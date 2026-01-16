import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import cloudinary, {
  uploadMultipleFiles,
  getUploadPreset,
  rollbackUploads
} from '../config/cloudinary.js';
import cacheManager, { TTL, CACHE_KEYS } from '../utils/cache.js';

// Query performance logging utility
const logQueryPerformance = (queryName, startTime, resultCount = 0) => {
  const duration = Date.now() - startTime;
  console.log(`[Query Performance] ${queryName}: ${duration}ms | Results: ${resultCount}`);

  // Log warning for slow queries (>1000ms)
  if (duration > 1000) {
    console.warn(`[Slow Query Alert] ${queryName} took ${duration}ms`);
  }
};

// @desc    Get all products with filters, search, pagination
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Cap at 100
    const skip = (page - 1) * limit;

    // Build filter object using indexed fields
    const filter = { isActive: true };

    // Category filter - lookup by slug to get ObjectId
    if (req.query.category) {
      const category = await Category.findOne({
        slug: req.query.category.toLowerCase(),
        isActive: true
      }).select('_id').lean();

      if (category) {
        filter.category = category._id;
      } else {
        // If category not found, return empty results
        return sendSuccess(res, 200, {
          products: [],
          pagination: {
            page,
            limit,
            totalPages: 0,
            totalProducts: 0
          }
        }, 'No products found');
      }
    }

    // Price range filter (indexed field)
    if (req.query.minPrice || req.query.maxPrice) {
      filter.price = {};
      if (req.query.minPrice) filter.price.$gte = parseFloat(req.query.minPrice);
      if (req.query.maxPrice) filter.price.$lte = parseFloat(req.query.maxPrice);
    }

    // Brand filter (indexed field)
    if (req.query.brand) {
      filter.brand = req.query.brand;
    }

    // Gender filter
    if (req.query.gender) {
      filter.gender = req.query.gender;
    }

    // Size filter
    if (req.query.size) {
      filter.sizes = req.query.size;
    }

    // Color filter - optimized with indexed field
    if (req.query.color) {
      filter['colors.name'] = new RegExp(req.query.color, 'i');
    }

    // Search query - using text index for efficient search
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    // Sort options - using indexed fields for better performance
    let sort = {};
    if (req.query.search) {
      // When searching, sort by text score first
      sort = { score: { $meta: 'textScore' }, createdAt: -1 };
    } else if (req.query.sort) {
      switch (req.query.sort) {
        case 'price-low':
          sort = { price: 1 };
          break;
        case 'price-high':
          sort = { price: -1 };
          break;
        case 'rating':
          sort = { 'ratings.average': -1, 'ratings.count': -1 };
          break;
        case 'newest':
          sort = { createdAt: -1 };
          break;
        case 'popular':
          sort = { 'ratings.count': -1, 'ratings.average': -1 };
          break;
        default:
          sort = { createdAt: -1 };
      }
    } else {
      sort = { createdAt: -1 };
    }

    // Optimized query with .lean() for read-only data
    // Select only necessary fields to reduce data transfer
    const productsQuery = Product.find(filter)
      .select('name slug description price discountPrice discountPercentage images category brand gender sizes colors stock ratings isFeatured isActive createdAt')
      .populate('category', 'name slug') // Only populate necessary fields
      .sort(sort)
      .limit(limit)
      .skip(skip)
      .lean(); // Convert to plain JavaScript objects for better performance

    // Add text score projection for search queries
    if (req.query.search) {
      productsQuery.select({ score: { $meta: 'textScore' } });
    }

    // Execute queries in parallel for better performance
    const [products, total] = await Promise.all([
      productsQuery.exec(),
      Product.countDocuments(filter)
    ]);

    logQueryPerformance('getProducts', startTime, products.length);

    sendSuccess(res, 200, {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Products fetched successfully');
  } catch (error) {
    logQueryPerformance('getProducts (error)', startTime);
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
export const getFeaturedProducts = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50); // Cap at 50
    const cacheKey = `${CACHE_KEYS.FEATURED_PRODUCTS}:${limit}`;

    // Try to get from cache
    const cachedProducts = cacheManager.get(cacheKey);
    if (cachedProducts) {
      logQueryPerformance('getFeaturedProducts (cached)', startTime, cachedProducts.length);
      return sendSuccess(res, 200, cachedProducts, 'Featured products fetched successfully (cached)');
    }

    // Cache miss - fetch from database
    // Optimized query with .lean() and limited fields
    const products = await Product.find({ isFeatured: true, isActive: true })
      .select('name slug description price discountPrice images category brand ratings')
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1, createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();

    // Cache for 30 minutes
    cacheManager.set(cacheKey, products, TTL.THIRTY_MINUTES);

    logQueryPerformance('getFeaturedProducts', startTime, products.length);

    sendSuccess(res, 200, products, 'Featured products fetched successfully');
  } catch (error) {
    logQueryPerformance('getFeaturedProducts (error)', startTime);
    next(error);
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const cacheKey = `${CACHE_KEYS.PRODUCT}:${req.params.id}`;

    // Try to get from cache
    const cachedProduct = cacheManager.get(cacheKey);
    if (cachedProduct) {
      logQueryPerformance('getProductById (cached)', startTime, 1);
      return sendSuccess(res, 200, cachedProduct, 'Product fetched successfully (cached)');
    }

    // Cache miss - fetch from database
    // Optimized query with .lean() and selective population
    const product = await Product.findById(req.params.id)
      .populate('category', 'name slug description')
      .populate({
        path: 'reviews.user',
        select: 'firstName lastName avatar' // Only necessary user fields
      })
      .lean()
      .exec();

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Cache for 15 minutes
    cacheManager.set(cacheKey, product, TTL.FIFTEEN_MINUTES);

    logQueryPerformance('getProductById', startTime, 1);

    sendSuccess(res, 200, product, 'Product fetched successfully');
  } catch (error) {
    logQueryPerformance('getProductById (error)', startTime);
    next(error);
  }
};

