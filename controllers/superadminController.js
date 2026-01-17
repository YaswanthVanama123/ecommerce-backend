import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import AuditLog from '../models/AuditLog.js';
import Settings from '../models/Settings.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import mongoose from 'mongoose';

// ==================== USER MANAGEMENT ====================

// @desc    Get all users with advanced filtering
// @route   GET /api/superadmin/users
// @access  Private/SuperAdmin
export const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      role = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Search filter
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Role filter
    if (role) {
      filter.role = role;
    }

    // Status filter
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get total count
    const total = await User.countDocuments(filter);

    // Fetch users
    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, 200, {
      users,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalUsers: total,
        limit: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    }, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get user details by ID
// @route   GET /api/superadmin/users/:id
// @access  Private/SuperAdmin
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(id)
      .select('-password -refreshToken')
      .lean();

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Get user's order count and total spent
    const orderStats = await Order.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', 'delivered'] }, 1, 0] }
          }
        }
      }
    ]);

    const stats = orderStats[0] || { totalOrders: 0, totalSpent: 0, completedOrders: 0 };

    sendSuccess(res, 200, {
      user,
      stats
    }, 'User details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update user details
// @route   PUT /api/superadmin/users/:id
// @access  Private/SuperAdmin
export const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, email } = req.body;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Store old data for audit log
    const oldData = {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      email: user.email
    };

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (email && email !== user.email) {
      // Check if email already exists
      const emailExists = await User.findOne({ email, _id: { $ne: id } });
      if (emailExists) {
        return sendError(res, 400, 'Email already in use');
      }
      user.email = email;
    }

    await user.save();

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_UPDATED',
      entity: 'User',
      entityId: id,
      details: { userId: id, updatedFields: Object.keys(req.body) },
      changes: {
        before: oldData,
        after: {
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          email: user.email
        }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    sendSuccess(res, 200, user, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Change user role
// @route   PATCH /api/superadmin/users/:id/role
// @access  Private/SuperAdmin
export const changeUserRole = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    // Validate role
    if (!['user', 'admin', 'superadmin'].includes(role)) {
      return sendError(res, 400, 'Invalid role. Must be: user, admin, or superadmin');
    }

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Prevent superadmin from demoting themselves
    if (user._id.toString() === req.user._id.toString() && role !== 'superadmin') {
      return sendError(res, 400, 'Cannot change your own role');
    }

    const oldRole = user.role;
    user.role = role;
    await user.save();

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_ROLE_CHANGED',
      entity: 'User',
      entityId: id,
      details: { userId: id, oldRole, newRole: role },
      changes: {
        before: { role: oldRole },
        after: { role }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    sendSuccess(res, 200, user, `User role changed from ${oldRole} to ${role}`);
  } catch (error) {
    next(error);
  }
};

// @desc    Activate/deactivate user
// @route   PATCH /api/superadmin/users/:id/status
// @access  Private/SuperAdmin
export const changeUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    if (typeof isActive !== 'boolean') {
      return sendError(res, 400, 'isActive must be a boolean value');
    }

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Prevent superadmin from deactivating themselves
    if (user._id.toString() === req.user._id.toString() && !isActive) {
      return sendError(res, 400, 'Cannot deactivate your own account');
    }

    const oldStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'USER_STATUS_CHANGED',
      entity: 'User',
      entityId: id,
      details: { userId: id, status: isActive ? 'activated' : 'deactivated' },
      changes: {
        before: { isActive: oldStatus },
        after: { isActive }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    sendSuccess(res, 200, user, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user (soft delete by deactivating)
// @route   DELETE /api/superadmin/users/:id
// @access  Private/SuperAdmin
export const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Prevent superadmin from deleting themselves
    if (user._id.toString() === req.user._id.toString()) {
      return sendError(res, 400, 'Cannot delete your own account');
    }

    if (permanent === 'true') {
      // Permanent deletion
      await User.findByIdAndDelete(id);

      // Log audit
      await AuditLog.create({
        user: req.user._id,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: id,
        details: { userId: id, deletionType: 'permanent' },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      sendSuccess(res, 200, null, 'User permanently deleted');
    } else {
      // Soft delete (deactivate)
      user.isActive = false;
      await user.save();

      // Log audit
      await AuditLog.create({
        user: req.user._id,
        action: 'USER_DELETED',
        entity: 'User',
        entityId: id,
        details: { userId: id, deletionType: 'soft' },
        changes: {
          before: { isActive: true },
          after: { isActive: false }
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      });

      sendSuccess(res, 200, user, 'User deactivated successfully');
    }
  } catch (error) {
    next(error);
  }
};

// ==================== ADMIN MANAGEMENT ====================

// @desc    Get all admins
// @route   GET /api/superadmin/admins
// @access  Private/SuperAdmin
export const getAllAdmins = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, includeSuper = 'false' } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = includeSuper === 'true'
      ? { role: { $in: ['admin', 'superadmin'] } }
      : { role: 'admin' };

    const total = await User.countDocuments(filter);

    const admins = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, 200, {
      admins,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalAdmins: total,
        limit: limitNum
      }
    }, 'Admins retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Promote user to admin
// @route   POST /api/superadmin/admins/promote
// @access  Private/SuperAdmin
export const promoteToAdmin = async (req, res, next) => {
  try {
    const { userId } = req.body;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (user.role === 'admin' || user.role === 'superadmin') {
      return sendError(res, 400, 'User is already an admin or superadmin');
    }

    const oldRole = user.role;
    user.role = 'admin';
    await user.save();

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'ADMIN_PROMOTED',
      entity: 'User',
      entityId: userId,
      details: { userId, promotedFrom: oldRole },
      changes: {
        before: { role: oldRole },
        after: { role: 'admin' }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    sendSuccess(res, 200, user, 'User promoted to admin successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Demote admin to user
// @route   POST /api/superadmin/admins/demote
// @access  Private/SuperAdmin
export const demoteToUser = async (req, res, next) => {
  try {
    const { userId } = req.body;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(userId);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    if (user.role === 'user') {
      return sendError(res, 400, 'User is already a regular user');
    }

    if (user.role === 'superadmin') {
      return sendError(res, 400, 'Cannot demote a superadmin');
    }

    // Prevent demoting self
    if (user._id.toString() === req.user._id.toString()) {
      return sendError(res, 400, 'Cannot demote yourself');
    }

    const oldRole = user.role;
    user.role = 'user';
    await user.save();

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'ADMIN_DEMOTED',
      entity: 'User',
      entityId: userId,
      details: { userId, demotedFrom: oldRole },
      changes: {
        before: { role: oldRole },
        after: { role: 'user' }
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    sendSuccess(res, 200, user, 'Admin demoted to user successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== ANALYTICS ====================

// @desc    Get dashboard statistics
// @route   GET /api/superadmin/analytics/dashboard
// @access  Private/SuperAdmin
export const getDashboardStats = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get user statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const newUsers = await User.countDocuments({
      createdAt: { $gte: startDate }
    });

    // Get role distribution
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get order statistics
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const completedOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });

    // Get revenue statistics
    const revenueStats = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, averageOrderValue: 0 };

    // Get recent revenue (last 30 days)
    const recentRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Get product statistics
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const outOfStock = await Product.countDocuments({ stock: 0 });

    // Get category statistics
    const totalCategories = await Category.countDocuments();

    sendSuccess(res, 200, {
      users: {
        total: totalUsers,
        active: activeUsers,
        newUsers,
        roleDistribution: roleDistribution.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {})
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders
      },
      revenue: {
        total: revenue.totalRevenue,
        average: revenue.averageOrderValue,
        recent: recentRevenue[0]?.total || 0,
        period: `${days} days`
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        outOfStock
      },
      categories: {
        total: totalCategories
      }
    }, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get user analytics
// @route   GET /api/superadmin/analytics/users
// @access  Private/SuperAdmin
export const getUserAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User registration trend
    const registrationTrend = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Active vs inactive users
    const statusDistribution = await User.aggregate([
      {
        $group: {
          _id: '$isActive',
          count: { $sum: 1 }
        }
      }
    ]);

    // Role distribution
    const roleDistribution = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Top customers by order count
    const topCustomers = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      { $unwind: '$userDetails' },
      {
        $project: {
          userId: '$_id',
          name: {
            $concat: ['$userDetails.firstName', ' ', '$userDetails.lastName']
          },
          email: '$userDetails.email',
          orderCount: 1,
          totalSpent: 1
        }
      }
    ]);

    sendSuccess(res, 200, {
      registrationTrend,
      statusDistribution: statusDistribution.reduce((acc, curr) => {
        acc[curr._id ? 'active' : 'inactive'] = curr.count;
        return acc;
      }, {}),
      roleDistribution: roleDistribution.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
      topCustomers
    }, 'User analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get product analytics
// @route   GET /api/superadmin/analytics/products
// @access  Private/SuperAdmin
export const getProductAnalytics = async (req, res, next) => {
  try {
    // Top selling products
    const topProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: {
            $sum: {
              $multiply: ['$items.quantity', '$items.price']
            }
          }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $project: {
          productId: '$_id',
          name: '$productDetails.name',
          totalSold: 1,
          revenue: 1
        }
      }
    ]);

    // Low stock products - find products where any stock item has low quantity
    const lowStock = await Product.find({
      'stock.quantity': { $lte: 10, $gt: 0 }
    })
      .select('name stock')
      .limit(10)
      .lean();

    // Out of stock products - find products where all stock items have 0 quantity
    const outOfStock = await Product.find({
      $or: [
        { stock: { $size: 0 } },
        { 'stock.quantity': { $lte: 0 } }
      ]
    })
      .select('name')
      .limit(10)
      .lean();

    // Category-wise product distribution
    const categoryDistribution = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      {
        $project: {
          categoryName: '$categoryDetails.name',
          count: 1
        }
      }
    ]);

    sendSuccess(res, 200, {
      topProducts,
      lowStock,
      outOfStock: outOfStock.length,
      categoryDistribution
    }, 'Product analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get revenue analytics
// @route   GET /api/superadmin/analytics/revenue
// @access  Private/SuperAdmin
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query;
    const days = parseInt(period, 10);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily revenue trend
    const dailyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Payment method distribution
    const paymentMethods = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Total revenue statistics
    const totalStats = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    const stats = totalStats[0] || {
      totalRevenue: 0,
      totalOrders: 0,
      averageOrderValue: 0
    };

    sendSuccess(res, 200, {
      dailyRevenue,
      paymentMethods: paymentMethods.reduce((acc, curr) => {
        acc[curr._id] = {
          count: curr.count,
          revenue: curr.revenue
        };
        return acc;
      }, {}),
      totalStats: stats,
      period: `${days} days`
    }, 'Revenue analytics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== AUDIT LOGS ====================

// @desc    Get audit logs
// @route   GET /api/superadmin/audit
// @access  Private/SuperAdmin
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      action = '',
      entity = '',
      userId = '',
      status = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // Build filter
    const filter = {};

    if (action) {
      filter.action = action;
    }

    if (entity) {
      filter.entity = entity;
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      filter.user = userId;
    }

    if (status) {
      filter.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await AuditLog.countDocuments(filter);

    const logs = await AuditLog.find(filter)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalPages = Math.ceil(total / limitNum);

    sendSuccess(res, 200, {
      logs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalLogs: total,
        limit: limitNum
      }
    }, 'Audit logs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get audit log details by ID
// @route   GET /api/superadmin/audit/:id
// @access  Private/SuperAdmin
export const getAuditLogById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid audit log ID format');
    }

    const log = await AuditLog.findById(id)
      .populate('user', 'firstName lastName email role')
      .lean();

    if (!log) {
      return sendError(res, 404, 'Audit log not found');
    }

    sendSuccess(res, 200, log, 'Audit log details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// ==================== SETTINGS ====================

// @desc    Get system settings
// @route   GET /api/superadmin/settings
// @access  Private/SuperAdmin
export const getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getInstance();

    sendSuccess(res, 200, settings, 'Settings retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update system settings
// @route   PUT /api/superadmin/settings
// @access  Private/SuperAdmin
export const updateSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getInstance();

    // Store old settings for audit log
    const oldSettings = settings.toObject();

    // Update settings
    Object.keys(req.body).forEach(key => {
      if (settings.schema.paths[key]) {
        settings[key] = req.body[key];
      }
    });

    settings.updatedBy = req.user._id;
    await settings.save();

    // Log audit
    await AuditLog.create({
      user: req.user._id,
      action: 'SETTINGS_UPDATED',
      entity: 'Settings',
      entityId: settings._id,
      details: { updatedFields: Object.keys(req.body) },
      changes: {
        before: oldSettings,
        after: settings.toObject()
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    sendSuccess(res, 200, settings, 'Settings updated successfully');
  } catch (error) {
    next(error);
  }
};

export default {
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
};
