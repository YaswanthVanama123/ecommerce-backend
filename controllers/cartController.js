import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// In-memory cache for cart validation (optional - can be replaced with Redis)
const cartValidationCache = new Map();
const CACHE_TTL = 60000; // 1 minute TTL

// Helper function to get cached validation
const getCachedValidation = (productId, size, color) => {
  const key = `${productId}-${size}-${color}`;
  const cached = cartValidationCache.get(key);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  cartValidationCache.delete(key);
  return null;
};

// Helper function to set cached validation
const setCachedValidation = (productId, size, color, data) => {
  const key = `${productId}-${size}-${color}`;
  cartValidationCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of cartValidationCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cartValidationCache.delete(key);
    }
  }
}, CACHE_TTL);

// @desc    Get user's cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images price discountPrice isActive'
      })
      .lean();

    if (!cart) {
      // Use findOneAndUpdate with upsert for atomic operation
      cart = await Cart.findOneAndUpdate(
        { user: req.user._id },
        { $setOnInsert: { user: req.user._id, items: [] } },
        { new: true, upsert: true, lean: true }
      );
    }

    // Calculate totals efficiently
    let total = 0;
    let totalItems = 0;

    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        const price = item.price || 0;
        total += price * item.quantity;
        totalItems += item.quantity;
      }
    }

    sendSuccess(res, 200, { cart, total, totalItems }, 'Cart fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart with optimized atomic operations
// @route   POST /api/cart/items
// @access  Private
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, size, color } = req.body;

    if (!quantity || quantity < 1) {
      return sendError(res, 400, 'Invalid quantity');
    }

    // Check cache first for validation
    let validationData = getCachedValidation(productId, size, color);

    if (!validationData) {
      // Validate product exists and is active
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

      validationData = {
        price: product.discountPrice || product.price,
        isActive: product.isActive
      };

      // Cache the validation result
      setCachedValidation(productId, size, color, validationData);
    }

    const price = validationData.price;

    // Use findOneAndUpdate with atomic operators for optimized cart operations
    // This handles both adding new items and updating existing ones atomically
    const cart = await Cart.findOneAndUpdate(
      {
        user: req.user._id,
        'items.product': productId,
        'items.size': size || { $exists: false },
        'items.color': color || { $exists: false }
      },
      {
        $inc: { 'items.$.quantity': quantity },
        $set: { 'items.$.price': price }
      },
      { new: true }
    );

    if (!cart) {
      // Item doesn't exist, add it
      const newCart = await Cart.findOneAndUpdate(
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
      ).populate({
        path: 'items.product',
        select: 'name images price discountPrice'
      });

      // Calculate totals
      let total = 0;
      let totalItems = 0;

      for (const item of newCart.items) {
        total += item.price * item.quantity;
        totalItems += item.quantity;
      }

      return sendSuccess(res, 200, { cart: newCart, total, totalItems }, 'Item added to cart successfully');
    }

    // Populate the updated cart
    await cart.populate({
      path: 'items.product',
      select: 'name images price discountPrice'
    });

    // Calculate totals
    let total = 0;
    let totalItems = 0;

    for (const item of cart.items) {
      total += item.price * item.quantity;
      totalItems += item.quantity;
    }

    sendSuccess(res, 200, { cart, total, totalItems }, 'Item added to cart successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity with atomic operations
// @route   PUT /api/cart/items/:itemId
// @access  Private
export const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return sendError(res, 400, 'Quantity must be at least 1');
    }

    // First, get the cart item to validate stock
    const cart = await Cart.findOne({
      user: req.user._id,
      'items._id': itemId
    }).select('items');

    if (!cart) {
      return sendError(res, 404, 'Cart or item not found');
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return sendError(res, 404, 'Item not found in cart');
    }

    // Check cache first for validation
    let validationData = getCachedValidation(item.product, item.size, item.color);

    if (!validationData) {
      // Check stock availability
      const product = await Product.findById(item.product)
        .select('stock price discountPrice isActive')
        .lean();

      if (!product || !product.isActive) {
        return sendError(res, 404, 'Product not found or inactive');
      }

      if (item.size && item.color) {
        const stockItem = product.stock.find(
          s => s.size === item.size && s.color === item.color
        );

        if (!stockItem || stockItem.quantity < quantity) {
          return sendError(res, 400, 'Insufficient stock');
        }
      }

      validationData = {
        price: product.discountPrice || product.price,
        isActive: product.isActive
      };

      // Cache the validation result
      setCachedValidation(item.product, item.size, item.color, validationData);
    }

    // Use findOneAndUpdate with atomic operations for optimized update
    const updatedCart = await Cart.findOneAndUpdate(
      {
        user: req.user._id,
        'items._id': itemId
      },
      {
        $set: {
          'items.$.quantity': quantity,
          'items.$.price': validationData.price
        }
      },
      {
        new: true,
        runValidators: true
      }
    ).populate({
      path: 'items.product',
      select: 'name images price discountPrice'
    });

    if (!updatedCart) {
      return sendError(res, 404, 'Cart not found');
    }

    // Calculate totals
    let total = 0;
    let totalItems = 0;

    for (const cartItem of updatedCart.items) {
      total += cartItem.price * cartItem.quantity;
      totalItems += cartItem.quantity;
    }

    sendSuccess(res, 200, { cart: updatedCart, total, totalItems }, 'Cart item updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart with atomic operations
// @route   DELETE /api/cart/items/:itemId
// @access  Private
export const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    // Use findOneAndUpdate with $pull for atomic removal
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      {
        $pull: { items: { _id: itemId } }
      },
      { new: true }
    ).populate({
      path: 'items.product',
      select: 'name images price discountPrice'
    });

    if (!cart) {
      return sendError(res, 404, 'Cart not found');
    }

    // Calculate totals
    let total = 0;
    let totalItems = 0;

    if (cart.items && cart.items.length > 0) {
      for (const item of cart.items) {
        total += item.price * item.quantity;
        totalItems += item.quantity;
      }
    }

    sendSuccess(res, 200, { cart, total, totalItems }, 'Item removed from cart successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart with atomic operations
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res, next) => {
  try {
    // Use findOneAndUpdate with $set for atomic clear
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [] } },
      { new: true }
    );

    if (!cart) {
      return sendError(res, 404, 'Cart not found');
    }

    sendSuccess(res, 200, { cart, total: 0, totalItems: 0 }, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk update cart items
// @route   PUT /api/cart/items/bulk
// @access  Private
export const bulkUpdateCartItems = async (req, res, next) => {
  try {
    const { updates } = req.body; // Array of { itemId, quantity }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return sendError(res, 400, 'Updates array is required');
    }

    // Get the cart first
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return sendError(res, 404, 'Cart not found');
    }

    // Validate all items and quantities
    const bulkOperations = [];

    for (const update of updates) {
      const { itemId, quantity } = update;

      if (!quantity || quantity < 1) {
        return sendError(res, 400, `Invalid quantity for item ${itemId}`);
      }

      const item = cart.items.id(itemId);

      if (!item) {
        return sendError(res, 404, `Item ${itemId} not found in cart`);
      }

      // Check cache for validation
      let validationData = getCachedValidation(item.product, item.size, item.color);

      if (!validationData) {
        // Validate stock
        const product = await Product.findById(item.product)
          .select('stock price discountPrice isActive')
          .lean();

        if (!product || !product.isActive) {
          return sendError(res, 404, `Product for item ${itemId} not found or inactive`);
        }

        if (item.size && item.color) {
          const stockItem = product.stock.find(
            s => s.size === item.size && s.color === item.color
          );

          if (!stockItem || stockItem.quantity < quantity) {
            return sendError(res, 400, `Insufficient stock for item ${itemId}`);
          }
        }

        validationData = {
          price: product.discountPrice || product.price,
          isActive: product.isActive
        };

        // Cache the validation result
        setCachedValidation(item.product, item.size, item.color, validationData);
      }

      // Update the item in the cart
      item.quantity = quantity;
      item.price = validationData.price;
    }

    // Save the cart
    await cart.save();

    // Populate and return
    await cart.populate({
      path: 'items.product',
      select: 'name images price discountPrice'
    });

    // Calculate totals
    let total = 0;
    let totalItems = 0;

    for (const item of cart.items) {
      total += item.price * item.quantity;
      totalItems += item.quantity;
    }

    sendSuccess(res, 200, { cart, total, totalItems }, 'Cart items updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Validate cart items (check stock availability and price updates)
// @route   POST /api/cart/validate
// @access  Private
export const validateCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name price discountPrice isActive stock'
      });

    if (!cart || cart.items.length === 0) {
      return sendSuccess(res, 200, { valid: true, issues: [] }, 'Cart is valid');
    }

    const issues = [];
    let hasChanges = false;

    for (const item of cart.items) {
      const product = item.product;

      // Check if product is still active
      if (!product || !product.isActive) {
        issues.push({
          itemId: item._id,
          type: 'unavailable',
          message: `Product ${product ? product.name : 'unknown'} is no longer available`
        });
        continue;
      }

      // Check price changes
      const currentPrice = product.discountPrice || product.price;
      if (item.price !== currentPrice) {
        issues.push({
          itemId: item._id,
          type: 'price_change',
          message: `Price for ${product.name} has changed from ${item.price} to ${currentPrice}`,
          oldPrice: item.price,
          newPrice: currentPrice
        });
        item.price = currentPrice;
        hasChanges = true;
      }

      // Check stock availability
      if (item.size && item.color) {
        const stockItem = product.stock.find(
          s => s.size === item.size && s.color === item.color
        );

        if (!stockItem) {
          issues.push({
            itemId: item._id,
            type: 'out_of_stock',
            message: `${product.name} (${item.size}/${item.color}) is out of stock`
          });
        } else if (stockItem.quantity < item.quantity) {
          issues.push({
            itemId: item._id,
            type: 'insufficient_stock',
            message: `Only ${stockItem.quantity} units of ${product.name} (${item.size}/${item.color}) available`,
            available: stockItem.quantity,
            requested: item.quantity
          });
        }
      }
    }

    // Save cart if there were price changes
    if (hasChanges) {
      await cart.save();
    }

    const valid = issues.length === 0;

    sendSuccess(res, 200, { valid, issues, hasChanges }, 'Cart validation completed');
  } catch (error) {
    next(error);
  }
};
