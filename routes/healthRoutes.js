/**
 * Health and Metrics Routes
 * Provides endpoints for monitoring application health and performance metrics
 */

import express from 'express';
import metricsCollector from '../utils/metrics.js';
import mongoose from 'mongoose';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Basic health check
 * @access  Public
 */
router.get('/', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };

  res.status(200).json(health);
});

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with system metrics
 * @access  Protected (Admin only)
 */
router.get('/detailed', protect, isAdmin, (req, res) => {
  const healthStatus = metricsCollector.getHealthStatus();

  const detailed = {
    ...healthStatus,
    mongodb: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    },
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid
    },
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  const statusCode = healthStatus.status === 'healthy' ? 200 :
                     healthStatus.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(detailed);
});

/**
 * @route   GET /api/health/metrics
 * @desc    Get performance metrics
 * @access  Protected (Admin only)
 */
router.get('/metrics', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics
    });
  } catch (error) {
    console.error('[METRICS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/metrics/summary
 * @desc    Get metrics summary
 * @access  Protected (Admin only)
 */
router.get('/metrics/summary', protect, isAdmin, (req, res) => {
  try {
    const summary = metricsCollector.getSummary();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: summary
    });
  } catch (error) {
    console.error('[METRICS SUMMARY ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve metrics summary',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/metrics/requests
 * @desc    Get request metrics
 * @access  Protected (Admin only)
 */
router.get('/metrics/requests', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        recent: metrics.requests.recent,
        total: metrics.requests.total,
        requestRates: metrics.requestRates
      }
    });
  } catch (error) {
    console.error('[REQUEST METRICS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve request metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/metrics/queries
 * @desc    Get database query metrics
 * @access  Protected (Admin only)
 */
router.get('/metrics/queries', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        recent: metrics.queries.recent,
        slow: metrics.queries.slow,
        total: metrics.queries.total
      }
    });
  } catch (error) {
    console.error('[QUERY METRICS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve query metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/metrics/endpoints
 * @desc    Get endpoint performance metrics
 * @access  Protected (Admin only)
 */
router.get('/metrics/endpoints', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics.endpoints
    });
  } catch (error) {
    console.error('[ENDPOINT METRICS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve endpoint metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/metrics/api-usage
 * @desc    Get API usage statistics
 * @access  Protected (Admin only)
 */
router.get('/metrics/api-usage', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics.apiUsage
    });
  } catch (error) {
    console.error('[API USAGE ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve API usage statistics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/metrics/system
 * @desc    Get system metrics
 * @access  Protected (Admin only)
 */
router.get('/metrics/system', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: metrics.system
    });
  } catch (error) {
    console.error('[SYSTEM METRICS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve system metrics',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/health/metrics/reset
 * @desc    Reset all metrics
 * @access  Protected (Admin only)
 */
router.post('/metrics/reset', protect, isAdmin, (req, res) => {
  try {
    metricsCollector.reset();

    res.status(200).json({
      success: true,
      message: 'Metrics reset successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[METRICS RESET ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset metrics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/status
 * @desc    Get health status with issues
 * @access  Protected (Admin only)
 */
router.get('/status', protect, isAdmin, (req, res) => {
  try {
    const healthStatus = metricsCollector.getHealthStatus();

    const statusCode = healthStatus.status === 'healthy' ? 200 :
                       healthStatus.status === 'degraded' ? 200 :
                       healthStatus.status === 'unhealthy' ? 503 : 503;

    res.status(statusCode).json({
      success: true,
      data: healthStatus
    });
  } catch (error) {
    console.error('[HEALTH STATUS ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve health status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/readiness
 * @desc    Readiness probe (for Kubernetes/Docker)
 * @access  Public
 */
router.get('/readiness', (req, res) => {
  const isReady = mongoose.connection.readyState === 1;

  if (isReady) {
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'Database connection not established'
    });
  }
});

/**
 * @route   GET /api/health/liveness
 * @desc    Liveness probe (for Kubernetes/Docker)
 * @access  Public
 */
router.get('/liveness', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * @route   GET /api/health/metrics/slow-queries
 * @desc    Get slow query report
 * @access  Protected (Admin only)
 */
router.get('/metrics/slow-queries', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const slowQueries = metrics.queries.slow;

    // Group by collection
    const byCollection = {};
    slowQueries.forEach(query => {
      if (!byCollection[query.collection]) {
        byCollection[query.collection] = [];
      }
      byCollection[query.collection].push(query);
    });

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        total: slowQueries.length,
        queries: slowQueries,
        byCollection
      }
    });
  } catch (error) {
    console.error('[SLOW QUERIES ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve slow queries',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/health/metrics/export
 * @desc    Export metrics in Prometheus format
 * @access  Protected (Admin only)
 */
router.get('/metrics/export', protect, isAdmin, (req, res) => {
  try {
    const metrics = metricsCollector.getMetrics();
    const summary = metrics.summary;

    // Generate Prometheus-style metrics
    const prometheusMetrics = `
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total ${summary.totalRequests}

# HELP api_requests_error_rate Error rate percentage
# TYPE api_requests_error_rate gauge
api_requests_error_rate ${parseFloat(summary.errorRate)}

# HELP api_response_time_avg Average response time in milliseconds
# TYPE api_response_time_avg gauge
api_response_time_avg ${summary.avgResponseTime}

# HELP db_queries_total Total number of database queries
# TYPE db_queries_total counter
db_queries_total ${summary.totalQueries}

# HELP db_queries_slow_total Total number of slow queries
# TYPE db_queries_slow_total counter
db_queries_slow_total ${summary.slowQueriesCount}

# HELP db_query_time_avg Average query execution time in milliseconds
# TYPE db_query_time_avg gauge
db_query_time_avg ${summary.avgQueryTime}

# HELP system_uptime_seconds System uptime in seconds
# TYPE system_uptime_seconds gauge
system_uptime_seconds ${summary.uptime}

# HELP api_request_rate_current Current request rate per minute
# TYPE api_request_rate_current gauge
api_request_rate_current ${summary.currentRequestRate}
`.trim();

    res.set('Content-Type', 'text/plain');
    res.status(200).send(prometheusMetrics);
  } catch (error) {
    console.error('[METRICS EXPORT ERROR]', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export metrics',
      error: error.message
    });
  }
});

export default router;
