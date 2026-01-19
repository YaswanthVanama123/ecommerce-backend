import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { uploadMultipleFiles, deleteFromCloudinary, getUploadPreset } from '../config/cloudinary.js';

// Query performance logging utility
const logQueryPerformance = (queryName, startTime, resultCount = 0) => {
  const duration = Date.now() - startTime;
  console.log(`[Query Performance] ${queryName}: ${duration}ms | Results: ${resultCount}`);

  // Log warning for slow queries (>1000ms)
  if (duration > 1000) {
    console.warn(`[Slow Query Alert] ${queryName} took ${duration}ms`);
  }
};

// @desc    Check review eligibility for a product from an order
// @route   GET /api/reviews/eligibility/:orderId/:productId
// @access  Private
export const checkReviewEligibility = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { orderId, productId } = req.params;
    const userId = req.user._id;

    const eligibility = await Review.canReviewFromOrder(userId, orderId, productId);

    logQueryPerformance('Check Review Eligibility', startTime, 1);

    return sendSuccess(res, 200, eligibility);
  } catch (error) {
    console.error('[Check Review Eligibility Error]:', error);
    return sendError(res, 500, 'Failed to check review eligibility', error.message);
  }
};

// @desc    Get reviewable orders for a user
// @route   GET /api/reviews/reviewable-orders
// @access  Private
export const getReviewableOrders = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const userId = req.user._id;
    const now = new Date();
    const fifteenDaysAgo = new Date(now - 15 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    // Find delivered orders within review window
    const orders = await Order.find({
      user: userId,
      orderStatus: 'delivered',
      deliveredAt: {
        $gte: fifteenDaysAgo,
        $lte: sevenDaysAgo
      }
    })
      .select('orderNumber items deliveredAt')
      .populate('items.product', 'name images')
      .lean();

    // Check which products have already been reviewed
    const reviewableOrders = await Promise.all(
      orders.map(async (order) => {
        const itemsWithReviewStatus = await Promise.all(
          order.items.map(async (item) => {
            const existingReview = await Review.findOne({
              order: order._id,
              product: item.product._id,
              user: userId
            }).select('_id');

            return {
              ...item,
              hasReview: !!existingReview,
              reviewEligible: !existingReview
            };
          })
        );

        return {
          ...order,
          items: itemsWithReviewStatus,
          reviewableItemsCount: itemsWithReviewStatus.filter(i => !i.hasReview).length
        };
      })
    );

    // Filter orders that have at least one reviewable item
    const filteredOrders = reviewableOrders.filter(o => o.reviewableItemsCount > 0);

    logQueryPerformance('Get Reviewable Orders', startTime, filteredOrders.length);

    return sendSuccess(res, 200, {
      orders: filteredOrders,
      totalReviewable: filteredOrders.reduce((sum, o) => sum + o.reviewableItemsCount, 0)
    });
  } catch (error) {
    console.error('[Get Reviewable Orders Error]:', error);
    return sendError(res, 500, 'Failed to fetch reviewable orders', error.message);
  }
};

