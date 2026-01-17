import express from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  batchUpdateOrderStatus,
  getDashboardAnalytics,
  getOrderAnalyticsByRange
} from '../controllers/orderController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import orderValidator from '../validators/orderValidator.js';

const router = express.Router();

// User routes - Order Management
router.post('/', protect, validate(orderValidator.create, 'body'), createOrder);
router.get('/', protect, validate(orderValidator.getOrders, 'query'), getMyOrders);
router.get('/:id', protect, validate(orderValidator.id, 'params'), getOrderById);
router.post('/:id/cancel', protect, validate(orderValidator.id, 'params'), validate(orderValidator.cancel, 'body'), cancelOrder);

// Admin routes - Order Management
router.get('/admin/orders', protect, isAdmin, validate(orderValidator.getAllOrders, 'query'), getAllOrders);
router.put('/admin/orders/:id/status', protect, isAdmin, validate(orderValidator.id, 'params'), validate(orderValidator.updateStatus, 'body'), updateOrderStatus);

// Batch operations (Admin)
router.put('/admin/orders/batch/status', protect, isAdmin, batchUpdateOrderStatus);

// Analytics routes (Admin)
router.get('/admin/analytics/dashboard', protect, isAdmin, getDashboardAnalytics);
router.get('/admin/analytics/range', protect, isAdmin, getOrderAnalyticsByRange);

export default router;
