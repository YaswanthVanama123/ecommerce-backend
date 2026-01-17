import Banner from '../models/Banner.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import cacheManager, { TTL, CACHE_KEYS } from '../utils/cache.js';

// Add banner cache keys to the CACHE_KEYS object
const BANNER_CACHE_KEYS = {
  ACTIVE_BANNERS: 'active_banners',
  BANNER: 'banner',
  ALL_BANNERS: 'all_banners'
};

/**
 * @desc    Get active banners for users
 * @route   GET /api/banners/active
 * @access  Public
 */
export const getActiveBanners = async (req, res, next) => {
  try {
    const { position, type, limit = 10 } = req.query;

    // Build cache key based on query parameters
    const cacheKey = `${BANNER_CACHE_KEYS.ACTIVE_BANNERS}:${position || 'all'}:${type || 'all'}:${limit}`;

    // Try to get from cache
    const cachedBanners = cacheManager.get(cacheKey);
    if (cachedBanners) {
      return sendSuccess(res, 200, cachedBanners, 'Active banners fetched successfully (cached)');
    }

    // Build query for currently valid banners
    const now = new Date();
    const query = {
      isActive: true,
      validFrom: { $lte: now },
      validTo: { $gte: now }
    };

    // Add optional filters
    if (position) {
      query.position = position;
    }
    if (type) {
      query.type = type;
    }

    // Fetch active banners from database
    const banners = await Banner.find(query)
      .populate('targetCategory', 'name slug')
      .populate('targetProducts', 'name price discountPrice images')
      .sort({ priority: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Cache for 5 minutes (active banners change frequently)
    cacheManager.set(cacheKey, banners, TTL.FIVE_MINUTES);

    sendSuccess(res, 200, banners, 'Active banners fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all banners (admin)
 * @route   GET /api/banners
 * @access  Private/Admin
 */
export const getAllBanners = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      position,
      type,
      isActive,
      status = 'all',
      sort = '-priority'
    } = req.query;

    // Build cache key
    const cacheKey = `${BANNER_CACHE_KEYS.ALL_BANNERS}:${page}:${limit}:${position || 'all'}:${type || 'all'}:${isActive || 'all'}:${status}:${sort}`;

    // Try to get from cache
    const cachedData = cacheManager.get(cacheKey);
    if (cachedData) {
      return sendSuccess(res, 200, cachedData, 'Banners fetched successfully (cached)');
    }

    // Build query
    const query = {};

    // Add optional filters
    if (position) {
      query.position = position;
    }
    if (type) {
      query.type = type;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Add status filter
    const now = new Date();
    if (status === 'active') {
      query.isActive = true;
      query.validFrom = { $lte: now };
      query.validTo = { $gte: now };
    } else if (status === 'expired') {
      query.validTo = { $lt: now };
    } else if (status === 'upcoming') {
      query.validFrom = { $gt: now };
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Fetch banners with pagination
    const [banners, total] = await Promise.all([
      Banner.find(query)
        .populate('targetCategory', 'name slug')
        .populate('targetProducts', 'name price discountPrice images')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Banner.countDocuments(query)
    ]);

    const result = {
      banners,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    };

    // Cache for 2 minutes
    cacheManager.set(cacheKey, result, TTL.ONE_MINUTE * 2);

    sendSuccess(res, 200, result, 'Banners fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get banner by ID
 * @route   GET /api/banners/:id
 * @access  Private/Admin
 */
export const getBannerById = async (req, res, next) => {
  try {
    const cacheKey = `${BANNER_CACHE_KEYS.BANNER}:${req.params.id}`;

    // Try to get from cache
    const cachedBanner = cacheManager.get(cacheKey);
    if (cachedBanner) {
      return sendSuccess(res, 200, cachedBanner, 'Banner fetched successfully (cached)');
    }

    // Fetch from database
    const banner = await Banner.findById(req.params.id)
      .populate('targetCategory', 'name slug')
      .populate('targetProducts', 'name price discountPrice images')
      .populate('createdBy', 'name email')
      .lean();

    if (!banner) {
      return sendError(res, 404, 'Banner not found');
    }

    // Cache for 15 minutes
    cacheManager.set(cacheKey, banner, TTL.FIFTEEN_MINUTES);

    sendSuccess(res, 200, banner, 'Banner fetched successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create banner
 * @route   POST /api/banners
 * @access  Private/Admin
 */
export const createBanner = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      description,
      image,
      backgroundImage,
      buttonText,
      buttonLink,
      type,
      discountPercentage,
      validFrom,
      validTo,
      isActive,
      position,
      priority,
      targetCategory,
      targetProducts
    } = req.body;

    // Create banner with createdBy set to the current admin user
    const banner = await Banner.create({
      title,
      subtitle,
      description,
      image,
      backgroundImage,
      buttonText,
      buttonLink,
      type,
      discountPercentage,
      validFrom,
      validTo,
      isActive,
      position,
      priority,
      targetCategory: targetCategory || null,
      targetProducts: targetProducts || [],
      createdBy: req.user._id
    });

    // Populate the banner
    const populatedBanner = await Banner.findById(banner._id)
      .populate('targetCategory', 'name slug')
      .populate('targetProducts', 'name price discountPrice images')
      .populate('createdBy', 'name email')
      .lean();

    // Invalidate all banner caches
    cacheManager.deletePattern(`${BANNER_CACHE_KEYS.ACTIVE_BANNERS}:*`);
    cacheManager.deletePattern(`${BANNER_CACHE_KEYS.ALL_BANNERS}:*`);

    sendSuccess(res, 201, populatedBanner, 'Banner created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update banner
 * @route   PUT /api/banners/:id
 * @access  Private/Admin
 */
export const updateBanner = async (req, res, next) => {
  try {
    const {
      title,
      subtitle,
      description,
      image,
      backgroundImage,
      buttonText,
      buttonLink,
      type,
      discountPercentage,
      validFrom,
      validTo,
      isActive,
      position,
      priority,
      targetCategory,
      targetProducts
    } = req.body;

    // Find banner
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return sendError(res, 404, 'Banner not found');
    }

    // Update fields
    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (description !== undefined) banner.description = description;
    if (image !== undefined) banner.image = image;
    if (backgroundImage !== undefined) banner.backgroundImage = backgroundImage;
    if (buttonText !== undefined) banner.buttonText = buttonText;
    if (buttonLink !== undefined) banner.buttonLink = buttonLink;
    if (type !== undefined) banner.type = type;
    if (discountPercentage !== undefined) banner.discountPercentage = discountPercentage;
    if (validFrom !== undefined) banner.validFrom = validFrom;
    if (validTo !== undefined) banner.validTo = validTo;
    if (isActive !== undefined) banner.isActive = isActive;
    if (position !== undefined) banner.position = position;
    if (priority !== undefined) banner.priority = priority;
    if (targetCategory !== undefined) banner.targetCategory = targetCategory || null;
    if (targetProducts !== undefined) banner.targetProducts = targetProducts || [];

    // Save banner
    const updatedBanner = await banner.save();

    // Populate the updated banner
    const populatedBanner = await Banner.findById(updatedBanner._id)
      .populate('targetCategory', 'name slug')
      .populate('targetProducts', 'name price discountPrice images')
      .populate('createdBy', 'name email')
      .lean();

    // Invalidate all banner caches
    cacheManager.deletePattern(`${BANNER_CACHE_KEYS.ACTIVE_BANNERS}:*`);
    cacheManager.deletePattern(`${BANNER_CACHE_KEYS.ALL_BANNERS}:*`);
    cacheManager.delete(`${BANNER_CACHE_KEYS.BANNER}:${req.params.id}`);

    sendSuccess(res, 200, populatedBanner, 'Banner updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete banner
 * @route   DELETE /api/banners/:id
 * @access  Private/Admin
 */
export const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params.id);

    if (!banner) {
      return sendError(res, 404, 'Banner not found');
    }

    await banner.deleteOne();

    // Invalidate all banner caches
    cacheManager.deletePattern(`${BANNER_CACHE_KEYS.ACTIVE_BANNERS}:*`);
    cacheManager.deletePattern(`${BANNER_CACHE_KEYS.ALL_BANNERS}:*`);
    cacheManager.delete(`${BANNER_CACHE_KEYS.BANNER}:${req.params.id}`);

    sendSuccess(res, 200, null, 'Banner deleted successfully');
  } catch (error) {
    next(error);
  }
};
