import compression from 'compression';
import responseTime from 'response-time';
import etag from 'etag';

// Response compression middleware with gzip/deflate
export const compressionMiddleware = compression({
  // Compression level: 6 is a good balance between speed and compression ratio
  level: 6,
  // Threshold: only compress responses larger than 1KB
  threshold: 1024,
  // Filter function to determine if response should be compressed
  filter: (req, res) => {
    // Don't compress if no-transform header is present
    if (req.headers['cache-control']?.includes('no-transform')) {
      return false;
    }

    // Don't compress streaming responses
    if (res.getHeader('Content-Type')?.includes('stream')) {
      return false;
    }

    // Don't compress if already compressed
    if (res.getHeader('Content-Encoding')) {
      return false;
    }

    // Use compression filter to check defaults
    return compression.filter(req, res);
  },
});

// Response time tracking middleware
export const responseTimeMiddleware = responseTime((req, res, time) => {
  // Log slow requests (> 1 second)
  if (time > 1000) {
    console.warn(`Slow request detected: ${req.method} ${req.url} - ${time.toFixed(2)}ms`);
  }

  // Add custom header for monitoring
  res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
});

// ETag generation and conditional request handling
export const etagMiddleware = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  // Override res.send
  res.send = function (data) {
    // Only generate ETag for successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Generate ETag for the response body
      const etagValue = generateETag(data);

      if (etagValue) {
        res.setHeader('ETag', etagValue);

        // Check If-None-Match header for conditional requests
        const clientETag = req.headers['if-none-match'];
        if (clientETag === etagValue) {
          res.status(304).end();
          return res;
        }
      }
    }

    return originalSend.call(this, data);
  };

  // Override res.json
  res.json = function (data) {
    // Only generate ETag for successful responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      const jsonString = JSON.stringify(data);
      const etagValue = generateETag(jsonString);

      if (etagValue) {
        res.setHeader('ETag', etagValue);

        // Check If-None-Match header for conditional requests
        const clientETag = req.headers['if-none-match'];
        if (clientETag === etagValue) {
          res.status(304).end();
          return res;
        }
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

// Generate ETag using the etag library
function generateETag(data) {
  try {
    if (typeof data === 'string') {
      return etag(Buffer.from(data));
    } else if (Buffer.isBuffer(data)) {
      return etag(data);
    } else if (typeof data === 'object') {
      return etag(Buffer.from(JSON.stringify(data)));
    }
    return null;
  } catch (error) {
    console.error('Error generating ETag:', error);
    return null;
  }
}

// Last-Modified and If-Modified-Since handling
export const lastModifiedMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Set Last-Modified header for cacheable responses
    if (res.statusCode >= 200 && res.statusCode < 300) {
      // Use updatedAt or createdAt from data if available
      let lastModified = null;

      if (data && typeof data === 'object') {
        if (Array.isArray(data) && data.length > 0 && data[0].updatedAt) {
          // For arrays, use the most recent updatedAt
          lastModified = new Date(Math.max(...data.map(item =>
            new Date(item.updatedAt || item.createdAt || 0).getTime()
          )));
        } else if (data.updatedAt || data.createdAt) {
          lastModified = new Date(data.updatedAt || data.createdAt);
        }
      }

      if (lastModified && !isNaN(lastModified.getTime())) {
        const lastModifiedString = lastModified.toUTCString();
        res.setHeader('Last-Modified', lastModifiedString);

        // Check If-Modified-Since header
        const ifModifiedSince = req.headers['if-modified-since'];
        if (ifModifiedSince) {
          const ifModifiedSinceDate = new Date(ifModifiedSince);
          if (lastModified.getTime() <= ifModifiedSinceDate.getTime()) {
            res.status(304).end();
            return res;
          }
        }
      }
    }

    return originalJson.call(this, data);
  };

  next();
};

// Response size monitoring
export const responseSizeMonitor = (req, res, next) => {
  const originalSend = res.send;
  const originalJson = res.json;

  res.send = function (data) {
    const size = Buffer.byteLength(data || '');

    // Log large responses (> 1MB)
    if (size > 1024 * 1024) {
      console.warn(`Large response detected: ${req.method} ${req.url} - ${(size / 1024 / 1024).toFixed(2)}MB`);
    }

    res.setHeader('Content-Length', size);
    return originalSend.call(this, data);
  };

  res.json = function (data) {
    const jsonString = JSON.stringify(data);
    const size = Buffer.byteLength(jsonString);

    // Log large responses (> 1MB)
    if (size > 1024 * 1024) {
      console.warn(`Large JSON response detected: ${req.method} ${req.url} - ${(size / 1024 / 1024).toFixed(2)}MB`);
    }

    res.setHeader('Content-Length', size);
    return originalJson.call(this, data);
  };

  next();
};

// Streaming support for large responses
export const streamingMiddleware = (req, res, next) => {
  // Add helper method for streaming JSON arrays
  res.streamJson = function (dataGenerator, options = {}) {
    const { onError, onEnd } = options;

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.write('[');

    let first = true;

    const writeItem = (item) => {
      if (!first) {
        res.write(',');
      }
      first = false;
      res.write(JSON.stringify(item));
    };

    return {
      write: writeItem,
      end: () => {
        res.write(']');
        res.end();
        if (onEnd) onEnd();
      },
      error: (error) => {
        if (!first) {
          res.write(']');
        }
        res.end();
        if (onError) onError(error);
      }
    };
  };

  next();
};

