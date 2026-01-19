import Order from '../models/Order.js';
import Shipping from '../models/Shipping.js';

/**
 * Shipping Analytics Service
 * Provides comprehensive analytics for shipping and delivery operations
 */

/**
 * Calculate average delivery time by carrier
 * @param {Object} options - Filter options (startDate, endDate, carrier)
 * @returns {Promise<Array>} Average delivery times grouped by carrier
 */
export const getAverageDeliveryTimeByCarrier = async (options = {}) => {
  try {
    const { startDate, endDate, carrier } = options;

    const matchStage = {
      status: 'delivered',
      actualDeliveryDate: { $exists: true }
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    if (carrier) {
      matchStage.carrier = carrier;
    }

    const results = await Shipping.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          deliveryTimeInDays: {
            $divide: [
              { $subtract: ['$actualDeliveryDate', '$createdAt'] },
              1000 * 60 * 60 * 24 // Convert milliseconds to days
            ]
          }
        }
      },
      {
        $group: {
          _id: '$carrier',
          averageDeliveryTime: { $avg: '$deliveryTimeInDays' },
          minDeliveryTime: { $min: '$deliveryTimeInDays' },
          maxDeliveryTime: { $max: '$deliveryTimeInDays' },
          totalDeliveries: { $sum: 1 }
        }
      },
      {
        $project: {
          carrier: '$_id',
          averageDeliveryTime: { $round: ['$averageDeliveryTime', 2] },
          minDeliveryTime: { $round: ['$minDeliveryTime', 2] },
          maxDeliveryTime: { $round: ['$maxDeliveryTime', 2] },
          totalDeliveries: 1,
          _id: 0
        }
      },
      { $sort: { averageDeliveryTime: 1 } }
    ]);

    return results;
  } catch (error) {
    console.error('Error calculating average delivery time:', error);
    throw error;
  }
};

/**
 * Calculate delivery success rate
 * @param {Object} options - Filter options (startDate, endDate, carrier)
 * @returns {Promise<Object>} Success rate statistics
 */
export const getDeliverySuccessRate = async (options = {}) => {
  try {
    const { startDate, endDate, carrier } = options;

    const matchStage = {};

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    if (carrier) {
      matchStage.carrier = carrier;
    }

    const results = await Shipping.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalShipments: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          returned: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
          },
          inTransit: {
            $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          pickedUp: {
            $sum: { $cond: [{ $eq: ['$status', 'picked_up'] }, 1, 0] }
          },
          outForDelivery: {
            $sum: { $cond: [{ $eq: ['$status', 'out_for_delivery'] }, 1, 0] }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalShipments: 1,
          delivered: 1,
          failed: 1,
          returned: 1,
          inTransit: 1,
          pending: 1,
          pickedUp: 1,
          outForDelivery: 1,
          successRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$delivered', '$totalShipments'] },
                  100
                ]
              },
              2
            ]
          },
          failureRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$failed', '$totalShipments'] },
                  100
                ]
              },
              2
            ]
          },
          returnRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$returned', '$totalShipments'] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    return results[0] || {
      totalShipments: 0,
      delivered: 0,
      failed: 0,
      returned: 0,
      inTransit: 0,
      pending: 0,
      pickedUp: 0,
      outForDelivery: 0,
      successRate: 0,
      failureRate: 0,
      returnRate: 0
    };
  } catch (error) {
    console.error('Error calculating delivery success rate:', error);
    throw error;
  }
};

/**
 * Get failed deliveries report
 * @param {Object} options - Filter options (startDate, endDate, carrier, limit)
 * @returns {Promise<Array>} List of failed deliveries with details
 */
export const getFailedDeliveriesReport = async (options = {}) => {
  try {
    const { startDate, endDate, carrier, limit = 100 } = options;

    const matchStage = { status: 'failed' };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    if (carrier) {
      matchStage.carrier = carrier;
    }

    const failedShipments = await Shipping.find(matchStage)
      .populate('order', 'orderNumber totalAmount')
      .select('trackingNumber carrier status currentLocation recipientInfo notes createdAt locationHistory')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Extract failure reasons from location history
    const failedDeliveriesWithReasons = failedShipments.map(shipment => {
      const failureEntry = shipment.locationHistory
        .filter(entry => entry.status === 'failed')
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      return {
        trackingNumber: shipment.trackingNumber,
        orderNumber: shipment.order?.orderNumber || 'N/A',
        carrier: shipment.carrier,
        recipientName: shipment.recipientInfo?.name || 'N/A',
        recipientCity: shipment.recipientInfo?.address?.city || 'N/A',
        currentLocation: shipment.currentLocation,
        failureReason: failureEntry?.description || shipment.notes || 'No reason provided',
        failureDate: failureEntry?.timestamp || shipment.createdAt,
        orderValue: shipment.order?.totalAmount || 0
      };
    });

    return failedDeliveriesWithReasons;
  } catch (error) {
    console.error('Error generating failed deliveries report:', error);
    throw error;
  }
};

