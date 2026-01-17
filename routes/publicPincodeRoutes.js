import express from 'express';
import {
  checkPincodeServiceability,
  checkProductDeliverability,
} from '../controllers/pincodeController.js';

const router = express.Router();

// ==================== PUBLIC PINCODE ROUTES ====================
// @route   /api/pincode

// Check if a pincode is serviceable
router.post('/check', checkPincodeServiceability);

// Check if a product can be delivered to a pincode
router.post('/check-product', checkProductDeliverability);

export default router;
