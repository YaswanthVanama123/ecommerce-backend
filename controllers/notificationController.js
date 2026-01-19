import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import orderNotificationService from '../services/orderNotifications.js';

/**
 * Notification Controller
 *
 * Handles notification-related operations:
 * - Get user notifications
 * - Mark as read/unread
 * - Delete notifications
 * - Manage notification preferences
 * - Get notification statistics
 */

// @desc    Get user notifications with pagination and filters
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      read,
      priority
    } = req.query;

    // Build filter
    const filter = { user: req.user._id };

    if (type) {
      filter.type = type;
    }

    if (read !== undefined) {
      filter.read = read === 'true';
    }

    if (priority) {
      filter.priority = priority;
    }

    // Get notifications with pagination
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);

    return sendSuccess(res, 200, 'Notifications fetched successfully', {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return sendError(res, 500, 'Failed to fetch notifications', error.message);
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.getUnreadCount(req.user._id);

    return sendSuccess(res, 200, 'Unread count fetched successfully', {
      unreadCount: count
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return sendError(res, 500, 'Failed to fetch unread count', error.message);
  }
};

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
export const getNotificationById = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found');
    }

    return sendSuccess(res, 200, 'Notification fetched successfully', {
      notification
    });
  } catch (error) {
    console.error('Error fetching notification:', error);
    return sendError(res, 500, 'Failed to fetch notification', error.message);
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found');
    }

    await notification.markAsRead();

    return sendSuccess(res, 200, 'Notification marked as read', {
      notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return sendError(res, 500, 'Failed to mark notification as read', error.message);
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user._id);

    return sendSuccess(res, 200, 'All notifications marked as read');
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return sendError(res, 500, 'Failed to mark all notifications as read', error.message);
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found');
    }

    return sendSuccess(res, 200, 'Notification deleted successfully');
  } catch (error) {
    console.error('Error deleting notification:', error);
    return sendError(res, 500, 'Failed to delete notification', error.message);
  }
};

