import mongoose from 'mongoose';

const adminActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User Management
      'user_created',
      'user_updated',
      'user_deleted',
      'user_activated',
      'user_deactivated',
      'user_role_changed',
      'password_reset',

      // Product Management
      'product_created',
      'product_updated',
      'product_deleted',
      'product_status_changed',
      'bulk_product_update',
      'inventory_adjusted',

      // Order Management
      'order_created',
      'order_updated',
      'order_status_changed',
      'order_cancelled',
      'bulk_order_update',
      'refund_issued',

      // Category Management
      'category_created',
      'category_updated',
      'category_deleted',

      // Coupon Management
      'coupon_created',
      'coupon_updated',
      'coupon_deleted',

      // Settings
      'settings_updated',
      'payment_settings_updated',
      'shipping_settings_updated',
      'email_settings_updated',

      // Banner Management
      'banner_created',
      'banner_updated',
      'banner_deleted',

      // Security
      'login',
      'logout',
      'login_failed',
      'password_changed',
      'two_factor_enabled',
      'two_factor_disabled',

      // System
      'backup_created',
      'backup_restored',
      'system_settings_changed',
      'admin_user_created',
      'admin_user_updated',
      'admin_user_deleted',

      // Export/Import
      'data_exported',
      'data_imported',
      'bulk_delete'
    ]
  },
  resource: {
    type: {
      type: String,
      enum: [
        'user', 'admin', 'product', 'order', 'category', 'coupon',
        'banner', 'settings', 'backup', 'review', 'inventory',
        'shipping', 'payment', 'notification', 'system'
      ],
      required: true
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  description: {
    type: String,
    required: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: String,
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: String,
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes for efficient querying
adminActivityLogSchema.index({ user: 1, createdAt: -1 });
adminActivityLogSchema.index({ action: 1, createdAt: -1 });
adminActivityLogSchema.index({ 'resource.type': 1, 'resource.id': 1, createdAt: -1 });
adminActivityLogSchema.index({ severity: 1, createdAt: -1 });
adminActivityLogSchema.index({ createdAt: -1 });
adminActivityLogSchema.index({ ipAddress: 1, createdAt: -1 });
adminActivityLogSchema.index({ success: 1, createdAt: -1 });

// Static method to log activity
adminActivityLogSchema.statics.log = async function({
  user,
  userName,
  userEmail,
  action,
  resource,
  changes = {},
  description,
  severity = 'low',
  ipAddress,
  userAgent = '',
  success = true,
  errorMessage = '',
  metadata = {}
}) {
  try {
    const log = await this.create({
      user,
      userName,
      userEmail,
      action,
      resource,
      changes,
      description,
      severity,
      ipAddress,
      userAgent,
      success,
      errorMessage,
      metadata
    });
    return log;
  } catch (error) {
    console.error('Error logging admin activity:', error);
    return null;
  }
};

// Static method to get user activities
adminActivityLogSchema.statics.getUserActivities = async function(userId, options = {}) {
  const {
    limit = 50,
    skip = 0,
    action = null,
    startDate = null,
    endDate = null
  } = options;

  const query = { user: userId };

  if (action) query.action = action;

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

  return { logs, total, hasMore: total > skip + logs.length };
};

// Static method to get resource activities
adminActivityLogSchema.statics.getResourceActivities = async function(resourceType, resourceId, options = {}) {
  const {
    limit = 50,
    skip = 0
  } = options;

  const query = {
    'resource.type': resourceType,
    'resource.id': resourceId
  };

  const logs = await this.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'firstName lastName email')
    .lean();

  const total = await this.countDocuments(query);

  return { logs, total, hasMore: total > skip + logs.length };
};

// Static method to get critical activities
adminActivityLogSchema.statics.getCriticalActivities = async function(options = {}) {
  const {
    limit = 100,
    skip = 0,
    startDate = null,
    endDate = null
  } = options;

  const query = {
    severity: { $in: ['high', 'critical'] }
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
    .populate('user', 'firstName lastName email')
    .lean();

  const total = await this.countDocuments(query);

  return { logs, total };
};

// Static method to get activity statistics
adminActivityLogSchema.statics.getStatistics = async function(startDate, endDate) {
  const query = {};

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }

  const [
    totalActivities,
    actionBreakdown,
    resourceBreakdown,
    severityBreakdown,
    failedActivities,
    topUsers
  ] = await Promise.all([
    this.countDocuments(query),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$action', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$resource.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]),
    this.countDocuments({ ...query, success: false }),
    this.aggregate([
      { $match: query },
      { $group: { _id: '$user', userName: { $first: '$userName' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])
  ]);

  return {
    totalActivities,
    actionBreakdown,
    resourceBreakdown,
    severityBreakdown,
    failedActivities,
    topUsers
  };
};

const AdminActivityLog = mongoose.model('AdminActivityLog', adminActivityLogSchema);

export default AdminActivityLog;
