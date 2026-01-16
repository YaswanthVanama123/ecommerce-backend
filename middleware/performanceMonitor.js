/**
 * Performance Monitoring Middleware
 * Tracks request response times, database queries, and system metrics
 */

import metricsCollector from '../utils/metrics.js';
import mongoose from 'mongoose';

/**
 * Request performance monitoring middleware
 * Tracks response times and records metrics for each request
 */
export const requestPerformanceMonitor = (req, res, next) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  // Capture the original end function
  const originalEnd = res.end;

  // Override res.end to capture metrics when response completes
  res.end = function (...args) {
    // Restore original end function
    res.end = originalEnd;

    // Calculate metrics
    const responseTime = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    // Record request metrics
    metricsCollector.recordRequest({
      method: req.method,
      path: req.route ? req.route.path : req.path,
      statusCode: res.statusCode,
      responseTime,
      memoryUsage: {
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        rss: endMemory.rss - startMemory.rss
      },
      userAgent: req.get('user-agent'),
      ip: req.ip || req.connection.remoteAddress
    });

    // Log slow requests (> 1000ms)
    if (responseTime > 1000) {
      console.warn(`[SLOW REQUEST] ${req.method} ${req.path} - ${responseTime}ms`);
    }

    // Add response time header
    res.set('X-Response-Time', `${responseTime}ms`);

    // Call the original end function
    return originalEnd.apply(res, args);
  };

  next();
};

/**
 * Database query performance monitoring
 * Sets up mongoose middleware to track query execution times
 */
export const setupQueryProfiling = () => {
  // Enable mongoose debug mode in development
  if (process.env.NODE_ENV === 'development') {
    mongoose.set('debug', (collectionName, method, query, doc) => {
      console.log(`[MONGOOSE] ${collectionName}.${method}`, JSON.stringify(query));
    });
  }

  // Track query execution time for all query types
  const queryTypes = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'countDocuments',
    'aggregate'
  ];

  // Apply pre and post hooks for all schemas
  mongoose.plugin((schema) => {
    queryTypes.forEach((queryType) => {
      // Pre hook to record start time
      schema.pre(queryType, function () {
        this._startTime = Date.now();
        this._queryType = queryType;
      });

      // Post hook to record execution time
      schema.post(queryType, function (result) {
        if (this._startTime) {
          const executionTime = Date.now() - this._startTime;
          const collection = this.model?.collection?.name || this.mongooseCollection?.name || 'unknown';

          // Record query metrics
          metricsCollector.recordQuery({
            collection,
            operation: this._queryType,
            executionTime,
            queryShape: sanitizeQuery(this.getQuery()),
            docsExamined: result?.length || (result ? 1 : 0),
            docsReturned: result?.length || (result ? 1 : 0)
          });

          // Log slow queries (> 100ms)
          if (executionTime > 100) {
            console.warn(
              `[SLOW QUERY] ${collection}.${this._queryType} - ${executionTime}ms`,
              JSON.stringify(sanitizeQuery(this.getQuery()))
            );
          }
        }
      });
    });
  });
};

/**
 * Sanitize query for logging (remove sensitive data)
 */
const sanitizeQuery = (query) => {
  if (!query) return {};

  const sanitized = JSON.parse(JSON.stringify(query));

  // Remove sensitive fields
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

  const removeSensitiveData = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;

    Object.keys(obj).forEach(key => {
      if (sensitiveFields.includes(key)) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        removeSensitiveData(obj[key]);
      }
    });

    return obj;
  };

  return removeSensitiveData(sanitized);
};

/**
 * System metrics monitoring
 * Periodically records system performance metrics
 */
export const startSystemMetricsMonitoring = (interval = 60000) => {
  setInterval(() => {
    metricsCollector.recordSystemMetrics();
  }, interval);

  // Record initial metrics
  metricsCollector.recordSystemMetrics();

  console.log('[PERFORMANCE MONITOR] System metrics monitoring started');
};

/**
 * Endpoint response time logger
 * Logs response time for specific endpoints
 */
export const logEndpointResponseTime = (req, res, next) => {
  const startTime = process.hrtime();

  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const responseTime = seconds * 1000 + nanoseconds / 1000000; // Convert to milliseconds

    // Log response time
    console.log(
      `[ENDPOINT] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} - ${responseTime.toFixed(2)}ms`
    );
  });

  next();
};

/**
 * Memory usage monitoring middleware
 * Logs memory usage for each request
 */
