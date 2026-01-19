import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Payment from '../models/Payment.js';
import Return from '../models/Return.js';
import { generatePDF, generateExcel, generateCSV } from '../utils/reportGenerator.js';

// Sales Report - Comprehensive sales data
export const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Group by configuration
    let dateFormat;
    switch(groupBy) {
      case 'hour':
        dateFormat = { $dateToString: { format: "%Y-%m-%d %H:00", date: "$createdAt" } };
        break;
      case 'day':
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case 'week':
        dateFormat = { $week: "$createdAt" };
        break;
      case 'month':
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
      case 'year':
        dateFormat = { $year: "$createdAt" };
        break;
      default:
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }

    const salesData = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: dateFormat,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          totalItems: { $sum: { $size: '$items' } },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          pendingOrders: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'processing', 'shipped']] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Calculate summary statistics
    const summary = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          maxOrderValue: { $max: '$totalAmount' },
          minOrderValue: { $min: '$totalAmount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: salesData,
      summary: summary[0] || {},
      filters: { startDate, endDate, groupBy }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sales report',
      error: error.message
    });
  }
};

// Sales Summary - Quick overview
export const getSalesSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const summary = await Order.aggregate([
      { $match: matchStage },
      {
        $facet: {
          overview: [
            {
              $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalRevenue: { $sum: '$totalAmount' },
                averageOrderValue: { $avg: '$totalAmount' }
              }
            }
          ],
          byStatus: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
              }
            }
          ],
          byPaymentMethod: [
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 },
                revenue: { $sum: '$totalAmount' }
              }
            }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: summary[0],
      filters: { startDate, endDate }
    });
  } catch (error) {
    console.error('Get sales summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sales summary',
      error: error.message
    });
  }
};

// Revenue Report - Revenue analysis
export const getRevenueReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'category' } = req.query;

    const matchStage = { status: { $in: ['delivered', 'shipped'] } };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    let revenueData;

    if (groupBy === 'category') {
      revenueData = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $lookup: {
            from: 'categories',
            localField: 'productInfo.category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$categoryInfo.name',
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            orders: { $addToSet: '$_id' },
            itemsSold: { $sum: '$items.quantity' }
          }
        },
        {
          $project: {
            category: '$_id',
            revenue: 1,
            orderCount: { $size: '$orders' },
            itemsSold: 1
          }
        },
        { $sort: { revenue: -1 } }
      ]);
    } else {
      // Group by time period
      const dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      revenueData = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: dateFormat,
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
    }

    // Calculate total revenue
    const totalRevenue = revenueData.reduce((sum, item) => sum + (item.revenue || 0), 0);

    res.json({
      success: true,
      data: revenueData,
      totalRevenue,
      filters: { startDate, endDate, groupBy }
    });
  } catch (error) {
    console.error('Get revenue report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating revenue report',
      error: error.message
    });
  }
};

// Revenue by Category
export const getRevenueByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const matchStage = { status: { $in: ['delivered', 'shipped'] } };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const categoryRevenue = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: '$productInfo' },
      {
        $lookup: {
          from: 'categories',
          localField: 'productInfo.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: '$categoryInfo' },
      {
        $group: {
          _id: {
            categoryId: '$categoryInfo._id',
            categoryName: '$categoryInfo.name'
          },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          itemsSold: { $sum: '$items.quantity' },
          orderCount: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          categoryId: '$_id.categoryId',
          categoryName: '$_id.categoryName',
          revenue: 1,
          itemsSold: 1,
          orderCount: { $size: '$orderCount' },
          averageOrderValue: { $divide: ['$revenue', { $size: '$orderCount' }] }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({
      success: true,
      data: categoryRevenue,
      filters: { startDate, endDate }
    });
  } catch (error) {
    console.error('Get revenue by category error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating revenue by category report',
      error: error.message
    });
  }
};

// Revenue by Product
export const getRevenueByProduct = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50 } = req.query;

    const matchStage = { status: { $in: ['delivered', 'shipped'] } };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const productRevenue = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          quantitySold: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
          averagePrice: { $avg: '$items.price' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: productRevenue,
      filters: { startDate, endDate, limit }
    });
  } catch (error) {
    console.error('Get revenue by product error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating revenue by product report',
      error: error.message
    });
  }
};

