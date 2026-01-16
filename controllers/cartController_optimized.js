import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// @desc    Get user's cart (OPTIMIZED)
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images price discountPrice isActive stock',
        options: { lean: true }
      })
      .lean()
      .exec();

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
      cart = cart.toObject();
    }

    // Calculate totals in JavaScript (more efficient than Mongoose methods)
    const total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);

    sendSuccess(res, 200, { cart, total, totalItems }, 'Cart fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart (OPTIMIZED)
// @route   POST /api/cart/items
// @access  Private
export const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity, size, color } = req.body;

    // Validate product exists (optimized with lean and select)
    const product = await Product.findById(productId)
      .select('price discountPrice isActive stock')
      .lean()
      .exec();

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

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item =>
        item.product.toString() === productId &&
        item.size === size &&
        item.color === color
    );

    const price = product.discountPrice || product.price;

    if (existingItemIndex > -1) {
      // Update quantity if item exists
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].price = price;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        size,
        color,
        price
      });
    }

    await cart.save();

    // Populate after save for response
    await cart.populate({
      path: 'items.product',
      select: 'name images price discountPrice',
      options: { lean: true }
    });

    const cartObj = cart.toObject();
    const total = cartObj.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartObj.items.reduce((sum, item) => sum + item.quantity, 0);

    sendSuccess(res, 200, { cart: cartObj, total, totalItems }, 'Item added to cart successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity (OPTIMIZED)
// @route   PUT /api/cart/items/:itemId
// @access  Private
export const updateCartItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return sendError(res, 400, 'Quantity must be at least 1');
    }

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return sendError(res, 404, 'Cart not found');
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return sendError(res, 404, 'Item not found in cart');
    }

    // Check stock availability (optimized)
    const product = await Product.findById(item.product)
      .select('stock')
      .lean()
      .exec();

    if (item.size && item.color) {
      const stockItem = product.stock.find(
        s => s.size === item.size && s.color === item.color
      );
      if (!stockItem || stockItem.quantity < quantity) {
        return sendError(res, 400, 'Insufficient stock');
      }
    }

    item.quantity = quantity;

    await cart.save();
    await cart.populate({
      path: 'items.product',
      select: 'name images price discountPrice',
      options: { lean: true }
    });

    const cartObj = cart.toObject();
    const total = cartObj.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartObj.items.reduce((sum, item) => sum + item.quantity, 0);

    sendSuccess(res, 200, { cart: cartObj, total, totalItems }, 'Cart item updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
export const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return sendError(res, 404, 'Cart not found');
    }

    cart.items = cart.items.filter(item => item._id.toString() !== itemId);

    await cart.save();
    await cart.populate({
      path: 'items.product',
      select: 'name images price discountPrice',
      options: { lean: true }
    });

    const cartObj = cart.toObject();
    const total = cartObj.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cartObj.items.reduce((sum, item) => sum + item.quantity, 0);

    sendSuccess(res, 200, { cart: cartObj, total, totalItems }, 'Item removed from cart successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
export const clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return sendError(res, 404, 'Cart not found');
    }

    cart.items = [];
    await cart.save();

    sendSuccess(res, 200, { cart, total: 0, totalItems: 0 }, 'Cart cleared successfully');
  } catch (error) {
    next(error);
  }
};