/**
 * Carrier performance comparison
 * @param {Object} options - Filter options (startDate, endDate)
 * @returns {Promise<Array>} Performance metrics by carrier
 */
export const getCarrierPerformanceComparison = async (options = {}) => {
  try {
    const { startDate, endDate } = options;

    const matchStage = {};

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const results = await Shipping.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$carrier',
          totalShipments: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          returned: {
            $sum: { $cond: [{ $eq: ['$status', 'returned'] }, 1, 0] }
          },
          inTransit: {
            $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'shippings',
          let: { carrierName: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$carrier', '$$carrierName'] },
                    { $eq: ['$status', 'delivered'] },
                    { $ne: ['$actualDeliveryDate', null] }
                  ]
                },
                ...matchStage
              }
            },
            {
              $addFields: {
                deliveryTimeInDays: {
                  $divide: [
                    { $subtract: ['$actualDeliveryDate', '$createdAt'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgDeliveryTime: { $avg: '$deliveryTimeInDays' }
              }
            }
          ],
          as: 'deliveryStats'
        }
      },
      {
        $project: {
          carrier: '$_id',
          totalShipments: 1,
          delivered: 1,
          failed: 1,
          returned: 1,
          inTransit: 1,
          successRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$delivered', '$totalShipments'] },
                  100
                ]
              },
              2
            ]
          },
          failureRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$failed', '$totalShipments'] },
                  100
                ]
              },
              2
            ]
          },
          averageDeliveryTime: {
            $round: [
              { $ifNull: [{ $arrayElemAt: ['$deliveryStats.avgDeliveryTime', 0] }, 0] },
              2
            ]
          },
          _id: 0
        }
      },
      { $sort: { successRate: -1 } }
    ]);

    return results;
  } catch (error) {
    console.error('Error comparing carrier performance:', error);
    throw error;
  }
};

/**
 * Calculate revenue by shipping carrier
 * @param {Object} options - Filter options (startDate, endDate)
 * @returns {Promise<Array>} Revenue statistics by carrier
 */
