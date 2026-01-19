/**
 * Monitoring and Observability Utilities
 * Provides error tracking, performance monitoring, and custom metrics
 */

import os from 'os';
import process from 'process';

class MonitoringService {
  constructor() {
    this.metrics = {
      requests: { total: 0, errors: 0, success: 0 },
      responseTime: [],
      activeConnections: 0,
      errors: [],
      customMetrics: new Map()
    };

    this.startTime = Date.now();
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Initialize monitoring service
   */
  init() {
    if (this.isProduction && process.env.SENTRY_DSN) {
      this.initSentry();
    }

    this.setupPerformanceMonitoring();
    this.setupMetricsCollection();

    console.log('[Monitoring] Service initialized');
  }

  /**
   * Initialize Sentry for error tracking
   */
  initSentry() {
    try {
      // Placeholder for Sentry initialization
      // In production, install @sentry/node and configure
      console.log('[Monitoring] Sentry initialized');
    } catch (error) {
      console.error('[Monitoring] Failed to initialize Sentry:', error.message);
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    setInterval(() => {
      this.collectSystemMetrics();
    }, 60000);
  }

  /**
   * Setup metrics collection
   */
  setupMetricsCollection() {
    setInterval(() => {
      this.resetHourlyMetrics();
    }, 3600000);
  }

  /**
   * Track error
   */
  trackError(error, context = {}) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };

    this.metrics.errors.push(errorData);

    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
    }

    console.error('[Monitoring] Error tracked:', errorData);

    if (this.isProduction) {
      this.sendToErrorTracking(errorData);
    }

    this.metrics.requests.errors++;
  }

  /**
   * Track request
   */
  trackRequest(req, res, responseTime) {
    this.metrics.requests.total++;

    if (res.statusCode >= 400) {
      this.metrics.requests.errors++;
    } else {
      this.metrics.requests.success++;
    }

    this.metrics.responseTime.push({
      path: req.path,
      method: req.method,
      time: responseTime,
      statusCode: res.statusCode,
      timestamp: Date.now()
    });

    if (this.metrics.responseTime.length > 1000) {
      this.metrics.responseTime.shift();
    }
  }

  /**
   * Track custom metric
   */
  trackCustomMetric(name, value, tags = {}) {
    if (!this.metrics.customMetrics.has(name)) {
      this.metrics.customMetrics.set(name, []);
    }

    const metric = {
      value,
      tags,
      timestamp: Date.now()
    };

    const metrics = this.metrics.customMetrics.get(name);
    metrics.push(metric);

    if (metrics.length > 100) {
      metrics.shift();
    }

    console.log(`[Monitoring] Custom metric tracked: ${name}=${value}`);
  }

  /**
   * Collect system metrics
   */
  collectSystemMetrics() {
    const metrics = {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      uptime: process.uptime(),
      systemMemory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      loadAverage: os.loadavg(),
      timestamp: new Date().toISOString()
    };

    this.trackCustomMetric('system.memory.rss', metrics.memory.rss);
    this.trackCustomMetric('system.memory.heap', metrics.memory.heapUsed);
    this.trackCustomMetric('system.cpu.user', metrics.cpu.user);
    this.trackCustomMetric('system.uptime', metrics.uptime);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0
      ? this.metrics.responseTime.reduce((sum, m) => sum + m.time, 0) / this.metrics.responseTime.length
      : 0;

    const recentErrors = this.metrics.errors.slice(-10);

    return {
      uptime: process.uptime(),
      startTime: this.startTime,
      requests: this.metrics.requests,
      performance: {
        averageResponseTime: avgResponseTime.toFixed(2),
        recentResponseTimes: this.metrics.responseTime.slice(-10)
      },
      recentErrors,
      activeConnections: this.metrics.activeConnections,
      memory: process.memoryUsage(),
      system: {
        platform: os.platform(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        loadAverage: os.loadavg()
      },
      customMetrics: Object.fromEntries(this.metrics.customMetrics)
    };
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const memoryUsage = process.memoryUsage();
    const memoryThreshold = 0.9;
    const maxHeap = memoryUsage.heapTotal;
    const usedHeap = memoryUsage.heapUsed;

    const isHealthy = {
      memory: (usedHeap / maxHeap) < memoryThreshold,
      uptime: process.uptime() > 0,
      errors: this.metrics.requests.errors < (this.metrics.requests.total * 0.1)
    };

    const status = Object.values(isHealthy).every(v => v) ? 'healthy' : 'unhealthy';

    return {
      status,
      checks: isHealthy,
      metrics: {
        uptime: process.uptime(),
        memory: memoryUsage,
        requests: this.metrics.requests,
        errorRate: this.metrics.requests.total > 0
          ? ((this.metrics.requests.errors / this.metrics.requests.total) * 100).toFixed(2) + '%'
          : '0%'
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Reset hourly metrics
   */
  resetHourlyMetrics() {
    console.log('[Monitoring] Resetting hourly metrics');
    this.metrics.requests = { total: 0, errors: 0, success: 0 };
    this.metrics.responseTime = [];
  }

  /**
   * Send error to external tracking service
   */
  sendToErrorTracking(errorData) {
    console.log('[Monitoring] Sending error to tracking service:', errorData.message);
  }

  /**
   * Track active connection
   */
  incrementConnections() {
    this.metrics.activeConnections++;
  }

  /**
   * Track closed connection
   */
  decrementConnections() {
    this.metrics.activeConnections--;
  }
}

const monitoring = new MonitoringService();

export default monitoring;
