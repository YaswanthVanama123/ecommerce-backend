import mongoose from 'mongoose';
import Order from '../models/Order.js';
import ActivityLog from '../models/ActivityLog.js';
import Shipping from '../models/Shipping.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// Helper function to get client IP and user agent
const getRequestMetadata = (req) => {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.headers['user-agent'] || '',
    referrer: req.headers['referer'] || req.headers['referrer'] || ''
  };
};

// @desc    Get order timeline (combined from statusHistory and ActivityLog)
// @route   GET /api/orders/:id/timeline
// @access  Private
export const getOrderTimeline = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .populate('shipping')
      .lean();

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Check if user owns the order or is admin
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return sendError(res, 403, 'Not authorized to view this order timeline');
    }

    // Get activity logs
    const activityLogs = await ActivityLog.getOrderTimeline(order._id, {
      limit: req.query.limit || 100,
      skip: req.query.skip || 0,
      category: req.query.category,
      severity: req.query.severity,
      actorType: req.query.actorType
    });

    // Combine statusHistory from order with activity logs
    const timelineEvents = [];

    // Add events from statusHistory
    if (order.statusHistory && order.statusHistory.length > 0) {
      order.statusHistory.forEach(historyItem => {
        timelineEvents.push({
          type: 'status_event',
          timestamp: historyItem.updatedAt,
          status: historyItem.status,
          note: historyItem.note,
          actor: historyItem.actor || { type: 'system', name: 'System' },
          metadata: historyItem.metadata || {},
          eventType: historyItem.eventType || 'status_change',
          oldValue: historyItem.oldValue,
          newValue: historyItem.newValue,
          isImportant: historyItem.isImportant || false
        });
      });
    }

    // Add events from activity logs
    activityLogs.logs.forEach(log => {
      timelineEvents.push({
        type: 'activity_log',
        timestamp: log.createdAt,
        action: log.action,
        description: log.description,
        category: log.category,
        severity: log.severity,
        actor: log.actor,
        oldValue: log.oldValue,
        newValue: log.newValue,
        metadata: log.metadata,
        result: log.result,
        relatedEntities: log.relatedEntities
      });
    });

    // Add shipping events if available
    if (order.shipping) {
      const shipping = order.shipping;
      if (shipping.trackingHistory && shipping.trackingHistory.length > 0) {
        shipping.trackingHistory.forEach(trackingEvent => {
          timelineEvents.push({
            type: 'shipping_event',
            timestamp: trackingEvent.timestamp,
            status: trackingEvent.status,
            location: trackingEvent.location,
            description: trackingEvent.description,
            actor: { type: 'delivery_agent', name: trackingEvent.agentName || 'Delivery Partner' },
            metadata: {
              coordinates: trackingEvent.coordinates,
              facilityCode: trackingEvent.facilityCode
            }
          });
        });
      }
    }

    // Sort all events by timestamp (most recent first)
    timelineEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate time elapsed between events
    const eventsWithDuration = timelineEvents.map((event, index) => {
      if (index < timelineEvents.length - 1) {
        const nextEvent = timelineEvents[index + 1];
        const duration = new Date(event.timestamp) - new Date(nextEvent.timestamp);
        return {
          ...event,
          timeSincePrevious: duration
        };
      }
      return event;
    });

    // Group related events
    const groupedEvents = groupRelatedEvents(eventsWithDuration);

    sendSuccess(res, 200, {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        createdAt: order.createdAt
      },
      timeline: groupedEvents,
      totalEvents: timelineEvents.length,
      hasMore: activityLogs.hasMore
    }, 'Order timeline fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Helper function to group related events
const groupRelatedEvents = (events) => {
  const grouped = [];
  let currentGroup = null;

  events.forEach(event => {
    // Group events that happened within 1 minute of each other
    if (currentGroup &&
        event.timeSincePrevious &&
        event.timeSincePrevious < 60000) {
      currentGroup.relatedEvents.push(event);
    } else {
      if (currentGroup) {
        grouped.push(currentGroup);
      }
      currentGroup = {
        primaryEvent: event,
        relatedEvents: [],
        timestamp: event.timestamp
      };
    }
  });

  if (currentGroup) {
    grouped.push(currentGroup);
  }

  return grouped;
};