// @desc    Get product by slug (alternative to ID, SEO-friendly)
// @route   GET /api/products/slug/:slug
// @access  Public
export const getProductBySlug = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Slug is an indexed field for efficient querying
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('category', 'name slug description')
      .populate({
        path: 'reviews.user',
        select: 'firstName lastName avatar'
      })
      .lean()
      .exec();

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    logQueryPerformance('getProductBySlug', startTime, 1);

    sendSuccess(res, 200, product, 'Product fetched successfully');
  } catch (error) {
    logQueryPerformance('getProductBySlug (error)', startTime);
    next(error);
  }
};

// @desc    Search products with optimized text search
// @route   GET /api/products/search
// @access  Public
export const searchProducts = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { q, limit = 20, page = 1 } = req.query;

    if (!q || q.trim().length === 0) {
      return sendError(res, 400, 'Search query is required');
    }

    const searchLimit = Math.min(parseInt(limit), 100);
    const skip = (parseInt(page) - 1) * searchLimit;

    // Optimized text search with proper index usage
    const searchQuery = {
      $text: { $search: q },
      isActive: true
    };

    // Execute queries in parallel
    const [products, total] = await Promise.all([
      Product.find(searchQuery)
        .select('name slug description price discountPrice images category brand ratings score')
        .select({ score: { $meta: 'textScore' } })
        .populate('category', 'name slug')
        .sort({ score: { $meta: 'textScore' }, 'ratings.average': -1 })
        .limit(searchLimit)
        .skip(skip)
        .lean()
        .exec(),
      Product.countDocuments(searchQuery)
    ]);

    logQueryPerformance('searchProducts', startTime, products.length);

    sendSuccess(res, 200, {
      products,
      pagination: {
        page: parseInt(page),
        limit: searchLimit,
        total,
        pages: Math.ceil(total / searchLimit)
      }
    }, 'Search completed successfully');
  } catch (error) {
    logQueryPerformance('searchProducts (error)', startTime);
    next(error);
  }
};