// @desc    Create a new review with images
// @route   POST /api/reviews
// @access  Private
export const createReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const {
      productId,
      orderId,
      rating,
      title,
      comment,
      qualityRating,
      valueRating,
      sizeRating
    } = req.body;
    const userId = req.user._id;

    // Verify product exists
    const product = await Product.findById(productId).select('_id name');
    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Check review eligibility if orderId is provided
    let verified = false;
    if (orderId) {
      const eligibility = await Review.canReviewFromOrder(userId, orderId, productId);

      if (!eligibility.canReview) {
        return sendError(res, 400, eligibility.reason, eligibility);
      }
      verified = true;
    } else {
      // Check if user has purchased this product from any order
      const hasPurchased = await Order.findOne({
        user: userId,
        'items.product': productId,
        orderStatus: 'delivered'
      }).select('_id');

      verified = !!hasPurchased;
    }

    // Check if user already reviewed this product (without order context)
    const existingReview = await Review.findOne({
      product: productId,
      user: userId
    });

    if (existingReview) {
      return sendError(res, 400, 'You have already reviewed this product. Please update your existing review instead.');
    }

    // Upload review images if provided
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      try {
        const preset = getUploadPreset('product');
        const uploadResult = await uploadMultipleFiles(req.files, {
          ...preset,
          folder: 'ecommerce/reviews',
          eager: [
            { width: 400, height: 400, crop: 'fill', quality: 'auto:good', format: 'webp' }
          ]
        });

        if (uploadResult.success) {
          imageUrls = uploadResult.uploadedFiles.map(f => f.url);
        }
      } catch (uploadError) {
        console.error('[Review Image Upload Error]:', uploadError);
        // Continue without images if upload fails
      }
    }

    // Create review with pending status (requires moderation)
    const reviewData = {
      product: productId,
      user: userId,
      rating,
      title,
      verified,
      status: 'pending' // All reviews start as pending
    };

    // Add optional fields
    if (comment) reviewData.comment = comment;
    if (orderId) reviewData.order = orderId;
    if (imageUrls.length > 0) reviewData.images = imageUrls;
    if (qualityRating) reviewData.qualityRating = qualityRating;
    if (valueRating) reviewData.valueRating = valueRating;
    if (sizeRating) reviewData.sizeRating = sizeRating;

    const review = await Review.create(reviewData);

    // Populate user details
    await review.populate('user', 'firstName lastName');

    logQueryPerformance('Create Review', startTime, 1);

    return sendSuccess(res, 201, {
      review,
      verified,
      message: 'Review submitted successfully and is pending moderation'
    }, 'Review submitted successfully');
  } catch (error) {
    console.error('[Create Review Error]:', error);
    return sendError(res, 500, 'Failed to create review', error.message);
  }
};

