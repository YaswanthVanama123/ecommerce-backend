import Return from '../models/Return.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// Create return request
export const createReturnRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      orderId,
      items,
      reason,
      detailedReason,
      images,
      pickupAddress,
      refundMethod,
      bankDetails
    } = req.body;

    // Validate required fields
    if (!orderId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and items are required'
      });
    }

    if (!reason || !detailedReason) {
      return res.status(400).json({
        success: false,
        message: 'Return reason and detailed description are required'
      });
    }

    if (!images || images.length < 2 || images.length > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please upload between 2 and 5 images'
      });
    }

    if (!pickupAddress) {
      return res.status(400).json({
        success: false,
        message: 'Pickup address is required'
      });
    }

    // Check return eligibility
    const itemIds = items.map(item => item.orderItemId);
    const eligibilityCheck = await Return.checkEligibility(orderId, itemIds);

    if (!eligibilityCheck.eligible) {
      return res.status(400).json({
        success: false,
        message: eligibilityCheck.reason
      });
    }

    const order = eligibilityCheck.order;

    // Verify order belongs to user
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Build return items with validation
    const returnItems = [];
    for (const item of items) {
      const orderItem = order.items.id(item.orderItemId);
      if (!orderItem) {
        return res.status(400).json({
          success: false,
          message: `Order item ${item.orderItemId} not found`
        });
      }

      if (item.returnQuantity > orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Return quantity cannot exceed ordered quantity for ${orderItem.name}`
        });
      }

      returnItems.push({
        orderItem: orderItem._id,
        product: orderItem.product,
        name: orderItem.name,
        image: orderItem.image,
        quantity: orderItem.quantity,
        size: orderItem.size,
        color: orderItem.color,
        price: orderItem.price,
        discountPrice: orderItem.discountPrice,
        returnQuantity: item.returnQuantity
      });
    }

    // Calculate return window
    const firstProduct = returnItems[0].product;
    const returnWindowDays = await Return.getReturnWindow(firstProduct);
    const returnWindowExpiry = new Date(order.deliveredAt);
    returnWindowExpiry.setDate(returnWindowExpiry.getDate() + returnWindowDays);

    // Check if within return window
    if (new Date() > returnWindowExpiry) {
      return res.status(400).json({
        success: false,
        message: `Return window of ${returnWindowDays} days has expired`
      });
    }

    // Create return request
    const returnRequest = new Return({
      order: orderId,
      orderNumber: order.orderNumber,
      user: userId,
      items: returnItems,
      reason,
      detailedReason,
      images,
      pickupAddress,
      refundMethod,
      bankDetails: refundMethod === 'bank_transfer' ? bankDetails : undefined,
      returnWindow: returnWindowDays,
      returnWindowExpiry,
      isEligible: true
    });

    // Calculate initial refund (without deductions)
    returnRequest.calculateRefund(0, '', false);

    await returnRequest.save();

    // Populate for response
    await returnRequest.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'order', select: 'orderNumber orderStatus deliveredAt' },
      { path: 'items.product', select: 'name category' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Return request created successfully',
      return: returnRequest
    });
  } catch (error) {
    console.error('Create return request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create return request',
      error: error.message
    });
  }
};

// Get user returns
export const getUserReturns = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, page = 1, limit = 10 } = req.query;

    const query = { user: userId };
    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const returns = await Return.find(query)
      .populate('order', 'orderNumber orderStatus deliveredAt totalAmount')
      .populate('items.product', 'name category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Return.countDocuments(query);

    res.json({
      success: true,
      returns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get user returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch returns',
      error: error.message
    });
  }
};

// Get return by ID
export const getReturnById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const returnRequest = await Return.findById(id)
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber orderStatus deliveredAt totalAmount paymentMethod')
      .populate('items.product', 'name category images')
      .populate('statusHistory.updatedBy', 'name email')
      .populate('qualityCheck.checkedBy', 'name email');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    // Check authorization
    if (userRole === 'user' && returnRequest.user._id.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    res.json({
      success: true,
      return: returnRequest
    });
  } catch (error) {
    console.error('Get return by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch return details',
      error: error.message
    });
  }
};

// Get all returns (Admin)
export const getAllReturns = async (req, res) => {
  try {
    const {
      status,
      priority,
      reason,
      search,
      startDate,
      endDate,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};

    if (status) {
      query.status = status;
    }

    if (priority) {
      query.priority = priority;
    }

    if (reason) {
      query.reason = reason;
    }

    if (search) {
      query.$or = [
        { returnNumber: new RegExp(search, 'i') },
        { orderNumber: new RegExp(search, 'i') }
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const returns = await Return.find(query)
      .populate('user', 'name email phone')
      .populate('order', 'orderNumber totalAmount')
      .populate('items.product', 'name category')
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Return.countDocuments(query);

    // Get status counts
    const statusCounts = await Return.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      returns,
      statusCounts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch returns',
      error: error.message
    });
  }
};

// Update return status (Admin)
export const updateReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, adminComment } = req.body;
    const adminId = req.user._id;

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    // Validate status transition
    const validTransitions = {
      'requested': ['approved', 'rejected'],
      'approved': ['pickup_scheduled', 'cancelled'],
      'pickup_scheduled': ['picked_up', 'cancelled'],
      'picked_up': ['in_transit', 'received'],
      'in_transit': ['received'],
      'received': ['inspected'],
      'inspected': ['refund_initiated', 'rejected'],
      'refund_initiated': ['refund_completed']
    };

    const currentStatus = returnRequest.status;
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${currentStatus} to ${status}`
      });
    }

    // Update status
    returnRequest.updateStatus(status, adminId, note, adminComment);

    await returnRequest.save();

    // Populate for response
    await returnRequest.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'order', select: 'orderNumber' },
      { path: 'statusHistory.updatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Return status updated successfully',
      return: returnRequest
    });
  } catch (error) {
    console.error('Update return status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update return status',
      error: error.message
    });
  }
};

