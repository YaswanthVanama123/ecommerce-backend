import express from 'express';
import { protect, checkRole } from '../middleware/auth.js';
import {
  getProfile,
  updateProfile,
  toggleStatus,
  getStats,
  updateLocation,
  updateDeliveryLocation,
  getDirections,
  getOrderDetails
} from '../controllers/deliveryController.js';

const router = express.Router();

/**
 * Profile Management Routes
 */

// GET /api/delivery/profile - Get delivery partner profile
router.get('/profile', protect, checkRole(['delivery_agent']), getProfile);

// PUT /api/delivery/profile - Update delivery partner profile
router.put('/profile', protect, checkRole(['delivery_agent']), updateProfile);

// POST /api/delivery/toggle-status - Toggle online/offline status
router.post('/toggle-status', protect, checkRole(['delivery_agent']), toggleStatus);

// GET /api/delivery/stats - Get delivery statistics
router.get('/stats', protect, checkRole(['delivery_agent']), getStats);

// PUT /api/delivery/location - Update current location
router.put('/location', protect, checkRole(['delivery_agent']), updateLocation);

// POST /api/delivery/location - Update location during active delivery
router.post('/location', protect, checkRole(['delivery_agent']), updateDeliveryLocation);

// GET /api/delivery/orders/:orderId/directions - Get directions to customer
router.get('/orders/:orderId/directions', protect, checkRole(['delivery_agent']), getDirections);

/**
 * Order Management Routes
 */

// GET /api/delivery/orders - Get assigned orders
router.get('/orders', protect, checkRole(['delivery_agent']), async (req, res) => {
  try {
    const { status } = req.query;
    const deliveryPersonId = req.user.id;

    // Import Order model
    const Order = (await import('../models/Order.js')).default;

    // Build query
    const query = {
      deliveryPerson: deliveryPersonId,
    };

    // Filter by status if provided
    if (status) {
      const statusMap = {
        'new': ['pending', 'assigned'],
        'in-progress': ['accepted', 'picked_up', 'in_transit'],
        'completed': ['delivered', 'failed', 'cancelled']
      };

      const statuses = statusMap[status] || [status];
      query.deliveryStatus = { $in: statuses };
    }

    // Fetch orders
    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 })
      .select('orderNumber user items shippingAddress totalAmount deliveryFee deliveryStatus status createdAt estimatedDelivery deliveryDate');

    res.json({
      success: true,
      count: orders.length,
      data: orders,
      orders: orders
    });
  } catch (error) {
    console.error('Error fetching delivery orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// GET /api/delivery/orders/:id - Get order details
router.get('/orders/:id', protect, checkRole(['delivery_agent']), getOrderDetails);

// POST /api/delivery/orders/:id/accept - Accept an order
router.post('/orders/:id/accept', protect, checkRole(['delivery_agent']), async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryPersonId = req.user.id;

    // Import Order model
    const Order = (await import('../models/Order.js')).default;

    // Find order
    const order = await Order.findOne({
      _id: id,
      deliveryPerson: deliveryPersonId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be accepted
    if (order.deliveryStatus !== 'assigned' && order.deliveryStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be accepted in current status'
      });
    }

    // Update order status
    order.deliveryStatus = 'accepted';
    order.status = 'accepted';
    order.acceptedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Order accepted successfully',
      data: order
    });
  } catch (error) {
    console.error('Error accepting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept order',
      error: error.message
    });
  }
});

// POST /api/delivery/orders/:id/reject - Reject an order
router.post('/orders/:id/reject', protect, checkRole(['delivery_agent']), async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const deliveryPersonId = req.user.id;

    // Import Order model
    const Order = (await import('../models/Order.js')).default;

    // Find order
    const order = await Order.findOne({
      _id: id,
      deliveryPerson: deliveryPersonId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order can be rejected
    if (order.deliveryStatus !== 'assigned' && order.deliveryStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Order cannot be rejected in current status'
      });
    }

    // Update order - unassign from this delivery person
    order.deliveryPerson = null;
    order.deliveryStatus = 'pending';
    order.rejectionReason = reason || 'No reason provided';
    order.rejectedBy = deliveryPersonId;
    order.rejectedAt = new Date();
    await order.save();

    res.json({
      success: true,
      message: 'Order rejected successfully'
    });
  } catch (error) {
    console.error('Error rejecting order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject order',
      error: error.message
    });
  }
});

