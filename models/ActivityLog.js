import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    index: true
  },
  actor: {
    type: {
      type: String,
      enum: ['user', 'admin', 'system', 'delivery_agent', 'payment_gateway'],
      required: true
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String,
    role: String
  },
  action: {
    type: String,
    required: true,
    enum: [
      'order_created',
      'order_viewed',
      'status_changed',
      'payment_initiated',
      'payment_completed',
      'payment_failed',
      'refund_initiated',
      'refund_completed',
      'order_modified',
      'order_cancelled',
      'cancellation_requested',
      'cancellation_approved',
      'cancellation_rejected',
      'shipment_created',
      'shipment_updated',
      'tracking_updated',
      'note_added',
      'address_changed',
      'delivery_attempted',
      'delivery_rescheduled',
      'delivered',
      'return_requested',
      'return_approved',
      'return_rejected',
      'item_returned',
      'email_sent',
      'notification_sent'
    ]
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['order', 'payment', 'shipment', 'customer_service', 'system'],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'error', 'critical'],
    default: 'info'
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    device: {
      type: String,
      os: String,
      browser: String
    },
    requestId: String,
    sessionId: String,
    referrer: String,
    additionalData: mongoose.Schema.Types.Mixed
  },
  result: {
    success: {
      type: Boolean,
      default: true
    },
    errorCode: String,
    errorMessage: String
  },
  relatedEntities: [{
    entityType: {
      type: String,
      enum: ['product', 'user', 'payment', 'shipment', 'refund']
    },
    entityId: mongoose.Schema.Types.ObjectId,
    entityName: String
  }],
  isVisible: {
    type: Boolean,
    default: true
  },
  tags: [String]
}, {
  timestamps: true
});

// Indexes for efficient querying
activityLogSchema.index({ order: 1, createdAt: -1 });
activityLogSchema.index({ orderNumber: 1, createdAt: -1 });
activityLogSchema.index({ 'actor.type': 1, 'actor.id': 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ category: 1, createdAt: -1 });
activityLogSchema.index({ severity: 1, createdAt: -1 });
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ tags: 1 });

// Static method to log activity
activityLogSchema.statics.logActivity = async function({
  order,
  orderNumber,
  actor,
  action,
  description,
  category,
  severity = 'info',
  oldValue = null,
  newValue = null,
  metadata = {},
  relatedEntities = [],
  tags = []
}) {
  try {
    const log = await this.create({
      order,
      orderNumber,
      actor,
      action,
      description,
      category,
      severity,
      oldValue,
      newValue,
      metadata,
      relatedEntities,
      tags,
      result: { success: true }
    });
    return log;
  } catch (error) {
    console.error('Error logging activity:', error);
    return null;
  }
};

// Static method to get order timeline
activityLogSchema.statics.getOrderTimeline = async function(orderId, options = {}) {
  const {
    limit = 100,
    skip = 0,
    category = null,
    severity = null,
    actorType = null,
    startDate = null,
    endDate = null
  } = options;

  const query = { order: orderId, isVisible: true };

  if (category) query.category = category;
  if (severity) query.severity = severity;
  if (actorType) query['actor.type'] = actorType;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await this.countDocuments(query);

  return {
    logs,
    total,
    hasMore: total > skip + logs.length
  };
};

// Static method to get user activity
activityLogSchema.statics.getUserActivity = async function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    action = null
  } = options;

  const query = { 'actor.id': userId, 'actor.type': 'user', isVisible: true };

  if (action) query.action = action;

  const logs = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await this.countDocuments(query);

  return { logs, total };
};

// Static method to get critical activities
activityLogSchema.statics.getCriticalActivities = async function(options = {}) {
  const {
    limit = 100,
    skip = 0,
    startDate = null,
    endDate = null
  } = options;

  const query = {
    severity: { $in: ['warning', 'error', 'critical'] },
    isVisible: true
  };

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const logs = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('order', 'orderNumber user')
    .lean();

  const total = await this.countDocuments(query);

  return { logs, total };
};

const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
