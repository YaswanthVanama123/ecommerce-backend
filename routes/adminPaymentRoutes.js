import express from 'express';
import {
  getAllPayments,
  getPaymentById,
  processRefund,
  getPaymentStatistics,
  updatePaymentStatus
} from '../controllers/adminPaymentController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Apply protect and isAdmin middleware to all routes
router.use(protect);
router.use(isAdmin);

// Payment management routes
router.get('/statistics', getPaymentStatistics);
router.get('/', getAllPayments);
router.get('/:id', getPaymentById);
router.post('/:id/refund', processRefund);
router.patch('/:id/status', updatePaymentStatus);

export default router;
