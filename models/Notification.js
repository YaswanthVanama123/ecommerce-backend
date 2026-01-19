import mongoose from 'mongoose';

/**
 * Notification Model
 *
 * Handles in-app notifications for users
 * Features:
 * - Multi-type notifications (order, shipping, payment, system)
 * - Read/unread status tracking
 * - Priority levels
 * - Rich data payload
 * - Action URLs
 * - Auto-cleanup of old notifications
 */

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'order_placed',
      'payment_received',
      'order_confirmed',
      'order_processing',
      'order_shipped',
      'out_for_delivery',
      'order_delivered',
      'order_cancelled',
      'return_initiated',
      'return_approved',
      'refund_processed',
      'low_stock',
      'new_message',
      'system'
    ],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  data: {
    // Additional structured data for the notification
    orderId: String,
    orderNumber: String,
    trackingNumber: String,
    amount: Number,
    productId: String,
    productName: String,
    imageUrl: String,
    actionUrl: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  actionUrl: {
    type: String,
    trim: true
  },
  actionText: {
    type: String,
    trim: true,
    maxlength: 50
  },
  expiresAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Compound index for user notifications query (most common)
notificationSchema.index({ user: 1, createdAt: -1 }, { name: 'user_created_idx' });

// Compound index for unread notifications
notificationSchema.index({ user: 1, read: 1, createdAt: -1 }, { name: 'user_read_created_idx' });

// Index for notification type queries
notificationSchema.index({ user: 1, type: 1, createdAt: -1 }, { name: 'user_type_created_idx' });

// TTL index for auto-cleanup of expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: 'expires_at_ttl_idx' });

// TTL index for auto-cleanup of old read notifications (90 days)
notificationSchema.index(
  { readAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60, // 90 days
    partialFilterExpression: { read: true, readAt: { $ne: null } },
    name: 'read_at_ttl_idx'
  }
);

// Method to mark notification as read
notificationSchema.methods.markAsRead = function() {
  if (!this.read) {
    this.read = true;
    this.readAt = new Date();
  }
  return this.save();
};

// Static method to mark all user notifications as read
notificationSchema.statics.markAllAsRead = async function(userId) {
  return this.updateMany(
    { user: userId, read: false },
    { read: true, readAt: new Date() }
  );
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = async function(userId) {
  return this.countDocuments({ user: userId, read: false });
};

// Static method to cleanup old notifications
notificationSchema.statics.cleanupOld = async function(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  return this.deleteMany({
    read: true,
    readAt: { $lt: cutoffDate }
  });
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
