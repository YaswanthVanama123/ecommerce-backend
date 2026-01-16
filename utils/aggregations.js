import mongoose from 'mongoose';

/**
 * Aggregation Pipelines Utility
 * Provides optimized aggregation pipelines for various analytics and reporting needs
 */

/**
 * Order Statistics Aggregation
 * Groups orders by status and calculates metrics
 * @param {Object} dateFilter - Optional date filter { $gte, $lte }
 * @returns {Array} Aggregation pipeline
 */
export const getOrderStatisticsPipeline = (dateFilter = {}) => {
  const matchStage = {};
  if (dateFilter.startDate || dateFilter.endDate) {
    matchStage.createdAt = {};
    if (dateFilter.startDate) matchStage.createdAt.$gte = new Date(dateFilter.startDate);
    if (dateFilter.endDate) matchStage.createdAt.$lte = new Date(dateFilter.endDate);
  }

  return [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $facet: {
        // Order count by status
        byStatus: [
          {
            $group: {
              _id: '$orderStatus',
              count: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' },
              avgOrderValue: { $avg: '$totalAmount' }
            }
          },
          { $sort: { count: -1 } }
        ],
        // Order count by payment status
        byPaymentStatus: [
          {
            $group: {
              _id: '$paymentStatus',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ],
        // Order count by payment method
        byPaymentMethod: [
          {
            $group: {
              _id: '$paymentMethod',
              count: { $sum: 1 },
              totalAmount: { $sum: '$totalAmount' }
            }
          }
        ],
        // Overall statistics
        overall: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' },
              avgOrderValue: { $avg: '$totalAmount' },
              totalItemsSold: { $sum: { $sum: '$items.quantity' } }
            }
          }
        ],
        // Daily statistics (last 30 days)
        daily: [
          {
            $group: {
              _id: {
                $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
              },
              orders: { $sum: 1 },
              revenue: { $sum: '$totalAmount' }
            }
          },
          { $sort: { _id: -1 } },
          { $limit: 30 }
        ]
      }
    }
  ];
};

/**
 * Product Analytics Aggregation
 * Analyzes product performance including sales, revenue, and ratings
 * @param {Object} options - Filter options { categoryId, limit, sortBy }
 * @returns {Array} Aggregation pipeline
 */
export const getProductAnalyticsPipeline = (options = {}) => {
  const { categoryId, limit = 20, sortBy = 'revenue', isActive = true } = options;

  const matchStage = { isActive };
  if (categoryId) {
    matchStage.category = mongoose.Types.ObjectId(categoryId);
  }

  return [
    { $match: matchStage },
    {
      $lookup: {
        from: 'orders',
        let: { productId: '$_id' },
        pipeline: [
          { $unwind: '$items' },
          {
            $match: {
              $expr: { $eq: ['$items.product', '$$productId'] },
              orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
            }
          },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: '$items.quantity' },
              totalRevenue: {
                $sum: {
                  $multiply: [
                    '$items.quantity',
                    { $ifNull: ['$items.discountPrice', '$items.price'] }
                  ]
                }
              },
              orderCount: { $sum: 1 }
            }
          }
        ],
        as: 'salesData'
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    },
    {
      $addFields: {
        salesData: { $arrayElemAt: ['$salesData', 0] },
        categoryInfo: { $arrayElemAt: ['$categoryInfo', 0] }
      }
    },
    {
      $project: {
        name: 1,
        price: 1,
        discountPrice: 1,
        images: { $arrayElemAt: ['$images', 0] },
        category: '$categoryInfo.name',
        categoryId: '$categoryInfo._id',
        brand: 1,
        ratings: 1,
        isFeatured: 1,
        totalQuantitySold: { $ifNull: ['$salesData.totalQuantity', 0] },
        totalRevenue: { $ifNull: ['$salesData.totalRevenue', 0] },
        orderCount: { $ifNull: ['$salesData.orderCount', 0] },
        stock: {
          $sum: '$stock.quantity'
        },
        availableSizes: { $size: { $ifNull: ['$sizes', []] } },
        availableColors: { $size: { $ifNull: ['$colors', []] } }
      }
    },
    {
      $sort: {
        ...(sortBy === 'revenue' && { totalRevenue: -1 }),
        ...(sortBy === 'quantity' && { totalQuantitySold: -1 }),
        ...(sortBy === 'rating' && { 'ratings.average': -1 }),
        ...(sortBy === 'orders' && { orderCount: -1 })
      }
    },
    { $limit: limit }
  ];
};