// Partial response support (field filtering)
export const fieldFilterMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Check for fields query parameter
    const fields = req.query.fields;

    if (fields && data) {
      const filteredData = filterFields(data, fields);
      return originalJson.call(this, filteredData);
    }

    return originalJson.call(this, data);
  };

  next();
};

// Filter object/array based on comma-separated field list
function filterFields(data, fieldsString) {
  if (!fieldsString) return data;

  const fields = fieldsString.split(',').map(f => f.trim());

  if (Array.isArray(data)) {
    return data.map(item => filterObject(item, fields));
  } else if (typeof data === 'object' && data !== null) {
    return filterObject(data, fields);
  }

  return data;
}

function filterObject(obj, fields) {
  if (!obj || typeof obj !== 'object') return obj;

  const filtered = {};

  fields.forEach(field => {
    // Support nested fields with dot notation (e.g., "user.name")
    if (field.includes('.')) {
      const parts = field.split('.');
      const firstPart = parts[0];

      if (obj[firstPart] !== undefined) {
        if (!filtered[firstPart]) {
          filtered[firstPart] = {};
        }

        // Recursively filter nested objects
        const remainingPath = parts.slice(1).join('.');
        filtered[firstPart] = filterObject(obj[firstPart], [remainingPath]);
      }
    } else {
      if (obj[field] !== undefined) {
        filtered[field] = obj[field];
      }
    }
  });

  return filtered;
}

// Cache control headers
export const cacheControlMiddleware = (req, res, next) => {
  // Set default cache control headers based on route
  if (req.method === 'GET') {
    // Public routes cache for 5 minutes
    if (req.path.includes('/api/products') || req.path.includes('/api/categories')) {
      res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
    }
    // Private routes with no caching
    else if (req.path.includes('/api/cart') || req.path.includes('/api/orders')) {
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
    // API default: short cache
    else {
      res.setHeader('Cache-Control', 'public, max-age=60, must-revalidate');
    }
  } else {
    // Non-GET requests should not be cached
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  }

  next();
};

// HTTP/2 optimization hints
export const http2PushMiddleware = (req, res, next) => {
  // Add Link headers for HTTP/2 server push (if supported)
  // This is a placeholder - actual implementation depends on HTTP/2 support

  // Example: Push related resources
  if (req.path === '/api/products' && res.statusCode === 200) {
    // Hint that categories might be needed next
    res.setHeader('Link', '</api/categories>; rel=preload; as=fetch');
  }

  next();
};

// JSON serialization optimization
export const optimizedJsonMiddleware = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Remove null/undefined values to reduce payload size
    const optimized = removeNullValues(data);
    return originalJson.call(this, optimized);
  };

  next();
};

function removeNullValues(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => removeNullValues(item));
  } else if (obj && typeof obj === 'object') {
    const cleaned = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      // Keep false and 0, but remove null and undefined
      if (value !== null && value !== undefined) {
        cleaned[key] = removeNullValues(value);
      }
    });
    return cleaned;
  }
  return obj;
}

// Request body size validation middleware
export const bodyValidationMiddleware = (req, res, next) => {
  // Already handled by express.json({ limit }) in security.js
  // This is an additional check for specific routes if needed

  const contentLength = parseInt(req.headers['content-length'] || '0', 10);
  const maxSize = 10 * 1024 * 1024; // 10MB for file uploads

  // Allow larger payloads for specific routes (e.g., file uploads)
  if (req.path.includes('/upload') || req.path.includes('/image')) {
    if (contentLength > maxSize) {
      return res.status(413).json({
        success: false,
        message: 'Request body too large. Maximum size is 10MB.'
      });
    }
  }

  next();
};

// Performance monitoring aggregator
export const performanceMonitor = (req, res, next) => {
  const startTime = Date.now();

  // Track request
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const size = parseInt(res.getHeader('Content-Length') || '0', 10);

    // Log performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${req.method} ${req.path} - ${duration}ms - ${(size / 1024).toFixed(2)}KB - ${res.statusCode}`);
    }

    // Track metrics for monitoring (could be sent to external service)
    const metrics = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      size,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    };

    // Store metrics (implement storage as needed)
    // For production, send to monitoring service like DataDog, New Relic, etc.
    if (process.env.ENABLE_METRICS === 'true') {
      storeMetrics(metrics);
    }
  });

  next();
};

// Placeholder for metrics storage
function storeMetrics(metrics) {
  // Implementation depends on monitoring solution
  // Examples:
  // - Send to DataDog: dogstatsd.histogram('api.response_time', metrics.duration)
  // - Send to CloudWatch
  // - Store in database for analytics
  // - Send to application monitoring service
}

export default {
  compressionMiddleware,
  responseTimeMiddleware,
  etagMiddleware,
  lastModifiedMiddleware,
  responseSizeMonitor,
  streamingMiddleware,
  fieldFilterMiddleware,
  cacheControlMiddleware,
  http2PushMiddleware,
  optimizedJsonMiddleware,
  bodyValidationMiddleware,
  performanceMonitor,
};
