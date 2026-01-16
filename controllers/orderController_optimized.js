import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { executePaginatedOperation } from '../utils/paginationHelper.js';
import { executeBatchQueries } from '../utils/queryOptimization.js';

// @desc    Create new order from cart
// @route   POST /api/orders
// @access  Private/User
export const createOrder = async (req, res, next) => {
  try {
    const { shippingAddressId, paymentMethod } = req.body;

    // Get user's cart with optimized population
    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images price discountPrice isActive stock',
        options: { lean: true }
      })
      .lean()
      .exec();

    if (!cart || cart.items.length === 0) {
      return sendError(res, 400, 'Cart is empty');
    }

    // Get shipping address (optimized)
    const user = await User.findById(req.user._id)
      .select('firstName lastName phone addresses')
      .lean()
      .exec();

    const shippingAddress = user.addresses.find(addr => addr._id.toString() === shippingAddressId);

    if (!shippingAddress) {
      return sendError(res, 404, 'Shipping address not found');
    }

    // Prepare order items and validate stock
    const orderItems = [];
    let itemsTotal = 0;

    for (const cartItem of cart.items) {
      const product = cartItem.product;

      if (!product.isActive) {
        return sendError(res, 400, `Product ${product.name} is no longer available`);
      }

      // Check stock if size and color specified
      if (cartItem.size && cartItem.color) {
        const stockItem = product.stock.find(
          s => s.size === cartItem.size && s.color === cartItem.color
        );
        if (!stockItem || stockItem.quantity < cartItem.quantity) {
          return sendError(res, 400, `Insufficient stock for ${product.name}`);
        }
      }

      const itemPrice = cartItem.price * cartItem.quantity;
      itemsTotal += itemPrice;

      orderItems.push({
        product: product._id,
        name: product.name,
        image: product.images[0] || '',
        quantity: cartItem.quantity,
        size: cartItem.size,
        color: cartItem.color,
        price: product.price,
        discountPrice: product.discountPrice
      });
    }

    // Calculate totals
    const shippingCharge = itemsTotal > 500 ? 0 : 50;
    const tax = Math.round(itemsTotal * 0.18); // 18% GST
    const totalAmount = itemsTotal + shippingCharge + tax;

    // Create order
    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        firstName: user.firstName,
        lastName: user.lastName,
        addressLine1: shippingAddress.addressLine1,
        addressLine2: shippingAddress.addressLine2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        pincode: shippingAddress.pincode,
        country: shippingAddress.country,
        phone: user.phone
      },
      paymentMethod,
      itemsTotal,
      shippingCharge,
      tax,
      totalAmount
    });

    // Update product stock (batch operation for better performance)
    const stockUpdates = cart.items
      .filter(item => item.size && item.color)
      .map(async (cartItem) => {
        return Product.findOneAndUpdate(
          {
            _id: cartItem.product._id,
            'stock.size': cartItem.size,
            'stock.color': cartItem.color
          },
          {
            $inc: { 'stock.$.quantity': -cartItem.quantity }
          }
        ).exec();
      });

    await Promise.all(stockUpdates);

    // Clear cart
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [] } }
    ).exec();

    sendSuccess(res, 201, order, 'Order created successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's orders (OPTIMIZED)
// @route   GET /api/orders
// @access  Private/User
export const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const filter = { user: req.user._id };

    // Create optimized data query
    const dataQuery = Order.find(filter)
      .select('orderNumber items orderStatus paymentStatus totalAmount createdAt')
      .sort({ createdAt: -1 });

    // Create count query
    const countQuery = Order.find(filter);

    // Execute both in parallel with lean
    const result = await executePaginatedOperation(dataQuery, countQuery, page, limit, true);

    sendSuccess(res, 200, {
      orders: result.data,
      pagination: result.pagination
    }, 'Orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID (OPTIMIZED)
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate({
        path: 'user',
        select: 'firstName lastName email phone',
        options: { lean: true }
      })
      .populate({
        path: 'items.product',
        select: 'name images',
        options: { lean: true }
      })
      .lean()
      .exec();

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Check if user owns the order or is admin
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role === 'user'
    ) {
      return sendError(res, 403, 'Not authorized to view this order');
    }

    sendSuccess(res, 200, order, 'Order fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel order
// @route   PUT /api/orders/:id/cancel
// @access  Private/User
export const cancelOrder = async (req, res, next) => {
  try {
    const { reason } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized to cancel this order');
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      return sendError(res, 400, `Order cannot be cancelled as it is ${order.orderStatus}`);
    }

    order.cancellationReason = reason;
    order.updateStatus('cancelled', reason);

    await order.save();

    // Restore stock (batch operation)
    const stockRestores = order.items
      .filter(item => item.size && item.color)
      .map(async (item) => {
        return Product.findOneAndUpdate(
          {
            _id: item.product,
            'stock.size': item.size,
            'stock.color': item.color
          },
          {
            $inc: { 'stock.$.quantity': item.quantity }
          }
        ).exec();
      });

    await Promise.all(stockRestores);

    sendSuccess(res, 200, order, 'Order cancelled successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin) (OPTIMIZED)
// @route   GET /api/orders/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    // Build filter
    const filter = {};
    if (req.query.status) {
      filter.orderStatus = req.query.status;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // Create optimized data query
    const dataQuery = Order.find(filter)
      .populate({
        path: 'user',
        select: 'firstName lastName email',
        options: { lean: true }
      })
      .select('orderNumber user orderStatus paymentStatus totalAmount createdAt')
      .sort({ createdAt: -1 });

    // Create count query
    const countQuery = Order.find(filter);

    // Execute both in parallel with lean
    const result = await executePaginatedOperation(dataQuery, countQuery, page, limit, true);

    sendSuccess(res, 200, {
      orders: result.data,
      pagination: result.pagination
    }, 'Orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin)
// @route   PUT /api/orders/admin/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, 'Invalid status');
    }

    order.updateStatus(status, note);

    // Update payment status based on order status
    if (status === 'delivered' && order.paymentMethod === 'COD') {
      order.paymentStatus = 'completed';
      order.paymentDetails.paidAt = new Date();
    }

    await order.save();

    sendSuccess(res, 200, order, 'Order status updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard analytics (Admin) (OPTIMIZED with aggregation)
// @route   GET /api/orders/admin/analytics/dashboard
// @access  Private/Admin
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Execute all analytics queries in parallel
    const [totalOrders, ordersToday, pendingOrders, revenueStats, recentOrders, ordersByStatus] = await executeBatchQueries([
      // Total orders
      Order.countDocuments().exec(),

      // Orders today
      Order.countDocuments({ createdAt: { $gte: today } }).exec(),

      // Pending orders
      Order.countDocuments({
        orderStatus: { $in: ['pending', 'confirmed', 'processing'] }
      }).exec(),

      // Revenue stats using aggregation
      Order.aggregate([
        {
          $facet: {
            total: [
              { $match: { paymentStatus: 'completed' } },
              { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
            ],
            monthly: [
              {
                $match: {
                  paymentStatus: 'completed',
                  createdAt: { $gte: firstDayOfMonth }
                }
              },
              { $group: { _id: null, revenue: { $sum: '$totalAmount' } } }
            ]
          }
        }
      ]).exec(),

      // Recent orders
      Order.find()
        .populate({
          path: 'user',
          select: 'firstName lastName',
          options: { lean: true }
        })
        .select('orderNumber user orderStatus totalAmount createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
        .exec(),

      // Orders by status
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ]).exec()
    ]);

    const totalRevenue = revenueStats[0]?.total[0]?.revenue || 0;
    const monthRevenue = revenueStats[0]?.monthly[0]?.revenue || 0;

    sendSuccess(res, 200, {
      totalOrders,
      ordersToday,
      pendingOrders,
      totalRevenue,
      monthRevenue,
      recentOrders,
      ordersByStatus
    }, 'Dashboard analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};