// @desc    Get products by category (optimized)
// @route   GET /api/products/category/:categoryId
// @access  Public
export const getProductsByCategory = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { categoryId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const skip = (page - 1) * limit;

    // Using indexed category field for efficient filtering
    const filter = { category: categoryId, isActive: true };

    // Parallel query execution
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select('name slug description price discountPrice images brand sizes colors stock ratings createdAt')
        .sort({ 'ratings.average': -1, createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean()
        .exec(),
      Product.countDocuments(filter)
    ]);

    logQueryPerformance('getProductsByCategory', startTime, products.length);

    sendSuccess(res, 200, {
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Category products fetched successfully');
  } catch (error) {
    logQueryPerformance('getProductsByCategory (error)', startTime);
    next(error);
  }
};

// @desc    Get related products (based on category and tags)
// @route   GET /api/products/:id/related
// @access  Public
export const getRelatedProducts = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const limit = Math.min(parseInt(req.query.limit) || 6, 20);

    // First, get the current product with minimal fields
    const currentProduct = await Product.findById(req.params.id)
      .select('category tags')
      .lean()
      .exec();

    if (!currentProduct) {
      return sendError(res, 404, 'Product not found');
    }

    // Find related products using indexed fields
    const relatedProducts = await Product.find({
      _id: { $ne: req.params.id },
      isActive: true,
      $or: [
        { category: currentProduct.category },
        { tags: { $in: currentProduct.tags || [] } }
      ]
    })
      .select('name slug description price discountPrice images category brand ratings')
      .populate('category', 'name slug')
      .sort({ 'ratings.average': -1 })
      .limit(limit)
      .lean()
      .exec();

    logQueryPerformance('getRelatedProducts', startTime, relatedProducts.length);

    sendSuccess(res, 200, relatedProducts, 'Related products fetched successfully');
  } catch (error) {
    logQueryPerformance('getRelatedProducts (error)', startTime);
    next(error);
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Admin
export const createProduct = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const productData = {
      ...req.body,
      createdBy: req.user._id
    };

    const product = await Product.create(productData);

    // Invalidate product caches
    cacheManager.deletePattern(`${CACHE_KEYS.PRODUCTS}:*`);
    cacheManager.deletePattern(`${CACHE_KEYS.FEATURED_PRODUCTS}:*`);

    logQueryPerformance('createProduct', startTime, 1);

    sendSuccess(res, 201, product, 'Product created successfully');
  } catch (error) {
    logQueryPerformance('createProduct (error)', startTime);
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
export const updateProduct = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Use lean() for the initial read, then fetch full document if needed
    const productExists = await Product.findById(req.params.id)
      .select('_id')
      .lean()
      .exec();

    if (!productExists) {
      return sendError(res, 404, 'Product not found');
    }

    const allowedUpdates = [
      'name', 'description', 'category', 'subCategory', 'brand',
      'price', 'discountPrice', 'images', 'sizes', 'colors',
      'stock', 'tags', 'isFeatured', 'isActive', 'specifications'
    ];

    // Build update object with only allowed fields
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Use findByIdAndUpdate for better performance
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).exec();

    // Invalidate product caches
    cacheManager.delete(`${CACHE_KEYS.PRODUCT}:${req.params.id}`);
    cacheManager.deletePattern(`${CACHE_KEYS.PRODUCTS}:*`);
    cacheManager.deletePattern(`${CACHE_KEYS.FEATURED_PRODUCTS}:*`);

    logQueryPerformance('updateProduct', startTime, 1);

    sendSuccess(res, 200, updatedProduct, 'Product updated successfully');
  } catch (error) {
    logQueryPerformance('updateProduct (error)', startTime);
    next(error);
  }
};

// @desc    Batch update products (optimize bulk operations)
// @route   PUT /api/products/batch
// @access  Private/Admin
export const batchUpdateProducts = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { productIds, updates } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return sendError(res, 400, 'Product IDs array is required');
    }

    if (!updates || Object.keys(updates).length === 0) {
      return sendError(res, 400, 'Updates object is required');
    }

    // Whitelist allowed batch update fields
    const allowedBatchUpdates = ['isActive', 'isFeatured', 'category', 'tags', 'discountPrice'];
    const sanitizedUpdates = {};

    Object.keys(updates).forEach(key => {
      if (allowedBatchUpdates.includes(key)) {
        sanitizedUpdates[key] = updates[key];
      }
    });

    // Perform bulk update operation
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: sanitizedUpdates },
      { runValidators: true }
    );

    // Invalidate all product caches
    cacheManager.deletePattern(`${CACHE_KEYS.PRODUCT}:*`);
    cacheManager.deletePattern(`${CACHE_KEYS.PRODUCTS}:*`);
    cacheManager.deletePattern(`${CACHE_KEYS.FEATURED_PRODUCTS}:*`);

    logQueryPerformance('batchUpdateProducts', startTime, result.modifiedCount);

    sendSuccess(res, 200, {
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount
    }, `${result.modifiedCount} products updated successfully`);
  } catch (error) {
    logQueryPerformance('batchUpdateProducts (error)', startTime);
    next(error);
  }
};

