import User from '../models/User.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  getUserActivityMetricsPipeline,
  getProductAnalyticsPipeline,
  getCategoryProductCountPipeline,
  getRevenueAnalyticsPipeline,
  getCustomerLTVPipeline,
  getInventoryStatusPipeline
} from '../utils/aggregations.js';

// @desc    Get all users with pagination and search
// @route   GET /api/admin/users
// @access  Private/SuperAdmin
export const getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '', role = '', status = '' } = req.query;

    // Build filter object
    const filter = {};

    // Search filter (search in email, firstName, lastName)
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

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Fetch users
    const users = await User.find(filter)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
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
        limit: limitNum
      }
    }, 'Users retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get user details by ID
// @route   GET /api/admin/users/:id
// @access  Private/SuperAdmin
export const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(id).select('-password -refreshToken').lean();

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    sendSuccess(res, 200, user, 'User details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Activate/Deactivate user
// @route   PUT /api/admin/users/:id/status
// @access  Private/SuperAdmin
export const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    // Validate isActive value
    if (typeof isActive !== 'boolean') {
      return sendError(res, 400, 'isActive must be a boolean value');
    }

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 404, 'User not found');
    }

    // Prevent deactivating the current superadmin
    if (user._id.toString() === req.user._id.toString() && !isActive) {
      return sendError(res, 403, 'You cannot deactivate your own account');
    }

    user.isActive = isActive;
    await user.save();

    sendSuccess(res, 200, {
      _id: user._id,
      email: user.email,
      isActive: user.isActive
    }, `User ${isActive ? 'activated' : 'deactivated'} successfully`);
  } catch (error) {
    next(error);
  }
};

// @desc    Get all admin users
// @route   GET /api/admin/admins
// @access  Private/SuperAdmin
export const getAllAdmins = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;

    // Build filter object
    const filter = {
      role: { $in: ['admin', 'superadmin'] }
    };

    // Search filter
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const total = await User.countDocuments(filter);

    // Fetch admins
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

// @desc    Create new admin user
// @route   POST /api/admin/admins
// @access  Private/SuperAdmin
export const createAdmin = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return sendError(res, 400, 'Email, password, firstName, and lastName are required');
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return sendError(res, 400, 'Please provide a valid email');
    }

    // Validate password length
    if (password.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters');
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return sendError(res, 400, 'User already exists with this email');
    }

    // Validate role
    const validRoles = ['admin', 'superadmin'];
    const userRole = role && validRoles.includes(role) ? role : 'admin';

    // Create new admin user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone: phone || '',
      role: userRole,
      isActive: true
    });

    sendSuccess(res, 201, {
      user: user.toJSON()
    }, `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} created successfully`);
  } catch (error) {
    next(error);
  }
};

