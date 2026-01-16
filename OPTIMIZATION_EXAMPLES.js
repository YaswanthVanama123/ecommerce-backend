/**
 * Optimization Middleware Usage Examples
 *
 * This file contains practical examples of using the optimization middleware
 * in your API endpoints and client applications.
 */

// ============================================
// SERVER-SIDE EXAMPLES
// ============================================

/**
 * Example 1: Using Streaming for Large Datasets
 *
 * When returning large arrays of data, use streaming to reduce
 * memory usage and improve time-to-first-byte.
 */
export const streamLargeProductList = async (req, res) => {
  try {
    // Initialize streaming response
    const stream = res.streamJson({
      onError: (err) => console.error('Stream error:', err),
      onEnd: () => console.log('Stream completed successfully')
    });

    // Use MongoDB cursor for efficient memory usage
    const productCursor = Product.find({})
      .select('name price image')
      .cursor();

    // Stream each product as it's fetched
    for await (const product of productCursor) {
      stream.write(product);
    }

    stream.end();
  } catch (error) {
    console.error('Streaming error:', error);
    res.status(500).json({ success: false, message: 'Streaming failed' });
  }
};

/**
 * Example 2: Setting Custom Cache Headers
 *
 * Override default cache behavior for specific routes
 */
export const getPublicProducts = async (req, res) => {
  // Set custom cache duration (1 hour for product listings)
  res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');

  const products = await Product.find({ status: 'active' });
  res.json({ success: true, data: products });
};

/**
 * Example 3: Manual ETag Setting
 *
 * For custom resources, you can manually set ETags
 */
export const getCustomResource = async (req, res) => {
  const data = await fetchCustomData();

  // Generate custom ETag based on data version
  const etag = `"v${data.version}-${data.lastModified.getTime()}"`;
  res.setHeader('ETag', etag);

  // Check if client has current version
  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end();
  }

  res.json({ success: true, data });
};

/**
 * Example 4: Bypassing Compression for Binary Data
 *
 * Already compressed data should skip compression
 */
export const downloadImage = (req, res) => {
  // Signal to compression middleware to skip
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Encoding', 'identity'); // Prevent compression

  // Stream image file
  const imageStream = fs.createReadStream('./uploads/image.jpg');
  imageStream.pipe(res);
};

/**
 * Example 5: Using Field Filtering in Controllers
 *
 * Support partial responses in your endpoints
 */
export const getProducts = async (req, res) => {
  const { fields, page = 1, limit = 20 } = req.query;

  // Build MongoDB projection from fields parameter
  const projection = fields
    ? fields.split(',').reduce((acc, field) => ({ ...acc, [field]: 1 }), {})
    : {}; // Return all fields if not specified

  const products = await Product.find({})
    .select(projection)
    .limit(limit)
    .skip((page - 1) * limit);

  // Field filtering middleware will handle additional filtering
  res.json({ success: true, data: products });
};

/**
 * Example 6: Optimizing Database Queries
 *
 * Use lean() and select() to reduce data transfer
 */
export const getOptimizedProducts = async (req, res) => {
  // Only fetch needed fields from database
  const products = await Product.find({ status: 'active' })
    .select('name price image rating')
    .lean() // Return plain JavaScript objects (faster)
    .limit(50);

  // Add cache header
  res.setHeader('Cache-Control', 'public, max-age=300');

  res.json({ success: true, data: products });
};

// ============================================
// CLIENT-SIDE EXAMPLES (JavaScript/Fetch)
// ============================================

/**
 * Example 1: Using ETags for Caching
 */
async function fetchProductsWithCache() {
  // Get cached ETag from localStorage
  const cachedETag = localStorage.getItem('products-etag');
  const cachedData = localStorage.getItem('products-data');

  const headers = {
    'Accept-Encoding': 'gzip, deflate',
  };

  // Add If-None-Match header if we have a cached ETag
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
  }

  const response = await fetch('/api/products', { headers });

  // Check for 304 Not Modified
  if (response.status === 304) {
    console.log('Using cached data');
    return JSON.parse(cachedData);
  }

  // Cache new data
  const data = await response.json();
  const newETag = response.headers.get('etag');

  if (newETag) {
    localStorage.setItem('products-etag', newETag);
    localStorage.setItem('products-data', JSON.stringify(data));
  }

  return data;
}