// @desc    Update product stock (optimized for inventory management)
// @route   PATCH /api/products/:id/stock
// @access  Private/Admin
export const updateProductStock = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { stock } = req.body;

    if (typeof stock !== 'number' || stock < 0) {
      return sendError(res, 400, 'Valid stock number is required');
    }

    // Atomic update operation for stock
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { stock } },
      { new: true, select: 'name stock', runValidators: true }
    ).exec();

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Invalidate product cache
    cacheManager.delete(`${CACHE_KEYS.PRODUCT}:${req.params.id}`);

    logQueryPerformance('updateProductStock', startTime, 1);

    sendSuccess(res, 200, product, 'Stock updated successfully');
  } catch (error) {
    logQueryPerformance('updateProductStock (error)', startTime);
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
export const deleteProduct = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const product = await Product.findById(req.params.id)
      .select('_id images')
      .exec();

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Delete associated images from cloudinary (if needed)
    if (product.images && product.images.length > 0) {
      // Extract public IDs and delete in parallel
      const deletePromises = product.images.map(imageUrl => {
        const publicId = imageUrl.split('/').slice(-2).join('/').split('.')[0];
        return cloudinary.uploader.destroy(`ecommerce/products/${publicId}`, {
          invalidate: true
        }).catch(err => console.error('Error deleting image:', err));
      });

      await Promise.allSettled(deletePromises);
    }

    await product.deleteOne();

    // Invalidate product caches
    cacheManager.delete(`${CACHE_KEYS.PRODUCT}:${req.params.id}`);
    cacheManager.deletePattern(`${CACHE_KEYS.PRODUCTS}:*`);
    cacheManager.deletePattern(`${CACHE_KEYS.FEATURED_PRODUCTS}:*`);

    logQueryPerformance('deleteProduct', startTime, 1);

    sendSuccess(res, 200, null, 'Product deleted successfully');
  } catch (error) {
    logQueryPerformance('deleteProduct (error)', startTime);
    next(error);
  }
};

// @desc    Upload product images (optimized with parallel processing)
// @route   POST /api/products/upload
// @access  Private/Admin
export const uploadImages = async (req, res, next) => {
  const startTime = Date.now();

  try {
    if (!req.files || req.files.length === 0) {
      return sendError(res, 400, 'No images provided');
    }

    // Limit number of images per upload
    const maxImages = 10;
    if (req.files.length > maxImages) {
      return sendError(res, 400, `Maximum ${maxImages} images allowed per upload`);
    }

    // Track upload progress
    const progressData = [];
    const onProgress = (progress) => {
      progressData.push(progress);
      console.log(`Upload progress: ${progress.fileName} - ${progress.progress}%`);
    };

    // Get upload preset for products with optimized settings
    const uploadOptions = getUploadPreset('product');

    // Upload files concurrently with optimized configuration
    const uploadResult = await uploadMultipleFiles(
      req.files,
      uploadOptions,
      onProgress
    );

    logQueryPerformance('uploadImages', startTime, uploadResult.uploadedFiles.length);

    if (!uploadResult.success) {
      return sendError(res, 500, uploadResult.error || 'Upload failed', {
        uploaded: uploadResult.uploadedFiles,
        failed: uploadResult.failedFiles
      });
    }

    // Include processing information if available
    const imagesWithProcessingInfo = uploadResult.uploadedFiles.map((uploadedFile, index) => {
      const fileProcessingInfo = req.files[index]?.processingInfo;
      return {
        ...uploadedFile,
        processing: fileProcessingInfo ? {
          originalSize: fileProcessingInfo.originalSize,
          compressedSize: fileProcessingInfo.compressedSize,
          compressionRatio: `${fileProcessingInfo.compressionRatio}%`,
          metadata: fileProcessingInfo.metadata
        } : undefined
      };
    });

    sendSuccess(res, 200, {
      images: imagesWithProcessingInfo,
      summary: {
        total: req.files.length,
        successful: uploadResult.totalUploaded,
        failed: uploadResult.totalFailed
      },
      failures: uploadResult.failedFiles.length > 0 ? uploadResult.failedFiles : undefined
    }, `${uploadResult.totalUploaded} of ${req.files.length} images uploaded successfully`);
  } catch (error) {
    logQueryPerformance('uploadImages (error)', startTime);

    // Attempt to rollback any successful uploads if there was an error
    if (error.uploadedPublicIds && error.uploadedPublicIds.length > 0) {
      await rollbackUploads(error.uploadedPublicIds).catch(rollbackError => {
        console.error('Rollback failed:', rollbackError);
      });
    }

    next(error);
  }
};

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private/User
export const addReview = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const { rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return sendError(res, 400, 'Rating must be between 1 and 5');
    }

    const product = await Product.findById(req.params.id)
      .select('reviews ratings')
      .exec();

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return sendError(res, 400, 'You have already reviewed this product');
    }

    const review = {
      user: req.user._id,
      rating: Number(rating),
      comment: comment || ''
    };

    product.reviews.push(review);

    // Update ratings if method exists
    if (typeof product.updateRatings === 'function') {
      product.updateRatings();
    }

    await product.save();

    // Invalidate product cache (review affects product data)
    cacheManager.delete(`${CACHE_KEYS.PRODUCT}:${req.params.id}`);

    // Fetch updated product with populated review
    const updatedProduct = await Product.findById(req.params.id)
      .populate({
        path: 'reviews.user',
        select: 'firstName lastName avatar'
      })
      .lean()
      .exec();

    logQueryPerformance('addReview', startTime, 1);

    sendSuccess(res, 201, updatedProduct, 'Review added successfully');
  } catch (error) {
    logQueryPerformance('addReview (error)', startTime);
    next(error);
  }
};

