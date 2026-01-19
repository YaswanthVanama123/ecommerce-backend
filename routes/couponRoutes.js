import express from 'express';
const router = express.Router();
import {
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  toggleCouponStatus,
  getCouponStatistics,
  validateCoupon,
  applyCoupon
} from '../controllers/couponController.js';
import { protect, admin } from '../middleware/auth.js';

// Admin routes
router.get('/stats/overview', protect, admin, getCouponStatistics);
router.get('/', protect, admin, getAllCoupons);
router.get('/:id', protect, admin, getCouponById);
router.post('/', protect, admin, createCoupon);
router.put('/:id', protect, admin, updateCoupon);
router.delete('/:id', protect, admin, deleteCoupon);
router.patch('/:id/toggle', protect, admin, toggleCouponStatus);

// User routes
router.post('/validate', protect, validateCoupon);
router.post('/apply', protect, applyCoupon);

export default router;
