/**
 * In-memory caching utility using Map with TTL support
 * Provides get, set, delete, and clear functions with automatic expiration
 */

class CacheManager {
  constructor() {
    // Main cache store
    this.cache = new Map();
    // TTL tracking store (stores expiration timestamps)
    this.ttls = new Map();
    // Cleanup interval (runs every 5 minutes)
    this.cleanupInterval = 5 * 60 * 1000;

    // Start automatic cleanup
    this.startCleanup();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {*} Cached value or null if expired/not found
   */
  get(key) {
    try {
      if (!this.cache.has(key)) {
        return null;
      }

      // Check if key has expired
      if (this.ttls.has(key)) {
        const expirationTime = this.ttls.get(key);
        if (Date.now() > expirationTime) {
          // Key has expired, remove it
          this.delete(key);
          return null;
        }
      }

      return this.cache.get(key);
    } catch (error) {
      console.error(`Cache get error for key "${key}":`, error.message);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds (optional)
   * @returns {boolean} Success status
   */
  set(key, value, ttl = null) {
    try {
      if (!key) {
        console.error('Cache set error: Key is required');
        return false;
      }

      this.cache.set(key, value);

      // Set TTL if provided
      if (ttl && typeof ttl === 'number' && ttl > 0) {
        const expirationTime = Date.now() + ttl;
        this.ttls.set(key, expirationTime);
      }

      return true;
    } catch (error) {
      console.error(`Cache set error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Delete value from cache
   * @param {string} key - Cache key
   * @returns {boolean} Success status
   */
  delete(key) {
    try {
      const deleted = this.cache.delete(key);
      this.ttls.delete(key);
      return deleted;
    } catch (error) {
      console.error(`Cache delete error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Delete multiple keys that match a pattern
   * @param {string} pattern - Pattern to match (supports wildcards with *)
   * @returns {number} Number of keys deleted
   */
  deletePattern(pattern) {
    try {
      let deletedCount = 0;
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.delete(key);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error(`Cache deletePattern error for pattern "${pattern}":`, error.message);
      return 0;
    }
  }

  /**
   * Clear all cache entries
   * @returns {boolean} Success status
   */
  clear() {
    try {
      this.cache.clear();
      this.ttls.clear();
      return true;
    } catch (error) {
      console.error('Cache clear error:', error.message);
      return false;
    }
  }

  /**
   * Check if key exists in cache and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} True if key exists and is valid
   */
  has(key) {
    try {
      if (!this.cache.has(key)) {
        return false;
      }

      // Check if expired
      if (this.ttls.has(key)) {
        const expirationTime = this.ttls.get(key);
        if (Date.now() > expirationTime) {
          this.delete(key);
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error(`Cache has error for key "${key}":`, error.message);
      return false;
    }
  }

  /**
   * Get cache statistics
   * @returns {object} Cache statistics
   */
  getStats() {
    try {
      const now = Date.now();
      let expiredCount = 0;
      let activeCount = 0;

      for (const key of this.cache.keys()) {
        if (this.ttls.has(key)) {
          const expirationTime = this.ttls.get(key);
          if (now > expirationTime) {
            expiredCount++;
          } else {
            activeCount++;
          }
        } else {
          activeCount++;
        }
      }

      return {
        totalKeys: this.cache.size,
        activeKeys: activeCount,
        expiredKeys: expiredCount,
        memoryUsage: process.memoryUsage().heapUsed
      };
    } catch (error) {
      console.error('Cache getStats error:', error.message);
      return {
        totalKeys: 0,
        activeKeys: 0,
        expiredKeys: 0,
        memoryUsage: 0
      };
    }
  }

  /**
   * Clean up expired entries
   * @returns {number} Number of expired entries removed
   */
  cleanup() {
    try {
      const now = Date.now();
      let cleanedCount = 0;

      for (const [key, expirationTime] of this.ttls.entries()) {
        if (now > expirationTime) {
          this.delete(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Cache cleanup error:', error.message);
      return 0;
    }
  }

  /**
   * Start automatic cleanup interval
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      const cleaned = this.cleanup();
      if (cleaned > 0) {
        console.log(`Cache cleanup: Removed ${cleaned} expired entries`);
      }
    }, this.cleanupInterval);

    // Prevent the timer from keeping the process alive
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop automatic cleanup interval
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get or set pattern - Retrieves cached value or executes function and caches result
   * @param {string} key - Cache key
   * @param {function} fn - Async function to execute if cache miss
   * @param {number} ttl - Time to live in milliseconds
   * @returns {*} Cached or fresh value
   */
  async getOrSet(key, fn, ttl = null) {
    try {
      // Try to get from cache
      const cached = this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Cache miss - execute function
      const value = await fn();

      // Only cache non-null/undefined values
      if (value !== null && value !== undefined) {
        this.set(key, value, ttl);
      }

      return value;
    } catch (error) {
      console.error(`Cache getOrSet error for key "${key}":`, error.message);
      // On error, try to execute the function without caching
      return await fn();
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

// TTL constants (in milliseconds)
export const TTL = {
  ONE_MINUTE: 60 * 1000,
  FIVE_MINUTES: 5 * 60 * 1000,
  FIFTEEN_MINUTES: 15 * 60 * 1000,
  THIRTY_MINUTES: 30 * 60 * 1000,
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000
};

// Cache key prefixes for organization
export const CACHE_KEYS = {
  CATEGORIES: 'categories',
  CATEGORY: 'category',
  CATEGORY_TREE: 'category_tree',
  PRODUCTS: 'products',
  PRODUCT: 'product',
  FEATURED_PRODUCTS: 'featured_products'
};

// Export cache manager instance
export default cacheManager;

// Export individual functions for convenience
export const {
  get,
  set,
  delete: del,
  deletePattern,
  clear,
  has,
  getStats,
  cleanup,
  getOrSet
} = cacheManager;
