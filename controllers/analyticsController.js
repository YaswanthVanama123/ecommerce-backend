import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Payment from '../models/Payment.js';
import NodeCache from 'node-cache';

// Create cache instance - 5 minutes TTL
const analyticsCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Get Dashboard Statistics
 * @route GET /api/admin/analytics/dashboard
 * @desc Real-time dashboard statistics
 */
export const getDashboardStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const cacheKey = `dashboard_${startDate}_${endDate}`;

    // Check cache first
    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    // Date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Fetch data in parallel for better performance
    const [
      totalOrders,
      totalRevenue,
      totalCustomers,
      totalProducts,
      pendingOrders,
      completedOrders,
      cancelledOrders,
      processingOrders,
      avgOrderValue,
      topSellingProducts,
      recentOrders,
      ordersByStatus,
      revenueByCategory,
    ] = await Promise.all([
      // Total orders
      Order.countDocuments(dateFilter),

      // Total revenue from completed orders
      Order.aggregate([
        {
          $match: {
            ...dateFilter,
            status: { $in: ['completed', 'delivered'] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$total' },
          },
        },
      ]),

      // Total customers (users with role 'user')
      User.countDocuments({ role: 'user', ...dateFilter }),

      // Total products
      Product.countDocuments({ isActive: true }),

      // Pending orders
      Order.countDocuments({ ...dateFilter, status: 'pending' }),

      // Completed orders
      Order.countDocuments({ ...dateFilter, status: { $in: ['completed', 'delivered'] } }),

      // Cancelled orders
      Order.countDocuments({ ...dateFilter, status: 'cancelled' }),

      // Processing orders
      Order.countDocuments({ ...dateFilter, status: 'processing' }),

      // Average order value
      Order.aggregate([
        {
          $match: {
            ...dateFilter,
            status: { $in: ['completed', 'delivered'] },
          },
        },
        {
          $group: {
            _id: null,
            avgValue: { $avg: '$total' },
          },
        },
      ]),

      // Top selling products (by order count)
      Order.aggregate([
        { $match: dateFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        { $unwind: '$productInfo' },
        {
          $project: {
            productId: '$_id',
            name: '$productInfo.name',
            image: '$productInfo.image',
            totalQuantity: 1,
            totalRevenue: 1,
            orderCount: 1,
          },
        },
      ]),

      // Recent orders
      Order.find(dateFilter)
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email')
        .select('_id orderNumber total status createdAt user shippingAddress'),

      // Orders by status
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$total' },
          },
        },
      ]),

      // Revenue by category
      Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        { $unwind: '$productInfo' },
        {
          $lookup: {
            from: 'categories',
            localField: 'productInfo.category',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$categoryInfo._id',
            categoryName: { $first: '$categoryInfo.name' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            totalQuantity: { $sum: '$items.quantity' },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),
    ]);

    const stats = {
      overview: {
        totalOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalCustomers,
        totalProducts,
        avgOrderValue: avgOrderValue[0]?.avgValue || 0,
      },
      orderStats: {
        pending: pendingOrders,
        processing: processingOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
        ordersByStatus,
      },
      topSellingProducts,
      recentOrders,
      revenueByCategory,
      // Calculate growth percentages (comparing to previous period)
      growth: {
        ordersGrowth: 0, // Would need historical data
        revenueGrowth: 0,
        customersGrowth: 0,
      },
    };

    // Cache the results
    analyticsCache.set(cacheKey, stats);

    res.json({
      success: true,
      data: stats,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
    });
  }
};

/**
 * Get Sales Analytics
 * @route GET /api/admin/analytics/sales
 * @desc Sales analytics with time series data
 */
export const getSalesAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const cacheKey = `sales_${startDate}_${endDate}_${groupBy}`;

    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Determine date grouping format
    let dateGroupFormat;
    switch (groupBy) {
      case 'hour':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
          hour: { $hour: '$createdAt' },
        };
        break;
      case 'day':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
      case 'week':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'month':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case 'year':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
        };
        break;
      default:
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
    }

    const salesData = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: dateGroupFormat,
          totalSales: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' },
          completedOrders: {
            $sum: {
              $cond: [{ $in: ['$status', ['completed', 'delivered']] }, 1, 0],
            },
          },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Cache the results
    analyticsCache.set(cacheKey, salesData);

    res.json({
      success: true,
      data: salesData,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching sales analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales analytics',
      error: error.message,
    });
  }
};