// @desc    Get product reviews (paginated)
// @route   GET /api/products/:id/reviews
// @access  Public
export const getProductReviews = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const product = await Product.findById(req.params.id)
      .select('reviews ratings')
      .populate({
        path: 'reviews.user',
        select: 'firstName lastName avatar'
      })
      .lean()
      .exec();

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Paginate reviews manually
    const totalReviews = product.reviews.length;
    const paginatedReviews = product.reviews
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(skip, skip + limit);

    logQueryPerformance('getProductReviews', startTime, paginatedReviews.length);

    sendSuccess(res, 200, {
      reviews: paginatedReviews,
      ratings: product.ratings,
      pagination: {
        page,
        limit,
        total: totalReviews,
        pages: Math.ceil(totalReviews / limit)
      }
    }, 'Reviews fetched successfully');
  } catch (error) {
    logQueryPerformance('getProductReviews (error)', startTime);
    next(error);
  }
};

// @desc    Get products aggregated statistics (for admin dashboard)
// @route   GET /api/products/stats
// @access  Private/Admin
export const getProductStats = async (req, res, next) => {
  const startTime = Date.now();

  try {
    // Optimized aggregation pipeline using indexed fields
    const stats = await Product.aggregate([
      {
        $facet: {
          totalStats: [
            {
              $group: {
                _id: null,
                totalProducts: { $sum: 1 },
                activeProducts: {
                  $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
                },
                featuredProducts: {
                  $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] }
                },
                outOfStock: {
                  $sum: { $cond: [{ $lte: ['$stock', 0] }, 1, 0] }
                },
                lowStock: {
                  $sum: { $cond: [{ $and: [{ $gt: ['$stock', 0] }, { $lte: ['$stock', 10] }] }, 1, 0] }
                },
                averagePrice: { $avg: '$price' },
                totalValue: { $sum: { $multiply: ['$price', '$stock'] } }
              }
            }
          ],
          categoryStats: [
            {
              $group: {
                _id: '$category',
                count: { $sum: 1 },
                averagePrice: { $avg: '$price' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ],
          brandStats: [
            {
              $group: {
                _id: '$brand',
                count: { $sum: 1 },
                averageRating: { $avg: '$ratings.average' }
              }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    logQueryPerformance('getProductStats', startTime);

    sendSuccess(res, 200, {
      total: stats[0].totalStats[0] || {},
      byCategory: stats[0].categoryStats || [],
      byBrand: stats[0].brandStats || []
    }, 'Statistics fetched successfully');
  } catch (error) {
    logQueryPerformance('getProductStats (error)', startTime);
    next(error);
  }
};