// @desc    Update admin user
// @route   PUT /api/admin/admins/:id
// @access  Private/SuperAdmin
export const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, phone, role, isActive } = req.body;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Ensure user is an admin
    if (!['admin', 'superadmin'].includes(user.role)) {
      return sendError(res, 400, 'User is not an admin');
    }

    // Prevent downgrading superadmin role
    if (user.role === 'superadmin' && role && role !== 'superadmin') {
      return sendError(res, 403, 'Cannot change superadmin role');
    }

    // Prevent changing own role from superadmin
    if (user._id.toString() === req.user._id.toString() && role && role !== user.role) {
      return sendError(res, 403, 'You cannot change your own role');
    }

    // Prevent deactivating the current superadmin
    if (user._id.toString() === req.user._id.toString() && isActive === false) {
      return sendError(res, 403, 'You cannot deactivate your own account');
    }

    // Update allowed fields
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (phone !== undefined) user.phone = phone;
    if (role !== undefined && role !== 'superadmin') user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    sendSuccess(res, 200, {
      user: user.toJSON()
    }, 'Admin updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Delete admin user
// @route   DELETE /api/admin/admins/:id
// @access  Private/SuperAdmin
export const deleteAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return sendError(res, 400, 'Invalid user ID format');
    }

    const user = await User.findById(id);

    if (!user) {
      return sendError(res, 404, 'Admin user not found');
    }

    // Ensure user is an admin
    if (!['admin', 'superadmin'].includes(user.role)) {
      return sendError(res, 400, 'User is not an admin');
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return sendError(res, 403, 'You cannot delete your own account');
    }

    // Prevent deleting superadmin
    if (user.role === 'superadmin') {
      return sendError(res, 403, 'Cannot delete superadmin users');
    }

    // Delete user
    await User.findByIdAndDelete(id);

    sendSuccess(res, 200, {
      _id: user._id,
      email: user.email
    }, 'Admin deleted successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get user activity metrics (Admin)
// @route   GET /api/admin/analytics/users
// @access  Private/Admin
export const getUserActivityMetrics = async (req, res, next) => {
  try {
    const { startDate, endDate, userRole = 'user', page = 1, limit = 50 } = req.query;

    const pipeline = getUserActivityMetricsPipeline({
      startDate,
      endDate,
      userRole
    });

    // Add pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    pipeline.push({ $skip: skip }, { $limit: parseInt(limit) });

    const users = await User.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = getUserActivityMetricsPipeline({
      startDate,
      endDate,
      userRole
    });
    countPipeline.push({ $count: 'total' });
    const countResult = await User.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    sendSuccess(res, 200, {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'User activity metrics fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get product analytics (Admin)
// @route   GET /api/admin/analytics/products
// @access  Private/Admin
export const getProductAnalytics = async (req, res, next) => {
  try {
    const {
      categoryId,
      limit = 20,
      sortBy = 'revenue',
      isActive = 'true'
    } = req.query;

    const pipeline = getProductAnalyticsPipeline({
      categoryId,
      limit: parseInt(limit),
      sortBy,
      isActive: isActive === 'true'
    });

    const products = await Product.aggregate(pipeline);

    sendSuccess(res, 200, { products }, 'Product analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get category statistics (Admin)
// @route   GET /api/admin/analytics/categories
// @access  Private/Admin
export const getCategoryStatistics = async (req, res, next) => {
  try {
    const { includeInactive = 'false' } = req.query;

    const pipeline = getCategoryProductCountPipeline({
      includeInactive: includeInactive === 'true'
    });

    const categories = await Category.aggregate(pipeline);

    sendSuccess(res, 200, { categories }, 'Category statistics fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get revenue analytics (Admin)
// @route   GET /api/admin/analytics/revenue
// @access  Private/Admin
export const getRevenueAnalytics = async (req, res, next) => {
  try {
    const {
      groupBy = 'day',
      startDate,
      endDate
    } = req.query;

    const pipeline = getRevenueAnalyticsPipeline({
      groupBy,
      startDate,
      endDate
    });

    const analytics = await Order.aggregate(pipeline);

    sendSuccess(res, 200, analytics[0], 'Revenue analytics fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer lifetime value (Admin)
// @route   GET /api/admin/analytics/customer-ltv
// @access  Private/Admin
export const getCustomerLTV = async (req, res, next) => {
  try {
    const { limit = 50 } = req.query;

    const pipeline = getCustomerLTVPipeline(parseInt(limit));

    const customers = await User.aggregate(pipeline);

    // Calculate summary statistics
    const summary = {
      totalCustomers: customers.length,
      totalRevenue: customers.reduce((sum, c) => sum + c.lifetimeValue, 0),
      avgLTV: customers.length > 0
        ? customers.reduce((sum, c) => sum + c.lifetimeValue, 0) / customers.length
        : 0,
      activeCustomers: customers.filter(c => c.customerStatus === 'Active').length,
      atRiskCustomers: customers.filter(c => c.customerStatus === 'At Risk').length,
      churnedCustomers: customers.filter(c => c.customerStatus === 'Churned').length
    };

    sendSuccess(res, 200, {
      customers,
      summary
    }, 'Customer LTV fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get inventory status (Admin)
// @route   GET /api/admin/analytics/inventory
// @access  Private/Admin
export const getInventoryStatus = async (req, res, next) => {
  try {
    const { lowStockThreshold = 10 } = req.query;

    const pipeline = getInventoryStatusPipeline({
      lowStockThreshold: parseInt(lowStockThreshold)
    });

    const products = await Product.aggregate(pipeline);

    // Generate summary
    const summary = {
      totalProducts: products.length,
      outOfStock: products.filter(p => p.stockStatus === 'Out of Stock').length,
      lowStock: products.filter(p => p.stockStatus === 'Low Stock').length,
      inStock: products.filter(p => p.stockStatus === 'In Stock').length
    };

    sendSuccess(res, 200, {
      products,
      summary
    }, 'Inventory status fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive dashboard stats (Admin)
// @route   GET /api/admin/analytics/dashboard
// @access  Private/Admin
export const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Run all analytics queries in parallel for better performance
    const [
      totalUsers,
      activeUsers,
      totalOrders,
      recentOrders,
      totalProducts,
      lowStockProducts,
      revenueData,
      topProducts
    ] = await Promise.all([
      // Total users
      User.countDocuments({ role: 'user' }),

      // Active users (users who ordered in last 30 days)
      Order.distinct('user', {
        createdAt: { $gte: thirtyDaysAgo }
      }).then(users => users.length),

      // Total orders
      Order.countDocuments(),

      // Recent orders this month
      Order.countDocuments({
        createdAt: { $gte: firstDayOfMonth }
      }),

      // Total products
      Product.countDocuments({ isActive: true }),

      // Low stock products
      Product.aggregate([
        { $match: { isActive: true } },
        { $unwind: { path: '$stock', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            totalStock: { $sum: '$stock.quantity' }
          }
        },
        {
          $match: {
            $or: [
              { totalStock: { $lte: 10 } },
              { totalStock: { $exists: false } }
            ]
          }
        },
        { $count: 'count' }
      ]).then(result => result.length > 0 ? result[0].count : 0),

      // Revenue data
      Order.aggregate([
        {
          $facet: {
            totalRevenue: [
              { $match: { paymentStatus: 'completed' } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ],
            monthRevenue: [
              {
                $match: {
                  paymentStatus: 'completed',
                  createdAt: { $gte: firstDayOfMonth }
                }
              },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ],
            todayRevenue: [
              {
                $match: {
                  paymentStatus: 'completed',
                  createdAt: { $gte: today }
                }
              },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } }
            ]
          }
        }
      ]).then(result => ({
        total: result[0].totalRevenue[0]?.total || 0,
        thisMonth: result[0].monthRevenue[0]?.total || 0,
        today: result[0].todayRevenue[0]?.total || 0
      })),

      // Top selling products
      Order.aggregate([
        { $match: { orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.name' },
            totalSold: { $sum: '$items.quantity' },
            revenue: {
              $sum: {
                $multiply: [
                  '$items.quantity',
                  { $ifNull: ['$items.discountPrice', '$items.price'] }
                ]
              }
            }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 }
      ])
    ]);

    sendSuccess(res, 200, {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      orders: {
        total: totalOrders,
        thisMonth: recentOrders
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts
      },
      revenue: revenueData,
      topProducts
    }, 'Dashboard stats fetched successfully');
  } catch (error) {
    next(error);
  }
};