// @desc    Get reviews for a product (public - approved only)
// @route   GET /api/reviews/product/:productId
// @access  Public
export const getProductReviews = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    // Build filter - only show approved reviews for public
    const filter = {
      product: productId,
      status: 'approved',
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

    // Filter by images
    if (req.query.hasImages === 'true') {
      filter.images = { $exists: true, $ne: [] };
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
        .populate('response.respondedBy', 'firstName lastName role')
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
        review.isNotHelpfulByCurrentUser = review.notHelpful?.some(
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
      .populate('response.respondedBy', 'firstName lastName role')
      .lean();

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    // Only show approved reviews to public
    if (review.status !== 'approved' && (!req.user || req.user._id.toString() !== review.user._id.toString())) {
      return sendError(res, 404, 'Review not available');
    }

    if (!review.isActive) {
      return sendError(res, 404, 'Review not available');
    }

    // Add helpful status for logged-in users
    if (req.user) {
      review.isHelpfulByCurrentUser = review.helpful.some(
        id => id.toString() === req.user._id.toString()
      );
      review.isNotHelpfulByCurrentUser = review.notHelpful?.some(
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

// @desc    Update a review (within 48 hours)
// @route   PUT /api/reviews/:id
// @access  Private (only review author)
export const updateReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { rating, title, comment, qualityRating, valueRating, sizeRating } = req.body;
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

    // Check if review can be edited (within 48 hours)
    if (!review.canBeEdited()) {
      return sendError(res, 400, 'Reviews can only be edited within 48 hours of creation');
    }

    // Update fields
    if (rating !== undefined) review.rating = rating;
    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    if (qualityRating !== undefined) review.qualityRating = qualityRating;
    if (valueRating !== undefined) review.valueRating = valueRating;
    if (sizeRating !== undefined) review.sizeRating = sizeRating;

    // Handle image uploads
    if (req.files && req.files.length > 0) {
      try {
        const preset = getUploadPreset('product');
        const uploadResult = await uploadMultipleFiles(req.files, {
          ...preset,
          folder: 'ecommerce/reviews'
        });

        if (uploadResult.success) {
          const newImageUrls = uploadResult.uploadedFiles.map(f => f.url);
          review.images = [...(review.images || []), ...newImageUrls];
        }
      } catch (uploadError) {
        console.error('[Review Image Upload Error]:', uploadError);
      }
    }

    // Set review status back to pending after edit
    if (review.status === 'approved') {
      review.status = 'pending';
    }

    review.editedAt = new Date();
    await review.save();

    // Update product ratings if rating changed
    if (rating !== undefined) {
      await updateProductRatings(review.product);
    }

    // Populate user details
    await review.populate('user', 'firstName lastName');

    logQueryPerformance('Update Review', startTime, 1);

    return sendSuccess(res, 200, { review }, 'Review updated successfully and is pending re-moderation');
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

// @desc    Mark review as helpful or not helpful
// @route   POST /api/reviews/:id/vote
// @access  Private
export const voteReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { type } = req.body; // 'helpful' or 'notHelpful'
    const userId = req.user._id;

    // Find review
    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    if (!review.isActive || review.status !== 'approved') {
      return sendError(res, 404, 'Review not available');
    }

    // Cannot vote on own review
    if (review.user.toString() === userId.toString()) {
      return sendError(res, 400, 'You cannot vote on your own review');
    }

    const isHelpful = review.helpful.some(id => id.toString() === userId.toString());
    const isNotHelpful = review.notHelpful.some(id => id.toString() === userId.toString());

    if (type === 'helpful') {
      if (isHelpful) {
        // Remove helpful vote
        review.helpful = review.helpful.filter(id => id.toString() !== userId.toString());
      } else {
        // Remove from not helpful if exists and add to helpful
        review.notHelpful = review.notHelpful.filter(id => id.toString() !== userId.toString());
        review.helpful.push(userId);
      }
    } else if (type === 'notHelpful') {
      if (isNotHelpful) {
        // Remove not helpful vote
        review.notHelpful = review.notHelpful.filter(id => id.toString() !== userId.toString());
      } else {
        // Remove from helpful if exists and add to not helpful
        review.helpful = review.helpful.filter(id => id.toString() !== userId.toString());
        review.notHelpful.push(userId);
      }
    } else {
      return sendError(res, 400, 'Invalid vote type. Must be "helpful" or "notHelpful"');
    }

    await review.save();

    logQueryPerformance('Vote Review', startTime, 1);

    return sendSuccess(res, 200, {
      helpfulCount: review.helpfulCount,
      notHelpfulCount: review.notHelpfulCount,
      userVote: type
    }, 'Vote recorded successfully');
  } catch (error) {
    console.error('[Vote Review Error]:', error);
    return sendError(res, 500, 'Failed to vote on review', error.message);
  }
};

// @desc    Report a review
// @route   POST /api/reviews/:id/report
// @access  Private
export const reportReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user._id;

    // Find review
    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    // Check if user already reported this review
    const existingReport = review.reports.find(
      r => r.reportedBy.toString() === userId.toString() && r.status === 'pending'
    );

    if (existingReport) {
      return sendError(res, 400, 'You have already reported this review');
    }

    // Add report
    review.reports.push({
      reportedBy: userId,
      reason,
      description,
      status: 'pending'
    });

    await review.save();

    logQueryPerformance('Report Review', startTime, 1);

    return sendSuccess(res, 200, null, 'Review reported successfully. Our team will review it.');
  } catch (error) {
    console.error('[Report Review Error]:', error);
    return sendError(res, 500, 'Failed to report review', error.message);
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

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('product', 'name images price')
        .populate('response.respondedBy', 'firstName lastName role')
        .lean(),
      Review.countDocuments(filter)
    ]);

    // Add editable status
    reviews.forEach(review => {
      const hoursSinceCreation = (Date.now() - new Date(review.createdAt).getTime()) / (1000 * 60 * 60);
      review.canEdit = review.canEdit && hoursSinceCreation <= 48;
    });

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

// @desc    Get product rating summary with statistics
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
    const [verifiedCount, totalCount, withImagesCount] = await Promise.all([
      Review.countDocuments({ product: productId, verified: true, status: 'approved', isActive: true }),
      Review.countDocuments({ product: productId, status: 'approved', isActive: true }),
      Review.countDocuments({
        product: productId,
        status: 'approved',
        isActive: true,
        images: { $exists: true, $ne: [] }
      })
    ]);

    logQueryPerformance('Get Product Rating Summary', startTime);

    return sendSuccess(res, 200, {
      ...ratingStats,
      verifiedCount,
      totalCount,
      withImagesCount,
      verifiedPercentage: totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0,
      withImagesPercentage: totalCount > 0 ? Math.round((withImagesCount / totalCount) * 100) : 0
    });
  } catch (error) {
    console.error('[Get Rating Summary Error]:', error);
    return sendError(res, 500, 'Failed to fetch rating summary', error.message);
  }
};

