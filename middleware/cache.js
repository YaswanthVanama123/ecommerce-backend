// Redis Caching Middleware with Cache Invalidation Strategies
// Provides flexible caching with automatic invalidation

const redis = require('redis');
const { promisify } = require('util');

// ========================================
// Redis Client Setup
// ========================================

let redisClient = null;
let isRedisConnected = false;

// Create Redis client
function createRedisClient() {
  if (redisClient) return redisClient;

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = redis.createClient({
    url: redisUrl,
    retry_strategy: (options) => {
      if (options.error && options.error.code === 'ECONNREFUSED') {
        console.error('[Cache] Redis connection refused');
        return new Error('Redis connection refused');
      }
      if (options.total_retry_time > 1000 * 60 * 60) {
        console.error('[Cache] Redis retry time exhausted');
        return new Error('Retry time exhausted');
      }
      if (options.attempt > 10) {
        console.error('[Cache] Redis max retry attempts reached');
        return undefined;
      }
      return Math.min(options.attempt * 100, 3000);
    }
  });

  redisClient.on('connect', () => {
    console.log('[Cache] Redis client connected');
    isRedisConnected = true;
  });

  redisClient.on('error', (err) => {
    console.error('[Cache] Redis client error:', err);
    isRedisConnected = false;
  });

  redisClient.on('end', () => {
    console.log('[Cache] Redis client disconnected');
    isRedisConnected = false;
  });

  return redisClient;
}

// Promisify Redis commands
const getAsync = (client) => promisify(client.get).bind(client);
const setAsync = (client) => promisify(client.set).bind(client);
const delAsync = (client) => promisify(client.del).bind(client);
const keysAsync = (client) => promisify(client.keys).bind(client);
const ttlAsync = (client) => promisify(client.ttl).bind(client);

// ========================================
// Cache Configuration
// ========================================

const CACHE_CONFIG = {
  // Default TTL values (in seconds)
  ttl: {
    products: 300,        // 5 minutes
    categories: 600,      // 10 minutes
    users: 180,          // 3 minutes
    orders: 120,         // 2 minutes
    cart: 3600,          // 1 hour
    settings: 1800,      // 30 minutes
    default: 300         // 5 minutes
  },

  // Cache key prefixes
  prefix: {
    products: 'product:',
    categories: 'category:',
    users: 'user:',
    orders: 'order:',
    cart: 'cart:',
    settings: 'settings:',
    list: 'list:',
    search: 'search:'
  },

  // Invalidation patterns
  patterns: {
    products: 'product:*',
    categories: 'category:*',
    users: 'user:*',
    orders: 'order:*',
    cart: 'cart:*',
    lists: 'list:*'
  }
};

// ========================================
// Cache Middleware
// ========================================

/**
 * Main cache middleware factory
 * @param {Object} options - Cache options
 * @param {string} options.prefix - Cache key prefix
 * @param {number} options.ttl - Time to live in seconds
 * @param {Function} options.keyGenerator - Custom key generator function
 * @param {boolean} options.skipCache - Skip cache for this request
 */
function cacheMiddleware(options = {}) {
  return async (req, res, next) => {
    // Skip caching if disabled or not a GET request
    if (!process.env.REDIS_ENABLED || req.method !== 'GET') {
      return next();
    }

    const {
      prefix = 'cache:',
      ttl = CACHE_CONFIG.ttl.default,
      keyGenerator = defaultKeyGenerator,
      skipCache = false
    } = options;

    if (skipCache) {
      return next();
    }

    try {
      // Ensure Redis client is created
      const client = createRedisClient();

      if (!isRedisConnected) {
        console.warn('[Cache] Redis not connected, skipping cache');
        return next();
      }

      // Generate cache key
      const cacheKey = prefix + keyGenerator(req);

      // Try to get from cache
      const cachedData = await getAsync(client)(cacheKey);

      if (cachedData) {
        console.log(`[Cache] HIT: ${cacheKey}`);

        // Parse and send cached data
        const data = JSON.parse(cachedData);

        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey
        });

        return res.json(data);
      }

      console.log(`[Cache] MISS: ${cacheKey}`);

      // Add cache headers
      res.set({
        'X-Cache': 'MISS',
        'X-Cache-Key': cacheKey
      });

      // Intercept res.json to cache the response
      const originalJson = res.json.bind(res);
      res.json = async (data) => {
        try {
          // Cache the response
          await setAsync(client)(
            cacheKey,
            JSON.stringify(data),
            'EX',
            ttl
          );
          console.log(`[Cache] SET: ${cacheKey} (TTL: ${ttl}s)`);
        } catch (err) {
          console.error('[Cache] Error caching response:', err);
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('[Cache] Middleware error:', error);
      next();
    }
  };
}

