/**
 * Health Check Routes
 * Provides endpoints for monitoring service health
 */

import express from 'express';
import mongoose from 'mongoose';
import monitoring from '../utils/monitoring.js';

const router = express.Router();

/**
 * Basic health check
 * GET /api/health
 */
router.get('/', (req, res) => {
  const healthStatus = monitoring.getHealthStatus();

  res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'validatesharing-api',
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * Detailed health check
 * GET /api/health/detailed
 */
router.get('/detailed', (req, res) => {
  const healthStatus = monitoring.getHealthStatus();

  res.status(healthStatus.status === 'healthy' ? 200 : 503).json({
    status: healthStatus.status,
    timestamp: new Date().toISOString(),
    service: 'validatesharing-api',
    version: process.env.npm_package_version || '1.0.0',
    checks: healthStatus.checks,
    metrics: healthStatus.metrics,
    system: {
      platform: process.platform,
      nodeVersion: process.version,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    }
  });
});

/**
 * Database health check
 * GET /api/health/db
 */
router.get('/db', async (req, res) => {
  try {
    // Check MongoDB connection
    const dbState = mongoose.connection.readyState;
    const dbStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };

    const isHealthy = dbState === 1;

    if (isHealthy) {
      // Perform a simple query to verify database is responsive
      await mongoose.connection.db.admin().ping();
    }

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      database: {
        state: dbStates[dbState],
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Redis health check
 * GET /api/health/redis
 */
router.get('/redis', async (req, res) => {
  try {
    // If you have Redis client, check its connection
    // This is a placeholder - implement based on your Redis setup
    const isHealthy = true; // Replace with actual Redis health check

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      redis: {
        connected: isHealthy
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Liveness probe (Kubernetes)
 * GET /api/health/live
 */
router.get('/live', (req, res) => {
  // Simple check - is the service running?
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe (Kubernetes)
 * GET /api/health/ready
 */
router.get('/ready', async (req, res) => {
  try {
    // Check if service is ready to handle requests
    const dbReady = mongoose.connection.readyState === 1;

    if (dbReady) {
      await mongoose.connection.db.admin().ping();
    }

    const isReady = dbReady;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not ready',
      checks: {
        database: dbReady
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get application metrics
 * GET /api/health/metrics
 */
router.get('/metrics', (req, res) => {
  const metrics = monitoring.getMetrics();

  res.status(200).json({
    metrics,
    timestamp: new Date().toISOString()
  });
});

/**
 * Startup probe (Kubernetes)
 * GET /api/health/startup
 */
router.get('/startup', (req, res) => {
  // Check if application has finished starting up
  const uptime = process.uptime();
  const isStarted = uptime > 5; // Service considered started after 5 seconds

  res.status(isStarted ? 200 : 503).json({
    status: isStarted ? 'started' : 'starting',
    uptime,
    timestamp: new Date().toISOString()
  });
});

export default router;
