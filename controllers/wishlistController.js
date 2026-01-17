import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// @desc    Get user's wishlist
// @route   GET /api/wishlist
// @access  Private
export const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images price discountPrice isActive ratings category brand stock',
        populate: {
          path: 'category',
          select: 'name slug'
        }
      })
      .lean();

    if (!wishlist) {
      // Create empty wishlist if it doesn't exist
      wishlist = await Wishlist.findOneAndUpdate(
        { user: req.user._id },
        { $setOnInsert: { user: req.user._id, items: [] } },
        { new: true, upsert: true, lean: true }
      );
    }

    // Filter out inactive products
    if (wishlist.items && wishlist.items.length > 0) {
      wishlist.items = wishlist.items.filter(item => item.product && item.product.isActive);
    }

    const totalItems = wishlist.items ? wishlist.items.length : 0;

    sendSuccess(res, 200, { wishlist, totalItems }, 'Wishlist fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to wishlist
// @route   POST /api/wishlist
// @access  Private
export const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    // Validate product exists and is active
    const product = await Product.findById(productId)
      .select('isActive')
      .lean();

    if (!product || !product.isActive) {
      return sendError(res, 404, 'Product not found or inactive');
    }

    // Check if product already exists in wishlist
    const existingWishlist = await Wishlist.findOne({
      user: req.user._id,
      'items.product': productId
    });

    if (existingWishlist) {
      return sendError(res, 400, 'Product already exists in wishlist');
    }

    // Use findOneAndUpdate with atomic operators
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: {
          items: {
            product: productId
          }
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    ).populate({
      path: 'items.product',
      select: 'name images price discountPrice isActive ratings category brand stock',
      populate: {
        path: 'category',
        select: 'name slug'
      }
    });

    const totalItems = wishlist.items ? wishlist.items.length : 0;

    sendSuccess(res, 200, { wishlist, totalItems }, 'Product added to wishlist successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from wishlist
// @route   DELETE /api/wishlist/:productId
// @access  Private
export const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Use findOneAndUpdate with $pull for atomic removal
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      {
        $pull: { items: { product: productId } }
      },
      { new: true }
    ).populate({
      path: 'items.product',
      select: 'name images price discountPrice isActive ratings category brand stock',
      populate: {
        path: 'category',
        select: 'name slug'
      }
    });

    if (!wishlist) {
      return sendError(res, 404, 'Wishlist not found');
    }

    const totalItems = wishlist.items ? wishlist.items.length : 0;

    sendSuccess(res, 200, { wishlist, totalItems }, 'Product removed from wishlist successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Clear entire wishlist
// @route   DELETE /api/wishlist
// @access  Private
export const clearWishlist = async (req, res, next) => {
  try {
    // Use findOneAndUpdate with $set for atomic clear
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [] } },
      { new: true }
    );

    if (!wishlist) {
      return sendError(res, 404, 'Wishlist not found');
    }

    sendSuccess(res, 200, { wishlist, totalItems: 0 }, 'Wishlist cleared successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Check if product is in wishlist
// @route   GET /api/wishlist/check/:productId
// @access  Private
export const checkProductInWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({
      user: req.user._id,
      'items.product': productId
    }).select('_id').lean();

    const inWishlist = !!wishlist;

    sendSuccess(res, 200, { inWishlist }, 'Wishlist check completed');
  } catch (error) {
    next(error);
  }
};

// @desc    Move item from wishlist to cart
// @route   POST /api/wishlist/:productId/move-to-cart
// @access  Private
export const moveToCart = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity = 1, size, color } = req.body;

    // Validate product exists
    const product = await Product.findById(productId)
      .select('isActive price discountPrice stock')
      .lean();

    if (!product || !product.isActive) {
      return sendError(res, 404, 'Product not found or inactive');
    }

    // Check stock availability if size and color are provided
    if (size && color) {
      const stockItem = product.stock.find(
        s => s.size === size && s.color === color
      );

      if (!stockItem || stockItem.quantity < quantity) {
        return sendError(res, 400, 'Insufficient stock for selected size and color');
      }
    }

    // Import Cart model dynamically to avoid circular dependencies
    const Cart = (await import('../models/Cart.js')).default;

    // Add to cart
    const price = product.discountPrice || product.price;

    await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        $push: {
          items: {
            product: productId,
            quantity,
            size,
            color,
            price
          }
        }
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    // Remove from wishlist
    const wishlist = await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      {
        $pull: { items: { product: productId } }
      },
      { new: true }
    ).populate({
      path: 'items.product',
      select: 'name images price discountPrice isActive ratings category brand stock',
      populate: {
        path: 'category',
        select: 'name slug'
      }
    });

    const totalItems = wishlist ? wishlist.items.length : 0;

    sendSuccess(res, 200, { wishlist, totalItems }, 'Product moved to cart successfully');
  } catch (error) {
    next(error);
  }
};
