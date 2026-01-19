import express from 'express';
import {
  createShipping,
  updateShippingStatus,
  getShippingByOrder,
  trackShipment,
  updateShippingLocation,
  getShipmentsByCarrier,
  getAllShipments,
  getShippingStatistics,
  updateTrackingInfo,
  handleCarrierWebhook,
  getDeliveryTimeline
} from '../controllers/shippingController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import shippingValidator from '../validators/shippingValidator.js';

const router = express.Router();

// Public routes
router.get('/track/:trackingNumber', trackShipment);

// Webhook route (needs authentication in production)
router.post('/webhook/carrier-update', handleCarrierWebhook);

// Admin routes - Must be before parameterized routes
router.get('/admin/shipments', protect, isAdmin, validate(shippingValidator.getAll, 'query'), getAllShipments);
router.get('/admin/all', protect, isAdmin, validate(shippingValidator.getAll, 'query'), getAllShipments);
router.get('/admin/statistics', protect, isAdmin, getShippingStatistics);
router.get('/carrier/:carrier', protect, isAdmin, validate(shippingValidator.carrier, 'params'), getShipmentsByCarrier);
router.post('/create', protect, isAdmin, validate(shippingValidator.create, 'body'), createShipping);
router.put('/:id/update', protect, isAdmin, validate(shippingValidator.id, 'params'), validate(shippingValidator.updateStatus, 'body'), updateShippingStatus);
router.put('/:id/location', protect, isAdmin, validate(shippingValidator.id, 'params'), validate(shippingValidator.updateLocation, 'body'), updateShippingLocation);
router.put('/:id/tracking', protect, isAdmin, validate(shippingValidator.id, 'params'), validate(shippingValidator.updateTracking, 'body'), updateTrackingInfo);

// Protected user routes
router.get('/:orderId', protect, validate(shippingValidator.orderId, 'params'), getShippingByOrder);
router.get('/:id/timeline', protect, validate(shippingValidator.id, 'params'), getDeliveryTimeline);

export default router;