// ============ ADMIN ROUTES ============

// @desc    Get all reviews for moderation (admin)
// @route   GET /api/reviews/admin/moderation
// @access  Private (Admin only)
export const getReviewsForModeration = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    const filter = { isActive: true };

    // Filter by status
    if (req.query.status) {
      filter.status = req.query.status;
    } else {
      filter.status = 'pending'; // Default to pending
    }

    // Filter by reported reviews
    if (req.query.reported === 'true') {
      filter['reports.status'] = 'pending';
    }

    const [reviews, totalReviews] = await Promise.all([
      Review.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email')
        .populate('product', 'name images')
        .populate('order', 'orderNumber')
        .lean(),
      Review.countDocuments(filter)
    ]);

    // Add pending reports count
    reviews.forEach(review => {
      review.pendingReportsCount = review.reports.filter(r => r.status === 'pending').length;
    });

    const totalPages = Math.ceil(totalReviews / limit);

    logQueryPerformance('Get Reviews For Moderation', startTime, reviews.length);

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
    console.error('[Get Reviews For Moderation Error]:', error);
    return sendError(res, 500, 'Failed to fetch reviews for moderation', error.message);
  }
};

// @desc    Approve a review (admin)
// @route   PUT /api/reviews/admin/:id/approve
// @access  Private (Admin only)
export const approveReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const adminId = req.user._id;

    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    review.status = 'approved';
    review.moderatedBy = adminId;
    review.moderatedAt = new Date();
    review.rejectionReason = undefined;

    await review.save();

    // Update product ratings
    await updateProductRatings(review.product);

    logQueryPerformance('Approve Review', startTime, 1);

    return sendSuccess(res, 200, { review }, 'Review approved successfully');
  } catch (error) {
    console.error('[Approve Review Error]:', error);
    return sendError(res, 500, 'Failed to approve review', error.message);
  }
};

// @desc    Reject a review (admin)
// @route   PUT /api/reviews/admin/:id/reject
// @access  Private (Admin only)
export const rejectReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user._id;

    if (!reason) {
      return sendError(res, 400, 'Rejection reason is required');
    }

    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    review.status = 'rejected';
    review.rejectionReason = reason;
    review.moderatedBy = adminId;
    review.moderatedAt = new Date();

    await review.save();

    // Update product ratings (in case it was previously approved)
    await updateProductRatings(review.product);

    logQueryPerformance('Reject Review', startTime, 1);

    return sendSuccess(res, 200, { review }, 'Review rejected successfully');
  } catch (error) {
    console.error('[Reject Review Error]:', error);
    return sendError(res, 500, 'Failed to reject review', error.message);
  }
};

// @desc    Respond to a review as seller/admin
// @route   POST /api/reviews/admin/:id/respond
// @access  Private (Admin only)
export const respondToReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id } = req.params;
    const { response } = req.body;
    const adminId = req.user._id;

    if (!response || response.trim().length === 0) {
      return sendError(res, 400, 'Response text is required');
    }

    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    if (review.status !== 'approved') {
      return sendError(res, 400, 'Can only respond to approved reviews');
    }

    review.response = {
      respondedBy: adminId,
      response: response.trim(),
      respondedAt: new Date()
    };

    await review.save();
    await review.populate('response.respondedBy', 'firstName lastName role');

    logQueryPerformance('Respond To Review', startTime, 1);

    return sendSuccess(res, 200, { review }, 'Response added successfully');
  } catch (error) {
    console.error('[Respond To Review Error]:', error);
    return sendError(res, 500, 'Failed to respond to review', error.message);
  }
};

