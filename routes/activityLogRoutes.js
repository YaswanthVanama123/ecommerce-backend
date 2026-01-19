import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getActivityLogs,
  getActivityStats,
  getUserActivities,
  getResourceActivities,
  exportActivityLogs
} from '../controllers/activityLogController.js';

const router = express.Router();

// Protect all routes and require admin access
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// Activity log routes
router.get('/', getActivityLogs);
router.get('/stats', getActivityStats);
router.get('/user/:userId', getUserActivities);
router.get('/resource/:resourceType/:resourceId', getResourceActivities);
router.get('/export', exportActivityLogs);

export default router;
