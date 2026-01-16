import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUserStatus,
  getAllAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getUserActivityMetrics,
  getProductAnalytics,
  getCategoryStatistics,
  getRevenueAnalytics,
  getCustomerLTV,
  getInventoryStatus,
  getDashboardStats
} from '../controllers/adminController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin, isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// User management routes (SuperAdmin only)
router.get('/users', isSuperAdmin, getAllUsers);
router.get('/users/:id', isSuperAdmin, getUserById);
router.put('/users/:id/status', isSuperAdmin, updateUserStatus);

// Admin management routes (SuperAdmin only)
router.get('/admins', isSuperAdmin, getAllAdmins);
router.post('/admins', isSuperAdmin, createAdmin);
router.put('/admins/:id', isSuperAdmin, updateAdmin);
router.delete('/admins/:id', isSuperAdmin, deleteAdmin);

// Analytics routes (Admin and SuperAdmin)
router.get('/analytics/dashboard', isAdmin, getDashboardStats);
router.get('/analytics/users', isAdmin, getUserActivityMetrics);
router.get('/analytics/products', isAdmin, getProductAnalytics);
router.get('/analytics/categories', isAdmin, getCategoryStatistics);
router.get('/analytics/revenue', isAdmin, getRevenueAnalytics);
router.get('/analytics/customer-ltv', isAdmin, getCustomerLTV);
router.get('/analytics/inventory', isAdmin, getInventoryStatus);

export default router;