/**
 * User Activity Metrics Aggregation
 * Analyzes user engagement and purchasing behavior
 * @param {Object} options - Filter options { dateRange, userRole }
 * @returns {Array} Aggregation pipeline
 */
export const getUserActivityMetricsPipeline = (options = {}) => {
  const { startDate, endDate, userRole = 'user' } = options;

  const matchStage = { role: userRole };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  return [
    { $match: matchStage },
    {
      $lookup: {
        from: 'orders',
        localField: '_id',
        foreignField: 'user',
        as: 'orders'
      }
    },
    {
      $lookup: {
        from: 'carts',
        localField: '_id',
        foreignField: 'user',
        as: 'cart'
      }
    },
    {
      $addFields: {
        cart: { $arrayElemAt: ['$cart', 0] }
      }
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        phone: 1,
        isActive: 1,
        registeredAt: '$createdAt',
        totalOrders: { $size: '$orders' },
        totalSpent: {
          $sum: {
            $map: {
              input: {
                $filter: {
                  input: '$orders',
                  as: 'order',
                  cond: { $eq: ['$$order.paymentStatus', 'completed'] }
                }
              },
              as: 'completedOrder',
              in: '$$completedOrder.totalAmount'
            }
          }
        },
        avgOrderValue: {
          $cond: {
            if: { $gt: [{ $size: '$orders' }, 0] },
            then: {
              $divide: [
                {
                  $sum: {
                    $map: {
                      input: {
                        $filter: {
                          input: '$orders',
                          as: 'order',
                          cond: { $eq: ['$$order.paymentStatus', 'completed'] }
                        }
                      },
                      as: 'completedOrder',
                      in: '$$completedOrder.totalAmount'
                    }
                  }
                },
                { $size: '$orders' }
              ]
            },
            else: 0
          }
        },
        lastOrderDate: {
          $max: '$orders.createdAt'
        },
        cartItemCount: {
          $cond: {
            if: { $ne: ['$cart', null] },
            then: { $size: { $ifNull: ['$cart.items', []] } },
            else: 0
          }
        },
        hasActiveCart: {
          $cond: {
            if: { $and: [
              { $ne: ['$cart', null] },
              { $gt: [{ $size: { $ifNull: ['$cart.items', []] } }, 0] }
            ]},
            then: true,
            else: false
          }
        },
        customerSegment: {
          $switch: {
            branches: [
              {
                case: { $gte: [{ $size: '$orders' }, 10] },
                then: 'VIP'
              },
              {
                case: { $gte: [{ $size: '$orders' }, 5] },
                then: 'Regular'
              },
              {
                case: { $gte: [{ $size: '$orders' }, 1] },
                then: 'Occasional'
              }
            ],
            default: 'New'
          }
        }
      }
    },
    { $sort: { totalSpent: -1 } }
  ];
};

/**
 * Category-wise Product Count Aggregation
 * Groups products by category with additional metrics
 * @param {Object} options - Filter options { includeInactive }
 * @returns {Array} Aggregation pipeline
 */
export const getCategoryProductCountPipeline = (options = {}) => {
  const { includeInactive = false } = options;

  return [
    { $match: { isActive: true } },
    {
      $lookup: {
        from: 'products',
        let: { categoryId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$category', '$$categoryId'] },
              ...(includeInactive ? {} : { isActive: true })
            }
          },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              activeProducts: {
                $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
              },
              featuredProducts: {
                $sum: { $cond: [{ $eq: ['$isFeatured', true] }, 1, 0] }
              },
              avgPrice: { $avg: '$price' },
              minPrice: { $min: '$price' },
              maxPrice: { $max: '$price' },
              totalStock: { $sum: { $sum: '$stock.quantity' } }
            }
          }
        ],
        as: 'productStats'
      }
    },
    {
      $addFields: {
        productStats: { $arrayElemAt: ['$productStats', 0] }
      }
    },
    {
      $project: {
        name: 1,
        slug: 1,
        description: 1,
        image: 1,
        order: 1,
        totalProducts: { $ifNull: ['$productStats.totalProducts', 0] },
        activeProducts: { $ifNull: ['$productStats.activeProducts', 0] },
        featuredProducts: { $ifNull: ['$productStats.featuredProducts', 0] },
        avgPrice: { $ifNull: ['$productStats.avgPrice', 0] },
        priceRange: {
          min: { $ifNull: ['$productStats.minPrice', 0] },
          max: { $ifNull: ['$productStats.maxPrice', 0] }
        },
        totalStock: { $ifNull: ['$productStats.totalStock', 0] }
      }
    },
    { $sort: { order: 1, name: 1 } }
  ];
};

