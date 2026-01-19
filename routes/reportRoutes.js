import express from 'express';
import {
  getSalesReport,
  getRevenueReport,
  getInventoryReport,
  getCustomerReport,
  getProductPerformanceReport,
  generateCustomReport,
  exportReport,
  getScheduledReports,
  createScheduledReport,
  updateScheduledReport,
  deleteScheduledReport,
  getReportHistory,
  getTopPerformers,
  getBottomPerformers,
  getSalesSummary,
  getRevenueByCategory,
  getRevenueByProduct,
  getInventoryValuation,
  getCustomerLifetimeValue,
  getProductMetrics
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// All routes require authentication and admin access
router.use(protect);
router.use(isAdmin);

// Main Report Endpoints
router.get('/sales', getSalesReport);
router.get('/revenue', getRevenueReport);
router.get('/inventory', getInventoryReport);
router.get('/customers', getCustomerReport);
router.get('/products', getProductPerformanceReport);

// Detailed Report Endpoints
router.get('/sales/summary', getSalesSummary);
router.get('/revenue/category', getRevenueByCategory);
router.get('/revenue/product', getRevenueByProduct);
router.get('/inventory/valuation', getInventoryValuation);
router.get('/customers/lifetime-value', getCustomerLifetimeValue);
router.get('/products/metrics', getProductMetrics);

// Performance Endpoints
router.get('/top-performers', getTopPerformers);
router.get('/bottom-performers', getBottomPerformers);

// Custom Report
router.post('/custom', generateCustomReport);

// Export Report
router.post('/export', exportReport);

// Scheduled Reports Management
router.get('/scheduled', getScheduledReports);
router.post('/scheduled', createScheduledReport);
router.put('/scheduled/:id', updateScheduledReport);
router.delete('/scheduled/:id', deleteScheduledReport);

// Report History
router.get('/history', getReportHistory);

export default router;