// @desc    Delete all read notifications
// @route   DELETE /api/notifications/read
// @access  Private
export const deleteAllRead = async (req, res, next) => {
  try {
    const result = await Notification.deleteMany({
      user: req.user._id,
      read: true
    });

    return sendSuccess(res, 200, `${result.deletedCount} notifications deleted`);
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    return sendError(res, 500, 'Failed to delete notifications', error.message);
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private
export const getNotificationStats = async (req, res, next) => {
  try {
    const stats = await orderNotificationService.getNotificationStats(req.user._id);

    return sendSuccess(res, 200, 'Notification stats fetched successfully', stats);
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return sendError(res, 500, 'Failed to fetch notification stats', error.message);
  }
};

// ============================================================================
// Notification Preferences
// ============================================================================

// @desc    Get user notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
export const getNotificationPreferences = async (req, res, next) => {
  try {
    const preferences = await NotificationPreference.getOrCreateForUser(req.user._id);

    return sendSuccess(res, 200, 'Notification preferences fetched successfully', {
      preferences
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return sendError(res, 500, 'Failed to fetch notification preferences', error.message);
  }
};

// @desc    Update notification preferences
// @route   PUT /api/notifications/preferences
// @access  Private
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const preferences = await NotificationPreference.getOrCreateForUser(req.user._id);

    // Update preferences
    const {
      channels,
      quietHours,
      marketing,
      minimumPriority
    } = req.body;

    if (channels) {
      // Update individual channel preferences
      Object.keys(channels).forEach(channelKey => {
        if (preferences.channels[channelKey]) {
          Object.assign(preferences.channels[channelKey], channels[channelKey]);
        }
      });
    }

    if (quietHours) {
      Object.assign(preferences.quietHours, quietHours);
    }

    if (marketing) {
      Object.assign(preferences.marketing, marketing);
    }

    if (minimumPriority) {
      preferences.minimumPriority = minimumPriority;
    }

    await preferences.save();

    return sendSuccess(res, 200, 'Notification preferences updated successfully', {
      preferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return sendError(res, 500, 'Failed to update notification preferences', error.message);
  }
};

// @desc    Update channel preference
// @route   PUT /api/notifications/preferences/channel/:channel
// @access  Private
export const updateChannelPreference = async (req, res, next) => {
  try {
    const { channel } = req.params;
    const { enabled, events, phoneNumber } = req.body;

    const preferences = await NotificationPreference.getOrCreateForUser(req.user._id);

    if (!preferences.channels[channel]) {
      return sendError(res, 400, 'Invalid channel');
    }

    // Update channel settings
    if (enabled !== undefined) {
      preferences.channels[channel].enabled = enabled;
    }

    if (events) {
      Object.assign(preferences.channels[channel].events, events);
    }

    if (phoneNumber !== undefined && ['sms', 'whatsapp'].includes(channel)) {
      preferences.channels[channel].phoneNumber = phoneNumber;
    }

    await preferences.save();

    return sendSuccess(res, 200, `${channel} preferences updated successfully`, {
      channel: preferences.channels[channel]
    });
  } catch (error) {
    console.error('Error updating channel preference:', error);
    return sendError(res, 500, 'Failed to update channel preference', error.message);
  }
};

// @desc    Add push notification device token
// @route   POST /api/notifications/preferences/push-device
// @access  Private
export const addPushDevice = async (req, res, next) => {
  try {
    const { token, platform } = req.body;

    if (!token || !platform) {
      return sendError(res, 400, 'Token and platform are required');
    }

    if (!['web', 'android', 'ios'].includes(platform)) {
      return sendError(res, 400, 'Invalid platform');
    }

    const preferences = await NotificationPreference.getOrCreateForUser(req.user._id);
    await preferences.addPushDevice(token, platform);

    return sendSuccess(res, 200, 'Push device added successfully', {
      devices: preferences.channels.push.devices
    });
  } catch (error) {
    console.error('Error adding push device:', error);
    return sendError(res, 500, 'Failed to add push device', error.message);
  }
};

// @desc    Remove push notification device token
// @route   DELETE /api/notifications/preferences/push-device/:token
// @access  Private
export const removePushDevice = async (req, res, next) => {
  try {
    const { token } = req.params;

    const preferences = await NotificationPreference.getOrCreateForUser(req.user._id);
    await preferences.removePushDevice(token);

    return sendSuccess(res, 200, 'Push device removed successfully', {
      devices: preferences.channels.push.devices
    });
  } catch (error) {
    console.error('Error removing push device:', error);
    return sendError(res, 500, 'Failed to remove push device', error.message);
  }
};

// @desc    Update quiet hours
// @route   PUT /api/notifications/preferences/quiet-hours
// @access  Private
export const updateQuietHours = async (req, res, next) => {
  try {
    const { enabled, startTime, endTime, timezone } = req.body;

    const preferences = await NotificationPreference.getOrCreateForUser(req.user._id);

    if (enabled !== undefined) {
      preferences.quietHours.enabled = enabled;
    }

    if (startTime) {
      preferences.quietHours.startTime = startTime;
    }

    if (endTime) {
      preferences.quietHours.endTime = endTime;
    }

    if (timezone) {
      preferences.quietHours.timezone = timezone;
    }

    await preferences.save();

    return sendSuccess(res, 200, 'Quiet hours updated successfully', {
      quietHours: preferences.quietHours
    });
  } catch (error) {
    console.error('Error updating quiet hours:', error);
    return sendError(res, 500, 'Failed to update quiet hours', error.message);
  }
};

// @desc    Test notification
// @route   POST /api/notifications/test
// @access  Private
export const sendTestNotification = async (req, res, next) => {
  try {
    const { channel = 'inApp' } = req.body;

    const result = await orderNotificationService.sendNotification(
      req.user._id,
      'order_placed',
      {
        orderId: 'test-order-id',
        orderNumber: 'TEST-123',
        amount: 999,
        items: []
      },
      'medium'
    );

    return sendSuccess(res, 200, 'Test notification sent', result);
  } catch (error) {
    console.error('Error sending test notification:', error);
    return sendError(res, 500, 'Failed to send test notification', error.message);
  }
};

export default {
  getNotifications,
  getUnreadCount,
  getNotificationById,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead,
  getNotificationStats,
  getNotificationPreferences,
  updateNotificationPreferences,
  updateChannelPreference,
  addPushDevice,
  removePushDevice,
  updateQuietHours,
  sendTestNotification
};
