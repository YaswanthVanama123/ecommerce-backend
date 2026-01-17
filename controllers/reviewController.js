import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Query performance logging utility
const logQueryPerformance = (queryName, startTime, resultCount = 0) => {
  const duration = Date.now() - startTime;
  console.log(`[Query Performance] ${queryName}: ${duration}ms | Results: ${resultCount}`);

  // Log warning for slow queries (>1000ms)
  if (duration > 1000) {
    console.warn(`[Slow Query Alert] ${queryName} took ${duration}ms`);
  }
};

// @desc    Create a new review
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { productId, rating, title, comment } = req.body;
    const userId = req.user._id;

    // Verify product exists
    const product = await Product.findById(productId).select('_id name');
    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: userId
    });

    if (existingReview) {
      return sendError(res, 400, 'You have already reviewed this product. Please update your existing review instead.');
    }

    // Check if user has purchased this product
    const hasPurchased = await Order.findOne({
      user: userId,
      'items.product': productId,
      orderStatus: 'delivered'
    }).select('_id');

    const verified = !!hasPurchased;

    // Create review
    const review = await Review.create({
      product: productId,
      user: userId,
      rating,
      title,
      comment,
      verified
    });

    // Update product ratings
    await updateProductRatings(productId);

    // Populate user details
    await review.populate('user', 'firstName lastName');

    logQueryPerformance('Create Review', startTime, 1);

    return sendSuccess(res, 201, {
      review,
      verified,
      message: verified
        ? 'Review created successfully (Verified Purchase)'
        : 'Review created successfully'
    }, 'Review submitted successfully');
  } catch (error) {
    console.error('[Create Review Error]:', error);
    return sendError(res, 500, 'Failed to create review', error.message);
  }
};

// @desc    Get reviews for a product
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {
      product: productId,
      isActive: true
    };

    // Filter by rating
    if (req.query.rating) {
      filter.rating = parseInt(req.query.rating);
    }

    // Filter by verified purchases only
    if (req.query.verified === 'true') {
      filter.verified = true;
    }

    // Sort options
    let sort = {};
    switch (req.query.sort) {
      case 'oldest':
        sort = { createdAt: 1 };
        break;
      case 'highest':
        sort = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sort = { rating: 1, createdAt: -1 };
        break;
      case 'helpful':
        sort = { helpfulCount: -1, createdAt: -1 };
        break;
      default: // newest
        sort = { createdAt: -1 };
    }

    // Get reviews with pagination
    const [reviews, totalReviews, ratingStats] = await Promise.all([
      Review.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName')
        .lean(),
      Review.countDocuments(filter),
      Review.calculateProductRating(productId)
    ]);

    // Add helpful status for logged-in users
    if (req.user) {
      reviews.forEach(review => {
        review.isHelpfulByCurrentUser = review.helpful.some(
          id => id.toString() === req.user._id.toString()
        );
      });
    }

    const totalPages = Math.ceil(totalReviews / limit);

    logQueryPerformance('Get Product Reviews', startTime, reviews.length);

    return sendSuccess(res, 200, {
      reviews,
      ratingStats,
      pagination: {
        page,
        limit,
        totalPages,
        totalReviews,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('[Get Product Reviews Error]:', error);
    return sendError(res, 500, 'Failed to fetch reviews', error.message);
  }
};

// @desc    Get a single review by ID
// @route   GET /api/reviews/:id
// @access  Public
export const getReviewById = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('user', 'firstName lastName')
      .populate('product', 'name images')
      .lean();

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    if (!review.isActive) {
      return sendError(res, 404, 'Review not available');
    }

    // Add helpful status for logged-in users
    if (req.user) {
      review.isHelpfulByCurrentUser = review.helpful.some(
        id => id.toString() === req.user._id.toString()
      );
    }

    logQueryPerformance('Get Review By ID', startTime, 1);

    return sendSuccess(res, 200, { review });
  } catch (error) {
    console.error('[Get Review Error]:', error);
    return sendError(res, 500, 'Failed to fetch review', error.message);
  }
};