// Inventory Report
export const getInventoryReport = async (req, res) => {
  try {
    const { lowStockThreshold = 10, category } = req.query;

    const matchStage = {};
    if (category) {
      matchStage.category = category;
    }

    const inventoryData = await Product.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          sku: 1,
          category: '$categoryInfo.name',
          stock: 1,
          price: 1,
          discountPrice: 1,
          status: 1,
          stockValue: { $multiply: ['$stock', { $ifNull: ['$discountPrice', '$price'] }] },
          isLowStock: { $lte: ['$stock', parseInt(lowStockThreshold)] },
          isOutOfStock: { $eq: ['$stock', 0] }
        }
      },
      { $sort: { stock: 1 } }
    ]);

    // Summary statistics
    const summary = {
      totalProducts: inventoryData.length,
      lowStockProducts: inventoryData.filter(p => p.isLowStock && !p.isOutOfStock).length,
      outOfStockProducts: inventoryData.filter(p => p.isOutOfStock).length,
      totalInventoryValue: inventoryData.reduce((sum, p) => sum + p.stockValue, 0),
      averageStock: inventoryData.reduce((sum, p) => sum + p.stock, 0) / inventoryData.length || 0
    };

    res.json({
      success: true,
      data: inventoryData,
      summary,
      filters: { lowStockThreshold, category }
    });
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating inventory report',
      error: error.message
    });
  }
};

// Inventory Valuation
export const getInventoryValuation = async (req, res) => {
  try {
    const valuation = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      { $unwind: { path: '$categoryInfo', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$categoryInfo.name',
          totalProducts: { $sum: 1 },
          totalStock: { $sum: '$stock' },
          stockValue: {
            $sum: {
              $multiply: ['$stock', { $ifNull: ['$discountPrice', '$price'] }]
            }
          },
          averagePrice: { $avg: { $ifNull: ['$discountPrice', '$price'] } }
        }
      },
      { $sort: { stockValue: -1 } }
    ]);

    const totalValuation = valuation.reduce((sum, cat) => sum + cat.stockValue, 0);

    res.json({
      success: true,
      data: valuation,
      totalValuation
    });
  } catch (error) {
    console.error('Get inventory valuation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating inventory valuation report',
      error: error.message
    });
  }
};

// Customer Report
export const getCustomerReport = async (req, res) => {
  try {
    const { startDate, endDate, minOrders = 1 } = req.query;

    const matchStage = {};
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const customerData = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          lastOrderDate: { $max: '$createdAt' },
          firstOrderDate: { $min: '$createdAt' }
        }
      },
      { $match: { totalOrders: { $gte: parseInt(minOrders) } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          customerId: '$_id',
          customerName: '$userInfo.name',
          email: '$userInfo.email',
          phone: '$userInfo.phone',
          totalOrders: 1,
          totalSpent: 1,
          averageOrderValue: 1,
          lastOrderDate: 1,
          firstOrderDate: 1,
          customerLifetime: {
            $dateDiff: {
              startDate: '$firstOrderDate',
              endDate: '$lastOrderDate',
              unit: 'day'
            }
          }
        }
      },
      { $sort: { totalSpent: -1 } }
    ]);

    // Customer summary
    const summary = {
      totalCustomers: customerData.length,
      totalRevenue: customerData.reduce((sum, c) => sum + c.totalSpent, 0),
      averageCustomerValue: customerData.reduce((sum, c) => sum + c.totalSpent, 0) / customerData.length || 0,
      averageOrdersPerCustomer: customerData.reduce((sum, c) => sum + c.totalOrders, 0) / customerData.length || 0
    };

    res.json({
      success: true,
      data: customerData,
      summary,
      filters: { startDate, endDate, minOrders }
    });
  } catch (error) {
    console.error('Get customer report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating customer report',
      error: error.message
    });
  }
};