/**
 * Example 2: Using Last-Modified for Caching
 */
async function fetchWithLastModified() {
  const lastModified = localStorage.getItem('products-last-modified');

  const headers = {};
  if (lastModified) {
    headers['If-Modified-Since'] = lastModified;
  }

  const response = await fetch('/api/products', { headers });

  if (response.status === 304) {
    console.log('Data not modified, using cache');
    return JSON.parse(localStorage.getItem('products-data'));
  }

  const data = await response.json();
  const newLastModified = response.headers.get('last-modified');

  if (newLastModified) {
    localStorage.setItem('products-last-modified', newLastModified);
    localStorage.setItem('products-data', JSON.stringify(data));
  }

  return data;
}

/**
 * Example 3: Using Field Filtering
 */
async function fetchProductsList() {
  // Only request fields needed for product list view
  const response = await fetch(
    '/api/products?fields=id,name,price,image,rating'
  );

  const data = await response.json();
  return data;
}

/**
 * Example 4: Using Multiple Optimizations Together
 */
async function fetchOptimized(endpoint, options = {}) {
  const { fields, useCache = true } = options;

  // Build URL with field filtering
  let url = endpoint;
  if (fields) {
    url += `?fields=${fields.join(',')}`;
  }

  const headers = {
    'Accept-Encoding': 'gzip, deflate',
  };

  // Add cache headers if enabled
  if (useCache) {
    const etag = localStorage.getItem(`${endpoint}-etag`);
    if (etag) {
      headers['If-None-Match'] = etag;
    }
  }

  const response = await fetch(url, { headers });

  // Handle 304 Not Modified
  if (response.status === 304) {
    return JSON.parse(localStorage.getItem(`${endpoint}-data`));
  }

  const data = await response.json();

  // Cache response
  if (useCache) {
    const etag = response.headers.get('etag');
    if (etag) {
      localStorage.setItem(`${endpoint}-etag`, etag);
      localStorage.setItem(`${endpoint}-data`, JSON.stringify(data));
    }
  }

  return data;
}

// Usage:
// const products = await fetchOptimized('/api/products', {
//   fields: ['name', 'price', 'image'],
//   useCache: true
// });

/**
 * Example 5: Monitoring Response Performance
 */
async function fetchWithMetrics(url) {
  const startTime = performance.now();

  const response = await fetch(url, {
    headers: { 'Accept-Encoding': 'gzip, deflate' }
  });

  const data = await response.json();
  const endTime = performance.now();

  // Get server-side metrics
  const serverTime = response.headers.get('x-response-time');
  const contentLength = response.headers.get('content-length');

  console.log('Performance Metrics:', {
    clientTime: `${(endTime - startTime).toFixed(2)}ms`,
    serverTime,
    responseSize: `${(parseInt(contentLength) / 1024).toFixed(2)}KB`,
    cached: response.status === 304
  });

  return data;
}

// ============================================
// CLIENT-SIDE EXAMPLES (React)
// ============================================

/**
 * Example 6: React Hook with Caching
 */
import { useState, useEffect } from 'react';

function useOptimizedFetch(endpoint, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      try {
        const etag = localStorage.getItem(`${endpoint}-etag`);
        const cachedData = localStorage.getItem(`${endpoint}-data`);

        const headers = { 'Accept-Encoding': 'gzip, deflate' };
        if (etag) {
          headers['If-None-Match'] = etag;
        }

        // Build URL with field filtering
        let url = endpoint;
        if (options.fields) {
          url += `?fields=${options.fields.join(',')}`;
        }

        const response = await fetch(url, { headers });

        if (response.status === 304 && cachedData) {
          // Use cached data
          if (isMounted) {
            setData(JSON.parse(cachedData));
            setLoading(false);
          }
          return;
        }

        const result = await response.json();

        // Cache new data
        const newETag = response.headers.get('etag');
        if (newETag) {
          localStorage.setItem(`${endpoint}-etag`, newETag);
          localStorage.setItem(`${endpoint}-data`, JSON.stringify(result));
        }

        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [endpoint, options.fields]);

  return { data, loading, error };
}

// Usage in component:
// const { data, loading, error } = useOptimizedFetch('/api/products', {
//   fields: ['name', 'price', 'image']
// });

/**
 * Example 7: React Component with Field Selection
 */
