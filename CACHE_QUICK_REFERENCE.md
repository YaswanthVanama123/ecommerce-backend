# Cache Quick Reference Guide

## Import Cache Manager

```javascript
import cacheManager, { TTL, CACHE_KEYS } from '../utils/cache.js';
```

## Common Operations

### 1. Get from Cache
```javascript
const value = cacheManager.get('key-name');
if (value) {
  // Cache hit - use cached value
  return value;
}
// Cache miss - fetch from database
```

### 2. Set to Cache
```javascript
// Without TTL (no expiration)
cacheManager.set('key-name', data);

// With TTL
cacheManager.set('key-name', data, TTL.FIFTEEN_MINUTES);
```

### 3. Delete from Cache
```javascript
// Delete single key
cacheManager.delete('key-name');

// Delete multiple keys with pattern
cacheManager.deletePattern('products:*'); // Deletes all keys starting with 'products:'
```

### 4. Cache-Aside Pattern (getOrSet)
```javascript
const product = await cacheManager.getOrSet(
  'product:123',
  async () => {
    // This function only executes on cache miss
    return await Product.findById('123');
  },
  TTL.FIFTEEN_MINUTES
);
```

## TTL Constants

```javascript
TTL.ONE_MINUTE       // 60 seconds
TTL.FIVE_MINUTES     // 5 minutes
TTL.FIFTEEN_MINUTES  // 15 minutes
TTL.THIRTY_MINUTES   // 30 minutes
TTL.ONE_HOUR         // 1 hour
TTL.ONE_DAY          // 24 hours
```

## Cache Key Prefixes

```javascript
CACHE_KEYS.CATEGORIES        // 'categories'
CACHE_KEYS.CATEGORY          // 'category'
CACHE_KEYS.CATEGORY_TREE     // 'category_tree'
CACHE_KEYS.PRODUCTS          // 'products'
CACHE_KEYS.PRODUCT           // 'product'
CACHE_KEYS.FEATURED_PRODUCTS // 'featured_products'
```

## Complete Controller Example

```javascript
import Product from '../models/Product.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import cacheManager, { TTL, CACHE_KEYS } from '../utils/cache.js';

export const getProductById = async (req, res, next) => {
  try {
    const cacheKey = `${CACHE_KEYS.PRODUCT}:${req.params.id}`;

    // Try cache first
    const cachedProduct = cacheManager.get(cacheKey);
    if (cachedProduct) {
      return sendSuccess(res, 200, cachedProduct, 'Product fetched (cached)');
    }

    // Cache miss - fetch from database
    const product = await Product.findById(req.params.id);

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Cache for 15 minutes
    cacheManager.set(cacheKey, product, TTL.FIFTEEN_MINUTES);

    sendSuccess(res, 200, product, 'Product fetched successfully');
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!product) {
      return sendError(res, 404, 'Product not found');
    }

    // Invalidate caches
    cacheManager.delete(`${CACHE_KEYS.PRODUCT}:${req.params.id}`);
    cacheManager.deletePattern(`${CACHE_KEYS.PRODUCTS}:*`);
    cacheManager.deletePattern(`${CACHE_KEYS.FEATURED_PRODUCTS}:*`);

    sendSuccess(res, 200, product, 'Product updated successfully');
  } catch (error) {
    next(error);
  }
};
```

## Cache Invalidation Patterns

### Single Resource Update
```javascript
// Update product
cacheManager.delete(`product:${id}`);
```

### Related Resources Update
```javascript
// Update category (invalidate all related caches)
cacheManager.delete(CACHE_KEYS.CATEGORIES);
cacheManager.delete(CACHE_KEYS.CATEGORY_TREE);
cacheManager.delete(`category:${id}`);
```

### Bulk Operations
```javascript
// Bulk update products
cacheManager.deletePattern('product:*');
cacheManager.deletePattern('products:*');
cacheManager.deletePattern('featured_products:*');
```

## Monitoring Cache

### Get Statistics
```javascript
const stats = cacheManager.getStats();
console.log(stats);
// Output:
// {
//   totalKeys: 150,
//   activeKeys: 145,
//   expiredKeys: 5,
//   memoryUsage: 4567890
// }
```

### Check if Key Exists
```javascript
if (cacheManager.has('product:123')) {
  console.log('Product is cached');
}
```

### Manual Cleanup
```javascript
// Remove expired entries
const cleaned = cacheManager.cleanup();
console.log(`Cleaned ${cleaned} expired entries`);

// Clear all cache
cacheManager.clear();
```

## Best Practices

### ✅ DO:
- Always invalidate cache after create/update/delete operations
- Use appropriate TTL based on data volatility
- Use pattern deletion for related caches
- Include "(cached)" in response messages to track cache hits

### ❌ DON'T:
- Don't cache sensitive data (passwords, tokens)
- Don't use very long TTL for frequently changing data
- Don't forget to invalidate cache on data mutations
- Don't cache error responses

## Cache Hit/Miss Logging

```javascript
export const getProduct = async (req, res, next) => {
  const startTime = Date.now();

  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = cacheManager.get(cacheKey);

    if (cached) {
      const duration = Date.now() - startTime;
      console.log(`[Cache HIT] ${cacheKey} - ${duration}ms`);
      return sendSuccess(res, 200, cached, 'Product fetched (cached)');
    }

    console.log(`[Cache MISS] ${cacheKey}`);
    const product = await Product.findById(req.params.id);

    if (product) {
      cacheManager.set(cacheKey, product, TTL.FIFTEEN_MINUTES);
    }

    const duration = Date.now() - startTime;
    console.log(`[Database Query] ${cacheKey} - ${duration}ms`);

    sendSuccess(res, 200, product, 'Product fetched successfully');
  } catch (error) {
    next(error);
  }
};
```

## Testing Cache

```javascript
describe('Product Controller', () => {
  beforeEach(() => {
    cacheManager.clear(); // Clear cache before each test
  });

  test('should cache product on first request', async () => {
    const res = await request(app).get('/api/products/123');
    expect(res.body.message).toBe('Product fetched successfully');

    // Verify it's in cache
    const cached = cacheManager.get('product:123');
    expect(cached).toBeDefined();
  });

  test('should return cached product on second request', async () => {
    await request(app).get('/api/products/123');
    const res = await request(app).get('/api/products/123');
    expect(res.body.message).toContain('cached');
  });
});
```

## Troubleshooting

### Cache Not Working
1. Verify cache import: `import cacheManager from '../utils/cache.js'`
2. Check TTL is set: `cacheManager.set(key, value, TTL.FIFTEEN_MINUTES)`
3. Verify key format: Use consistent naming (e.g., `product:123`)

### Cache Not Invalidating
1. Check invalidation is called after mutations
2. Verify pattern matches keys: `deletePattern('product:*')` matches `product:123`
3. Ensure cache keys are consistent

### Memory Issues
1. Check cache stats: `cacheManager.getStats()`
2. Clear cache if needed: `cacheManager.clear()`
3. Reduce TTL for less important data
4. Use pattern deletion to clean up unused caches

## Performance Metrics

### Expected Results:
- Cache Hit: < 5ms response time
- Cache Miss: 50-200ms response time (database query)
- Cache Improvement: 80-95% faster

### Monitor Performance:
```javascript
const startTime = Date.now();
const data = cacheManager.get(key) || await fetchFromDB();
const duration = Date.now() - startTime;
console.log(`Response time: ${duration}ms`);
```