/**
 * Get Revenue Analytics
 * @route GET /api/admin/analytics/revenue
 * @desc Revenue trends and analysis
 */
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const cacheKey = `revenue_${startDate}_${endDate}_${groupBy}`;

    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Determine date grouping
    let dateGroupFormat;
    switch (groupBy) {
      case 'day':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
      case 'week':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'month':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      default:
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
    }

    const [revenueData, paymentMethodRevenue, categoryRevenue] = await Promise.all([
      // Revenue time series
      Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
        {
          $group: {
            _id: dateGroupFormat,
            totalRevenue: { $sum: '$total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Revenue by payment method
      Payment.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$paymentMethod',
            totalAmount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { totalAmount: -1 } },
      ]),

      // Revenue by category
      Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        { $unwind: '$productInfo' },
        {
          $lookup: {
            from: 'categories',
            localField: 'productInfo.category',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$categoryInfo._id',
            categoryName: { $first: '$categoryInfo.name' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),
    ]);

    const result = {
      timeSeries: revenueData,
      byPaymentMethod: paymentMethodRevenue,
      byCategory: categoryRevenue,
    };

    // Cache the results
    analyticsCache.set(cacheKey, result);

    res.json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error.message,
    });
  }
};

/**
 * Get Customer Analytics
 * @route GET /api/admin/analytics/customers
 * @desc Customer analytics and growth metrics
 */
