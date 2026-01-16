# Performance Monitoring System Architecture

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Incoming HTTP Request                        │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Express Middleware     │
                    │  Pipeline Start         │
                    └────────────┬────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    │  ┌─────────────────────────▼─────────────────────────┐  │
    │  │  1. requestPerformanceMonitor                     │  │
    │  │     - Start timer                                 │  │
    │  │     - Capture start memory                        │  │
    │  │     - Override res.end()                          │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  2. logEndpointResponseTime                       │  │
    │  │     - Log response time on finish                 │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  3. memoryUsageMonitor                            │  │
    │  │     - Check current memory usage                  │  │
    │  │     - Warn if > 75% heap                          │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    │  ┌───────────────────────────────────────────────────┐  │
    │  │  4. requestRateMonitor                            │  │
    │  │     - Track requests per endpoint                 │  │
    │  │     - Warn if > 100 req/min                       │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Route Handler         │
                    │   (Controller Logic)    │
                    └────────────┬────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    │  ┌─────────────────────────▼─────────────────────────┐  │
    │  │  Database Query (Mongoose)                        │  │
    │  │                                                    │  │
    │  │  ┌──────────────────────────────────────────────┐ │  │
    │  │  │  Pre Hook (setupQueryProfiling)              │ │  │
    │  │  │  - Start timer                               │ │  │
    │  │  │  - Record query type                         │ │  │
    │  │  └──────────────────────────────────────────────┘ │  │
    │  │                                                    │  │
    │  │  ┌──────────────────────────────────────────────┐ │  │
    │  │  │  Query Execution                             │ │  │
    │  │  │  - MongoDB operation                         │ │  │
    │  │  └──────────────────────────────────────────────┘ │  │
    │  │                                                    │  │
    │  │  ┌──────────────────────────────────────────────┐ │  │
    │  │  │  Post Hook (setupQueryProfiling)             │ │  │
    │  │  │  - Calculate execution time                  │ │  │
    │  │  │  - Record to metricsCollector                │ │  │
    │  │  │  - Log if slow (> 100ms)                     │ │  │
    │  │  └──────────────────────────────────────────────┘ │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   Send Response         │
                    └────────────┬────────────┘
                                 │
    ┌────────────────────────────┼────────────────────────────┐
    │                            │                            │
    │  ┌─────────────────────────▼─────────────────────────┐  │
    │  │  res.end() Override                               │  │
    │  │  - Calculate response time                        │  │
    │  │  - Calculate memory usage delta                   │  │
    │  │  - Record to metricsCollector                     │  │
    │  │  - Log if slow (> 1000ms)                         │  │
    │  │  - Add X-Response-Time header                     │  │
    │  └───────────────────────────────────────────────────┘  │
    │                                                          │
    └──────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  Response to Client     │
                    └─────────────────────────┘
```

## Metrics Collection Flow

```
┌───────────────────────────────────────────────────────────────┐
│                    MetricsCollector                            │
│                    (Singleton Instance)                        │
└───────────────────────────────┬───────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
    ┌───────────▼──────────┐    │    ┌──────────▼──────────┐
    │  Request Metrics     │    │    │   Query Metrics     │
    │  ┌────────────────┐  │    │    │  ┌───────────────┐  │
    │  │ method         │  │    │    │  │ collection    │  │
    │  │ path           │  │    │    │  │ operation     │  │
    │  │ statusCode     │  │    │    │  │ executionTime │  │
    │  │ responseTime   │  │    │    │  │ isSlow        │  │
    │  │ memoryUsage    │  │    │    │  │ queryShape    │  │
    │  │ userAgent      │  │    │    │  │ docsExamined  │  │
    │  │ ip             │  │    │    │  │ docsReturned  │  │
    │  └────────────────┘  │    │    │  └───────────────┘  │
    │  Max: 1000 entries   │    │    │  Max: 500 entries   │
    └──────────────────────┘    │    └─────────────────────┘
                                │
                ┌───────────────▼───────────────┐
                │     System Metrics            │
                │  ┌─────────────────────────┐  │
                │  │ timestamp               │  │
                │  │ memory (heap/rss)       │  │
                │  │ uptime                  │  │
                │  │ cpu                     │  │
                │  └─────────────────────────┘  │
                │  Collected every 60s          │
                └───────────────────────────────┘
                                │
            ┌───────────────────┼───────────────────┐
            │                   │                   │