export const getRevenueByCarrier = async (options = {}) => {
  try {
    const { startDate, endDate } = options;

    const matchStage = {
      shippingStatus: { $in: ['delivered', 'in_transit', 'shipped'] }
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const results = await Order.aggregate([
      { $match: matchStage },
      {
        $lookup: {
          from: 'shippings',
          localField: 'shipping',
          foreignField: '_id',
          as: 'shippingDetails'
        }
      },
      { $unwind: { path: '$shippingDetails', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$shippingDetails.carrier',
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          totalShippingCharges: { $sum: '$shippingCharge' },
          averageOrderValue: { $avg: '$totalAmount' }
        }
      },
      {
        $project: {
          carrier: { $ifNull: ['$_id', 'not_assigned'] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          totalOrders: 1,
          totalShippingCharges: { $round: ['$totalShippingCharges', 2] },
          averageOrderValue: { $round: ['$averageOrderValue', 2] },
          _id: 0
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    return results;
  } catch (error) {
    console.error('Error calculating revenue by carrier:', error);
    throw error;
  }
};

/**
 * Get delayed shipments report
 * @param {Object} options - Filter options (carrier, limit)
 * @returns {Promise<Array>} List of delayed shipments
 */
export const getDelayedShipmentsReport = async (options = {}) => {
  try {
    const { carrier, limit = 100 } = options;

    const now = new Date();
    const matchStage = {
      status: { $nin: ['delivered', 'failed', 'returned'] },
      estimatedDeliveryDate: { $lt: now }
    };

    if (carrier) {
      matchStage.carrier = carrier;
    }

    const delayedShipments = await Shipping.find(matchStage)
      .populate('order', 'orderNumber totalAmount user')
      .select('trackingNumber carrier status currentLocation estimatedDeliveryDate recipientInfo createdAt')
      .sort({ estimatedDeliveryDate: 1 })
      .limit(limit)
      .lean();

    const delayedWithMetrics = delayedShipments.map(shipment => {
      const delayInDays = Math.floor(
        (now - new Date(shipment.estimatedDeliveryDate)) / (1000 * 60 * 60 * 24)
      );

      return {
        trackingNumber: shipment.trackingNumber,
        orderNumber: shipment.order?.orderNumber || 'N/A',
        carrier: shipment.carrier,
        status: shipment.status,
        currentLocation: shipment.currentLocation,
        recipientName: shipment.recipientInfo?.name || 'N/A',
        recipientCity: shipment.recipientInfo?.address?.city || 'N/A',
        estimatedDeliveryDate: shipment.estimatedDeliveryDate,
        delayInDays,
        orderValue: shipment.order?.totalAmount || 0,
        createdAt: shipment.createdAt
      };
    });

    return delayedWithMetrics;
  } catch (error) {
    console.error('Error generating delayed shipments report:', error);
    throw error;
  }
};

/**
 * Get regional delivery analytics
 * @param {Object} options - Filter options (startDate, endDate, region)
 * @returns {Promise<Array>} Delivery statistics by region (state/city)
 */
export const getRegionalDeliveryAnalytics = async (options = {}) => {
  try {
    const { startDate, endDate, groupBy = 'state' } = options;

    const matchStage = {};

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const groupField = groupBy === 'city'
      ? '$recipientInfo.address.city'
      : '$recipientInfo.address.state';

    const results = await Shipping.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: groupField,
          totalShipments: { $sum: 1 },
          delivered: {
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] }
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          inTransit: {
            $sum: { $cond: [{ $eq: ['$status', 'in_transit'] }, 1, 0] }
          },
          carriers: { $addToSet: '$carrier' }
        }
      },
      {
        $lookup: {
          from: 'shippings',
          let: { regionName: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: [groupField, '$$regionName'] },
                    { $eq: ['$status', 'delivered'] },
                    { $ne: ['$actualDeliveryDate', null] }
                  ]
                },
                ...matchStage
              }
            },
            {
              $addFields: {
                deliveryTimeInDays: {
                  $divide: [
                    { $subtract: ['$actualDeliveryDate', '$createdAt'] },
                    1000 * 60 * 60 * 24
                  ]
                }
              }
            },
            {
              $group: {
                _id: null,
                avgDeliveryTime: { $avg: '$deliveryTimeInDays' }
              }
            }
          ],
          as: 'deliveryStats'
        }
      },
      {
        $project: {
          region: '$_id',
          totalShipments: 1,
          delivered: 1,
          failed: 1,
          inTransit: 1,
          successRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$delivered', '$totalShipments'] },
                  100
                ]
              },
              2
            ]
          },
          averageDeliveryTime: {
            $round: [
              { $ifNull: [{ $arrayElemAt: ['$deliveryStats.avgDeliveryTime', 0] }, 0] },
              2
            ]
          },
          carriersUsed: { $size: '$carriers' },
          _id: 0
        }
      },
      { $sort: { totalShipments: -1 } },
      { $limit: 50 }
    ]);

    return results;
  } catch (error) {
    console.error('Error generating regional delivery analytics:', error);
    throw error;
  }
};

/**
 * Get shipping overview metrics
 * @param {Object} options - Filter options (startDate, endDate)
 * @returns {Promise<Object>} Overview statistics
 */
