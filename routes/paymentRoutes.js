import express from 'express';
import {
  createPaymentIntent,
  verifyPayment,
  getPaymentMethods,
  processRefund
} from '../controllers/paymentController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import paymentValidator from '../validators/paymentValidator.js';

const router = express.Router();

// User routes
router.post(
  '/create-intent',
  protect,
  validate(paymentValidator.createIntent, 'body'),
  createPaymentIntent
);

router.post(
  '/verify',
  protect,
  validate(paymentValidator.verify, 'body'),
  verifyPayment
);

router.get('/methods', protect, getPaymentMethods);

// Admin routes
router.post(
  '/refund',
  protect,
  isAdmin,
  validate(paymentValidator.refund, 'body'),
  processRefund
);

export default router;