// Schedule pickup (Admin)
export const schedulePickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { scheduledDate, scheduledTimeSlot, pickupPartner } = req.body;
    const adminId = req.user._id;

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    if (returnRequest.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Return must be approved before scheduling pickup'
      });
    }

    returnRequest.pickupDetails = {
      scheduledDate: new Date(scheduledDate),
      scheduledTimeSlot,
      pickupPartner,
      trackingNumber: `TRK${Date.now()}`
    };

    returnRequest.updateStatus('pickup_scheduled', adminId, `Pickup scheduled for ${scheduledDate} ${scheduledTimeSlot}`);

    await returnRequest.save();

    await returnRequest.populate('user', 'name email phone');

    res.json({
      success: true,
      message: 'Pickup scheduled successfully',
      return: returnRequest
    });
  } catch (error) {
    console.error('Schedule pickup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule pickup',
      error: error.message
    });
  }
};

// Perform quality check (Admin)
export const performQualityCheck = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      condition,
      packagingIntact,
      tagsAttached,
      notes,
      images,
      approved,
      rejectionReason
    } = req.body;
    const adminId = req.user._id;

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    if (returnRequest.status !== 'received') {
      return res.status(400).json({
        success: false,
        message: 'Return must be received before quality check'
      });
    }

    returnRequest.qualityCheck = {
      checkedBy: adminId,
      condition,
      packagingIntact,
      tagsAttached,
      notes,
      images,
      approved,
      rejectionReason
    };

    const statusNote = approved
      ? 'Quality check passed'
      : `Quality check failed: ${rejectionReason}`;

    returnRequest.updateStatus('inspected', adminId, statusNote);

    await returnRequest.save();

    await returnRequest.populate([
      { path: 'user', select: 'name email phone' },
      { path: 'qualityCheck.checkedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Quality check completed successfully',
      return: returnRequest
    });
  } catch (error) {
    console.error('Quality check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform quality check',
      error: error.message
    });
  }
};

// Process refund (Admin)
export const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { deductions = 0, deductionReason = '', includeShipping = false } = req.body;
    const adminId = req.user._id;

    const returnRequest = await Return.findById(id).populate('order');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    if (returnRequest.status !== 'inspected') {
      return res.status(400).json({
        success: false,
        message: 'Return must be inspected before processing refund'
      });
    }

    if (!returnRequest.qualityCheck?.approved) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process refund for rejected quality check'
      });
    }

    // Calculate refund
    const refundAmount = returnRequest.calculateRefund(deductions, deductionReason, includeShipping);

    // Simulate refund initiation
    returnRequest.refundDetails = {
      refundId: `REF${Date.now()}`,
      initiatedAt: new Date()
    };

    returnRequest.updateStatus(
      'refund_initiated',
      adminId,
      `Refund of ₹${refundAmount} initiated via ${returnRequest.refundMethod}`
    );

    await returnRequest.save();

    // In production, integrate with payment gateway here

    await returnRequest.populate('user', 'name email phone');

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      return: returnRequest,
      refundAmount
    });
  } catch (error) {
    console.error('Process refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund',
      error: error.message
    });
  }
};

// Complete refund (Admin/System)
export const completeRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundId, transactionId } = req.body;
    const adminId = req.user._id;

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    if (returnRequest.status !== 'refund_initiated') {
      return res.status(400).json({
        success: false,
        message: 'Refund must be initiated before completion'
      });
    }

    returnRequest.refundDetails.completedAt = new Date();
    if (transactionId) {
      returnRequest.refundDetails.transactionId = transactionId;
    }

    returnRequest.updateStatus(
      'refund_completed',
      adminId,
      `Refund completed successfully. Amount: ₹${returnRequest.refundBreakdown.finalRefundAmount}`
    );

    // Update order payment status
    const order = await Order.findById(returnRequest.order);
    if (order && returnRequest.items.length === order.items.length) {
      // Full return - mark as refunded
      order.paymentStatus = 'refunded';
      await order.save();
    }

    await returnRequest.save();

    await returnRequest.populate('user', 'name email phone');

    res.json({
      success: true,
      message: 'Refund completed successfully',
      return: returnRequest
    });
  } catch (error) {
    console.error('Complete refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete refund',
      error: error.message
    });
  }
};

