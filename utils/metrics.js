/**
 * Performance Metrics Collection Utility
 * Tracks and stores performance metrics for API endpoints and database queries
 */

class MetricsCollector {
  constructor() {
    // Store metrics in memory (in production, consider using Redis or a time-series database)
    this.metrics = {
      requests: [],
      queries: [],
      endpoints: new Map(),
      apiUsage: new Map(),
      requestRates: [],
      systemMetrics: []
    };

    // Configuration
    this.config = {
      maxStoredRequests: 1000,
      maxStoredQueries: 500,
      slowQueryThreshold: 100, // ms
      requestRateInterval: 60000, // 1 minute
      metricsRetentionTime: 3600000, // 1 hour
    };

    // Initialize request rate tracking
    this.currentMinuteRequests = 0;
    this.startRequestRateTracking();

    // Initialize cleanup interval
    this.startMetricsCleanup();
  }

  /**
   * Record a request metric
   */
  recordRequest(requestData) {
    const metric = {
      timestamp: Date.now(),
      method: requestData.method,
      path: requestData.path,
      statusCode: requestData.statusCode,
      responseTime: requestData.responseTime,
      memoryUsage: requestData.memoryUsage,
      userAgent: requestData.userAgent,
      ip: requestData.ip
    };

    this.metrics.requests.push(metric);
    this.currentMinuteRequests++;

    // Trim old requests if limit exceeded
    if (this.metrics.requests.length > this.config.maxStoredRequests) {
      this.metrics.requests.shift();
    }

    // Update endpoint statistics
    this.updateEndpointStats(requestData);

    // Update API usage statistics
    this.updateApiUsage(requestData);
  }

  /**
   * Record a database query metric
   */
  recordQuery(queryData) {
    const metric = {
      timestamp: Date.now(),
      collection: queryData.collection,
      operation: queryData.operation,
      executionTime: queryData.executionTime,
      isSlow: queryData.executionTime > this.config.slowQueryThreshold,
      queryShape: queryData.queryShape,
      docsExamined: queryData.docsExamined,
      docsReturned: queryData.docsReturned
    };

    this.metrics.queries.push(metric);

    // Trim old queries if limit exceeded
    if (this.metrics.queries.length > this.config.maxStoredQueries) {
      this.metrics.queries.shift();
    }
  }

  /**
   * Update endpoint statistics
   */
  updateEndpointStats(requestData) {
    const endpoint = `${requestData.method} ${requestData.path}`;

    if (!this.metrics.endpoints.has(endpoint)) {
      this.metrics.endpoints.set(endpoint, {
        count: 0,
        totalResponseTime: 0,
        minResponseTime: Infinity,
        maxResponseTime: 0,
        statusCodes: {},
        errors: 0
      });
    }

    const stats = this.metrics.endpoints.get(endpoint);
    stats.count++;
    stats.totalResponseTime += requestData.responseTime;
    stats.minResponseTime = Math.min(stats.minResponseTime, requestData.responseTime);
    stats.maxResponseTime = Math.max(stats.maxResponseTime, requestData.responseTime);

    // Track status codes
    const statusCode = requestData.statusCode.toString();
    stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;

    // Track errors (4xx and 5xx)
    if (requestData.statusCode >= 400) {
      stats.errors++;
    }
  }

  /**
   * Update API usage statistics
   */
  updateApiUsage(requestData) {
    const endpoint = requestData.path;

    if (!this.metrics.apiUsage.has(endpoint)) {
      this.metrics.apiUsage.set(endpoint, {
        count: 0,
        lastAccessed: Date.now(),
        methods: {}
      });
    }

    const usage = this.metrics.apiUsage.get(endpoint);
    usage.count++;
    usage.lastAccessed = Date.now();
    usage.methods[requestData.method] = (usage.methods[requestData.method] || 0) + 1;
  }

  /**
   * Record system metrics
   */
  recordSystemMetrics() {
    const memUsage = process.memoryUsage();

    const metric = {
      timestamp: Date.now(),
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      uptime: process.uptime(),
      cpu: process.cpuUsage()
    };

    this.metrics.systemMetrics.push(metric);

    // Keep only last 100 system metrics
    if (this.metrics.systemMetrics.length > 100) {
      this.metrics.systemMetrics.shift();
    }
  }

  /**
   * Start request rate tracking
   */
  startRequestRateTracking() {
    setInterval(() => {
      this.metrics.requestRates.push({
        timestamp: Date.now(),
        requestsPerMinute: this.currentMinuteRequests
      });

      // Keep only last 60 minutes of data
      if (this.metrics.requestRates.length > 60) {
        this.metrics.requestRates.shift();
      }

      // Reset counter
      this.currentMinuteRequests = 0;
    }, this.config.requestRateInterval);
  }

  /**
   * Start periodic metrics cleanup
   */
  startMetricsCleanup() {
    setInterval(() => {
      const cutoffTime = Date.now() - this.config.metricsRetentionTime;

      // Clean up old requests
      this.metrics.requests = this.metrics.requests.filter(
        req => req.timestamp > cutoffTime
      );

      // Clean up old queries
      this.metrics.queries = this.metrics.queries.filter(
        query => query.timestamp > cutoffTime
      );

      // Clean up old system metrics
      this.metrics.systemMetrics = this.metrics.systemMetrics.filter(
        metric => metric.timestamp > cutoffTime
      );
    }, this.config.metricsRetentionTime / 2); // Run cleanup twice per retention period
  }

