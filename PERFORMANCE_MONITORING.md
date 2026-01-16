# Performance Monitoring and Metrics System

## Overview

This comprehensive performance monitoring system tracks database query execution times, request response times, memory usage, API endpoint statistics, and system health metrics in real-time.

## Features

### 1. Request Performance Monitoring
- **Response time tracking**: Monitors execution time for every request
- **Slow request detection**: Automatically logs requests taking > 1000ms
- **Memory usage per request**: Tracks heap and RSS memory changes
- **Status code tracking**: Records response status codes for each endpoint
- **User agent and IP tracking**: Captures client information

### 2. Database Query Profiling
- **Query execution time**: Tracks time for all database operations
- **Slow query detection**: Automatically logs queries taking > 100ms
- **Query shape logging**: Records sanitized query patterns
- **Operation type tracking**: Monitors find, update, delete, aggregate operations
- **Collection-level metrics**: Groups queries by MongoDB collection

### 3. Memory Usage Monitoring
- **Heap usage tracking**: Monitors JavaScript heap memory
- **RSS tracking**: Monitors resident set size
- **Memory leak detection**: Warns when heap usage exceeds 75%
- **Historical data**: Stores memory usage over time

### 4. API Endpoint Statistics
- **Request count per endpoint**: Tracks usage frequency
- **Average/min/max response times**: Calculates performance metrics
- **Error rate tracking**: Monitors 4xx and 5xx errors
- **Status code distribution**: Shows breakdown of response codes

### 5. Request Rate Monitoring
- **Per-minute request tracking**: Monitors requests over time
- **High-traffic detection**: Warns when rate exceeds 100 req/min
- **Per-endpoint rate tracking**: Monitors individual endpoint usage

### 6. System Health Monitoring
- **Health status**: Reports healthy/degraded/unhealthy/critical status
- **System metrics**: CPU usage, uptime, Node.js version
- **Database status**: MongoDB connection state
- **Automated issue detection**: Identifies performance problems

## Architecture

### Components

#### 1. `/backend/utils/metrics.js`
Central metrics collection utility that stores and manages all performance data.

**Key Classes:**
- `MetricsCollector`: Singleton class managing all metrics

**Methods:**
- `recordRequest(requestData)`: Record request metrics
- `recordQuery(queryData)`: Record database query metrics
- `recordSystemMetrics()`: Capture system performance data
- `getMetrics()`: Retrieve all collected metrics
- `getSummary()`: Get performance summary
- `getHealthStatus()`: Get current health status
- `reset()`: Clear all metrics

#### 2. `/backend/middleware/performanceMonitor.js`
Middleware and utilities for performance tracking.

**Exports:**
- `requestPerformanceMonitor`: Main request tracking middleware
- `setupQueryProfiling()`: Configure mongoose query profiling
- `logEndpointResponseTime`: Log response times
- `memoryUsageMonitor`: Track memory usage
- `requestRateMonitor`: Monitor request rates
- `profileQuery()`: Profile specific query operations
- `SlowQueryDetector`: Class for detecting slow queries
- `startSystemMetricsMonitoring()`: Start periodic system monitoring
- `startPerformanceLogging()`: Start periodic performance summaries

#### 3. `/backend/routes/healthRoutes.js`
API endpoints for accessing metrics and health data.

## API Endpoints

### Public Endpoints

#### GET `/api/health`
Basic health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-14T12:00:00.000Z",
  "uptime": 3600,
  "environment": "production",
  "mongodb": "connected"
}
```

#### GET `/api/health/readiness`
Kubernetes/Docker readiness probe.

**Response (Ready):**
```json
{
  "status": "ready",
  "timestamp": "2024-01-14T12:00:00.000Z"
}
```

#### GET `/api/health/liveness`
Kubernetes/Docker liveness probe.

**Response:**
```json
{
  "status": "alive",
  "timestamp": "2024-01-14T12:00:00.000Z",
  "uptime": 3600
}
```

### Protected Endpoints (Admin Only)

#### GET `/api/health/metrics`
Complete performance metrics.

**Headers Required:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-14T12:00:00.000Z",
  "data": {
    "summary": {
      "totalRequests": 1000,
      "totalQueries": 500,
      "avgResponseTime": 45,
      "avgQueryTime": 12,
      "slowQueriesCount": 3,
      "errorRate": "2.5%",
      "currentRequestRate": 15,
      "uptime": 3600
    },
    "requests": {
      "recent": [...],
      "total": 1000
    },
    "queries": {
      "recent": [...],
      "slow": [...],
      "total": 500
    },
    "endpoints": [...],
    "apiUsage": [...],
    "requestRates": [...],
    "system": {...}
  }
}
```

