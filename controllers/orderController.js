import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Shipping from '../models/Shipping.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  sendOrderConfirmationEmail,
  sendOrderStatusEmail,
  sendOrderCancellationEmail,
  sendOrderShippedEmail,
  sendOrderModificationEmail
} from '../utils/emailService.js';
import orderNotificationService from '../services/orderNotifications.js';
import {
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderStatusChanged,
  emitPaymentStatusUpdated,
  emitOrderCancelled,
  emitNewOrderAlert,
  emitOrderCountUpdate
} from '../websocket/orderSocket.js';
import OrderQueryBuilder from '../services/orderQueryBuilder.js';
import { Parser } from 'json2csv';
import ExcelJS from 'exceljs';

// Helper function to generate tracking number
const generateTrackingNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `SHIP-${year}${month}${day}-${random}`;
};

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

    // Emit WebSocket events for real-time updates
    try {
      emitOrderCreated(order[0], req.user._id);
      emitNewOrderAlert(order[0]);
    } catch (socketError) {
      console.error('Failed to emit order created event:', socketError);
      // Don't fail the request if WebSocket fails
    }

    // Send multi-channel notifications (non-blocking)
    try {
      await orderNotificationService.notifyOrderPlaced(order[0], req.user);
      await orderNotificationService.notifyAdminNewOrder(order[0]);
    } catch (notificationError) {
      console.error('Failed to send order notifications:', notificationError);
      // Don't fail the request if notifications fail
    }

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

    // Emit WebSocket event for order cancellation
    try {
      emitOrderCancelled(order, req.user._id, reason);
    } catch (socketError) {
      console.error('Failed to emit order cancelled event:', socketError);
      // Don't fail the request if WebSocket fails
    }

    // Send order cancellation email (non-blocking)
    try {
      await sendOrderCancellationEmail(req.user.email, {
        orderNumber: order.orderNumber,
        reason: reason,
        refundAmount: order.paymentStatus === 'completed' ? order.totalAmount : null
      });
    } catch (emailError) {
      console.error('Failed to send order cancellation email:', emailError);
      // Don't fail the request if email fails
    }

    sendSuccess(res, 200, order, 'Order cancelled successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Modify order (items, address, phone) before processing
// @route   PUT /api/orders/:id/modify
// @access  Private/User
export const modifyOrder = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { shippingAddress, items, itemsToAdd, itemsToRemove, quantityChanges, note } = req.body;

    // Fetch the order
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name images price discountPrice stock isActive')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      await session.abortTransaction();
      return sendError(res, 403, 'Not authorized to modify this order');
    }

    // Check if order can be modified
    const canModify = order.canBeModified();
    if (!canModify.allowed) {
      await session.abortTransaction();
      return sendError(res, 400, canModify.reason);
    }

    const previousTotal = order.totalAmount;
    const changes = {};
    let modificationType = [];
    let requiresApproval = false;

    // Track stock changes
    const stockOperations = [];

    // 1. Handle shipping address changes
    if (shippingAddress && Object.keys(shippingAddress).length > 0) {
      changes.oldAddress = { ...order.shippingAddress.toObject() };
      Object.assign(order.shippingAddress, shippingAddress);
      changes.newAddress = { ...order.shippingAddress.toObject() };
      modificationType.push('address_change');
    }

    // 2. Handle quantity changes
    if (quantityChanges && Object.keys(quantityChanges).length > 0) {
      changes.quantityChanges = {};
      for (const [itemId, newQuantity] of Object.entries(quantityChanges)) {
        const item = order.items.id(itemId);
        if (item) {
          const oldQuantity = item.quantity;
          const quantityDiff = newQuantity - oldQuantity;

          // Check stock availability for increase
          if (quantityDiff > 0 && item.size && item.color) {
            const product = await Product.findById(item.product).session(session);
            const stockItem = product.stock.find(
              s => s.size === item.size && s.color === item.color
            );
            if (!stockItem || stockItem.quantity < quantityDiff) {
              await session.abortTransaction();
              return sendError(res, 400, `Insufficient stock for ${item.name}`);
            }
          }

          changes.quantityChanges[itemId] = { old: oldQuantity, new: newQuantity };
          item.quantity = newQuantity;

          // Track stock change
          if (item.size && item.color) {
            stockOperations.push({
              updateOne: {
                filter: {
                  _id: item.product,
                  'stock.size': item.size,
                  'stock.color': item.color
                },
                update: {
                  $inc: { 'stock.$.quantity': -quantityDiff }
                }
              }
            });
          }

          modificationType.push('quantity_change');
        }
      }
    }

    // 3. Handle items removal
    if (itemsToRemove && itemsToRemove.length > 0) {
      changes.removedItems = [];
      for (const itemId of itemsToRemove) {
        const item = order.items.id(itemId);
        if (item) {
          changes.removedItems.push({
            name: item.name,
            quantity: item.quantity,
            price: item.price
          });

          // Restore stock
          if (item.size && item.color) {
            stockOperations.push({
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

          order.items.pull(itemId);
        }
      }
      modificationType.push('items_removed');
      requiresApproval = true; // Removing items requires approval
    }

    // 4. Handle items addition
    if (itemsToAdd && itemsToAdd.length > 0) {
      changes.addedItems = [];
      for (const newItem of itemsToAdd) {
        const product = await Product.findById(newItem.productId)
          .select('name images price discountPrice stock isActive')
          .session(session);

        if (!product || !product.isActive) {
          await session.abortTransaction();
          return sendError(res, 400, `Product ${newItem.productId} is not available`);
        }

        // Check stock
        if (newItem.size && newItem.color) {
          const stockItem = product.stock.find(
            s => s.size === newItem.size && s.color === newItem.color
          );
          if (!stockItem || stockItem.quantity < newItem.quantity) {
            await session.abortTransaction();
            return sendError(res, 400, `Insufficient stock for ${product.name}`);
          }

          // Reduce stock
          stockOperations.push({
            updateOne: {
              filter: {
                _id: product._id,
                'stock.size': newItem.size,
                'stock.color': newItem.color
              },
              update: {
                $inc: { 'stock.$.quantity': -newItem.quantity }
              }
            }
          });
        }

        const orderItem = {
          product: product._id,
          name: product.name,
          image: product.images[0] || '',
          quantity: newItem.quantity,
          size: newItem.size,
          color: newItem.color,
          price: product.price,
          discountPrice: product.discountPrice
        };

        order.items.push(orderItem);
        changes.addedItems.push({
          name: product.name,
          quantity: newItem.quantity,
          price: product.price
        });
      }
      modificationType.push('items_added');
    }

    // 5. Recalculate totals
    let newItemsTotal = 0;
    for (const item of order.items) {
      const effectivePrice = item.discountPrice || item.price;
      newItemsTotal += effectivePrice * item.quantity;
    }

    // Validate minimum order value
    if (newItemsTotal < order.minimumOrderValue) {
      await session.abortTransaction();
      return sendError(res, 400, `Order total must be at least ₹${order.minimumOrderValue}`);
    }

    order.itemsTotal = newItemsTotal;
    const newShippingCharge = newItemsTotal > 500 ? 0 : 50;
    const newTax = Math.round(newItemsTotal * 0.18);
    order.shippingCharge = newShippingCharge;
    order.tax = newTax;
    order.totalAmount = newItemsTotal + newShippingCharge + newTax;

    const newTotal = order.totalAmount;
    const amountDifference = newTotal - previousTotal;

    // Determine if requires approval (major changes)
    if (Math.abs(amountDifference) > 500 || itemsToRemove?.length > 0) {
      requiresApproval = true;
    }

    // Add modification history
    const modType = modificationType.length > 1 ? 'combined' : modificationType[0];
    order.addModification(
      req.user._id,
      modType,
      changes,
      previousTotal,
      newTotal,
      note,
      requiresApproval
    );

    // Apply stock operations
    if (stockOperations.length > 0) {
      await Product.bulkWrite(stockOperations, { session });
    }

    await order.save({ session });
    await session.commitTransaction();

    // Send modification email (non-blocking)
    try {
      await sendOrderModificationEmail(req.user.email, {
        orderNumber: order.orderNumber,
        changes,
        previousTotal,
        newTotal,
        amountDifference,
        requiresApproval
      });
    } catch (emailError) {
      console.error('Failed to send order modification email:', emailError);
    }

    // Notify admins if requires approval
    if (requiresApproval) {
      // TODO: Send admin notification
      console.log(`Order ${order.orderNumber} modification requires admin approval`);
    }

    sendSuccess(res, 200, order, `Order modified successfully. ${requiresApproval ? 'Awaiting admin approval.' : ''}`);
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
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { status, note, trackingNumber, carrier } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      await session.abortTransaction();
      return sendError(res, 400, 'Invalid status');
    }

    // Use findById which uses the _id index
    const order = await Order.findById(req.params.id)
      .populate('user', 'email firstName lastName')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    const previousStatus = order.orderStatus;
    order.updateStatus(status, note);

    // Update payment status based on order status
    if (status === 'delivered' && order.paymentMethod === 'COD') {
      order.paymentStatus = 'completed';
      order.paymentDetails.paidAt = new Date();
    }

    // Auto-create shipping entry when order status changes to 'processing'
    if (status === 'processing' && previousStatus !== 'processing') {
      // Check if shipping entry doesn't already exist
      const existingShipping = await Shipping.findOne({ order: order._id }).session(session);

      if (!existingShipping) {
        const generatedTrackingNumber = trackingNumber || generateTrackingNumber();

        // Prepare recipient info from order
        const recipientInfo = {
          name: order.shippingAddress.fullName || `${order.shippingAddress.firstName || ''} ${order.shippingAddress.lastName || ''}`.trim(),
          phone: order.shippingAddress.phone,
          address: {
            addressLine1: order.shippingAddress.addressLine1,
            addressLine2: order.shippingAddress.addressLine2 || '',
            city: order.shippingAddress.city,
            state: order.shippingAddress.state,
            zipCode: order.shippingAddress.zipCode || order.shippingAddress.pincode,
            country: order.shippingAddress.country || 'India'
          }
        };

        // Create shipping entry
        const shipping = await Shipping.create([{
          order: order._id,
          trackingNumber: generatedTrackingNumber,
          carrier: carrier || 'other',
          status: 'pending',
          estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
          currentLocation: 'Warehouse',
          shipmentDetails: {
            weight: 1,
            dimensions: { length: 10, width: 10, height: 10, unit: 'cm' },
            package_count: 1
          },
          recipientInfo,
          notes: note || ''
        }], { session });

        // Update order with shipping reference and tracking number
        order.shipping = shipping[0]._id;
        order.trackingNumber = generatedTrackingNumber;
      }
    }

    await order.save({ session });

    await session.commitTransaction();

    // Emit WebSocket events for status change
    try {
      emitOrderStatusChanged(order, order.user._id, previousStatus);

      // If payment status changed as well
      if (status === 'delivered' && order.paymentMethod === 'COD') {
        emitPaymentStatusUpdated(order, order.user._id);
      }
    } catch (socketError) {
      console.error('Failed to emit order status change event:', socketError);
      // Don't fail the request if WebSocket fails
    }

    // Send appropriate email notification (non-blocking)
    try {
      if (status === 'shipped') {
        await sendOrderShippedEmail(order.user.email, {
          orderNumber: order.orderNumber,
          trackingNumber: order.trackingNumber || trackingNumber || 'Not available',
          carrier: carrier || 'Standard Shipping',
          estimatedDelivery: '3-5 business days'
        });
      } else if (status === 'cancelled') {
        await sendOrderCancellationEmail(order.user.email, {
          orderNumber: order.orderNumber,
          reason: note || 'Cancelled by admin'
        });
      } else {
        await sendOrderStatusEmail(order.user.email, {
          orderNumber: order.orderNumber,
          status: status,
          note: note,
          trackingNumber: order.trackingNumber || trackingNumber
        });
      }
    } catch (emailError) {
      console.error('Failed to send status update email:', emailError);
      // Don't fail the request if email fails
    }

    sendSuccess(res, 200, order, 'Order status updated successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
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

    // Emit WebSocket events for batch update (emit to admins)
    try {
      // Emit order count update to admin room
      const counts = await Promise.all([
        Order.countDocuments(),
        Order.countDocuments({ orderStatus: 'pending' }),
        Order.countDocuments({ orderStatus: 'processing' }),
        Order.countDocuments({ orderStatus: 'shipped' }),
        Order.countDocuments({ orderStatus: 'delivered' }),
        Order.countDocuments({ orderStatus: 'cancelled' })
      ]);

      emitOrderCountUpdate({
        total: counts[0],
        pending: counts[1],
        processing: counts[2],
        shipped: counts[3],
        delivered: counts[4],
        cancelled: counts[5]
      });
    } catch (socketError) {
      console.error('Failed to emit batch order update event:', socketError);
      // Don't fail the request if WebSocket fails
    }

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

// @desc    Advanced order search with complex filters (User)
// @route   GET /api/orders/search
// @access  Private/User
export const searchMyOrders = async (req, res, next) => {
  try {
    const {
      status,
      paymentStatus,
      datePreset,
      startDate,
      endDate,
      minPrice,
      maxPrice,
      search,
      orderId,
      productName,
      trackingNumber,
      sortBy = 'date_desc',
      page = 1,
      limit = 10
    } = req.query;

    // Create query builder instance
    const queryBuilder = new OrderQueryBuilder();

    // Filter by current user
    queryBuilder.filterByUser(req.user._id);

    // Apply filters
    if (status) {
      queryBuilder.filterByStatus(status.split(','));
    }

    if (paymentStatus) {
      queryBuilder.filterByPaymentStatus(paymentStatus.split(','));
    }

    // Date filtering
    if (datePreset) {
      queryBuilder.filterByDatePreset(datePreset);
    } else if (startDate || endDate) {
      queryBuilder.filterByDateRange(startDate, endDate);
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      queryBuilder.filterByPriceRange(minPrice, maxPrice);
    }

    // Search functionality
    if (search) {
      await queryBuilder.globalSearch(search);
    } else {
      if (orderId) {
        queryBuilder.searchByOrderId(orderId);
      }
      if (productName) {
        queryBuilder.searchByProductName(productName);
      }
      if (trackingNumber) {
        queryBuilder.searchByTrackingNumber(trackingNumber);
      }
    }

    // Sorting and pagination
    queryBuilder
      .sortBy(sortBy)
      .paginate(page, limit)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images');

    // Execute query
    const result = await queryBuilder.execute();

    sendSuccess(res, 200, result, 'Orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Advanced order search with complex filters (Admin)
// @route   GET /api/orders/admin/search
// @access  Private/Admin
export const advancedOrderSearch = async (req, res, next) => {
  try {
    const {
      status,
      paymentStatus,
      paymentMethod,
      shippingStatus,
      datePreset,
      startDate,
      endDate,
      minPrice,
      maxPrice,
      search,
      orderId,
      productName,
      trackingNumber,
      customerSearch,
      sortBy = 'date_desc',
      page = 1,
      limit = 20
    } = req.query;

    // Create query builder instance
    const queryBuilder = new OrderQueryBuilder();

    // Apply filters
    if (status) {
      const statusArray = Array.isArray(status) ? status : status.split(',');
      queryBuilder.filterByStatus(statusArray);
    }

    if (paymentStatus) {
      const paymentStatusArray = Array.isArray(paymentStatus) ? paymentStatus : paymentStatus.split(',');
      queryBuilder.filterByPaymentStatus(paymentStatusArray);
    }

    if (paymentMethod) {
      const paymentMethodArray = Array.isArray(paymentMethod) ? paymentMethod : paymentMethod.split(',');
      queryBuilder.filterByPaymentMethod(paymentMethodArray);
    }

    if (shippingStatus) {
      const shippingStatusArray = Array.isArray(shippingStatus) ? shippingStatus : shippingStatus.split(',');
      queryBuilder.filterByShippingStatus(shippingStatusArray);
    }

    // Date filtering
    if (datePreset) {
      queryBuilder.filterByDatePreset(datePreset);
    } else if (startDate || endDate) {
      queryBuilder.filterByDateRange(startDate, endDate);
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      queryBuilder.filterByPriceRange(minPrice, maxPrice);
    }

    // Search functionality
    if (search) {
      // Global search across all fields
      await queryBuilder.globalSearch(search);
    } else {
      // Specific field searches
      if (orderId) {
        queryBuilder.searchByOrderId(orderId);
      }
      if (productName) {
        queryBuilder.searchByProductName(productName);
      }
      if (trackingNumber) {
        queryBuilder.searchByTrackingNumber(trackingNumber);
      }
      if (customerSearch) {
        await queryBuilder.searchByCustomer(customerSearch);
      }
    }

    // Sorting and pagination
    queryBuilder
      .sortBy(sortBy)
      .paginate(page, limit)
      .populate('user', 'firstName lastName email phone')
      .populate('items.product', 'name images');

    // Execute query
    const result = await queryBuilder.execute();

    // Add filter summary to response
    const filterSummary = {
      activeFilters: {
        status: status || null,
        paymentStatus: paymentStatus || null,
        paymentMethod: paymentMethod || null,
        shippingStatus: shippingStatus || null,
        dateRange: startDate && endDate ? { startDate, endDate } : datePreset || null,
        priceRange: minPrice || maxPrice ? { min: minPrice, max: maxPrice } : null,
        search: search || null
      }
    };

    sendSuccess(res, 200, { ...result, filterSummary }, 'Orders fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Export orders to CSV
// @route   GET /api/orders/admin/export/csv
// @access  Private/Admin
export const exportOrdersToCSV = async (req, res, next) => {
  try {
    const {
      status,
      paymentStatus,
      paymentMethod,
      startDate,
      endDate,
      minPrice,
      maxPrice
    } = req.query;

    // Create query builder without pagination
    const queryBuilder = new OrderQueryBuilder();

    // Apply same filters as search
    if (status) queryBuilder.filterByStatus(status.split(','));
    if (paymentStatus) queryBuilder.filterByPaymentStatus(paymentStatus.split(','));
    if (paymentMethod) queryBuilder.filterByPaymentMethod(paymentMethod.split(','));
    if (startDate || endDate) queryBuilder.filterByDateRange(startDate, endDate);
    if (minPrice || maxPrice) queryBuilder.filterByPriceRange(minPrice, maxPrice);

    queryBuilder
      .sortBy('date_desc')
      .paginate(1, 10000) // Limit to 10,000 records for export
      .populate('user', 'firstName lastName email phone');

    const result = await queryBuilder.execute();

    // Prepare data for CSV
    const csvData = result.orders.map(order => ({
      'Order ID': order.orderNumber || order._id,
      'Customer Name': order.user ? `${order.user.firstName} ${order.user.lastName}` : order.shippingAddress?.fullName || 'N/A',
      'Customer Email': order.user?.email || 'N/A',
      'Customer Phone': order.user?.phone || order.shippingAddress?.phone || 'N/A',
      'Order Date': new Date(order.createdAt).toLocaleDateString(),
      'Order Status': order.orderStatus,
      'Payment Status': order.paymentStatus,
      'Payment Method': order.paymentMethod,
      'Shipping Status': order.shippingStatus,
      'Tracking Number': order.trackingNumber || 'N/A',
      'Items Count': order.items?.length || 0,
      'Items Total': order.itemsTotal?.toFixed(2) || '0.00',
      'Shipping Charge': order.shippingCharge?.toFixed(2) || '0.00',
      'Tax': order.tax?.toFixed(2) || '0.00',
      'Total Amount': order.totalAmount?.toFixed(2) || '0.00',
      'Shipping Address': order.shippingAddress ?
        `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}` :
        'N/A'
    }));

    // Generate CSV
    const parser = new Parser();
    const csv = parser.parse(csvData);

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=orders-export-${Date.now()}.csv`);

    res.send(csv);
  } catch (error) {
    next(error);
  }
};

// @desc    Export orders to Excel
// @route   GET /api/orders/admin/export/excel
// @access  Private/Admin
export const exportOrdersToExcel = async (req, res, next) => {
  try {
    const {
      status,
      paymentStatus,
      paymentMethod,
      startDate,
      endDate,
      minPrice,
      maxPrice
    } = req.query;

    // Create query builder without pagination
    const queryBuilder = new OrderQueryBuilder();

    // Apply same filters as search
    if (status) queryBuilder.filterByStatus(status.split(','));
    if (paymentStatus) queryBuilder.filterByPaymentStatus(paymentStatus.split(','));
    if (paymentMethod) queryBuilder.filterByPaymentMethod(paymentMethod.split(','));
    if (startDate || endDate) queryBuilder.filterByDateRange(startDate, endDate);
    if (minPrice || maxPrice) queryBuilder.filterByPriceRange(minPrice, maxPrice);

    queryBuilder
      .sortBy('date_desc')
      .paginate(1, 10000) // Limit to 10,000 records for export
      .populate('user', 'firstName lastName email phone');

    const result = await queryBuilder.execute();

    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orders');

    // Define columns
    worksheet.columns = [
      { header: 'Order ID', key: 'orderId', width: 20 },
      { header: 'Customer Name', key: 'customerName', width: 25 },
      { header: 'Customer Email', key: 'customerEmail', width: 30 },
      { header: 'Customer Phone', key: 'customerPhone', width: 15 },
      { header: 'Order Date', key: 'orderDate', width: 15 },
      { header: 'Order Status', key: 'orderStatus', width: 15 },
      { header: 'Payment Status', key: 'paymentStatus', width: 15 },
      { header: 'Payment Method', key: 'paymentMethod', width: 15 },
      { header: 'Shipping Status', key: 'shippingStatus', width: 15 },
      { header: 'Tracking Number', key: 'trackingNumber', width: 20 },
      { header: 'Items Count', key: 'itemsCount', width: 12 },
      { header: 'Items Total', key: 'itemsTotal', width: 12 },
      { header: 'Shipping Charge', key: 'shippingCharge', width: 15 },
      { header: 'Tax', key: 'tax', width: 10 },
      { header: 'Total Amount', key: 'totalAmount', width: 15 },
      { header: 'Shipping Address', key: 'shippingAddress', width: 50 }
    ];

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    result.orders.forEach(order => {
      worksheet.addRow({
        orderId: order.orderNumber || order._id,
        customerName: order.user ? `${order.user.firstName} ${order.user.lastName}` : order.shippingAddress?.fullName || 'N/A',
        customerEmail: order.user?.email || 'N/A',
        customerPhone: order.user?.phone || order.shippingAddress?.phone || 'N/A',
        orderDate: new Date(order.createdAt).toLocaleDateString(),
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        shippingStatus: order.shippingStatus,
        trackingNumber: order.trackingNumber || 'N/A',
        itemsCount: order.items?.length || 0,
        itemsTotal: order.itemsTotal?.toFixed(2) || '0.00',
        shippingCharge: order.shippingCharge?.toFixed(2) || '0.00',
        tax: order.tax?.toFixed(2) || '0.00',
        totalAmount: order.totalAmount?.toFixed(2) || '0.00',
        shippingAddress: order.shippingAddress ?
          `${order.shippingAddress.addressLine1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}` :
          'N/A'
      });
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=orders-export-${Date.now()}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};