// ========================================
// Key Generators
// ========================================

function defaultKeyGenerator(req) {
  const { url, query, user } = req;
  const userId = user ? user._id.toString() : 'anonymous';
  const queryString = JSON.stringify(query);
  return `${url}:${userId}:${queryString}`;
}

function productKeyGenerator(req) {
  const { url, query } = req;
  const { page = 1, limit = 20, category, search, sort } = query;
  return `products:${url}:p${page}:l${limit}:c${category || 'all'}:s${search || ''}:sort${sort || 'default'}`;
}

function userKeyGenerator(req) {
  const userId = req.user ? req.user._id.toString() : req.params.id;
  return `user:${userId}`;
}

function orderKeyGenerator(req) {
  const userId = req.user._id.toString();
  const { page = 1, status } = req.query;
  return `orders:${userId}:p${page}:status${status || 'all'}`;
}

// ========================================
// Cache Invalidation
// ========================================

class CacheInvalidator {
  constructor() {
    this.client = createRedisClient();
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidatePattern(pattern) {
    try {
      if (!isRedisConnected) {
        console.warn('[Cache] Cannot invalidate, Redis not connected');
        return 0;
      }

      const keys = await keysAsync(this.client)(pattern);

      if (keys.length === 0) {
        console.log(`[Cache] No keys found for pattern: ${pattern}`);
        return 0;
      }

      const deleted = await delAsync(this.client)(...keys);
      console.log(`[Cache] Invalidated ${deleted} keys matching: ${pattern}`);

      return deleted;
    } catch (error) {
      console.error('[Cache] Error invalidating pattern:', error);
      return 0;
    }
  }

  /**
   * Invalidate specific key
   */
  async invalidateKey(key) {
    try {
      if (!isRedisConnected) return 0;

      const deleted = await delAsync(this.client)(key);
      console.log(`[Cache] Invalidated key: ${key}`);

      return deleted;
    } catch (error) {
      console.error('[Cache] Error invalidating key:', error);
      return 0;
    }
  }

  /**
   * Invalidate all product caches
   */
  async invalidateProducts() {
    return this.invalidatePattern(CACHE_CONFIG.patterns.products);
  }

  /**
   * Invalidate all category caches
   */
  async invalidateCategories() {
    return this.invalidatePattern(CACHE_CONFIG.patterns.categories);
  }

  /**
   * Invalidate user-specific caches
   */
  async invalidateUser(userId) {
    return this.invalidatePattern(`${CACHE_CONFIG.prefix.users}${userId}*`);
  }

  /**
   * Invalidate order caches for a user
   */
  async invalidateUserOrders(userId) {
    return this.invalidatePattern(`${CACHE_CONFIG.prefix.orders}${userId}*`);
  }

  /**
   * Invalidate cart cache
   */
  async invalidateCart(userId) {
    return this.invalidateKey(`${CACHE_CONFIG.prefix.cart}${userId}`);
  }

  /**
   * Invalidate all list caches
   */
  async invalidateLists() {
    return this.invalidatePattern(CACHE_CONFIG.patterns.lists);
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    try {
      if (!isRedisConnected) return 0;

      await this.client.flushall();
      console.log('[Cache] All cache cleared');
      return 1;
    } catch (error) {
      console.error('[Cache] Error clearing all cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      if (!isRedisConnected) {
        return {
          connected: false,
          keys: 0,
          memory: 0
        };
      }

      const info = await promisify(this.client.info).bind(this.client)();
      const dbsize = await promisify(this.client.dbsize).bind(this.client)();

      // Parse memory usage from info
      const memoryMatch = info.match(/used_memory_human:(\S+)/);
      const memory = memoryMatch ? memoryMatch[1] : 'N/A';

      return {
        connected: true,
        keys: dbsize,
        memory,
        uptime: this.client.server_info?.uptime_in_seconds || 0
      };
    } catch (error) {
      console.error('[Cache] Error getting stats:', error);
      return {
        connected: false,
        error: error.message
      };
    }
  }
}

// Create singleton invalidator
const cacheInvalidator = new CacheInvalidator();

// ========================================
// Predefined Middleware
// ========================================

// Product list cache
const cacheProducts = cacheMiddleware({
  prefix: CACHE_CONFIG.prefix.products,
  ttl: CACHE_CONFIG.ttl.products,
  keyGenerator: productKeyGenerator
});

// Single product cache
const cacheProduct = cacheMiddleware({
  prefix: CACHE_CONFIG.prefix.products,
  ttl: CACHE_CONFIG.ttl.products,
  keyGenerator: (req) => `product:${req.params.id}`
});

// Category cache
const cacheCategories = cacheMiddleware({
  prefix: CACHE_CONFIG.prefix.categories,
  ttl: CACHE_CONFIG.ttl.categories,
  keyGenerator: (req) => 'categories:all'
});

// User cache
const cacheUser = cacheMiddleware({
  prefix: CACHE_CONFIG.prefix.users,
  ttl: CACHE_CONFIG.ttl.users,
  keyGenerator: userKeyGenerator
});

// Orders cache
const cacheOrders = cacheMiddleware({
  prefix: CACHE_CONFIG.prefix.orders,
  ttl: CACHE_CONFIG.ttl.orders,
  keyGenerator: orderKeyGenerator
});

// Settings cache
const cacheSettings = cacheMiddleware({
  prefix: CACHE_CONFIG.prefix.settings,
  ttl: CACHE_CONFIG.ttl.settings,
  keyGenerator: (req) => 'settings:app'
});

// ========================================
// Cache Warming
// ========================================

class CacheWarmer {
  constructor() {
    this.client = createRedisClient();
  }

