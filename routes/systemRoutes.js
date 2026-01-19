import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { getSystemStatus } from '../controllers/systemStatusController.js';

const router = express.Router();

// Protect all routes and require admin access
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// System status route
router.get('/status', getSystemStatus);

export default router;