#### GET `/api/health/metrics/summary`
Quick performance summary.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-14T12:00:00.000Z",
  "data": {
    "totalRequests": 1000,
    "totalQueries": 500,
    "avgResponseTime": 45,
    "avgQueryTime": 12,
    "slowQueriesCount": 3,
    "errorRate": "2.5%",
    "currentRequestRate": 15,
    "uptime": 3600
  }
}
```

#### GET `/api/health/metrics/queries`
Database query metrics.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-14T12:00:00.000Z",
  "data": {
    "recent": [
      {
        "timestamp": 1705233600000,
        "collection": "products",
        "operation": "find",
        "executionTime": 15,
        "isSlow": false,
        "queryShape": {"category": "electronics"},
        "docsExamined": 10,
        "docsReturned": 10
      }
    ],
    "slow": [...],
    "total": 500
  }
}
```

#### GET `/api/health/metrics/slow-queries`
Report of slow database queries.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-14T12:00:00.000Z",
  "data": {
    "total": 5,
    "queries": [
      {
        "timestamp": 1705233600000,
        "collection": "orders",
        "operation": "aggregate",
        "executionTime": 250,
        "isSlow": true,
        "queryShape": {...}
      }
    ],
    "byCollection": {
      "orders": [...],
      "products": [...]
    }
  }
}
```

#### GET `/api/health/metrics/endpoints`
Performance metrics per API endpoint.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-14T12:00:00.000Z",
  "data": [
    {
      "endpoint": "GET /api/products",
      "count": 150,
      "avgResponseTime": 45,
      "minResponseTime": 12,
      "maxResponseTime": 230,
      "statusCodes": {
        "200": 145,
        "404": 5
      },
      "errors": 5,
      "errorRate": "3.33%"
    }
  ]
}
```

#### GET `/api/health/metrics/api-usage`
API usage statistics.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-14T12:00:00.000Z",
  "data": [
    {
      "endpoint": "/api/products",
      "count": 150,
      "lastAccessed": "2024-01-14T12:00:00.000Z",
      "methods": {
        "GET": 120,
        "POST": 30
      }
    }
  ]
}
```

#### GET `/api/health/metrics/system`
System performance metrics.

**Response:**
```json
{
  "success": true,
  "timestamp": "2024-01-14T12:00:00.000Z",
  "data": {
    "current": {
      "memory": {
        "rss": "123.45 MB",
        "heapTotal": "89.12 MB",
        "heapUsed": "67.34 MB",
        "heapUsedPercentage": "75.55%",
        "external": "1.23 MB"
      },
      "uptime": "1h 30m 45s",
      "uptimeSeconds": 5445
    },
    "history": [...]
  }
}
```

#### GET `/api/health/status`
Health status with issue detection.

**Response (Healthy):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-14T12:00:00.000Z",
    "uptime": "1h 30m 45s",
    "metrics": {
      "avgResponseTime": 45,
      "errorRate": "2.5%",
      "memoryUsage": "67.55%",
      "slowQueries": 3,
      "requestRate": 15
    }
  }
}
```

**Response (Degraded):**
```json
{
  "success": true,
  "data": {
    "status": "degraded",
    "timestamp": "2024-01-14T12:00:00.000Z",
    "uptime": "1h 30m 45s",
    "issues": [
      "High memory usage",
      "High number of slow queries"
    ],
    "metrics": {...}
  }
}
```

#### GET `/api/health/detailed`
Detailed health check with full system information.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-14T12:00:00.000Z",
  "uptime": "1h 30m 45s",
  "mongodb": {
    "status": "connected",
    "readyState": 1,
    "host": "localhost",
    "name": "ecommerce"
  },
  "node": {
    "version": "v20.11.0",
    "platform": "darwin",
    "arch": "arm64",
    "pid": 12345
  },
  "memory": {...},
  "cpu": {...},
  "metrics": {...}
}
```

#### GET `/api/health/metrics/export`
Export metrics in Prometheus format.

**Response (text/plain):**
```
# HELP api_requests_total Total number of API requests
# TYPE api_requests_total counter
api_requests_total 1000

# HELP api_requests_error_rate Error rate percentage
# TYPE api_requests_error_rate gauge
api_requests_error_rate 2.5

# HELP api_response_time_avg Average response time in milliseconds
# TYPE api_response_time_avg gauge
api_response_time_avg 45
...
```

#### POST `/api/health/metrics/reset`
Reset all metrics (useful for testing).

**Response:**
```json
{
  "success": true,
  "message": "Metrics reset successfully",
  "timestamp": "2024-01-14T12:00:00.000Z"
}
```

## Configuration

### Thresholds

You can customize performance thresholds in `/backend/utils/metrics.js`:

```javascript
this.config = {
  maxStoredRequests: 1000,        // Maximum requests to store in memory
  maxStoredQueries: 500,          // Maximum queries to store
  slowQueryThreshold: 100,        // Slow query threshold in ms
  requestRateInterval: 60000,     // Request rate tracking interval (1 min)
  metricsRetentionTime: 3600000,  // Metrics retention time (1 hour)
};
```

### Monitoring Intervals

Configure monitoring intervals in `/backend/server.js`:

```javascript
// System metrics every 60 seconds
startSystemMetricsMonitoring(60000);