/**
 * Revenue Analytics Pipeline
 * Provides comprehensive revenue metrics with time-based grouping
 * @param {Object} options - Filter options { groupBy, startDate, endDate }
 * @returns {Array} Aggregation pipeline
 */
export const getRevenueAnalyticsPipeline = (options = {}) => {
  const { groupBy = 'day', startDate, endDate } = options;

  const matchStage = { paymentStatus: 'completed' };
  if (startDate || endDate) {
    matchStage.createdAt = {};
    if (startDate) matchStage.createdAt.$gte = new Date(startDate);
    if (endDate) matchStage.createdAt.$lte = new Date(endDate);
  }

  const dateFormat = {
    day: '%Y-%m-%d',
    week: '%Y-W%U',
    month: '%Y-%m',
    year: '%Y'
  }[groupBy] || '%Y-%m-%d';

  return [
    { $match: matchStage },
    {
      $facet: {
        // Time-series revenue data
        timeSeries: [
          {
            $group: {
              _id: {
                $dateToString: { format: dateFormat, date: '$createdAt' }
              },
              revenue: { $sum: '$totalAmount' },
              orders: { $sum: 1 },
              itemsTotal: { $sum: '$itemsTotal' },
              shippingTotal: { $sum: '$shippingCharge' },
              taxTotal: { $sum: '$tax' },
              discountTotal: { $sum: '$discount' },
              avgOrderValue: { $avg: '$totalAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ],
        // Revenue by payment method
        byPaymentMethod: [
          {
            $group: {
              _id: '$paymentMethod',
              revenue: { $sum: '$totalAmount' },
              orders: { $sum: 1 },
              avgOrderValue: { $avg: '$totalAmount' }
            }
          },
          { $sort: { revenue: -1 } }
        ],
        // Revenue by order status
        byOrderStatus: [
          {
            $group: {
              _id: '$orderStatus',
              revenue: { $sum: '$totalAmount' },
              orders: { $sum: 1 }
            }
          }
        ],
        // Top products by revenue
        topProducts: [
          { $unwind: '$items' },
          {
            $group: {
              _id: '$items.product',
              productName: { $first: '$items.name' },
              quantitySold: { $sum: '$items.quantity' },
              revenue: {
                $sum: {
                  $multiply: [
                    '$items.quantity',
                    { $ifNull: ['$items.discountPrice', '$items.price'] }
                  ]
                }
              },
              orders: { $sum: 1 }
            }
          },
          { $sort: { revenue: -1 } },
          { $limit: 10 }
        ],
        // Overall summary
        summary: [
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$totalAmount' },
              totalOrders: { $sum: 1 },
              avgOrderValue: { $avg: '$totalAmount' },
              totalItemsRevenue: { $sum: '$itemsTotal' },
              totalShipping: { $sum: '$shippingCharge' },
              totalTax: { $sum: '$tax' },
              totalDiscount: { $sum: '$discount' }
            }
          }
        ]
      }
    }
  ];
};

/**
 * Customer Lifetime Value (CLV) Pipeline
 * Calculates customer value metrics
 * @param {Number} limit - Number of customers to return
 * @returns {Array} Aggregation pipeline
 */
export const getCustomerLTVPipeline = (limit = 50) => {
  return [
    { $match: { role: 'user', isActive: true } },
    {
      $lookup: {
        from: 'orders',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$user', '$$userId'] },
              paymentStatus: 'completed'
            }
          }
        ],
        as: 'completedOrders'
      }
    },
    {
      $addFields: {
        orderCount: { $size: '$completedOrders' },
        totalSpent: { $sum: '$completedOrders.totalAmount' },
        firstOrderDate: { $min: '$completedOrders.createdAt' },
        lastOrderDate: { $max: '$completedOrders.createdAt' }
      }
    },
    {
      $match: {
        orderCount: { $gt: 0 }
      }
    },
    {
      $addFields: {
        avgOrderValue: {
          $cond: {
            if: { $gt: ['$orderCount', 0] },
            then: { $divide: ['$totalSpent', '$orderCount'] },
            else: 0
          }
        },
        customerLifetimeDays: {
          $cond: {
            if: { $ne: ['$firstOrderDate', null] },
            then: {
              $divide: [
                { $subtract: [new Date(), '$firstOrderDate'] },
                1000 * 60 * 60 * 24
              ]
            },
            else: 0
          }
        },
        daysSinceLastOrder: {
          $cond: {
            if: { $ne: ['$lastOrderDate', null] },
            then: {
              $divide: [
                { $subtract: [new Date(), '$lastOrderDate'] },
                1000 * 60 * 60 * 24
              ]
            },
            else: 999999
          }
        }
      }
    },
    {
      $addFields: {
        purchaseFrequency: {
          $cond: {
            if: { $gt: ['$customerLifetimeDays', 0] },
            then: { $divide: ['$orderCount', { $divide: ['$customerLifetimeDays', 30] }] },
            else: 0
          }
        },
        customerStatus: {
          $switch: {
            branches: [
              { case: { $lte: ['$daysSinceLastOrder', 30] }, then: 'Active' },
              { case: { $lte: ['$daysSinceLastOrder', 90] }, then: 'At Risk' },
              { case: { $gt: ['$daysSinceLastOrder', 90] }, then: 'Churned' }
            ],
            default: 'New'
          }
        }
      }
    },
    {
      $project: {
        firstName: 1,
        lastName: 1,
        email: 1,
        registeredAt: '$createdAt',
        orderCount: 1,
        totalSpent: 1,
        avgOrderValue: 1,
        firstOrderDate: 1,
        lastOrderDate: 1,
        customerLifetimeDays: { $round: ['$customerLifetimeDays', 0] },
        daysSinceLastOrder: { $round: ['$daysSinceLastOrder', 0] },
        purchaseFrequency: { $round: ['$purchaseFrequency', 2] },
        customerStatus: 1,
        lifetimeValue: '$totalSpent'
      }
    },
    { $sort: { lifetimeValue: -1 } },
    { $limit: limit }
  ];
};

