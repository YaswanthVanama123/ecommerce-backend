import Payment from '../models/Payment.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// @desc    Get all payments with filters
// @route   GET /api/admin/payments
// @access  Private/Admin
export const getAllPayments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = '',
      method = '',
      search = '',
      startDate = '',
      endDate = '',
      minAmount = '',
      maxAmount = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Status filter
    if (status) {
      filter.status = status;
    }

    // Payment method filter
    if (method) {
      filter.method = method;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) {
        filter.amount.$gte = parseFloat(minAmount);
      }
      if (maxAmount) {
        filter.amount.$lte = parseFloat(maxAmount);
      }
    }

    // Search filter (transaction ID, order number, user email)
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };

      // Find users matching email
      const users = await User.find({ email: searchRegex }).select('_id').lean();
      const userIds = users.map(u => u._id);

      // Find orders matching order number
      const orders = await Order.find({ orderNumber: searchRegex }).select('_id').lean();
      const orderIds = orders.map(o => o._id);

      filter.$or = [
        { transactionId: searchRegex },
        { 'gateway.paymentId': searchRegex },
        { user: { $in: userIds } },
        { order: { $in: orderIds } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const total = await Payment.countDocuments(filter);

    // Fetch payments with populated data
    const payments = await Payment.find(filter)
      .populate('user', 'firstName lastName email phone')
      .populate('order', 'orderNumber orderStatus totalAmount')
      .populate('refundDetails.refundedBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, 200, {
      payments,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalPayments: total,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    }, 'Payments retrieved successfully');
  } catch (error) {
    console.error('Error in getAllPayments:', error);
    next(error);
  }
};

// @desc    Get payment details by ID
// @route   GET /api/admin/payments/:id
// @access  Private/Admin
export const getPaymentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid payment ID format');
    }

    const payment = await Payment.findById(id)
      .populate('user', 'firstName lastName email phone')
      .populate('order', 'orderNumber orderStatus items shippingAddress totalAmount itemsTotal discount shippingCharge tax')
      .populate('refundDetails.refundedBy', 'firstName lastName email')
      .lean();

    if (!payment) {
      return sendError(res, 404, 'Payment not found');
    }

    sendSuccess(res, 200, payment, 'Payment details retrieved successfully');
  } catch (error) {
    console.error('Error in getPaymentById:', error);
    next(error);
  }
};

// @desc    Process refund
// @route   POST /api/admin/payments/:id/refund
// @access  Private/Admin
export const processRefund = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { refundAmount, refundReason, notes } = req.body;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid payment ID format');
    }

    // Validate required fields
    if (!refundAmount || !refundReason) {
      return sendError(res, 400, 'Refund amount and reason are required');
    }

    const payment = await Payment.findById(id).populate('order');

    if (!payment) {
      return sendError(res, 404, 'Payment not found');
    }

    // Check if payment can be refunded
    if (!['completed', 'partial_refund'].includes(payment.status)) {
      return sendError(res, 400, 'Payment cannot be refunded. Only completed or partially refunded payments can be refunded');
    }

    // Validate refund amount
    const refundAmountNum = parseFloat(refundAmount);
    const alreadyRefunded = payment.refundDetails?.refundAmount || 0;
    const maxRefundable = payment.amount - alreadyRefunded;

    if (refundAmountNum <= 0) {
      return sendError(res, 400, 'Refund amount must be greater than zero');
    }

    if (refundAmountNum > maxRefundable) {
      return sendError(res, 400, `Refund amount cannot exceed ${maxRefundable}. Already refunded: ${alreadyRefunded}`);
    }

    // Process refund
    const isPartial = (refundAmountNum + alreadyRefunded) < payment.amount;

    // Update payment status and refund details
    payment.status = isPartial ? 'partial_refund' : 'refunded';
    payment.refundDetails = {
      refundId: `REF${Date.now()}`,
      refundAmount: refundAmountNum + alreadyRefunded,
      refundReason,
      refundedAt: new Date(),
      refundStatus: 'completed',
      isPartialRefund: isPartial,
      refundedBy: req.user._id
    };

    if (notes) {
      payment.notes = payment.notes ? `${payment.notes}; Refund: ${notes}` : `Refund: ${notes}`;
    }

    await payment.save();

    // Update order status if fully refunded
    if (!isPartial && payment.order) {
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = 'refunded';
        order.refund = {
          status: 'completed',
          amount: refundAmountNum + alreadyRefunded,
          method: 'original_payment_method',
          completedAt: new Date(),
          initiatedAt: new Date()
        };
        order.statusHistory.push({
          status: 'refunded',
          updatedAt: new Date(),
          note: `Refund processed: ${refundReason}`,
          actor: {
            type: 'admin',
            id: req.user._id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email
          },
          eventType: 'refund',
          isImportant: true
        });
        await order.save();
      }
    }

    // Populate the payment for response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('user', 'firstName lastName email phone')
      .populate('order', 'orderNumber orderStatus totalAmount')
      .populate('refundDetails.refundedBy', 'firstName lastName email')
      .lean();

    sendSuccess(res, 200, populatedPayment, `Refund of ${refundAmountNum} processed successfully`);
  } catch (error) {
    console.error('Error in processRefund:', error);
    next(error);
  }
};

