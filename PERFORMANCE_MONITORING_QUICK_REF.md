# Performance Monitoring Quick Reference

## Quick Start

### Access Metrics Dashboard
```bash
# Get performance summary
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/api/health/metrics/summary
```

### Check Health Status
```bash
# Public health check
curl http://localhost:5000/api/health

# Detailed health (admin only)
curl -H "Authorization: Bearer <admin-token>" \
  http://localhost:5000/api/health/detailed
```

## Key Endpoints

| Endpoint | Access | Description |
|----------|--------|-------------|
| `/api/health` | Public | Basic health check |
| `/api/health/liveness` | Public | Liveness probe |
| `/api/health/readiness` | Public | Readiness probe |
| `/api/health/metrics` | Admin | Complete metrics |
| `/api/health/metrics/summary` | Admin | Quick summary |
| `/api/health/metrics/queries` | Admin | Query metrics |
| `/api/health/metrics/slow-queries` | Admin | Slow query report |
| `/api/health/metrics/endpoints` | Admin | Endpoint stats |
| `/api/health/metrics/api-usage` | Admin | API usage stats |
| `/api/health/metrics/system` | Admin | System metrics |
| `/api/health/status` | Admin | Health status |
| `/api/health/metrics/export` | Admin | Prometheus format |

## Monitoring Features

### 1. Request Tracking
- ✓ Response time for every request
- ✓ Memory usage per request
- ✓ Status code tracking
- ✓ Slow request detection (>1000ms)

### 2. Query Profiling
- ✓ Execution time for all queries
- ✓ Slow query detection (>100ms)
- ✓ Query shape logging
- ✓ Collection-level metrics

### 3. Memory Monitoring
- ✓ Heap usage tracking
- ✓ RSS tracking
- ✓ Memory leak warnings (>75%)
- ✓ Historical data

### 4. API Statistics
- ✓ Request count per endpoint
- ✓ Avg/min/max response times
- ✓ Error rate tracking
- ✓ Status code distribution

### 5. Rate Monitoring
- ✓ Requests per minute
- ✓ High-traffic warnings (>100 req/min)
- ✓ Per-endpoint rates

## Console Output Examples

### Request Logging
```
[ENDPOINT] GET /api/products - Status: 200 - 45.23ms
```

### Slow Request Warning
```
[SLOW REQUEST] GET /api/products - 1234ms
```

### Slow Query Warning
```
[SLOW QUERY] products.aggregate - 250ms
```

### Memory Warning
```
[MEMORY WARNING] High memory usage: 78.45%
```

### Performance Summary (Every 5 minutes)
```
========== PERFORMANCE SUMMARY ==========
Total Requests: 1000
Avg Response Time: 45ms
Error Rate: 2.5%
Slow Queries: 3
Memory Usage: 67.55%
=========================================
```

## Health Status Levels

| Status | Condition | Action |
|--------|-----------|--------|
| **healthy** | All metrics normal | None |
| **degraded** | Response time >1s OR Memory >75% | Monitor closely |
| **unhealthy** | Error rate >5% | Investigate errors |
| **critical** | Memory >90% | Immediate action |

## Configuration

### Adjust Thresholds
Edit `/backend/utils/metrics.js`:
```javascript
this.config = {
  slowQueryThreshold: 100,        // ms
  maxStoredRequests: 1000,
  maxStoredQueries: 500,
  requestRateInterval: 60000,     // 1 minute
  metricsRetentionTime: 3600000,  // 1 hour
};
```

### Change Monitoring Intervals
Edit `/backend/server.js`:
```javascript
startSystemMetricsMonitoring(60000);  // 60 seconds
startPerformanceLogging(300000);      // 5 minutes
```

## Code Examples

### Profile a Query
```javascript
import { profileQuery } from './middleware/performanceMonitor.js';

const result = await profileQuery('myQuery', async () => {
  return await Model.find(query);
});
```

### Track Slow Query with Context
```javascript
import { slowQueryDetector } from './middleware/performanceMonitor.js';

const result = await slowQueryDetector.trackQuery(
  'complexQuery',
  async () => await Model.aggregate(pipeline),
  { userId: req.user.id }
);
```

### Manual Metrics Recording
```javascript
import metricsCollector from './utils/metrics.js';

metricsCollector.recordRequest({
  method: 'GET',
  path: '/api/test',
  statusCode: 200,
  responseTime: 45,
  memoryUsage: { heapUsed: 1024, rss: 2048 },
  userAgent: 'Mozilla/5.0',
  ip: '127.0.0.1'
});
```

## Troubleshooting

### Problem: High Memory Usage
**Check:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/health/metrics/system
```
**Solution:** Review slow queries, implement pagination, restart if leak suspected

### Problem: Slow Queries
**Check:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/health/metrics/slow-queries
```
**Solution:** Add indexes, optimize queries, implement caching

### Problem: High Error Rate
**Check:**
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/health/metrics/endpoints
```
**Solution:** Review endpoint-specific errors, check database connection

## Integration

### Kubernetes Health Checks
```yaml
livenessProbe:
  httpGet:
    path: /api/health/liveness
    port: 5000

readinessProbe:
  httpGet:
    path: /api/health/readiness
    port: 5000
```

### Prometheus Scraping
```yaml
scrape_configs:
  - job_name: 'api'
    metrics_path: '/api/health/metrics/export'
    bearer_token: '<admin-token>'
    static_configs:
      - targets: ['localhost:5000']
```

## Files Created

1. `/backend/utils/metrics.js` - Metrics collection utility
2. `/backend/middleware/performanceMonitor.js` - Performance middleware
3. `/backend/routes/healthRoutes.js` - Health/metrics API endpoints
4. `/backend/server.js` - Updated with monitoring integration

## Additional Resources

- Full Documentation: [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md)
- Optimization Guide: [OPTIMIZATION_SUMMARY.md](./OPTIMIZATION_SUMMARY.md)
- Security Guide: [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md)
