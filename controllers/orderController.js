import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// @desc    Create new order from cart with transaction
// @route   POST /api/orders
// @access  Private/User
export const createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { shippingAddressId, paymentMethod } = req.body;

    // Get user's cart with populated products using lean for better performance
    const cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name images price discountPrice isActive stock'
      })
      .session(session);

    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return sendError(res, 400, 'Cart is empty');
    }

    // Get shipping address
    const user = await User.findById(req.user._id)
      .select('firstName lastName phone addresses')
      .session(session);

    const shippingAddress = user.addresses.id(shippingAddressId);

    if (!shippingAddress) {
      await session.abortTransaction();
      return sendError(res, 404, 'Shipping address not found');
    }

    // Bulk stock validation - collect all stock validations first
    const stockValidations = [];
    const productStockMap = new Map();

    for (const cartItem of cart.items) {
      const product = cartItem.product;

      if (!product.isActive) {
        await session.abortTransaction();
        return sendError(res, 400, `Product ${product.name} is no longer available`);
      }

      // Check stock if size and color specified
      if (cartItem.size && cartItem.color) {
        const stockItem = product.stock.find(
          s => s.size === cartItem.size && s.color === cartItem.color
        );

        if (!stockItem || stockItem.quantity < cartItem.quantity) {
          await session.abortTransaction();
          return sendError(res, 400, `Insufficient stock for ${product.name} (${cartItem.size}/${cartItem.color})`);
        }

        // Store stock updates for batch processing
        const key = `${product._id}-${cartItem.size}-${cartItem.color}`;
        productStockMap.set(key, {
          productId: product._id,
          size: cartItem.size,
          color: cartItem.color,
          quantity: cartItem.quantity
        });
      }

      stockValidations.push({ product, cartItem });
    }

    // Prepare order items
    const orderItems = [];
    let itemsTotal = 0;

    for (const { product, cartItem } of stockValidations) {
      const effectivePrice = product.discountPrice || product.price;
      const itemPrice = effectivePrice * cartItem.quantity;
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
    const order = await Order.create([{
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
    }], { session });

    // Batch update product stock using bulkWrite for efficiency
    const bulkStockOperations = [];

    for (const [key, stockInfo] of productStockMap.entries()) {
      bulkStockOperations.push({
        updateOne: {
          filter: {
            _id: stockInfo.productId,
            'stock.size': stockInfo.size,
            'stock.color': stockInfo.color
          },
          update: {
            $inc: { 'stock.$.quantity': -stockInfo.quantity }
          }
        }
      });
    }

    if (bulkStockOperations.length > 0) {
      await Product.bulkWrite(bulkStockOperations, { session });
    }

    // Clear cart efficiently
    await Cart.updateOne(
      { user: req.user._id },
      { $set: { items: [] } },
      { session }
    );

    await session.commitTransaction();

    sendSuccess(res, 201, order[0], 'Order created successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get user's orders with lean queries
// @route   GET /api/orders
// @access  Private/User
export const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Use lean() for better performance when we don't need Mongoose documents
    const orders = await Order.find({ user: req.user._id })
      .select('orderNumber items totalAmount orderStatus paymentStatus createdAt deliveredAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Order.countDocuments({ user: req.user._id });

    sendSuccess(res, 200, {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images');

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

// @desc    Cancel order with stock restoration
// @route   PUT /api/orders/:id/cancel
// @access  Private/User
export const cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { reason } = req.body;

    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return sendError(res, 403, 'Not authorized to cancel this order');
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      await session.abortTransaction();
      return sendError(res, 400, `Order cannot be cancelled as it is ${order.orderStatus}`);
    }

    order.cancellationReason = reason;
    order.updateStatus('cancelled', reason);

    await order.save({ session });

    // Batch restore stock using bulkWrite
    const bulkStockOperations = [];

    for (const item of order.items) {
      if (item.size && item.color) {
        bulkStockOperations.push({
          updateOne: {
            filter: {
              _id: item.product,
              'stock.size': item.size,
              'stock.color': item.color
            },
            update: {
              $inc: { 'stock.$.quantity': item.quantity }
            }
          }
        });
      }
    }

    if (bulkStockOperations.length > 0) {
      await Product.bulkWrite(bulkStockOperations, { session });
    }

    await session.commitTransaction();

    sendSuccess(res, 200, order, 'Order cancelled successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get all orders (Admin) with lean queries
// @route   GET /api/orders/admin/orders
// @access  Private/Admin
export const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status) {
      filter.orderStatus = req.query.status;
    }
    if (req.query.paymentStatus) {
      filter.paymentStatus = req.query.paymentStatus;
    }

    // Use lean() for better performance and indexed queries
    const orders = await Order.find(filter)
      .populate('user', 'firstName lastName email')
      .select('orderNumber user totalAmount orderStatus paymentStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Order.countDocuments(filter);

    sendSuccess(res, 200, {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status (Admin) - optimized with indexed query
// @route   PUT /api/orders/admin/orders/:id/status
// @access  Private/Admin
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, 'Invalid status');
    }

    // Use findById which uses the _id index
    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, 'Order not found');
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

// @desc    Batch update order statuses (Admin)
// @route   PUT /api/orders/admin/orders/batch/status
// @access  Private/Admin
export const batchUpdateOrderStatus = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { orderIds, status, note } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      await session.abortTransaction();
      return sendError(res, 400, 'Order IDs are required');
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid status');
    }

    // Fetch all orders in batch
    const orders = await Order.find({ _id: { $in: orderIds } }).session(session);

    if (orders.length === 0) {
      await session.abortTransaction();
      return sendError(res, 404, 'No orders found');
    }

    // Update all orders
    const bulkOperations = [];
    const statusHistoryEntry = {
      status,
      updatedAt: new Date(),
      note
    };

    for (const order of orders) {
      const updateObj = {
        orderStatus: status,
        $push: { statusHistory: statusHistoryEntry }
      };

      // Handle delivered status
      if (status === 'delivered') {
        updateObj.deliveredAt = new Date();
        if (order.paymentMethod === 'COD') {
          updateObj.paymentStatus = 'completed';
          updateObj['paymentDetails.paidAt'] = new Date();
        }
      } else if (status === 'cancelled') {
        updateObj.cancelledAt = new Date();
      }

      bulkOperations.push({
        updateOne: {
          filter: { _id: order._id },
          update: updateObj
        }
      });
    }

    const result = await Order.bulkWrite(bulkOperations, { session });

    await session.commitTransaction();

    sendSuccess(res, 200, {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount
    }, `${result.modifiedCount} orders updated successfully`);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get dashboard analytics (Admin) - optimized with lean and aggregation
// @route   GET /api/orders/admin/analytics/dashboard
// @access  Private/Admin
export const getDashboardAnalytics = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Use Promise.all to run multiple queries in parallel
    const [
      totalOrders,
      ordersToday,
      pendingOrders,
      revenueData,
      monthRevenueData,
      recentOrders,
      ordersByStatus
    ] = await Promise.all([
      // Total orders
      Order.countDocuments(),

      // Orders today - uses createdAt index
      Order.countDocuments({
        createdAt: { $gte: today }
      }),

      // Pending orders - uses status index
      Order.countDocuments({
        orderStatus: { $in: ['pending', 'confirmed', 'processing'] }
      }),

      // Total revenue - aggregation pipeline
      Order.aggregate([
        { $match: { paymentStatus: 'completed' } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),

      // Revenue this month - aggregation pipeline with date filter
      Order.aggregate([
        {
          $match: {
            paymentStatus: 'completed',
            createdAt: { $gte: firstDayOfMonth }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),

      // Recent orders with lean()
      Order.find()
        .populate('user', 'firstName lastName')
        .select('orderNumber orderStatus totalAmount createdAt')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),

      // Sales by status - aggregation pipeline
      Order.aggregate([
        { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
      ])
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    const monthRevenue = monthRevenueData.length > 0 ? monthRevenueData[0].total : 0;

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

// @desc    Get order analytics by date range (Admin)
// @route   GET /api/orders/admin/analytics/range
// @access  Private/Admin
export const getOrderAnalyticsByRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendError(res, 400, 'Start date and end date are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Use aggregation pipeline for efficient analytics
    const analytics = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $facet: {
          orderStats: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                avgOrderValue: { $avg: '$totalAmount' }
              }
            }
          ],
          statusBreakdown: [
            {
              $group: {
                _id: '$orderStatus',
                count: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
              }
            }
          ],
          dailyOrders: [
            {
              $group: {
                _id: {
                  $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                },
                orders: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
              }
            },
            { $sort: { _id: 1 } }
          ],
          paymentMethodStats: [
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
              }
            }
          ]
        }
      }
    ]);

    sendSuccess(res, 200, analytics[0], 'Order analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};