  /**
   * Warm up product cache
   */
  async warmProducts(products) {
    try {
      if (!isRedisConnected) return;

      for (const product of products) {
        const key = `${CACHE_CONFIG.prefix.products}product:${product._id}`;
        await setAsync(this.client)(
          key,
          JSON.stringify(product),
          'EX',
          CACHE_CONFIG.ttl.products
        );
      }

      console.log(`[Cache] Warmed ${products.length} products`);
    } catch (error) {
      console.error('[Cache] Error warming products:', error);
    }
  }

  /**
   * Warm up categories cache
   */
  async warmCategories(categories) {
    try {
      if (!isRedisConnected) return;

      const key = `${CACHE_CONFIG.prefix.categories}categories:all`;
      await setAsync(this.client)(
        key,
        JSON.stringify(categories),
        'EX',
        CACHE_CONFIG.ttl.categories
      );

      console.log('[Cache] Warmed categories cache');
    } catch (error) {
      console.error('[Cache] Error warming categories:', error);
    }
  }
}

const cacheWarmer = new CacheWarmer();

// ========================================
// Cache Helper Functions
// ========================================

/**
 * Get cached data
 */
async function getCached(key) {
  try {
    const client = createRedisClient();
    if (!isRedisConnected) return null;

    const data = await getAsync(client)(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('[Cache] Error getting cached data:', error);
    return null;
  }
}

/**
 * Set cached data
 */
async function setCached(key, data, ttl = CACHE_CONFIG.ttl.default) {
  try {
    const client = createRedisClient();
    if (!isRedisConnected) return false;

    await setAsync(client)(
      key,
      JSON.stringify(data),
      'EX',
      ttl
    );

    return true;
  } catch (error) {
    console.error('[Cache] Error setting cached data:', error);
    return false;
  }
}

/**
 * Delete cached data
 */
async function deleteCached(key) {
  try {
    const client = createRedisClient();
    if (!isRedisConnected) return false;

    await delAsync(client)(key);
    return true;
  } catch (error) {
    console.error('[Cache] Error deleting cached data:', error);
    return false;
  }
}

// ========================================
// Exports
// ========================================

module.exports = {
  // Middleware
  cacheMiddleware,
  cacheProducts,
  cacheProduct,
  cacheCategories,
  cacheUser,
  cacheOrders,
  cacheSettings,

  // Invalidation
  cacheInvalidator,
  CacheInvalidator,

  // Warming
  cacheWarmer,
  CacheWarmer,

  // Helpers
  getCached,
  setCached,
  deleteCached,

  // Config
  CACHE_CONFIG,

  // Client
  createRedisClient,
  getRedisClient: () => redisClient,
  isConnected: () => isRedisConnected
};