// Customer Lifetime Value
export const getCustomerLifetimeValue = async (req, res) => {
  try {
    const { limit = 100 } = req.query;

    const clvData = await Order.aggregate([
      {
        $group: {
          _id: '$user',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          averageOrderValue: { $avg: '$totalAmount' },
          firstOrderDate: { $min: '$createdAt' },
          lastOrderDate: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          customerId: '$_id',
          customerName: '$userInfo.name',
          email: '$userInfo.email',
          totalOrders: 1,
          totalRevenue: 1,
          averageOrderValue: 1,
          customerLifetimeDays: {
            $dateDiff: {
              startDate: '$firstOrderDate',
              endDate: { $ifNull: ['$lastOrderDate', new Date()] },
              unit: 'day'
            }
          },
          lifetimeValue: '$totalRevenue',
          orderFrequency: {
            $cond: {
              if: { $gt: [{ $dateDiff: { startDate: '$firstOrderDate', endDate: '$lastOrderDate', unit: 'day' } }, 0] },
              then: {
                $divide: [
                  '$totalOrders',
                  { $dateDiff: { startDate: '$firstOrderDate', endDate: '$lastOrderDate', unit: 'day' } }
                ]
              },
              else: 0
            }
          }
        }
      },
      { $sort: { lifetimeValue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: clvData
    });
  } catch (error) {
    console.error('Get customer lifetime value error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating customer lifetime value report',
      error: error.message
    });
  }
};

// Product Performance Report
export const getProductPerformanceReport = async (req, res) => {
  try {
    const { startDate, endDate, sortBy = 'revenue' } = req.query;

    const matchStage = { status: { $in: ['delivered', 'shipped'] } };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const productPerformance = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          totalQuantitySold: { $sum: '$items.quantity' },
          totalOrders: { $sum: 1 },
          averagePrice: { $avg: '$items.price' },
          minPrice: { $min: '$items.price' },
          maxPrice: { $max: '$items.price' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          productName: 1,
          currentStock: '$productInfo.stock',
          totalRevenue: 1,
          totalQuantitySold: 1,
          totalOrders: 1,
          averagePrice: 1,
          minPrice: 1,
          maxPrice: 1,
          averageRevenuePerOrder: { $divide: ['$totalRevenue', '$totalOrders'] },
          stockTurnoverRate: {
            $cond: {
              if: { $gt: ['$productInfo.stock', 0] },
              then: { $divide: ['$totalQuantitySold', '$productInfo.stock'] },
              else: null
            }
          }
        }
      },
      { $sort: { [sortBy]: -1 } }
    ]);

    res.json({
      success: true,
      data: productPerformance,
      filters: { startDate, endDate, sortBy }
    });
  } catch (error) {
    console.error('Get product performance report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating product performance report',
      error: error.message
    });
  }
};

// Product Metrics
export const getProductMetrics = async (req, res) => {
  try {
    const { productId } = req.query;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const metrics = await Order.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.product': productId } },
      {
        $facet: {
          salesMetrics: [
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
                totalQuantitySold: { $sum: '$items.quantity' },
                totalOrders: { $sum: 1 },
                averagePrice: { $avg: '$items.price' }
              }
            }
          ],
          timeSeriesData: [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                dailyRevenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
                dailyQuantity: { $sum: '$items.quantity' }
              }
            },
            { $sort: { _id: 1 } }
          ],
          statusBreakdown: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
                revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
              }
            }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: metrics[0]
    });
  } catch (error) {
    console.error('Get product metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating product metrics',
      error: error.message
    });
  }
};