export const memoryUsageMonitor = (req, res, next) => {
  const memUsage = process.memoryUsage();

  // Log if memory usage is high (> 75% of heap)
  const heapUsedPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  if (heapUsedPercentage > 75) {
    console.warn(
      `[MEMORY WARNING] High memory usage: ${heapUsedPercentage.toFixed(2)}% - ` +
      `Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB / ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`
    );
  }

  next();
};

/**
 * Request rate monitoring middleware
 * Tracks request rates per endpoint
 */
const requestCounts = new Map();
const REQUEST_WINDOW = 60000; // 1 minute

export const requestRateMonitor = (req, res, next) => {
  const endpoint = `${req.method} ${req.route ? req.route.path : req.path}`;
  const now = Date.now();

  if (!requestCounts.has(endpoint)) {
    requestCounts.set(endpoint, []);
  }

  const counts = requestCounts.get(endpoint);

  // Add current request
  counts.push(now);

  // Remove old requests outside the window
  const filtered = counts.filter(timestamp => now - timestamp < REQUEST_WINDOW);
  requestCounts.set(endpoint, filtered);

  // Log high request rates (> 100 requests per minute)
  if (filtered.length > 100) {
    console.warn(
      `[HIGH REQUEST RATE] ${endpoint} - ${filtered.length} requests in the last minute`
    );
  }

  next();
};

/**
 * Query profiling for specific operations
 * Provides detailed profiling for complex queries
 */
export const profileQuery = async (queryName, queryFn) => {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  try {
    const result = await queryFn();
    const executionTime = Date.now() - startTime;
    const endMemory = process.memoryUsage();

    console.log(
      `[QUERY PROFILE] ${queryName} - ${executionTime}ms - ` +
      `Memory: ${((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2)}MB`
    );

    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error(`[QUERY PROFILE ERROR] ${queryName} - ${executionTime}ms - ${error.message}`);
    throw error;
  }
};

/**
 * Slow query detection middleware
 * Monitors and logs slow database queries
 */
export class SlowQueryDetector {
  constructor(threshold = 100) {
    this.threshold = threshold;
    this.slowQueries = [];
    this.maxSlowQueries = 100;
  }

  async trackQuery(queryName, queryFn, context = {}) {
    const startTime = Date.now();

    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;

      if (executionTime > this.threshold) {
        const slowQuery = {
          name: queryName,
          executionTime,
          timestamp: new Date().toISOString(),
          context
        };

        this.slowQueries.push(slowQuery);

        // Trim old entries
        if (this.slowQueries.length > this.maxSlowQueries) {
          this.slowQueries.shift();
        }

        console.warn(
          `[SLOW QUERY DETECTED] ${queryName} - ${executionTime}ms - ` +
          `Context: ${JSON.stringify(context)}`
        );
      }

      return result;
    } catch (error) {
      console.error(`[QUERY ERROR] ${queryName} - ${error.message}`);
      throw error;
    }
  }

  getSlowQueries() {
    return this.slowQueries.sort((a, b) => b.executionTime - a.executionTime);
  }

  clearSlowQueries() {
    this.slowQueries = [];
  }
}

// Create singleton instance
export const slowQueryDetector = new SlowQueryDetector(100);

/**
 * Performance summary logger
 * Logs performance summary periodically
 */
export const startPerformanceLogging = (interval = 300000) => {
  setInterval(() => {
    const metrics = metricsCollector.getMetrics();

    console.log('\n========== PERFORMANCE SUMMARY ==========');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Total Requests: ${metrics.summary.totalRequests}`);
    console.log(`Avg Response Time: ${metrics.summary.avgResponseTime}ms`);
    console.log(`Error Rate: ${metrics.summary.errorRate}`);
    console.log(`Slow Queries: ${metrics.summary.slowQueriesCount}`);
    console.log(`Current Request Rate: ${metrics.summary.currentRequestRate} req/min`);
    console.log(`Memory Usage: ${metrics.system.current.memory.heapUsedPercentage}`);
    console.log(`Uptime: ${metrics.system.current.uptime}`);
    console.log('=========================================\n');
  }, interval);
};

export default {
  requestPerformanceMonitor,
  setupQueryProfiling,
  logEndpointResponseTime,
  memoryUsageMonitor,
  requestRateMonitor,
  profileQuery,
  slowQueryDetector,
  startSystemMetricsMonitoring,
  startPerformanceLogging
};