// @desc    Handle review report (admin)
// @route   PUT /api/reviews/admin/:id/report/:reportId
// @access  Private (Admin only)
export const handleReviewReport = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { id, reportId } = req.params;
    const { action } = req.body; // 'resolved' or 'dismissed'

    if (!['resolved', 'dismissed'].includes(action)) {
      return sendError(res, 400, 'Action must be either "resolved" or "dismissed"');
    }

    const review = await Review.findById(id);

    if (!review) {
      return sendError(res, 404, 'Review not found');
    }

    const report = review.reports.id(reportId);

    if (!report) {
      return sendError(res, 404, 'Report not found');
    }

    report.status = action;

    // If resolved, consider rejecting the review
    if (action === 'resolved') {
      review.status = 'rejected';
      review.rejectionReason = `Review reported and found to be ${report.reason}`;
      review.moderatedBy = req.user._id;
      review.moderatedAt = new Date();
    }

    await review.save();

    logQueryPerformance('Handle Review Report', startTime, 1);

    return sendSuccess(res, 200, { review }, `Report ${action} successfully`);
  } catch (error) {
    console.error('[Handle Review Report Error]:', error);
    return sendError(res, 500, 'Failed to handle report', error.message);
  }
};

// @desc    Get review analytics (admin)
// @route   GET /api/reviews/admin/analytics
// @access  Private (Admin only)
export const getReviewAnalytics = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const [
      totalReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      verifiedReviews,
      reportedReviews,
      avgRating,
      topRatedProducts,
      recentReviews
    ] = await Promise.all([
      Review.countDocuments({ isActive: true }),
      Review.countDocuments({ status: 'pending', isActive: true }),
      Review.countDocuments({ status: 'approved', isActive: true }),
      Review.countDocuments({ status: 'rejected', isActive: true }),
      Review.countDocuments({ verified: true, isActive: true }),
      Review.countDocuments({ 'reports.status': 'pending', isActive: true }),
      Review.aggregate([
        { $match: { status: 'approved', isActive: true } },
        { $group: { _id: null, avgRating: { $avg: '$rating' } } }
      ]),
      // Top rated products
      Review.aggregate([
        { $match: { status: 'approved', isActive: true } },
        {
          $group: {
            _id: '$product',
            avgRating: { $avg: '$rating' },
            reviewCount: { $sum: 1 }
          }
        },
        { $match: { reviewCount: { $gte: 5 } } }, // At least 5 reviews
        { $sort: { avgRating: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $project: {
            productId: '$_id',
            productName: '$product.name',
            avgRating: 1,
            reviewCount: 1
          }
        }
      ]),
      // Recent reviews
      Review.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'firstName lastName')
        .populate('product', 'name')
        .select('rating title status createdAt')
        .lean()
    ]);

    logQueryPerformance('Get Review Analytics', startTime);

    return sendSuccess(res, 200, {
      overview: {
        totalReviews,
        pendingReviews,
        approvedReviews,
        rejectedReviews,
        verifiedReviews,
        reportedReviews,
        averageRating: avgRating[0]?.avgRating || 0,
        verificationRate: totalReviews > 0 ? ((verifiedReviews / totalReviews) * 100).toFixed(2) : 0,
        approvalRate: totalReviews > 0 ? ((approvedReviews / totalReviews) * 100).toFixed(2) : 0
      },
      topRatedProducts,
      recentReviews
    });
  } catch (error) {
    console.error('[Get Review Analytics Error]:', error);
    return sendError(res, 500, 'Failed to fetch review analytics', error.message);
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
  checkReviewEligibility,
  getReviewableOrders,
  createReview,
  getProductReviews,
  getReviewById,
  updateReview,
  deleteReview,
  voteReview,
  reportReview,
  getUserReviews,
  getProductRatingSummary,
  // Admin routes
  getReviewsForModeration,
  approveReview,
  rejectReview,
  respondToReview,
  handleReviewReport,
  getReviewAnalytics
};