┌───────────▼──────────┐  ┌────▼─────────┐  ┌─────▼────────────┐
│ Endpoint Stats       │  │ API Usage    │  │ Request Rates    │
│ ┌──────────────────┐ │  │ ┌──────────┐ │  │ ┌──────────────┐ │
│ │ count            │ │  │ │ count    │ │  │ │ timestamp    │ │
│ │ avgResponseTime  │ │  │ │ methods  │ │  │ │ requestsPer  │ │
│ │ minResponseTime  │ │  │ │ lastAccess││ │ │   Minute     │ │
│ │ maxResponseTime  │ │  │ └──────────┘ │  │ └──────────────┘ │
│ │ statusCodes      │ │  │ Per endpoint │  │ Rolling 60 min   │
│ │ errors           │ │  └──────────────┘  └──────────────────┘
│ └──────────────────┘ │
└──────────────────────┘
```

## Monitoring Endpoints Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     /api/health Routes                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            │                │                │
   ┌────────▼────────┐   ┌──▼──────────┐  ┌─▼──────────────┐
   │  Public Access  │   │   Protected │  │   Protected    │
   │                 │   │   (Admin)   │  │   (Admin)      │
   │  /              │   │   /detailed │  │   /metrics     │
   │  /liveness      │   │   /status   │  │   /metrics/*   │
   │  /readiness     │   │             │  │                │
   └─────────────────┘   └─────────────┘  └────────────────┘
                                                    │
                    ┌───────────────────────────────┼───────────────┐
                    │                               │               │
           ┌────────▼────────┐             ┌────────▼──────┐  ┌────▼─────────┐
           │  Metric Types   │             │  Reports      │  │   Export     │
           │                 │             │               │  │              │
           │  /summary       │             │  /slow-queries│  │  /export     │
           │  /requests      │             │  /api-usage   │  │  /reset      │
           │  /queries       │             │  /endpoints   │  │              │
           │  /system        │             │               │  │              │
           └─────────────────┘             └───────────────┘  └──────────────┘
```

## Data Retention and Cleanup

```
┌────────────────────────────────────────────────────────────────────┐
│                      Metrics Storage                                │
└────────────────────────────────────────────────────────────────────┘

Request Metrics:
├─ Store: Last 1,000 requests
├─ Retention: 1 hour (auto-cleanup)
└─ Size: ~100-200 KB

Query Metrics:
├─ Store: Last 500 queries
├─ Retention: 1 hour (auto-cleanup)
└─ Size: ~50-100 KB

System Metrics:
├─ Store: Last 100 samples
├─ Retention: 1 hour (auto-cleanup)
└─ Size: ~10-20 KB

Request Rates:
├─ Store: Last 60 minutes
├─ Retention: 1 hour (auto-cleanup)
└─ Size: ~5-10 KB

Endpoint Stats:
├─ Store: All active endpoints
├─ Retention: Until reset
└─ Size: ~10-50 KB

API Usage:
├─ Store: All accessed endpoints
├─ Retention: Until reset
└─ Size: ~10-50 KB

Total Memory Footprint: < 1 MB
```

## Health Status Decision Tree

```
                        ┌─────────────┐
                        │ Check Stats │
                        └──────┬──────┘
                               │
                    ┌──────────▼──────────┐
                    │ Memory > 90%?       │
                    └──────┬──────┬───────┘
                          Yes     No
                           │      │
                    ┌──────▼──┐   │
                    │CRITICAL │   │
                    └─────────┘   │
                                  │
                       ┌──────────▼──────────┐
                       │ Error Rate > 5%?    │
                       └──────┬──────┬───────┘
                             Yes     No
                              │      │
                       ┌──────▼───┐  │
                       │UNHEALTHY │  │
                       └──────────┘  │
                                     │
                          ┌──────────▼──────────┐
                          │ Response > 1000ms?  │
                          └──────┬──────┬───────┘
                                Yes     No
                                 │      │
                          ┌──────▼───┐  │
                          │DEGRADED  │  │
                          └──────────┘  │
                                        │
                             ┌──────────▼──────────┐
                             │ Memory > 75%?       │
                             └──────┬──────┬───────┘
                                   Yes     No
                                    │      │
                             ┌──────▼───┐  │
                             │DEGRADED  │  │
                             └──────────┘  │
                                           │
                                ┌──────────▼──────────┐
                                │ Slow Queries > 10?  │
                                └──────┬──────┬───────┘
                                      Yes     No
                                       │      │
                                ┌──────▼───┐  │
                                │DEGRADED  │  │
                                └──────────┘  │
                                              │
                                       ┌──────▼───┐
                                       │ HEALTHY  │
                                       └──────────┘
```

## Integration Points

