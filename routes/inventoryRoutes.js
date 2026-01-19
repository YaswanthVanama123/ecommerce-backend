import express from 'express';
import {
  getInventoryOverview,
  getLowStockAlerts,
  adjustStock,
  getInventoryHistory,
  createReorder,
  getInventoryStatistics,
  bulkStockUpdate
} from '../controllers/inventoryController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and admin privileges
router.use(protect);
router.use(admin);

// GET /api/admin/inventory - Get inventory overview
router.get('/', getInventoryOverview);

// GET /api/admin/inventory/low-stock - Get low stock alerts
router.get('/low-stock', getLowStockAlerts);

// GET /api/admin/inventory/history - Get inventory adjustment history
router.get('/history', getInventoryHistory);

// GET /api/admin/inventory/statistics - Get inventory statistics
router.get('/statistics', getInventoryStatistics);

// POST /api/admin/inventory/adjust - Manual stock adjustment
router.post('/adjust', adjustStock);

// POST /api/admin/inventory/reorder - Create reorder
router.post('/reorder', createReorder);

// POST /api/admin/inventory/bulk-update - Bulk stock update
router.post('/bulk-update', bulkStockUpdate);

export default router;