  /**
   * Get all metrics
   */
  getMetrics() {
    return {
      summary: this.getSummary(),
      requests: {
        recent: this.metrics.requests.slice(-50), // Last 50 requests
        total: this.metrics.requests.length
      },
      queries: {
        recent: this.metrics.queries.slice(-50), // Last 50 queries
        slow: this.getSlowQueries(),
        total: this.metrics.queries.length
      },
      endpoints: this.getEndpointMetrics(),
      apiUsage: this.getApiUsageMetrics(),
      requestRates: this.metrics.requestRates,
      system: this.getSystemMetrics()
    };
  }

  /**
   * Get summary metrics
   */
  getSummary() {
    const recentRequests = this.metrics.requests.slice(-100);
    const recentQueries = this.metrics.queries.slice(-100);

    const avgResponseTime = recentRequests.length > 0
      ? recentRequests.reduce((sum, req) => sum + req.responseTime, 0) / recentRequests.length
      : 0;

    const avgQueryTime = recentQueries.length > 0
      ? recentQueries.reduce((sum, query) => sum + query.executionTime, 0) / recentQueries.length
      : 0;

    const slowQueries = recentQueries.filter(q => q.isSlow).length;
    const errorCount = recentRequests.filter(req => req.statusCode >= 400).length;

    return {
      totalRequests: this.metrics.requests.length,
      totalQueries: this.metrics.queries.length,
      avgResponseTime: Math.round(avgResponseTime),
      avgQueryTime: Math.round(avgQueryTime),
      slowQueriesCount: slowQueries,
      errorRate: recentRequests.length > 0
        ? ((errorCount / recentRequests.length) * 100).toFixed(2) + '%'
        : '0%',
      currentRequestRate: this.currentMinuteRequests,
      uptime: Math.round(process.uptime())
    };
  }

  /**
   * Get slow queries
   */
  getSlowQueries() {
    return this.metrics.queries
      .filter(q => q.isSlow)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 20);
  }

  /**
   * Get endpoint metrics
   */
  getEndpointMetrics() {
    const endpoints = [];

    this.metrics.endpoints.forEach((stats, endpoint) => {
      endpoints.push({
        endpoint,
        count: stats.count,
        avgResponseTime: Math.round(stats.totalResponseTime / stats.count),
        minResponseTime: Math.round(stats.minResponseTime),
        maxResponseTime: Math.round(stats.maxResponseTime),
        statusCodes: stats.statusCodes,
        errors: stats.errors,
        errorRate: ((stats.errors / stats.count) * 100).toFixed(2) + '%'
      });
    });

    // Sort by count (most accessed first)
    return endpoints.sort((a, b) => b.count - a.count);
  }

  /**
   * Get API usage metrics
   */
  getApiUsageMetrics() {
    const usage = [];

    this.metrics.apiUsage.forEach((stats, endpoint) => {
      usage.push({
        endpoint,
        count: stats.count,
        lastAccessed: new Date(stats.lastAccessed).toISOString(),
        methods: stats.methods
      });
    });

    // Sort by count (most used first)
    return usage.sort((a, b) => b.count - a.count);
  }

  /**
   * Get system metrics
   */
  getSystemMetrics() {
    if (this.metrics.systemMetrics.length === 0) {
      this.recordSystemMetrics();
    }

    const latest = this.metrics.systemMetrics[this.metrics.systemMetrics.length - 1];

    return {
      current: {
        memory: {
          rss: this.formatBytes(latest.memory.rss),
          heapTotal: this.formatBytes(latest.memory.heapTotal),
          heapUsed: this.formatBytes(latest.memory.heapUsed),
          heapUsedPercentage: ((latest.memory.heapUsed / latest.memory.heapTotal) * 100).toFixed(2) + '%',
          external: this.formatBytes(latest.memory.external)
        },
        uptime: this.formatUptime(latest.uptime),
        uptimeSeconds: Math.round(latest.uptime)
      },
      history: this.metrics.systemMetrics.map(m => ({
        timestamp: m.timestamp,
        heapUsed: m.memory.heapUsed,
        rss: m.memory.rss
      }))
    };
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format uptime to human readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics.requests = [];
    this.metrics.queries = [];
    this.metrics.endpoints.clear();
    this.metrics.apiUsage.clear();
    this.metrics.requestRates = [];
    this.metrics.systemMetrics = [];
    this.currentMinuteRequests = 0;
  }

  /**
   * Get health status
   */
  getHealthStatus() {
    const summary = this.getSummary();
    const systemMetrics = this.getSystemMetrics();

    let status = 'healthy';
    const issues = [];

    // Check response time
    if (summary.avgResponseTime > 1000) {
      status = 'degraded';
      issues.push('High average response time');
    }

    // Check error rate
    const errorRate = parseFloat(summary.errorRate);
    if (errorRate > 5) {
      status = 'unhealthy';
      issues.push('High error rate');
    }

    // Check memory usage
    const heapUsedPercentage = parseFloat(systemMetrics.current.memory.heapUsedPercentage);
    if (heapUsedPercentage > 90) {
      status = 'critical';
      issues.push('Critical memory usage');
    } else if (heapUsedPercentage > 75) {
      if (status === 'healthy') status = 'degraded';
      issues.push('High memory usage');
    }

    // Check slow queries
    if (summary.slowQueriesCount > 10) {
      if (status === 'healthy') status = 'degraded';
      issues.push('High number of slow queries');
    }

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: systemMetrics.current.uptime,
      issues: issues.length > 0 ? issues : undefined,
      metrics: {
        avgResponseTime: summary.avgResponseTime,
        errorRate: summary.errorRate,
        memoryUsage: systemMetrics.current.memory.heapUsedPercentage,
        slowQueries: summary.slowQueriesCount,
        requestRate: summary.currentRequestRate
      }
    };
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

export default metricsCollector;
