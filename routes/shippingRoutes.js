import express from 'express';
import {
  createShipping,
  getShippingByTrackingNumber,
  getShippingByOrderId,
  updateShippingStatus,
  updateTrackingInfo,
  getAllShipments,
  handleCarrierWebhook,
  getDeliveryTimeline
} from '../controllers/shippingController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Public routes
router.get('/track/:trackingNumber', getShippingByTrackingNumber);
router.post('/webhook/carrier-update', handleCarrierWebhook);

// Admin routes - Protected (must be before parameterized routes)
router.get('/admin/shipments', protect, isAdmin, getAllShipments);
router.post('/', protect, isAdmin, createShipping);
router.put('/:id/status', protect, isAdmin, updateShippingStatus);
router.put('/:id/tracking', protect, isAdmin, updateTrackingInfo);

// User routes - Protected
router.get('/order/:orderId', protect, getShippingByOrderId);
router.get('/:id/timeline', protect, getDeliveryTimeline);

export default router;
