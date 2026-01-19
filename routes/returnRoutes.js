import express from 'express';
import {
  createReturnRequest,
  getUserReturns,
  getReturnById,
  getAllReturns,
  updateReturnStatus,
  schedulePickup,
  performQualityCheck,
  processRefund,
  completeRefund,
  cancelReturnRequest,
  getReturnAnalytics,
  checkReturnEligibility
} from '../controllers/returnController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin, isSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// User routes - Return Management
router.post('/', protect, createReturnRequest);
router.get('/', protect, getUserReturns);
router.get('/check-eligibility/:orderId', protect, checkReturnEligibility);
router.get('/:id', protect, getReturnById);
router.post('/:id/cancel', protect, cancelReturnRequest);

// Admin routes - Return Management
router.get('/admin/all', protect, isAdmin, getAllReturns);
router.put('/:id/status', protect, isAdmin, updateReturnStatus);
router.post('/:id/schedule-pickup', protect, isAdmin, schedulePickup);
router.post('/:id/quality-check', protect, isAdmin, performQualityCheck);
router.post('/:id/process-refund', protect, isAdmin, processRefund);
router.post('/:id/complete-refund', protect, isAdmin, completeRefund);

// Analytics routes (Admin/Superadmin)
router.get('/admin/analytics', protect, isAdmin, getReturnAnalytics);
router.get('/superadmin/analytics', protect, isSuperAdmin, getReturnAnalytics);

export default router;
