import express from 'express';
import {
  getShippingOverview,
  getCarrierPerformanceComparison,
  getDeliveryTimeTrends,
  getAverageDeliveryTimeByCarrier,
  getDeliverySuccessRate,
  getFailedDeliveriesReport,
  getRevenueByCarrier,
  getDelayedShipmentsReport,
  getRegionalDeliveryAnalytics,
  getTopPerformingCarriers
} from '../analytics/shippingAnalytics.js';
import { authenticateToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * All analytics routes are protected and require authentication
 * Some routes require admin or superadmin role
 */

/**
 * @route   GET /api/analytics/shipping/overview
 * @desc    Get shipping overview metrics
 * @access  Admin, Superadmin
 * @query   startDate, endDate (optional)
 */
router.get('/shipping/overview', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const overview = await getShippingOverview({ startDate, endDate });

    res.json({
      success: true,
      data: overview
    });
  } catch (error) {
    console.error('Error fetching shipping overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shipping overview',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/carriers
 * @desc    Get carrier performance comparison
 * @access  Admin, Superadmin
 * @query   startDate, endDate (optional)
 */
router.get('/shipping/carriers', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const carriers = await getCarrierPerformanceComparison({ startDate, endDate });

    res.json({
      success: true,
      data: carriers
    });
  } catch (error) {
    console.error('Error fetching carrier performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch carrier performance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/performance
 * @desc    Get delivery performance metrics (trends and success rates)
 * @access  Admin, Superadmin
 * @query   startDate, endDate, interval (optional)
 */
router.get('/shipping/performance', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate, interval = 'day' } = req.query;

    const [trends, successRate] = await Promise.all([
      getDeliveryTimeTrends({ startDate, endDate, interval }),
      getDeliverySuccessRate({ startDate, endDate })
    ]);

    res.json({
      success: true,
      data: {
        trends,
        successRate
      }
    });
  } catch (error) {
    console.error('Error fetching delivery performance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery performance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/delivery-time
 * @desc    Get average delivery time by carrier
 * @access  Admin, Superadmin
 * @query   startDate, endDate, carrier (optional)
 */
router.get('/shipping/delivery-time', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate, carrier } = req.query;

    const deliveryTimes = await getAverageDeliveryTimeByCarrier({ startDate, endDate, carrier });

    res.json({
      success: true,
      data: deliveryTimes
    });
  } catch (error) {
    console.error('Error fetching delivery times:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery times',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/failed-deliveries
 * @desc    Get failed deliveries report
 * @access  Superadmin
 * @query   startDate, endDate, carrier, limit (optional)
 */
router.get('/shipping/failed-deliveries', authenticateToken, checkRole(['superadmin']), async (req, res) => {
  try {
    const { startDate, endDate, carrier, limit } = req.query;

    const failedDeliveries = await getFailedDeliveriesReport({
      startDate,
      endDate,
      carrier,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({
      success: true,
      data: failedDeliveries,
      count: failedDeliveries.length
    });
  } catch (error) {
    console.error('Error fetching failed deliveries:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch failed deliveries',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/delayed-shipments
 * @desc    Get delayed shipments report
 * @access  Admin, Superadmin
 * @query   carrier, limit (optional)
 */
router.get('/shipping/delayed-shipments', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { carrier, limit } = req.query;

    const delayedShipments = await getDelayedShipmentsReport({
      carrier,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({
      success: true,
      data: delayedShipments,
      count: delayedShipments.length
    });
  } catch (error) {
    console.error('Error fetching delayed shipments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch delayed shipments',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/revenue
 * @desc    Get revenue by shipping carrier
 * @access  Superadmin
 * @query   startDate, endDate (optional)
 */
router.get('/shipping/revenue', authenticateToken, checkRole(['superadmin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const revenue = await getRevenueByCarrier({ startDate, endDate });

    res.json({
      success: true,
      data: revenue
    });
  } catch (error) {
    console.error('Error fetching revenue by carrier:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue by carrier',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/regional
 * @desc    Get regional delivery analytics
 * @access  Admin, Superadmin
 * @query   startDate, endDate, groupBy (optional - 'state' or 'city')
 */
router.get('/shipping/regional', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'state' } = req.query;

    const regionalData = await getRegionalDeliveryAnalytics({ startDate, endDate, groupBy });

    res.json({
      success: true,
      data: regionalData
    });
  } catch (error) {
    console.error('Error fetching regional analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch regional analytics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/top-carriers
 * @desc    Get top performing carriers
 * @access  Admin, Superadmin
 * @query   startDate, endDate, limit (optional)
 */
router.get('/shipping/top-carriers', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;

    const topCarriers = await getTopPerformingCarriers({
      startDate,
      endDate,
      limit: limit ? parseInt(limit) : undefined
    });

    res.json({
      success: true,
      data: topCarriers
    });
  } catch (error) {
    console.error('Error fetching top carriers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top carriers',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/analytics/shipping/success-rate
 * @desc    Get delivery success rate
 * @access  Admin, Superadmin
 * @query   startDate, endDate, carrier (optional)
 */
router.get('/shipping/success-rate', authenticateToken, checkRole(['admin', 'superadmin']), async (req, res) => {
  try {
    const { startDate, endDate, carrier } = req.query;

    const successRate = await getDeliverySuccessRate({ startDate, endDate, carrier });

    res.json({
      success: true,
      data: successRate
    });
  } catch (error) {
    console.error('Error fetching success rate:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch success rate',
      error: error.message
    });
  }
});

export default router;
