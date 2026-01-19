import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  sendOrderCancellationEmail,
  sendCancellationRequestEmail,
  sendCancellationApprovedEmail,
  sendCancellationRejectedEmail,
  sendRefundInitiatedEmail
} from '../utils/emailService.js';

// @desc    Request order cancellation
// @route   POST /api/orders/:id/cancel
// @access  Private/User
export const requestCancellation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { reason, comments } = req.body;

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
    const canCancel = order.canBeCancelled();
    if (!canCancel.allowed) {
      await session.abortTransaction();
      return sendError(res, 400, canCancel.reason);
    }

    // Request cancellation
    const actor = {
      type: 'user',
      id: req.user._id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email
    };

    order.requestCancellation(reason, comments, actor);
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

    // Get user email
    const user = await User.findById(req.user._id).select('email firstName lastName');

    // Send cancellation request email (non-blocking)
    try {
      await sendCancellationRequestEmail(user.email, {
        orderNumber: order.orderNumber,
        customerName: `${user.firstName} ${user.lastName}`,
        reason: reason,
        comments: comments,
        refundAmount: order.paymentStatus === 'completed' ? order.totalAmount : null,
        refundTimeline: order.paymentStatus === 'completed' ? '5-7 business days after approval' : null
      });
    } catch (emailError) {
      console.error('Failed to send cancellation request email:', emailError);
      // Don't fail the request if email fails
    }

    sendSuccess(res, 200, {
      order,
      message: 'Cancellation request submitted successfully. You will receive a confirmation once approved.',
      cancellationDeadline: new Date(order.createdAt.getTime() + order.cancellationWindowHours * 60 * 60 * 1000)
    }, 'Order cancellation requested successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Request partial order cancellation
// @route   POST /api/orders/:id/cancel-items
// @access  Private/User
export const requestPartialCancellation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { items, reason, comments } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await session.abortTransaction();
      return sendError(res, 400, 'Items to cancel are required');
    }

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
    const canCancel = order.canBeCancelled();
    if (!canCancel.allowed) {
      await session.abortTransaction();
      return sendError(res, 400, canCancel.reason);
    }

    // Validate items
    for (const item of items) {
      const orderItem = order.items.find(i => i.product.toString() === item.productId);
      if (!orderItem) {
        await session.abortTransaction();
        return sendError(res, 400, `Product ${item.productId} not found in order`);
      }
      if (item.quantity > orderItem.quantity) {
        await session.abortTransaction();
        return sendError(res, 400, `Cannot cancel ${item.quantity} items of product ${item.productId}`);
      }
    }

    // Calculate refund amount
    const refundAmount = order.calculateRefundAmount(items);

    // Enable partial cancellation
    order.partialCancellation.enabled = true;
    order.partialCancellation.cancelledItems = items.map(item => ({
      product: item.productId,
      quantity: item.quantity,
      reason: item.reason || reason,
      refundAmount: refundAmount
    }));

    // Request cancellation
    const actor = {
      type: 'user',
      id: req.user._id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email
    };

    order.requestCancellation(reason, comments, actor);
    order.refund.amount = refundAmount;

    await order.save({ session });

    // Restore stock for cancelled items
    const bulkStockOperations = [];

    for (const item of items) {
      const orderItem = order.items.find(i => i.product.toString() === item.productId);
      if (orderItem && orderItem.size && orderItem.color) {
        bulkStockOperations.push({
          updateOne: {
            filter: {
              _id: item.productId,
              'stock.size': orderItem.size,
              'stock.color': orderItem.color
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

    sendSuccess(res, 200, {
      order,
      refundAmount,
      message: 'Partial cancellation request submitted successfully'
    }, 'Partial order cancellation requested successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get cancellation requests (Admin)
// @route   GET /api/orders/admin/cancellation-requests
// @access  Private/Admin
export const getCancellationRequests = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'pending';

    const filter = {
      orderStatus: 'cancellation_requested',
      'cancellationRequest.status': status
    };

    const orders = await Order.find(filter)
      .populate('user', 'firstName lastName email phone')
      .populate('cancellationRequest.respondedBy', 'firstName lastName email')
      .populate('items.product', 'name images')
      .select('orderNumber user items totalAmount orderStatus paymentStatus paymentMethod cancellationRequest createdAt')
      .sort({ 'cancellationRequest.requestedAt': -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Order.countDocuments(filter);

    sendSuccess(res, 200, {
      requests: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Cancellation requests fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get cancellation analytics (Admin)
// @route   GET /api/orders/admin/cancellation-analytics
// @access  Private/Admin
export const getCancellationAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const matchFilter = {};
    if (startDate && endDate) {
      matchFilter['cancellationRequest.requestedAt'] = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await Order.aggregate([
      {
        $match: {
          orderStatus: { $in: ['cancellation_requested', 'cancelled'] },
          ...matchFilter
        }
      },
      {
        $facet: {
          byReason: [
            {
              $group: {
                _id: '$cancellationRequest.reason',
                count: { $sum: 1 },
                totalAmount: { $sum: '$totalAmount' }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$cancellationRequest.status',
                count: { $sum: 1 }
              }
            }
          ],
          overall: [
            {
              $group: {
                _id: null,
                totalRequests: { $sum: 1 },
                totalRefundAmount: { $sum: '$refund.amount' },
                avgOrderValue: { $avg: '$totalAmount' }
              }
            }
          ]
        }
      }
    ]);

    sendSuccess(res, 200, analytics[0], 'Cancellation analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Approve cancellation request (Admin)
// @route   POST /api/orders/admin/:id/approve-cancellation
// @access  Private/Admin
export const approveCancellation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { adminComments } = req.body;

    const order = await Order.findById(req.params.id)
      .populate('user', 'email firstName lastName')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    if (order.cancellationRequest.status !== 'pending') {
      await session.abortTransaction();
      return sendError(res, 400, 'No pending cancellation request for this order');
    }

    // Approve cancellation
    const actor = {
      type: 'admin',
      id: req.user._id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email
    };

    order.approveCancellation(req.user._id, adminComments, actor);

    // Add refund event to timeline if payment was completed
    if (order.refund.status === 'pending') {
      order.addRefundEvent({
        amount: order.refund.amount,
        method: order.refund.method,
        estimatedDays: order.refund.estimatedDays,
        note: 'Refund initiated for cancelled order'
      }, actor);
    }

    await order.save({ session });

    await session.commitTransaction();

    // Send cancellation approved and refund initiated emails (non-blocking)
    try {
      await sendCancellationApprovedEmail(order.user.email, {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        reason: order.cancellationRequest.reason,
        adminComments: adminComments,
        refundAmount: order.refund.amount,
        refundMethod: order.refund.method,
        refundTimeline: `${order.refund.estimatedDays} business days`
      });

      if (order.refund.status === 'pending') {
        await sendRefundInitiatedEmail(order.user.email, {
          orderNumber: order.orderNumber,
          customerName: `${order.user.firstName} ${order.user.lastName}`,
          refundAmount: order.refund.amount,
          refundMethod: order.refund.method,
          estimatedDays: order.refund.estimatedDays,
          transactionId: order.refund.transactionId || 'Pending'
        });
      }
    } catch (emailError) {
      console.error('Failed to send cancellation approved emails:', emailError);
    }

    sendSuccess(res, 200, order, 'Cancellation request approved successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Reject cancellation request (Admin)
// @route   POST /api/orders/admin/:id/reject-cancellation
// @access  Private/Admin
export const rejectCancellation = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { adminComments } = req.body;

    if (!adminComments) {
      await session.abortTransaction();
      return sendError(res, 400, 'Admin comments are required for rejection');
    }

    const order = await Order.findById(req.params.id)
      .populate('user', 'email firstName lastName')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    if (order.cancellationRequest.status !== 'pending') {
      await session.abortTransaction();
      return sendError(res, 400, 'No pending cancellation request for this order');
    }

    // Reject cancellation
    const actor = {
      type: 'admin',
      id: req.user._id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email
    };

    order.rejectCancellation(req.user._id, adminComments, actor);

    // Restore stock if it was already reduced
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
              $inc: { 'stock.$.quantity': -item.quantity }
            }
          }
        });
      }
    }

    if (bulkStockOperations.length > 0) {
      await Product.bulkWrite(bulkStockOperations, { session });
    }

    await order.save({ session });

    await session.commitTransaction();

    // Send cancellation rejected email (non-blocking)
    try {
      await sendCancellationRejectedEmail(order.user.email, {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        reason: order.cancellationRequest.reason,
        adminComments: adminComments
      });
    } catch (emailError) {
      console.error('Failed to send cancellation rejected email:', emailError);
    }

    sendSuccess(res, 200, order, 'Cancellation request rejected successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Check if order can be cancelled
// @route   GET /api/orders/:id/can-cancel
// @access  Private/User
export const checkCancellationEligibility = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Not authorized to view this order');
    }

    const canCancel = order.canBeCancelled();

    const response = {
      canCancel: canCancel.allowed,
      reason: canCancel.reason || null,
      timeRemaining: canCancel.timeRemaining || null,
      cancellationDeadline: new Date(order.createdAt.getTime() + order.cancellationWindowHours * 60 * 60 * 1000),
      orderStatus: order.orderStatus,
      cancellationRequest: order.cancellationRequest
    };

    sendSuccess(res, 200, response, 'Cancellation eligibility checked');
  } catch (error) {
    next(error);
  }
};