// Cancel return request
export const cancelReturnRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    const returnRequest = await Return.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    // Check if user owns the return
    if (returnRequest.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access'
      });
    }

    // Only allow cancellation in certain statuses
    const cancellableStatuses = ['requested', 'approved', 'pickup_scheduled'];
    if (!cancellableStatuses.includes(returnRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel return at this stage'
      });
    }

    returnRequest.updateStatus('cancelled', userId, reason || 'Cancelled by user');

    await returnRequest.save();

    res.json({
      success: true,
      message: 'Return request cancelled successfully',
      return: returnRequest
    });
  } catch (error) {
    console.error('Cancel return error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel return request',
      error: error.message
    });
  }
};

// Get return analytics (Admin/Superadmin)
export const getReturnAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Return rate by reason
    const reasonStats = await Return.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$reason',
          count: { $sum: 1 },
          totalRefund: { $sum: '$refundBreakdown.finalRefundAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Return rate by status
    const statusStats = await Return.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Return rate by category
    const categoryStats = await Return.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      {
        $group: {
          _id: '$categoryDetails.name',
          count: { $sum: 1 },
          totalRefund: { $sum: '$refundBreakdown.finalRefundAmount' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Top returned products
    const topProducts = await Return.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          count: { $sum: '$items.returnQuantity' },
          reasons: { $push: '$reason' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Refund metrics
    const refundMetrics = await Return.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          totalReturns: { $sum: 1 },
          totalRefundAmount: { $sum: '$refundBreakdown.finalRefundAmount' },
          avgRefundAmount: { $avg: '$refundBreakdown.finalRefundAmount' },
          totalDeductions: { $sum: '$refundBreakdown.deductions' },
          completedReturns: {
            $sum: { $cond: [{ $eq: ['$status', 'refund_completed'] }, 1, 0] }
          },
          pendingReturns: {
            $sum: {
              $cond: [
                { $in: ['$status', ['requested', 'approved', 'pickup_scheduled', 'picked_up', 'in_transit', 'received', 'inspected', 'refund_initiated']] },
                1,
                0
              ]
            }
          },
          rejectedReturns: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          }
        }
      }
    ]);

    // Average processing time
    const processingTime = await Return.aggregate([
      {
        $match: {
          ...dateFilter,
          status: 'refund_completed'
        }
      },
      {
        $project: {
          processingTime: {
            $subtract: ['$refundDetails.completedAt', '$createdAt']
          }
        }
      },
      {
        $group: {
          _id: null,
          avgProcessingTime: { $avg: '$processingTime' }
        }
      }
    ]);

    res.json({
      success: true,
      analytics: {
        reasonStats,
        statusStats,
        categoryStats,
        topProducts,
        refundMetrics: refundMetrics[0] || {},
        avgProcessingTimeDays: processingTime[0]
          ? (processingTime[0].avgProcessingTime / (1000 * 60 * 60 * 24)).toFixed(2)
          : 0
      }
    });
  } catch (error) {
    console.error('Get return analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch return analytics',
      error: error.message
    });
  }
};

// Check return eligibility for order
export const checkReturnEligibility = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify order belongs to user
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized access to order'
      });
    }

    // Check basic eligibility
    const itemIds = order.items.map(item => item._id);
    const eligibilityCheck = await Return.checkEligibility(orderId, itemIds);

    if (!eligibilityCheck.eligible) {
      return res.json({
        success: true,
        eligible: false,
        reason: eligibilityCheck.reason
      });
    }

    // Check return window for each item
    const itemEligibility = await Promise.all(
      order.items.map(async (item) => {
        const returnWindowDays = await Return.getReturnWindow(item.product._id);
        const returnWindowExpiry = new Date(order.deliveredAt);
        returnWindowExpiry.setDate(returnWindowExpiry.getDate() + returnWindowDays);

        const isEligible = new Date() <= returnWindowExpiry;

        // Check if already returned
        const existingReturn = await Return.findOne({
          order: orderId,
          'items.orderItem': item._id,
          status: { $nin: ['rejected', 'cancelled'] }
        });

        return {
          itemId: item._id,
          productName: item.name,
          eligible: isEligible && !existingReturn,
          returnWindow: returnWindowDays,
          returnWindowExpiry,
          alreadyReturned: !!existingReturn
        };
      })
    );

    res.json({
      success: true,
      eligible: true,
      order: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        deliveredAt: order.deliveredAt
      },
      items: itemEligibility
    });
  } catch (error) {
    console.error('Check return eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check return eligibility',
      error: error.message
    });
  }
};