// @desc    Get payment statistics
// @route   GET /api/admin/payments/statistics
// @access  Private/Admin
export const getPaymentStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter.createdAt = { $gte: thirtyDaysAgo };
    }

    // Run aggregations in parallel
    const [
      statusStats,
      methodStats,
      revenueStats,
      dailyStats
    ] = await Promise.all([
      // Status breakdown
      Payment.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),

      // Payment method breakdown
      Payment.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$method',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        },
        { $sort: { count: -1 } }
      ]),

      // Revenue statistics
      Payment.aggregate([
        { $match: { ...dateFilter, status: 'completed' } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            totalTransactions: { $sum: 1 },
            avgTransactionValue: { $avg: '$amount' },
            minTransaction: { $min: '$amount' },
            maxTransaction: { $max: '$amount' }
          }
        }
      ]),

      // Daily/Weekly/Monthly trends
      Payment.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: groupBy === 'month' ? '%Y-%m' : groupBy === 'week' ? '%Y-W%V' : '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            completedAmount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0]
              }
            },
            completedCount: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
              }
            }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    // Calculate total counts
    const totalPayments = await Payment.countDocuments(dateFilter);
    const completedPayments = await Payment.countDocuments({ ...dateFilter, status: 'completed' });
    const failedPayments = await Payment.countDocuments({ ...dateFilter, status: 'failed' });
    const refundedPayments = await Payment.countDocuments({ ...dateFilter, status: { $in: ['refunded', 'partial_refund'] } });

    // Calculate refund statistics
    const refundStats = await Payment.aggregate([
      {
        $match: {
          ...dateFilter,
          status: { $in: ['refunded', 'partial_refund'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRefunded: { $sum: '$refundDetails.refundAmount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const statistics = {
      overview: {
        totalPayments,
        completedPayments,
        failedPayments,
        refundedPayments,
        successRate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(2) : 0
      },
      revenue: revenueStats[0] || {
        totalRevenue: 0,
        totalTransactions: 0,
        avgTransactionValue: 0,
        minTransaction: 0,
        maxTransaction: 0
      },
      refunds: {
        totalRefunded: refundStats[0]?.totalRefunded || 0,
        refundCount: refundStats[0]?.count || 0,
        avgRefundAmount: refundStats[0]?.count > 0 ? (refundStats[0].totalRefunded / refundStats[0].count) : 0
      },
      statusBreakdown: statusStats.reduce((acc, stat) => {
        acc[stat._id] = {
          count: stat.count,
          totalAmount: stat.totalAmount
        };
        return acc;
      }, {}),
      methodBreakdown: methodStats.map(stat => ({
        method: stat._id,
        count: stat.count,
        totalAmount: stat.totalAmount,
        percentage: totalPayments > 0 ? ((stat.count / totalPayments) * 100).toFixed(2) : 0
      })),
      trends: dailyStats.map(stat => ({
        date: stat._id,
        totalTransactions: stat.count,
        totalAmount: stat.totalAmount,
        completedTransactions: stat.completedCount,
        completedAmount: stat.completedAmount,
        successRate: stat.count > 0 ? ((stat.completedCount / stat.count) * 100).toFixed(2) : 0
      }))
    };

    sendSuccess(res, 200, statistics, 'Payment statistics retrieved successfully');
  } catch (error) {
    console.error('Error in getPaymentStatistics:', error);
    next(error);
  }
};

// @desc    Update payment status
// @route   PATCH /api/admin/payments/:id/status
// @access  Private/Admin
export const updatePaymentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes, transactionId } = req.body;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid payment ID format');
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return sendError(res, 400, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const payment = await Payment.findById(id).populate('order');

    if (!payment) {
      return sendError(res, 404, 'Payment not found');
    }

    const oldStatus = payment.status;
    payment.status = status;

    // Update status-specific fields
    if (status === 'completed') {
      payment.verified = true;
      payment.verifiedAt = new Date();
      payment.completedAt = new Date();
      if (transactionId) {
        payment.transactionId = transactionId;
      }
    } else if (status === 'failed') {
      payment.failedAt = new Date();
    } else if (status === 'cancelled') {
      payment.cancelledAt = new Date();
    }

    if (notes) {
      payment.notes = payment.notes ? `${payment.notes}; Status update: ${notes}` : `Status update: ${notes}`;
    }

    await payment.save();

    // Update order payment status if needed
    if (payment.order && status === 'completed') {
      const order = await Order.findById(payment.order);
      if (order) {
        order.paymentStatus = 'completed';
        order.statusHistory.push({
          status: order.orderStatus,
          updatedAt: new Date(),
          note: `Payment status updated from ${oldStatus} to ${status}`,
          actor: {
            type: 'admin',
            id: req.user._id,
            name: `${req.user.firstName} ${req.user.lastName}`,
            email: req.user.email
          },
          eventType: 'payment',
          isImportant: true
        });
        await order.save();
      }
    }

    // Populate the payment for response
    const populatedPayment = await Payment.findById(payment._id)
      .populate('user', 'firstName lastName email phone')
      .populate('order', 'orderNumber orderStatus totalAmount')
      .lean();

    sendSuccess(res, 200, populatedPayment, `Payment status updated from ${oldStatus} to ${status}`);
  } catch (error) {
    console.error('Error in updatePaymentStatus:', error);
    next(error);
  }
};