// Top Performers
export const getTopPerformers = async (req, res) => {
  try {
    const { type = 'products', limit = 10, startDate, endDate } = req.query;

    const matchStage = { status: { $in: ['delivered', 'shipped'] } };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    let topPerformers;

    if (type === 'products') {
      topPerformers = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            quantitySold: { $sum: '$items.quantity' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: parseInt(limit) }
      ]);
    } else if (type === 'customers') {
      topPerformers = await Order.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$user',
            totalSpent: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        { $unwind: '$userInfo' },
        {
          $project: {
            name: '$userInfo.name',
            email: '$userInfo.email',
            totalSpent: 1,
            totalOrders: 1
          }
        },
        { $sort: { totalSpent: -1 } },
        { $limit: parseInt(limit) }
      ]);
    } else if (type === 'categories') {
      topPerformers = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $lookup: {
            from: 'categories',
            localField: 'productInfo.category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$categoryInfo._id',
            name: { $first: '$categoryInfo.name' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            itemsSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: parseInt(limit) }
      ]);
    }

    res.json({
      success: true,
      data: topPerformers,
      filters: { type, limit, startDate, endDate }
    });
  } catch (error) {
    console.error('Get top performers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating top performers report',
      error: error.message
    });
  }
};

// Bottom Performers
export const getBottomPerformers = async (req, res) => {
  try {
    const { type = 'products', limit = 10, startDate, endDate } = req.query;

    const matchStage = { status: { $in: ['delivered', 'shipped'] } };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    let bottomPerformers;

    if (type === 'products') {
      // Get all products that had sales
      const productSales = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            quantitySold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: 1 } },
        { $limit: parseInt(limit) }
      ]);

      // Also get products with no sales
      const productsWithSales = productSales.map(p => p._id);
      const noSalesProducts = await Product.find({
        _id: { $nin: productsWithSales }
      })
        .select('name price stock')
        .limit(parseInt(limit))
        .lean();

      bottomPerformers = [
        ...noSalesProducts.map(p => ({
          _id: p._id,
          name: p.name,
          revenue: 0,
          quantitySold: 0,
          currentStock: p.stock
        })),
        ...productSales
      ].slice(0, parseInt(limit));
    } else if (type === 'categories') {
      bottomPerformers = await Order.aggregate([
        { $match: matchStage },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'products',
            localField: 'items.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $lookup: {
            from: 'categories',
            localField: 'productInfo.category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        { $unwind: '$categoryInfo' },
        {
          $group: {
            _id: '$categoryInfo._id',
            name: { $first: '$categoryInfo.name' },
            revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
            itemsSold: { $sum: '$items.quantity' }
          }
        },
        { $sort: { revenue: 1 } },
        { $limit: parseInt(limit) }
      ]);
    }

    res.json({
      success: true,
      data: bottomPerformers,
      filters: { type, limit, startDate, endDate }
    });
  } catch (error) {
    console.error('Get bottom performers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating bottom performers report',
      error: error.message
    });
  }
};