export const getCustomerAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const cacheKey = `customers_${startDate}_${endDate}_${groupBy}`;

    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Date grouping format
    let dateGroupFormat;
    switch (groupBy) {
      case 'day':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
      case 'week':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'month':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      default:
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
    }

    const [customerGrowth, topCustomers, customerStats] = await Promise.all([
      // Customer growth over time
      User.aggregate([
        { $match: { role: 'user', ...dateFilter } },
        {
          $group: {
            _id: dateGroupFormat,
            newCustomers: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Top customers by order value
      Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
        {
          $group: {
            _id: '$user',
            totalSpent: { $sum: '$total' },
            orderCount: { $sum: 1 },
            avgOrderValue: { $avg: '$total' },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo',
          },
        },
        { $unwind: '$userInfo' },
        {
          $project: {
            userId: '$_id',
            name: '$userInfo.name',
            email: '$userInfo.email',
            totalSpent: 1,
            orderCount: 1,
            avgOrderValue: 1,
          },
        },
      ]),

      // Overall customer statistics
      User.aggregate([
        { $match: { role: 'user' } },
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            activeCustomers: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const result = {
      growth: customerGrowth,
      topCustomers,
      stats: customerStats[0] || { totalCustomers: 0, activeCustomers: 0 },
    };

    // Cache the results
    analyticsCache.set(cacheKey, result);

    res.json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching customer analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer analytics',
      error: error.message,
    });
  }
};

/**
 * Get Product Analytics
 * @route GET /api/admin/analytics/products
 * @desc Product performance analytics
 */
export const getProductAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query;
    const cacheKey = `products_${startDate}_${endDate}_${limit}`;

    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const [topProducts, lowStockProducts, categoryPerformance, productStats] = await Promise.all([
      // Top performing products
      Order.aggregate([
        { $match: dateFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            orderCount: { $sum: 1 },
            avgPrice: { $avg: '$items.price' },
          },
        },
        { $sort: { totalRevenue: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        { $unwind: '$productInfo' },
        {
          $project: {
            productId: '$_id',
            name: '$productInfo.name',
            image: '$productInfo.image',
            category: '$productInfo.category',
            stock: '$productInfo.stock',
            totalQuantity: 1,
            totalRevenue: 1,
            orderCount: 1,
            avgPrice: 1,
          },
        },
      ]),

      // Low stock products
      Product.find({ stock: { $lt: 10 }, isActive: true })
        .select('name image stock category price')
        .populate('category', 'name')
        .limit(10)
        .sort({ stock: 1 }),

      // Category performance
      Order.aggregate([
        { $match: { ...dateFilter, status: { $in: ['completed', 'delivered'] } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo',
          },
        },
        { $unwind: '$productInfo' },
        {
          $lookup: {
            from: 'categories',
            localField: 'productInfo.category',
            foreignField: '_id',
            as: 'categoryInfo',
          },
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$categoryInfo._id',
            categoryName: { $first: '$categoryInfo.name' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
            totalQuantity: { $sum: '$items.quantity' },
            productCount: { $addToSet: '$items.product' },
          },
        },
        {
          $project: {
            categoryName: 1,
            totalRevenue: 1,
            totalQuantity: 1,
            productCount: { $size: '$productCount' },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]),

      // Product statistics
      Product.aggregate([
        {
          $facet: {
            totalProducts: [{ $count: 'count' }],
            activeProducts: [
              { $match: { isActive: true } },
              { $count: 'count' },
            ],
            averagePrice: [
              { $group: { _id: null, avgPrice: { $avg: '$price' } } },
            ],
            totalInventoryValue: [
              {
                $group: {
                  _id: null,
                  totalValue: { $sum: { $multiply: ['$price', '$stock'] } },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const result = {
      topProducts,
      lowStockProducts,
      categoryPerformance,
      stats: {
        totalProducts: productStats[0]?.totalProducts[0]?.count || 0,
        activeProducts: productStats[0]?.activeProducts[0]?.count || 0,
        averagePrice: productStats[0]?.averagePrice[0]?.avgPrice || 0,
        totalInventoryValue: productStats[0]?.totalInventoryValue[0]?.totalValue || 0,
      },
    };

    // Cache the results
    analyticsCache.set(cacheKey, result);

    res.json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching product analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product analytics',
      error: error.message,
    });
  }
};

/**
 * Get Order Analytics
 * @route GET /api/admin/analytics/orders
 * @desc Order analytics and trends
 */
export const getOrderAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const cacheKey = `orders_${startDate}_${endDate}_${groupBy}`;

    const cached = analyticsCache.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached,
        cached: true,
      });
    }

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Date grouping format
    let dateGroupFormat;
    switch (groupBy) {
      case 'day':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
      case 'week':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'month':
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      default:
        dateGroupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
    }

    const [orderTrends, statusDistribution, ordersByHour, avgFulfillmentTime] = await Promise.all([
      // Order trends over time
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: dateGroupFormat,
            totalOrders: { $sum: 1 },
            totalValue: { $sum: '$total' },
            avgOrderValue: { $avg: '$total' },
            completedOrders: {
              $sum: {
                $cond: [{ $in: ['$status', ['completed', 'delivered']] }, 1, 0],
              },
            },
            cancelledOrders: {
              $sum: {
                $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0],
              },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
      ]),

      // Status distribution
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$total' },
          },
        },
        { $sort: { count: -1 } },
      ]),

      // Orders by hour of day
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            orderCount: { $sum: 1 },
            totalValue: { $sum: '$total' },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Average fulfillment time (from order to delivery)
      Order.aggregate([
        {
          $match: {
            ...dateFilter,
            status: 'delivered',
            deliveredAt: { $exists: true },
          },
        },
        {
          $project: {
            fulfillmentTime: {
              $divide: [
                { $subtract: ['$deliveredAt', '$createdAt'] },
                1000 * 60 * 60 * 24, // Convert to days
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgFulfillmentDays: { $avg: '$fulfillmentTime' },
            minFulfillmentDays: { $min: '$fulfillmentTime' },
            maxFulfillmentDays: { $max: '$fulfillmentTime' },
          },
        },
      ]),
    ]);

    const result = {
      trends: orderTrends,
      statusDistribution,
      ordersByHour,
      fulfillmentMetrics: avgFulfillmentTime[0] || {
        avgFulfillmentDays: 0,
        minFulfillmentDays: 0,
        maxFulfillmentDays: 0,
      },
    };

    // Cache the results
    analyticsCache.set(cacheKey, result);

    res.json({
      success: true,
      data: result,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching order analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order analytics',
      error: error.message,
    });
  }
};

/**
 * Clear Analytics Cache
 * @route DELETE /api/admin/analytics/cache
 * @desc Clear the analytics cache
 */
export const clearAnalyticsCache = async (req, res) => {
  try {
    analyticsCache.flushAll();

    res.json({
      success: true,
      message: 'Analytics cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing analytics cache:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear analytics cache',
      error: error.message,
    });
  }
};