export const getShippingOverview = async (options = {}) => {
  try {
    const { startDate, endDate } = options;

    const matchStage = {};

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const [statusCounts, deliveryMetrics, carrierCounts] = await Promise.all([
      // Status counts
      Shipping.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Delivery time metrics for delivered shipments
      Shipping.aggregate([
        {
          $match: {
            ...matchStage,
            status: 'delivered',
            actualDeliveryDate: { $exists: true }
          }
        },
        {
          $addFields: {
            deliveryTimeInDays: {
              $divide: [
                { $subtract: ['$actualDeliveryDate', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDeliveryTime: { $avg: '$deliveryTimeInDays' },
            minDeliveryTime: { $min: '$deliveryTimeInDays' },
            maxDeliveryTime: { $max: '$deliveryTimeInDays' }
          }
        }
      ]),

      // Carrier distribution
      Shipping.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$carrier',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ])
    ]);

    // Format status counts
    const statusMap = {};
    statusCounts.forEach(item => {
      statusMap[item._id] = item.count;
    });

    // Format carrier counts
    const carrierDistribution = carrierCounts.map(item => ({
      carrier: item._id,
      count: item.count
    }));

    return {
      totalShipments: statusCounts.reduce((sum, item) => sum + item.count, 0),
      statusBreakdown: {
        pending: statusMap.pending || 0,
        pickedUp: statusMap.picked_up || 0,
        inTransit: statusMap.in_transit || 0,
        outForDelivery: statusMap.out_for_delivery || 0,
        delivered: statusMap.delivered || 0,
        failed: statusMap.failed || 0,
        returned: statusMap.returned || 0
      },
      deliveryMetrics: deliveryMetrics[0] ? {
        averageDeliveryTime: Math.round(deliveryMetrics[0].avgDeliveryTime * 100) / 100,
        minDeliveryTime: Math.round(deliveryMetrics[0].minDeliveryTime * 100) / 100,
        maxDeliveryTime: Math.round(deliveryMetrics[0].maxDeliveryTime * 100) / 100
      } : {
        averageDeliveryTime: 0,
        minDeliveryTime: 0,
        maxDeliveryTime: 0
      },
      carrierDistribution
    };
  } catch (error) {
    console.error('Error generating shipping overview:', error);
    throw error;
  }
};

/**
 * Get delivery time trends over time
 * @param {Object} options - Filter options (startDate, endDate, interval)
 * @returns {Promise<Array>} Delivery time trends
 */
export const getDeliveryTimeTrends = async (options = {}) => {
  try {
    const { startDate, endDate, interval = 'day' } = options;

    const matchStage = {
      status: 'delivered',
      actualDeliveryDate: { $exists: true }
    };

    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    // Determine date grouping based on interval
    let dateFormat;
    switch (interval) {
      case 'hour':
        dateFormat = { $dateToString: { format: '%Y-%m-%d %H:00', date: '$createdAt' } };
        break;
      case 'week':
        dateFormat = { $dateToString: { format: '%Y-W%V', date: '$createdAt' } };
        break;
      case 'month':
        dateFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
        break;
      case 'day':
      default:
        dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    }

    const results = await Shipping.aggregate([
      { $match: matchStage },
      {
        $addFields: {
          deliveryTimeInDays: {
            $divide: [
              { $subtract: ['$actualDeliveryDate', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          },
          dateGroup: dateFormat
        }
      },
      {
        $group: {
          _id: '$dateGroup',
          averageDeliveryTime: { $avg: '$deliveryTimeInDays' },
          totalDeliveries: { $sum: 1 }
        }
      },
      {
        $project: {
          date: '$_id',
          averageDeliveryTime: { $round: ['$averageDeliveryTime', 2] },
          totalDeliveries: 1,
          _id: 0
        }
      },
      { $sort: { date: 1 } }
    ]);

    return results;
  } catch (error) {
    console.error('Error generating delivery time trends:', error);
    throw error;
  }
};

/**
 * Get top performing carriers
 * @param {Object} options - Filter options (startDate, endDate, limit)
 * @returns {Promise<Array>} Top carriers by performance score
 */
export const getTopPerformingCarriers = async (options = {}) => {
  try {
    const { startDate, endDate, limit = 5 } = options;

    const performanceData = await getCarrierPerformanceComparison({ startDate, endDate });

    // Calculate performance score (weighted)
    const carriersWithScore = performanceData.map(carrier => {
      // Performance score formula:
      // 40% success rate + 30% inverse of avg delivery time + 20% volume + 10% low failure rate
      const volumeScore = Math.min((carrier.totalShipments / 100) * 10, 10); // Max 10 points for volume
      const successScore = (carrier.successRate / 100) * 40;
      const speedScore = carrier.averageDeliveryTime > 0
        ? Math.max(30 - (carrier.averageDeliveryTime * 2), 0)
        : 0;
      const reliabilityScore = (1 - (carrier.failureRate / 100)) * 10;

      const performanceScore = successScore + speedScore + volumeScore + reliabilityScore;

      return {
        ...carrier,
        performanceScore: Math.round(performanceScore * 100) / 100,
        volumeScore: Math.round(volumeScore * 100) / 100,
        successScore: Math.round(successScore * 100) / 100,
        speedScore: Math.round(speedScore * 100) / 100,
        reliabilityScore: Math.round(reliabilityScore * 100) / 100
      };
    });

    // Sort by performance score and limit
    return carriersWithScore
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting top performing carriers:', error);
    throw error;
  }
};

export default {
  getAverageDeliveryTimeByCarrier,
  getDeliverySuccessRate,
  getFailedDeliveriesReport,
  getCarrierPerformanceComparison,
  getRevenueByCarrier,
  getDelayedShipmentsReport,
  getRegionalDeliveryAnalytics,
  getShippingOverview,
  getDeliveryTimeTrends,
  getTopPerformingCarriers
};