// @desc    Update a review
// @route   PUT /api/reviews/:id
// @access  Private (only review author)
export const updateReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user._id;

    // Find review
    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    // Check if user is the author
    if (review.user.toString() !== userId.toString()) {
      return sendError(res, 403, 'You can only update your own reviews');
    }

    // Update fields
    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;

    await review.save();

    // Update product ratings if rating changed
    if (rating !== undefined) {
      await updateProductRatings(review.product);
    }

    // Populate user details
    await review.populate('user', 'firstName lastName');

    logQueryPerformance('Update Review', startTime, 1);

    return sendSuccess(res, 200, { review }, 'Review updated successfully');
  } catch (error) {
    console.error('[Update Review Error]:', error);
    return sendError(res, 500, 'Failed to update review', error.message);
  }
};

// @desc    Delete a review
// @route   DELETE /api/reviews/:id
// @access  Private (only review author or admin)
export const deleteReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';

    // Find review
    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    // Check if user is the author or admin
    if (review.user.toString() !== userId.toString() && !isAdmin) {
      return sendError(res, 403, 'You can only delete your own reviews');
    }

    const productId = review.product;

    // Soft delete (set isActive to false)
    review.isActive = false;
    await review.save();

    // Update product ratings
    await updateProductRatings(productId);

    logQueryPerformance('Delete Review', startTime, 1);

    return sendSuccess(res, 200, null, 'Review deleted successfully');
  } catch (error) {
    console.error('[Delete Review Error]:', error);
    return sendError(res, 500, 'Failed to delete review', error.message);
  }
};

// @desc    Mark review as helpful
// @route   POST /api/reviews/:id/helpful
// @access  Private
export const markReviewHelpful = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const userId = req.user._id;

    // Find review
    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    if (!review.isActive) {
      return sendError(res, 404, 'Review not available');
    }

    // Check if user already marked as helpful
    const alreadyMarked = review.helpful.some(
      helpfulUserId => helpfulUserId.toString() === userId.toString()
    );

    if (alreadyMarked) {
      // Remove from helpful (toggle)
      review.helpful = review.helpful.filter(
        helpfulUserId => helpfulUserId.toString() !== userId.toString()
      );
    } else {
      // Add to helpful
      review.helpful.push(userId);
    }

    await review.save();

    logQueryPerformance('Mark Review Helpful', startTime, 1);

    return sendSuccess(res, 200, {
      helpfulCount: review.helpfulCount,
      isHelpful: !alreadyMarked
    }, alreadyMarked ? 'Removed from helpful' : 'Marked as helpful');
  } catch (error) {
    console.error('[Mark Review Helpful Error]:', error);
    return sendError(res, 500, 'Failed to update review', error.message);
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/user/me
// @access  Private
export const getUserReviews = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const filter = {
      user: userId,
      isActive: true
    };

    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('product', 'name images price')
        .lean(),
      Review.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalReviews / limit);

    logQueryPerformance('Get User Reviews', startTime, reviews.length);

    return sendSuccess(res, 200, {
      reviews,
      pagination: {
        page,
        limit,
        totalPages,
        totalReviews,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('[Get User Reviews Error]:', error);
    return sendError(res, 500, 'Failed to fetch user reviews', error.message);
  }
};

// @desc    Get product rating summary
// @route   GET /api/reviews/product/:productId/summary
// @access  Public
export const getProductRatingSummary = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { productId } = req.params;

    // Verify product exists
    const product = await Product.findById(productId).select('_id');
    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    const ratingStats = await Review.calculateProductRating(productId);

    // Get verified vs non-verified count
    const [verifiedCount, totalCount] = await Promise.all([
      Review.countDocuments({ product: productId, verified: true, isActive: true }),
      Review.countDocuments({ product: productId, isActive: true })
    ]);

    logQueryPerformance('Get Product Rating Summary', startTime);

    return sendSuccess(res, 200, {
      ...ratingStats,
      verifiedCount,
      totalCount,
      verifiedPercentage: totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0
    });
  } catch (error) {
    console.error('[Get Rating Summary Error]:', error);
    return sendError(res, 500, 'Failed to fetch rating summary', error.message);
  }
};

// Helper function to update product ratings
async function updateProductRatings(productId) {
  try {
    const stats = await Review.calculateProductRating(productId);

    await Product.findByIdAndUpdate(
      productId,
      {
        'ratings.average': stats.averageRating,
        'ratings.count': stats.totalReviews
      },
      { new: true }
    );
  } catch (error) {
    console.error('[Update Product Ratings Error]:', error);
    // Don't throw error, just log it
  }
}

export default {
  createReview,
  getProductReviews,
  getReviewById,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getUserReviews,
  getProductRatingSummary
};