/**
 * Inventory Status Pipeline
 * Analyzes product stock levels and alerts
 * @param {Object} options - Filter options { lowStockThreshold }
 * @returns {Array} Aggregation pipeline
 */
export const getInventoryStatusPipeline = (options = {}) => {
  const { lowStockThreshold = 10 } = options;

  return [
    { $match: { isActive: true } },
    { $unwind: { path: '$stock', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$_id',
        name: { $first: '$name' },
        category: { $first: '$category' },
        price: { $first: '$price' },
        discountPrice: { $first: '$discountPrice' },
        images: { $first: '$images' },
        totalStock: { $sum: '$stock.quantity' },
        stockVariants: {
          $push: {
            size: '$stock.size',
            color: '$stock.color',
            quantity: '$stock.quantity'
          }
        }
      }
    },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        as: 'categoryInfo'
      }
    },
    {
      $addFields: {
        categoryInfo: { $arrayElemAt: ['$categoryInfo', 0] }
      }
    },
    {
      $project: {
        name: 1,
        category: '$categoryInfo.name',
        price: 1,
        discountPrice: 1,
        image: { $arrayElemAt: ['$images', 0] },
        totalStock: 1,
        stockVariants: 1,
        stockStatus: {
          $switch: {
            branches: [
              { case: { $eq: ['$totalStock', 0] }, then: 'Out of Stock' },
              { case: { $lte: ['$totalStock', lowStockThreshold] }, then: 'Low Stock' },
              { case: { $gt: ['$totalStock', lowStockThreshold] }, then: 'In Stock' }
            ],
            default: 'Unknown'
          }
        }
      }
    },
    { $sort: { totalStock: 1 } }
  ];
};

/**
 * Batch Update Helper
 * Optimizes bulk write operations
 * @param {Model} model - Mongoose model
 * @param {Array} updates - Array of update operations
 * @returns {Promise} Bulk write result
 */
export const batchUpdate = async (model, updates) => {
  if (!updates || updates.length === 0) {
    return { ok: 0, message: 'No updates provided' };
  }

  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: update.filter,
      update: update.update,
      upsert: update.upsert || false
    }
  }));

  return await model.bulkWrite(bulkOps, { ordered: false });
};

/**
 * Batch Insert Helper
 * Optimizes bulk insert operations
 * @param {Model} model - Mongoose model
 * @param {Array} documents - Array of documents to insert
 * @returns {Promise} Insert result
 */
export const batchInsert = async (model, documents) => {
  if (!documents || documents.length === 0) {
    return { ok: 0, message: 'No documents provided' };
  }

  return await model.insertMany(documents, { ordered: false });
};

export default {
  getOrderStatisticsPipeline,
  getProductAnalyticsPipeline,
  getUserActivityMetricsPipeline,
  getCategoryProductCountPipeline,
  getRevenueAnalyticsPipeline,
  getCustomerLTVPipeline,
  getInventoryStatusPipeline,
  batchUpdate,
  batchInsert
};