function ProductList() {
  // Only fetch fields needed for list view
  const { data, loading } = useOptimizedFetch('/api/products', {
    fields: ['id', 'name', 'price', 'image', 'rating']
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div className="product-grid">
      {data?.data?.map(product => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}

// ============================================
// CURL EXAMPLES FOR TESTING
// ============================================

/*
# Test Compression
curl -H "Accept-Encoding: gzip,deflate" -I http://localhost:5000/api/products
# Look for: Content-Encoding: gzip

# Test ETag Caching
curl -i http://localhost:5000/api/products
# Copy ETag value, then:
curl -H "If-None-Match: <etag-value>" http://localhost:5000/api/products
# Should return 304 Not Modified

# Test Last-Modified Caching
curl -i http://localhost:5000/api/products
# Copy Last-Modified value, then:
curl -H "If-Modified-Since: <date-value>" http://localhost:5000/api/products
# Should return 304 Not Modified

# Test Field Filtering
curl "http://localhost:5000/api/products?fields=name,price"
# Returns only name and price fields

# Test Field Filtering with Nested Fields
curl "http://localhost:5000/api/products?fields=name,price,category.name"

# Test Response Time Header
curl -I http://localhost:5000/api/products
# Look for: X-Response-Time: 123.45ms

# Test Multiple Optimizations Together
curl -H "Accept-Encoding: gzip" \
     -H "If-None-Match: <etag>" \
     "http://localhost:5000/api/products?fields=name,price"
*/

// ============================================
// AXIOS EXAMPLES
// ============================================

/**
 * Example 8: Axios with Caching
 */
import axios from 'axios';

// Create axios instance with compression support
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: {
    'Accept-Encoding': 'gzip, deflate'
  }
});

// Add request interceptor for caching
api.interceptors.request.use(config => {
  const etag = localStorage.getItem(`${config.url}-etag`);
  if (etag) {
    config.headers['If-None-Match'] = etag;
  }
  return config;
});

// Add response interceptor for cache storage
api.interceptors.response.use(response => {
  // Handle 304 Not Modified
  if (response.status === 304) {
    const cachedData = localStorage.getItem(`${response.config.url}-data`);
    return JSON.parse(cachedData);
  }

  // Cache new data
  const etag = response.headers['etag'];
  if (etag) {
    localStorage.setItem(`${response.config.url}-etag`, etag);
    localStorage.setItem(`${response.config.url}-data`, JSON.stringify(response.data));
  }

  return response;
});

// Usage:
async function fetchProducts() {
  const response = await api.get('/products?fields=name,price');
  return response.data;
}

// ============================================
// PERFORMANCE MONITORING
// ============================================

/**
 * Example 9: Client-Side Performance Monitoring
 */
class PerformanceMonitor {
  static trackRequest(url, metrics) {
    const report = {
      url,
      timestamp: new Date().toISOString(),
      ...metrics
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Report:', report);
    }

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToAnalytics(report);
    }
  }

  static async sendToAnalytics(report) {
    // Send to your analytics service
    // Example: Google Analytics, Mixpanel, etc.
  }
}

async function monitoredFetch(url) {
  const startTime = performance.now();

  const response = await fetch(url, {
    headers: { 'Accept-Encoding': 'gzip, deflate' }
  });

  const data = await response.json();
  const endTime = performance.now();

  PerformanceMonitor.trackRequest(url, {
    duration: endTime - startTime,
    size: response.headers.get('content-length'),
    cached: response.status === 304,
    serverTime: response.headers.get('x-response-time')
  });

  return data;
}

// ============================================
// BEST PRACTICES SUMMARY
// ============================================

/*
1. Always send Accept-Encoding header for compression
2. Cache ETag values in localStorage/sessionStorage
3. Use If-None-Match header for conditional requests
4. Request only needed fields with ?fields parameter
5. Implement client-side caching strategy
6. Monitor response times and sizes
7. Use streaming for large datasets on server
8. Optimize database queries with select() and lean()
9. Set appropriate cache headers on server
10. Handle 304 Not Modified responses correctly
*/

export default {
  fetchProductsWithCache,
  fetchWithLastModified,
  fetchOptimized,
  fetchWithMetrics,
  useOptimizedFetch,
  api,
  PerformanceMonitor
};
