import express from 'express';
import {
  getCustomers,
  getCustomerById,
  getCustomerOrders,
  updateCustomer,
  deleteCustomer,
  getCustomerStatistics
} from '../controllers/customerController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require admin access
router.use(protect);
router.use(admin);

// Customer statistics
router.get('/statistics', getCustomerStatistics);

// Customer CRUD operations
router.get('/', getCustomers);
router.get('/:id', getCustomerById);
router.get('/:id/orders', getCustomerOrders);
router.patch('/:id', updateCustomer);
router.delete('/:id', deleteCustomer);

export default router;