```
┌────────────────────────────────────────────────────────────────────┐
│                    External Integrations                            │
└────────────────────────────────────────────────────────────────────┘

Kubernetes/Docker:
├─ Liveness Probe → /api/health/liveness
│  ├─ Returns 200 if alive
│  └─ Used for pod restart decisions
│
└─ Readiness Probe → /api/health/readiness
   ├─ Returns 200 if MongoDB connected
   └─ Used for load balancer routing

Prometheus:
└─ Scrape Endpoint → /api/health/metrics/export
   ├─ Returns metrics in Prometheus format
   ├─ Requires admin authentication
   └─ Includes: requests, queries, response times, errors

Grafana:
└─ Data Source → /api/health/metrics
   ├─ JSON API for all metrics
   ├─ Requires admin authentication
   └─ Real-time data for dashboards

Custom Monitoring:
├─ REST API → /api/health/metrics/*
├─ JSON responses
├─ Real-time data
└─ Admin authentication required
```

## Performance Impact Analysis

```
┌────────────────────────────────────────────────────────────────────┐
│                    Performance Impact                               │
└────────────────────────────────────────────────────────────────────┘

Per Request Overhead:
├─ Time: < 1ms
├─ Memory: < 1KB
└─ CPU: Negligible

Query Profiling Overhead:
├─ Time: < 0.1ms per query
├─ Memory: < 100 bytes per query
└─ CPU: Negligible

System Metrics Collection:
├─ Frequency: Every 60 seconds
├─ Time: < 10ms
├─ Memory: < 1KB per sample
└─ CPU: Negligible

Performance Logging:
├─ Frequency: Every 5 minutes
├─ Time: < 50ms
├─ Memory: None (console output)
└─ CPU: Negligible

Total Impact:
├─ Response Time: < 1% increase
├─ Memory: < 1 MB total
├─ CPU: < 0.1% increase
└─ Throughput: No measurable impact
```

## Component Dependencies

```
server.js
    │
    ├─→ middleware/performanceMonitor.js
    │       │
    │       └─→ utils/metrics.js (MetricsCollector)
    │
    └─→ routes/healthRoutes.js
            │
            ├─→ utils/metrics.js (MetricsCollector)
            ├─→ middleware/auth.js (protect, isAdmin)
            └─→ mongoose (connection status)
```

## Monitoring Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Monitoring Dashboard View                         │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐
│  Health Status      │  │  Request Metrics    │  │  Query Metrics   │
│                     │  │                     │  │                  │
│  Status: HEALTHY    │  │  Total: 1,000       │  │  Total: 500      │
│  Uptime: 2h 30m     │  │  Avg Time: 45ms     │  │  Avg Time: 12ms  │
│  Memory: 67.5%      │  │  Error Rate: 2.5%   │  │  Slow: 3 queries │
└─────────────────────┘  └─────────────────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Top 5 Endpoints by Request Count                                   │
│  1. GET  /api/products         │ 150 requests │ 45ms avg            │
│  2. POST /api/cart             │ 120 requests │ 67ms avg            │
│  3. GET  /api/categories       │  80 requests │ 23ms avg            │
│  4. GET  /api/orders           │  50 requests │ 89ms avg            │
│  5. POST /api/auth/login       │  30 requests │ 234ms avg           │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  Slow Queries (> 100ms)                                             │
│  1. orders.aggregate           │ 250ms │ 10 minutes ago             │
│  2. products.find              │ 156ms │ 15 minutes ago             │
│  3. users.aggregate            │ 134ms │ 25 minutes ago             │
└─────────────────────────────────────────────────────────────────────┘

┌───────────────────┐  ┌──────────────────┐  ┌────────────────────────┐
│  Request Rate     │  │  Memory Usage    │  │  Response Times        │
│  ▁▂▃▄▅▆▇█         │  │  ▁▂▃▄▅▆▇█       │  │  ▁▂▃▄▅▆▇█             │
│  15 req/min       │  │  67.5% heap      │  │  45ms avg              │
└───────────────────┘  └──────────────────┘  └────────────────────────┘
```

## Alert Thresholds

```
┌────────────────────────────────────────────────────────────────────┐
│                      Alert Configuration                            │
└────────────────────────────────────────────────────────────────────┘

Warning Level:
├─ Response Time > 500ms        → Log warning
├─ Memory Usage > 75%           → Log warning
├─ Slow Queries > 5             → Log warning
└─ Request Rate > 100 req/min   → Log warning

Critical Level:
├─ Response Time > 1000ms       → Status: DEGRADED
├─ Memory Usage > 90%           → Status: CRITICAL
├─ Error Rate > 5%              → Status: UNHEALTHY
└─ Slow Queries > 10            → Status: DEGRADED

Action Required:
├─ Status: DEGRADED             → Monitor closely
├─ Status: UNHEALTHY            → Investigate immediately
└─ Status: CRITICAL             → Emergency action
```

This architecture provides comprehensive performance monitoring with minimal overhead and maximum visibility into application behavior.
