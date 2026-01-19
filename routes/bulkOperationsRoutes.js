import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  bulkProductOperation,
  bulkOrderOperation,
  bulkCustomerOperation,
  exportData
} from '../controllers/bulkOperationsController.js';

const router = express.Router();

// Protect all routes and require admin access
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// Bulk operations routes
router.post('/products', bulkProductOperation);
router.post('/orders', bulkOrderOperation);
router.post('/customers', bulkCustomerOperation);

// Export routes
router.post('/products/export', exportData('products'));
router.post('/orders/export', exportData('orders'));
router.post('/customers/export', exportData('customers'));

export default router;