// @desc    Get order timeline with milestones
// @route   GET /api/orders/:id/timeline/milestones
// @access  Private
export const getOrderMilestones = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName')
      .populate('shipping')
      .lean();

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Check authorization
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return sendError(res, 403, 'Not authorized to view this order');
    }

    // Define milestones
    const milestones = [
      {
        key: 'ordered',
        label: 'Order Placed',
        status: 'completed',
        timestamp: order.createdAt,
        estimatedTimestamp: order.createdAt,
        description: 'Your order has been placed successfully',
        icon: 'CheckCircle',
        color: 'green'
      },
      {
        key: 'confirmed',
        label: 'Order Confirmed',
        status: order.orderStatus === 'cancelled' ? 'skipped' :
                ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.orderStatus) ? 'completed' : 'pending',
        timestamp: getStatusTimestamp(order, 'confirmed'),
        estimatedTimestamp: getStatusTimestamp(order, 'confirmed') || addHours(order.createdAt, 2),
        description: 'We have confirmed your order',
        icon: 'ThumbsUp',
        color: 'blue'
      },
      {
        key: 'processing',
        label: 'Processing',
        status: order.orderStatus === 'cancelled' ? 'skipped' :
                ['processing', 'shipped', 'delivered'].includes(order.orderStatus) ? 'completed' : 'pending',
        timestamp: getStatusTimestamp(order, 'processing'),
        estimatedTimestamp: getStatusTimestamp(order, 'processing') || addHours(order.createdAt, 24),
        description: 'Your order is being processed',
        icon: 'Package',
        color: 'yellow'
      },
      {
        key: 'shipped',
        label: 'Shipped',
        status: order.orderStatus === 'cancelled' ? 'skipped' :
                ['shipped', 'delivered'].includes(order.orderStatus) ? 'completed' : 'pending',
        timestamp: getStatusTimestamp(order, 'shipped'),
        estimatedTimestamp: getStatusTimestamp(order, 'shipped') ||
                            order.shipping?.estimatedDeliveryDate ||
                            addDays(order.createdAt, 3),
        description: order.trackingNumber ? `Tracking: ${order.trackingNumber}` : 'Your order has been shipped',
        icon: 'Truck',
        color: 'purple',
        trackingNumber: order.trackingNumber
      },
      {
        key: 'delivered',
        label: 'Delivered',
        status: order.orderStatus === 'delivered' ? 'completed' :
                order.orderStatus === 'cancelled' ? 'skipped' : 'pending',
        timestamp: order.deliveredAt,
        estimatedTimestamp: order.deliveredAt ||
                            order.shipping?.estimatedDeliveryDate ||
                            addDays(order.createdAt, 7),
        description: order.deliveredAt ? 'Your order has been delivered' : 'Estimated delivery date',
        icon: 'Home',
        color: 'green'
      }
    ];

    // Add cancellation milestone if order is cancelled
    if (order.orderStatus === 'cancelled') {
      milestones.push({
        key: 'cancelled',
        label: 'Order Cancelled',
        status: 'completed',
        timestamp: order.cancelledAt,
        estimatedTimestamp: order.cancelledAt,
        description: order.cancellationReason || 'Order has been cancelled',
        icon: 'XCircle',
        color: 'red'
      });
    }

    // Calculate progress percentage
    const completedMilestones = milestones.filter(m => m.status === 'completed').length;
    const totalMilestones = milestones.filter(m => m.status !== 'skipped').length;
    const progressPercentage = (completedMilestones / totalMilestones) * 100;

    sendSuccess(res, 200, {
      milestones,
      currentStatus: order.orderStatus,
      progressPercentage: Math.round(progressPercentage),
      estimatedDelivery: order.shipping?.estimatedDeliveryDate,
      actualDelivery: order.deliveredAt
    }, 'Order milestones fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Helper functions
const getStatusTimestamp = (order, status) => {
  if (!order.statusHistory) return null;
  const statusEntry = order.statusHistory.find(h => h.status === status);
  return statusEntry ? statusEntry.updatedAt : null;
};

const addHours = (date, hours) => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// @desc    Add note to order timeline
// @route   POST /api/orders/:id/timeline/note
// @access  Private/Admin
export const addOrderNote = async (req, res, next) => {
  try {
    const { note, isImportant } = req.body;

    if (!note || note.trim().length === 0) {
      return sendError(res, 400, 'Note is required');
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    const actor = {
      type: req.user.role === 'admin' ? 'admin' : 'user',
      id: req.user._id,
      name: `${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email
    };

    const metadata = getRequestMetadata(req);

    // Add note to order history
    order.addNote(note, actor);
    await order.save();

    // Log activity
    await ActivityLog.logActivity({
      order: order._id,
      orderNumber: order.orderNumber,
      actor,
      action: 'note_added',
      description: `Note added: ${note}`,
      category: 'customer_service',
      severity: isImportant ? 'warning' : 'info',
      metadata,
      tags: ['note', req.user.role]
    });

    sendSuccess(res, 200, order, 'Note added successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get activity logs for an order (Admin only)
// @route   GET /api/orders/:id/activity-logs
// @access  Private/Admin
export const getOrderActivityLogs = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).select('orderNumber');

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    const options = {
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0,
      category: req.query.category,
      severity: req.query.severity,
      actorType: req.query.actorType,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await ActivityLog.getOrderTimeline(order._id, options);

    sendSuccess(res, 200, {
      orderNumber: order.orderNumber,
      logs: result.logs,
      total: result.total,
      hasMore: result.hasMore,
      pagination: {
        limit: options.limit,
        skip: options.skip,
        total: result.total
      }
    }, 'Activity logs fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get critical activities (Admin only)
// @route   GET /api/orders/activity-logs/critical
// @access  Private/Admin
export const getCriticalActivities = async (req, res, next) => {
  try {
    const options = {
      limit: parseInt(req.query.limit) || 100,
      skip: parseInt(req.query.skip) || 0,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };

    const result = await ActivityLog.getCriticalActivities(options);

    sendSuccess(res, 200, {
      logs: result.logs,
      total: result.total,
      pagination: {
        limit: options.limit,
        skip: options.skip,
        total: result.total
      }
    }, 'Critical activities fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Export order timeline as PDF
// @route   GET /api/orders/:id/timeline/export/pdf
// @access  Private
export const exportTimelinePDF = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'firstName lastName email')
      .lean();

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Check authorization
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return sendError(res, 403, 'Not authorized to export this timeline');
    }

    // Get timeline data
    const activityLogs = await ActivityLog.getOrderTimeline(order._id, { limit: 1000 });

    const timelineData = {
      order: {
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.orderStatus,
        totalAmount: order.totalAmount
      },
      customer: {
        name: `${order.user.firstName} ${order.user.lastName}`,
        email: order.user.email
      },
      events: order.statusHistory.map(h => ({
        timestamp: h.updatedAt,
        status: h.status,
        note: h.note,
        actor: h.actor?.name || 'System'
      }))
    };

    // For now, return JSON. In production, use a PDF library like puppeteer or pdfkit
    sendSuccess(res, 200, timelineData, 'Timeline data ready for PDF generation');
  } catch (error) {
    next(error);
  }
};

// @desc    Get timeline summary for order list
// @route   GET /api/orders/timeline/summary
// @access  Private
export const getTimelineSummary = async (req, res, next) => {
  try {
    const { orderIds } = req.query;

    if (!orderIds) {
      return sendError(res, 400, 'Order IDs are required');
    }

    const ids = orderIds.split(',');

    const orders = await Order.find({
      _id: { $in: ids },
      user: req.user._id
    }).select('orderNumber orderStatus statusHistory createdAt deliveredAt').lean();

    const summaries = orders.map(order => ({
      orderId: order._id,
      orderNumber: order.orderNumber,
      currentStatus: order.orderStatus,
      lastUpdate: order.statusHistory && order.statusHistory.length > 0
        ? order.statusHistory[order.statusHistory.length - 1].updatedAt
        : order.createdAt,
      totalEvents: order.statusHistory ? order.statusHistory.length : 0,
      isCompleted: order.orderStatus === 'delivered',
      isCancelled: order.orderStatus === 'cancelled'
    }));

    sendSuccess(res, 200, summaries, 'Timeline summaries fetched successfully');
  } catch (error) {
    next(error);
  }
};