// Performance logging every 5 minutes
startPerformanceLogging(300000);
```

## Health Status Definitions

- **healthy**: All systems operating normally
  - Response time < 1000ms
  - Error rate < 5%
  - Memory usage < 75%
  - Slow queries < 10

- **degraded**: System experiencing minor issues
  - Response time > 1000ms OR
  - Memory usage > 75% OR
  - Slow queries > 10

- **unhealthy**: System experiencing significant issues
  - Error rate > 5%

- **critical**: System in critical state
  - Memory usage > 90%

## Console Logging

The system logs various events to the console:

### Request Logging
```
[ENDPOINT] GET /api/products - Status: 200 - 45.23ms
```

### Slow Request Warnings
```
[SLOW REQUEST] GET /api/products - 1234ms
```

### Query Logging (Development)
```
[MONGOOSE] products.find {"category": "electronics"}
```

### Slow Query Warnings
```
[SLOW QUERY] products.aggregate - 250ms {"pipeline": [...]}
```

### Memory Warnings
```
[MEMORY WARNING] High memory usage: 78.45% - Heap: 67.34MB / 89.12MB
```

### High Request Rate Warnings
```
[HIGH REQUEST RATE] GET /api/products - 150 requests in the last minute
```

### Periodic Performance Summary
```
========== PERFORMANCE SUMMARY ==========
Timestamp: 2024-01-14T12:00:00.000Z
Total Requests: 1000
Avg Response Time: 45ms
Error Rate: 2.5%
Slow Queries: 3
Current Request Rate: 15 req/min
Memory Usage: 67.55%
Uptime: 1h 30m 45s
=========================================
```

## Usage Examples

### Get Current Performance Metrics
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/api/health/metrics/summary
```

### Monitor Slow Queries
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/api/health/metrics/slow-queries
```

### Check API Usage Statistics
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/api/health/metrics/api-usage
```

### Export Metrics for Prometheus
```bash
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/api/health/metrics/export
```

### Profile a Specific Query
```javascript
import { profileQuery } from './middleware/performanceMonitor.js';

const products = await profileQuery('fetchProducts', async () => {
  return await Product.find({ category: 'electronics' });
});
```

### Track Slow Query with Context
```javascript
import { slowQueryDetector } from './middleware/performanceMonitor.js';

const result = await slowQueryDetector.trackQuery(
  'complexAggregation',
  async () => {
    return await Order.aggregate([...]);
  },
  { userId: req.user.id, filters: req.query }
);
```

## Integration with Monitoring Tools

### Prometheus
Use the `/api/health/metrics/export` endpoint to integrate with Prometheus.

**prometheus.yml:**
```yaml
scrape_configs:
  - job_name: 'ecommerce-api'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/api/health/metrics/export'
    bearer_token: '<admin-token>'
```

### Grafana
Create dashboards using metrics from the `/api/health/metrics` endpoint.

### Kubernetes Health Checks
```yaml
livenessProbe:
  httpGet:
    path: /api/health/liveness
    port: 5000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /api/health/readiness
    port: 5000
  initialDelaySeconds: 5
  periodSeconds: 5
```

## Performance Optimization Tips

1. **Monitor slow queries regularly**: Check `/api/health/metrics/slow-queries` daily
2. **Watch memory trends**: High memory usage indicates potential leaks
3. **Track endpoint performance**: Identify bottlenecks using endpoint metrics
4. **Set up alerts**: Configure monitoring tools to alert on degraded health
5. **Analyze request patterns**: Use API usage stats to optimize caching
6. **Review error rates**: Investigate endpoints with high error rates

## Troubleshooting

### High Memory Usage
1. Check system metrics for memory trends
2. Review slow queries that might be loading large datasets
3. Consider implementing pagination or field filtering
4. Restart the application if memory leak is suspected

### Slow Queries
1. Review query shapes in slow query report
2. Add appropriate database indexes
3. Optimize aggregation pipelines
4. Consider query result caching

### High Error Rates
1. Check endpoint metrics for specific failing endpoints
2. Review recent requests for patterns
3. Check database connection status
4. Review application logs for errors

## File Structure

```
backend/
├── middleware/
│   └── performanceMonitor.js    # Performance monitoring middleware
├── utils/
│   └── metrics.js                # Metrics collection utility
├── routes/
│   └── healthRoutes.js           # Health and metrics API endpoints
└── server.js                     # Updated with monitoring integration
```

## Best Practices

1. **Regular Monitoring**: Check metrics dashboard at least daily
2. **Set Up Alerts**: Configure alerts for critical thresholds
3. **Optimize Queries**: Address slow queries promptly
4. **Resource Planning**: Use metrics for capacity planning
5. **Historical Analysis**: Track trends over time for insights
6. **Security**: Protect metrics endpoints (admin-only access)
7. **Performance Budgets**: Set and enforce performance targets

## Related Documentation

- [Optimization Summary](./OPTIMIZATION_SUMMARY.md)
- [Security Implementation](./SECURITY_IMPLEMENTATION.md)
- [API Documentation](./README.md)
