import express from 'express';
import {
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
} from '../controllers/notificationController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * Notification Routes
 *
 * All routes require authentication
 */

// Notification CRUD
router.get('/', protect, getNotifications);
router.get('/unread-count', protect, getUnreadCount);
router.get('/stats', protect, getNotificationStats);
router.get('/:id', protect, getNotificationById);
router.put('/:id/read', protect, markAsRead);
router.put('/read-all', protect, markAllAsRead);
router.delete('/:id', protect, deleteNotification);
router.delete('/read', protect, deleteAllRead);

// Notification Preferences
router.get('/preferences', protect, getNotificationPreferences);
router.put('/preferences', protect, updateNotificationPreferences);
router.put('/preferences/channel/:channel', protect, updateChannelPreference);
router.put('/preferences/quiet-hours', protect, updateQuietHours);

// Push Notification Devices
router.post('/preferences/push-device', protect, addPushDevice);
router.delete('/preferences/push-device/:token', protect, removePushDevice);

// Test Notification
router.post('/test', protect, sendTestNotification);

export default router;