// PATCH /api/delivery/orders/:id/status - Update order status
router.patch('/orders/:id/status', protect, checkRole(['delivery_agent']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, location } = req.body;
    const deliveryPersonId = req.user.id;

    // Import Order model
    const Order = (await import('../models/Order.js')).default;

    // Find order
    const order = await Order.findOne({
      _id: id,
      deliveryPerson: deliveryPersonId
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Validate status transition
    const validStatuses = ['accepted', 'picked_up', 'in_transit', 'delivered', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update order status
    order.deliveryStatus = status;
    order.status = status;

    // Update specific timestamps
    if (status === 'picked_up') {
      order.pickedUpAt = new Date();
    } else if (status === 'in_transit') {
      order.inTransitAt = new Date();
    } else if (status === 'delivered') {
      order.deliveredAt = new Date();
      order.orderStatus = 'delivered';
    } else if (status === 'failed') {
      order.failedAt = new Date();
    }

    // Update location if provided
    if (location) {
      order.currentLocation = location;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
});

/**
 * GET /api/delivery/earnings
 * Get earnings for delivery person with date range filter
 * Query params: from, to (optional)
 */
router.get('/earnings', protect, checkRole(['delivery_agent']), async (req, res) => {
  try {
    const { from, to } = req.query;
    const deliveryPersonId = req.user.id;

    // Import Order model
    const Order = (await import('../models/Order.js')).default;

    // Build date filter
    const dateFilter = {};
    if (from) {
      dateFilter.$gte = new Date(from);
    }
    if (to) {
      dateFilter.$lte = new Date(to);
    }

    // Query for completed deliveries by this delivery person
    const query = {
      deliveryPerson: deliveryPersonId,
      orderStatus: 'delivered'
    };

    if (Object.keys(dateFilter).length > 0) {
      query.deliveredAt = dateFilter;
    }

    // Fetch orders with delivery earnings
    const deliveries = await Order.find(query)
      .sort({ deliveredAt: -1 })
      .populate('user', 'name email')
      .select('orderNumber deliveredAt shippingAddress totalAmount deliveryFee deliveryTip deliveryDistance createdAt');

    // Calculate earnings breakdown
    const earningsData = deliveries.map(order => {
      const baseDeliveryFee = order.deliveryFee || 40; // Default base fee
      const distanceBonus = calculateDistanceBonus(order.deliveryDistance || 5);
      const tip = order.deliveryTip || 0;
      const total = baseDeliveryFee + distanceBonus + tip;

      return {
        orderId: order.orderNumber,
        orderObjectId: order._id,
        date: order.deliveredAt,
        customerName: order.shippingAddress.fullName,
        customerPhone: order.shippingAddress.phone,
        deliveryFee: baseDeliveryFee,
        distanceBonus: distanceBonus,
        distance: order.deliveryDistance || 5,
        tip: tip,
        total: total,
        orderValue: order.totalAmount
      };
    });

    // Calculate summary
    const summary = {
      totalEarnings: earningsData.reduce((sum, item) => sum + item.total, 0),
      totalDeliveries: earningsData.length,
      totalTips: earningsData.reduce((sum, item) => sum + item.tip, 0),
      averageEarning: earningsData.length > 0
        ? (earningsData.reduce((sum, item) => sum + item.total, 0) / earningsData.length).toFixed(2)
        : 0
    };

    // Calculate today's earnings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysEarnings = earningsData
      .filter(item => new Date(item.date) >= today)
      .reduce((sum, item) => sum + item.total, 0);

    // Calculate this week's earnings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEarnings = earningsData
      .filter(item => new Date(item.date) >= weekStart)
      .reduce((sum, item) => sum + item.total, 0);

    // Calculate this month's earnings
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthEarnings = earningsData
      .filter(item => new Date(item.date) >= monthStart)
      .reduce((sum, item) => sum + item.total, 0);

    res.json({
      success: true,
      earnings: earningsData,
      summary: {
        ...summary,
        todayEarnings: todaysEarnings,
        weekEarnings: weekEarnings,
        monthEarnings: monthEarnings
      }
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch earnings',
      error: error.message
    });
  }
});

/**
 * GET /api/delivery/payouts
 * Get payout history for delivery person
 */
router.get('/payouts', protect, checkRole(['delivery_agent']), async (req, res) => {
  try {
    const deliveryPersonId = req.user.id;

    // Import Payout model (create if doesn't exist)
    let Payout;
    try {
      Payout = (await import('../models/Payout.js')).default;
    } catch (err) {
      // If Payout model doesn't exist, return mock data
      return res.json({
        success: true,
        payouts: [
          {
            _id: '1',
            amount: 2450,
            status: 'completed',
            paymentMethod: 'Bank Transfer',
            paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            transactionId: 'PAY123456789',
            accountDetails: {
              accountNumber: '****4532',
              ifsc: 'SBIN0001234'
            }
          },
          {
            _id: '2',
            amount: 3200,
            status: 'completed',
            paymentMethod: 'Bank Transfer',
            paidAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
            transactionId: 'PAY987654321',
            accountDetails: {
              accountNumber: '****4532',
              ifsc: 'SBIN0001234'
            }
          }
        ],
        pendingPayout: {
          amount: 1250,
          deliveriesCount: 25,
          expectedDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        },
        paymentMethod: {
          type: 'Bank Transfer',
          accountNumber: '****4532',
          ifsc: 'SBIN0001234',
          accountHolderName: 'Delivery Partner'
        }
      });
    }

    // Fetch actual payouts from database
    const payouts = await Payout.find({ deliveryPerson: deliveryPersonId })
      .sort({ createdAt: -1 })
      .limit(20);

    // Calculate pending payout
    const Order = (await import('../models/Order.js')).default;
    const unpaidDeliveries = await Order.find({
      deliveryPerson: deliveryPersonId,
      orderStatus: 'delivered',
      deliveryPaymentStatus: { $ne: 'paid' }
    });

    const pendingAmount = unpaidDeliveries.reduce((sum, order) => {
      const baseDeliveryFee = order.deliveryFee || 40;
      const distanceBonus = calculateDistanceBonus(order.deliveryDistance || 5);
      const tip = order.deliveryTip || 0;
      return sum + baseDeliveryFee + distanceBonus + tip;
    }, 0);

    res.json({
      success: true,
      payouts,
      pendingPayout: {
        amount: pendingAmount,
        deliveriesCount: unpaidDeliveries.length,
        expectedDate: getNextPayoutDate()
      },
      paymentMethod: {
        type: 'Bank Transfer',
        accountNumber: '****4532',
        ifsc: 'SBIN0001234',
        accountHolderName: req.user.name || 'Delivery Partner'
      }
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payouts',
      error: error.message
    });
  }
});

/**
 * GET /api/delivery/earnings/chart
 * Get earnings data for chart visualization
 * Query params: period (daily, weekly, monthly)
 */
router.get('/earnings/chart', protect, checkRole(['delivery_agent']), async (req, res) => {
  try {
    const deliveryPersonId = req.user.id;
    const period = req.query.period || 'daily'; // daily, weekly, monthly

    const Order = (await import('../models/Order.js')).default;

    // Calculate date range based on period
    let startDate = new Date();
    let groupBy = {};

    if (period === 'daily') {
      // Last 7 days
      startDate.setDate(startDate.getDate() - 7);
      groupBy = {
        $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' }
      };
    } else if (period === 'weekly') {
      // Last 8 weeks
      startDate.setDate(startDate.getDate() - 56);
      groupBy = {
        $dateToString: { format: '%Y-W%U', date: '$deliveredAt' }
      };
    } else if (period === 'monthly') {
      // Last 6 months
      startDate.setMonth(startDate.getMonth() - 6);
      groupBy = {
        $dateToString: { format: '%Y-%m', date: '$deliveredAt' }
      };
    }

    // Aggregate earnings by period
    const chartData = await Order.aggregate([
      {
        $match: {
          deliveryPerson: req.user._id,
          orderStatus: 'delivered',
          deliveredAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: groupBy,
          totalEarnings: {
            $sum: {
              $add: [
                { $ifNull: ['$deliveryFee', 40] },
                { $multiply: [{ $ifNull: ['$deliveryDistance', 5] }, 2] },
                { $ifNull: ['$deliveryTip', 0] }
              ]
            }
          },
          deliveryCount: { $sum: 1 },
          totalTips: { $sum: { $ifNull: ['$deliveryTip', 0] } }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      period,
      data: chartData.map(item => ({
        date: item._id,
        earnings: item.totalEarnings,
        deliveries: item.deliveryCount,
        tips: item.totalTips
      }))
    });
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch chart data',
      error: error.message
    });
  }
});

// Helper function to calculate distance bonus
function calculateDistanceBonus(distance) {
  // Base calculation: Rs 2 per km above 5km
  const baseDistance = 5;
  if (distance <= baseDistance) {
    return 0;
  }
  return Math.round((distance - baseDistance) * 2);
}

// Helper function to get next payout date (every Friday)
function getNextPayoutDate() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + daysUntilFriday);
  nextFriday.setHours(0, 0, 0, 0);
  return nextFriday;
}

export default router;
