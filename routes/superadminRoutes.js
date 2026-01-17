import express from 'express';
import {
  // User Management
  getAllUsers,
  getUserById,
  updateUser,
  changeUserRole,
  changeUserStatus,
  deleteUser,
  // Admin Management
  getAllAdmins,
  promoteToAdmin,
  demoteToUser,
  // Analytics
  getDashboardStats,
  getUserAnalytics,
  getProductAnalytics,
  getRevenueAnalytics,
  // Audit Logs
  getAuditLogs,
  getAuditLogById,
  // Settings
  getSettings,
  updateSettings
} from '../controllers/superadminController.js';
import { getAllOrders, getOrderById, updateOrderStatus } from '../controllers/orderController.js';
import { getProducts, getProductById, createProduct, updateProduct, deleteProduct } from '../controllers/productController.js';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Apply protect and superadmin middleware to all routes
router.use(protect);
router.use(isSuperAdmin);

// Middleware to convert route param to query param for activity logs
const activityLogsMiddleware = (req, res, next) => {
  req.query.userId = req.params.id;
  next();
};

// ==================== USER MANAGEMENT ROUTES ====================
// @route   /api/superadmin/users

// Get all users with filtering and pagination
router.get('/users', getAllUsers);

// Get user details by ID
router.get('/users/:id', getUserById);

// Update user details
router.put('/users/:id', updateUser);

// Change user role (promote/demote)
router.patch('/users/:id/role', changeUserRole);

// Activate/deactivate user
router.patch('/users/:id/status', changeUserStatus);

// Delete user (soft delete by default, ?permanent=true for hard delete)
router.delete('/users/:id', deleteUser);

// ==================== ADMIN MANAGEMENT ROUTES ====================
// @route   /api/superadmin/admins

// Get all admins
router.get('/admins', getAllAdmins);

// Get admin activity logs (converts :id to userId query param)
router.get('/admins/:id/activity-logs', activityLogsMiddleware, getAuditLogs);

// Promote user to admin
router.post('/admins/promote', promoteToAdmin);

// Demote admin to user
router.post('/admins/demote', demoteToUser);

// ==================== ANALYTICS ROUTES ====================
// @route   /api/superadmin/analytics

// Get dashboard statistics
router.get('/analytics/dashboard', getDashboardStats);

// Get user analytics
router.get('/analytics/users', getUserAnalytics);

// Get product analytics
router.get('/analytics/products', getProductAnalytics);

// Get revenue analytics
router.get('/analytics/revenue', getRevenueAnalytics);

// Get top products (using product analytics)
router.get('/analytics/top-products', getProductAnalytics);

// Get top customers (alias for user analytics)
router.get('/analytics/top-customers', getUserAnalytics);

// ==================== AUDIT LOG ROUTES ====================
// @route   /api/superadmin/audit

// Get audit logs with filtering
router.get('/audit', getAuditLogs);

// Get audit log details by ID
router.get('/audit/:id', getAuditLogById);

// ==================== SETTINGS ROUTES ====================
// @route   /api/superadmin/settings

// Get system settings
router.get('/settings', getSettings);

// Update system settings
router.put('/settings', updateSettings);

// ==================== ORDER MANAGEMENT ROUTES ====================
// @route   /api/superadmin/orders

// Get all orders with filtering
router.get('/orders', getAllOrders);

// Get order details by ID
router.get('/orders/:id', getOrderById);

// Update order status
router.patch('/orders/:id/status', updateOrderStatus);

// ==================== PRODUCT MANAGEMENT ROUTES ====================
// @route   /api/superadmin/products

// Get all products with filtering
router.get('/products', getProducts);

// Get product details by ID
router.get('/products/:id', getProductById);

// Create new product
router.post('/products', createProduct);

// Update product
router.put('/products/:id', updateProduct);

// Delete product
router.delete('/products/:id', deleteProduct);

// ==================== CATEGORY MANAGEMENT ROUTES ====================
// @route   /api/superadmin/categories

// Get all categories
router.get('/categories', getCategories);

// Get category details by ID
router.get('/categories/:id', getCategoryById);

// Create new category
router.post('/categories', createCategory);

// Update category
router.put('/categories/:id', updateCategory);

// Delete category
router.delete('/categories/:id', deleteCategory);

// ==================== REPORTS ROUTES ====================
// @route   /api/superadmin/reports
// These are aliases to analytics endpoints for backward compatibility

// Sales report
router.get('/reports/sales', getProductAnalytics);

// Users report
router.get('/reports/users', getUserAnalytics);

// Products report
router.get('/reports/products', getProductAnalytics);

// Orders report
router.get('/reports/orders', getRevenueAnalytics);

// Custom report
router.post('/reports/custom', getDashboardStats);

export default router;