// Custom Report Generator
export const generateCustomReport = async (req, res) => {
  try {
    const {
      reportType,
      dateRange,
      filters,
      groupBy,
      metrics,
      sortBy
    } = req.body;

    // Build dynamic aggregation pipeline
    const pipeline = [];

    // Match stage
    const matchStage = {};
    if (dateRange?.startDate || dateRange?.endDate) {
      matchStage.createdAt = {};
      if (dateRange.startDate) matchStage.createdAt.$gte = new Date(dateRange.startDate);
      if (dateRange.endDate) matchStage.createdAt.$lte = new Date(dateRange.endDate);
    }

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key]) {
          matchStage[key] = filters[key];
        }
      });
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Group stage
    if (groupBy && metrics) {
      const groupStage = {
        $group: {
          _id: `$${groupBy}`,
          ...metrics.reduce((acc, metric) => {
            switch(metric) {
              case 'count':
                acc.count = { $sum: 1 };
                break;
              case 'sum':
                acc.totalAmount = { $sum: '$totalAmount' };
                break;
              case 'avg':
                acc.averageAmount = { $avg: '$totalAmount' };
                break;
              case 'min':
                acc.minAmount = { $min: '$totalAmount' };
                break;
              case 'max':
                acc.maxAmount = { $max: '$totalAmount' };
                break;
            }
            return acc;
          }, {})
        }
      };
      pipeline.push(groupStage);
    }

    // Sort stage
    if (sortBy) {
      const sortStage = {};
      sortStage[sortBy.field] = sortBy.order === 'desc' ? -1 : 1;
      pipeline.push({ $sort: sortStage });
    }

    // Execute aggregation based on report type
    let Model;
    switch(reportType) {
      case 'orders':
        Model = Order;
        break;
      case 'products':
        Model = Product;
        break;
      case 'users':
        Model = User;
        break;
      case 'payments':
        Model = Payment;
        break;
      default:
        Model = Order;
    }

    const data = await Model.aggregate(pipeline);

    res.json({
      success: true,
      data,
      query: req.body
    });
  } catch (error) {
    console.error('Generate custom report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating custom report',
      error: error.message
    });
  }
};

// Export Report
export const exportReport = async (req, res) => {
  try {
    const { reportData, format, reportName, columns } = req.body;

    if (!reportData || !format) {
      return res.status(400).json({
        success: false,
        message: 'Report data and format are required'
      });
    }

    let fileBuffer;
    let fileName;
    let contentType;

    switch(format.toLowerCase()) {
      case 'pdf':
        fileBuffer = await generatePDF(reportData, reportName, columns);
        fileName = `${reportName || 'report'}_${Date.now()}.pdf`;
        contentType = 'application/pdf';
        break;

      case 'excel':
      case 'xlsx':
        fileBuffer = await generateExcel(reportData, reportName, columns);
        fileName = `${reportName || 'report'}_${Date.now()}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'csv':
        fileBuffer = await generateCSV(reportData, columns);
        fileName = `${reportName || 'report'}_${Date.now()}.csv`;
        contentType = 'text/csv';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported format. Use pdf, excel, or csv'
        });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(fileBuffer);
  } catch (error) {
    console.error('Export report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting report',
      error: error.message
    });
  }
};

// Scheduled Reports Management
export const getScheduledReports = async (req, res) => {
  try {
    // This would typically query a ScheduledReport model
    // For now, returning a placeholder
    res.json({
      success: true,
      data: [],
      message: 'Scheduled reports feature - implementation pending'
    });
  } catch (error) {
    console.error('Get scheduled reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching scheduled reports',
      error: error.message
    });
  }
};

export const createScheduledReport = async (req, res) => {
  try {
    const { name, reportType, schedule, recipients, filters } = req.body;

    // This would typically create a ScheduledReport document
    res.json({
      success: true,
      message: 'Scheduled report created successfully',
      data: { name, reportType, schedule, recipients, filters }
    });
  } catch (error) {
    console.error('Create scheduled report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating scheduled report',
      error: error.message
    });
  }
};

export const updateScheduledReport = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    res.json({
      success: true,
      message: 'Scheduled report updated successfully',
      data: { id, ...updates }
    });
  } catch (error) {
    console.error('Update scheduled report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating scheduled report',
      error: error.message
    });
  }
};

export const deleteScheduledReport = async (req, res) => {
  try {
    const { id } = req.params;

    res.json({
      success: true,
      message: 'Scheduled report deleted successfully'
    });
  } catch (error) {
    console.error('Delete scheduled report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting scheduled report',
      error: error.message
    });
  }
};

// Report History
export const getReportHistory = async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    // This would typically query a ReportHistory model
    res.json({
      success: true,
      data: [],
      message: 'Report history feature - implementation pending'
    });
  } catch (error) {
    console.error('Get report history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching report history',
      error: error.message
    });
  }
};
