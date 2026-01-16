/**
 * Cache Manager Tests
 * Tests for the in-memory caching utility
 */

import cacheManager, { TTL, CACHE_KEYS } from '../utils/cache.js';

describe('Cache Manager', () => {
  beforeEach(() => {
    // Clear cache before each test
    cacheManager.clear();
  });

  afterAll(() => {
    // Stop cleanup timer to prevent hanging
    cacheManager.stopCleanup();
  });

  describe('Basic Operations', () => {
    test('should set and get a value', () => {
      const key = 'test-key';
      const value = { name: 'Test Product', price: 100 };

      cacheManager.set(key, value);
      const cachedValue = cacheManager.get(key);

      expect(cachedValue).toEqual(value);
    });

    test('should return null for non-existent key', () => {
      const cachedValue = cacheManager.get('non-existent-key');
      expect(cachedValue).toBeNull();
    });

    test('should delete a value', () => {
      const key = 'test-key';
      cacheManager.set(key, 'test-value');

      const deleted = cacheManager.delete(key);
      expect(deleted).toBe(true);

      const cachedValue = cacheManager.get(key);
      expect(cachedValue).toBeNull();
    });

    test('should check if key exists', () => {
      const key = 'test-key';

      expect(cacheManager.has(key)).toBe(false);

      cacheManager.set(key, 'test-value');
      expect(cacheManager.has(key)).toBe(true);
    });

    test('should clear all cache entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');

      cacheManager.clear();

      expect(cacheManager.get('key1')).toBeNull();
      expect(cacheManager.get('key2')).toBeNull();
      expect(cacheManager.get('key3')).toBeNull();
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire after TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';
      const ttl = 100; // 100ms

      cacheManager.set(key, value, ttl);

      // Should exist immediately
      expect(cacheManager.get(key)).toBe(value);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be expired
      expect(cacheManager.get(key)).toBeNull();
    });

    test('should not expire without TTL', async () => {
      const key = 'test-key';
      const value = 'test-value';

      cacheManager.set(key, value); // No TTL

      // Wait longer than typical TTL
      await new Promise(resolve => setTimeout(resolve, 200));

      // Should still exist
      expect(cacheManager.get(key)).toBe(value);
    });

    test('should handle TTL constants', () => {
      expect(TTL.ONE_MINUTE).toBe(60 * 1000);
      expect(TTL.FIVE_MINUTES).toBe(5 * 60 * 1000);
      expect(TTL.FIFTEEN_MINUTES).toBe(15 * 60 * 1000);
      expect(TTL.THIRTY_MINUTES).toBe(30 * 60 * 1000);
      expect(TTL.ONE_HOUR).toBe(60 * 60 * 1000);
      expect(TTL.ONE_DAY).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('Pattern Deletion', () => {
    test('should delete keys matching pattern', () => {
      cacheManager.set('products:1', 'Product 1');
      cacheManager.set('products:2', 'Product 2');
      cacheManager.set('products:3', 'Product 3');
      cacheManager.set('categories:1', 'Category 1');

      const deletedCount = cacheManager.deletePattern('products:*');

      expect(deletedCount).toBe(3);
      expect(cacheManager.get('products:1')).toBeNull();
      expect(cacheManager.get('products:2')).toBeNull();
      expect(cacheManager.get('products:3')).toBeNull();
      expect(cacheManager.get('categories:1')).toBe('Category 1');
    });

    test('should handle complex patterns', () => {
      cacheManager.set('user:123:profile', 'Profile');
      cacheManager.set('user:123:settings', 'Settings');
      cacheManager.set('user:456:profile', 'Profile 2');
      cacheManager.set('product:789', 'Product');

      const deletedCount = cacheManager.deletePattern('user:*');

      expect(deletedCount).toBe(3);
      expect(cacheManager.get('product:789')).toBe('Product');
    });
  });

  describe('GetOrSet Pattern', () => {
    test('should execute function on cache miss', async () => {
      const key = 'test-key';
      let functionCalled = false;
      const mockFn = async () => {
        functionCalled = true;
        return 'computed-value';
      };

      const result = await cacheManager.getOrSet(key, mockFn, TTL.ONE_MINUTE);

      expect(result).toBe('computed-value');
      expect(functionCalled).toBe(true);
    });

    test('should return cached value on cache hit', async () => {
      const key = 'test-key';
      const cachedValue = 'cached-value';
      let functionCalled = false;
      const mockFn = async () => {
        functionCalled = true;
        return 'computed-value';
      };

      cacheManager.set(key, cachedValue);

      const result = await cacheManager.getOrSet(key, mockFn, TTL.ONE_MINUTE);

      expect(result).toBe(cachedValue);
      expect(functionCalled).toBe(false);
    });

    test('should cache the result of function', async () => {
      const key = 'test-key';
      let callCount = 0;
      const mockFn = async () => {
        callCount++;
        return `result-${callCount}`;
      };

      // First call - cache miss
      const result1 = await cacheManager.getOrSet(key, mockFn, TTL.ONE_MINUTE);
      expect(result1).toBe('result-1');
      expect(callCount).toBe(1);

      // Second call - cache hit
      const result2 = await cacheManager.getOrSet(key, mockFn, TTL.ONE_MINUTE);
      expect(result2).toBe('result-1');
      expect(callCount).toBe(1); // Function should not be called again
    });
  });

  describe('Cache Statistics', () => {
    test('should return cache stats', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3', 100);

      const stats = cacheManager.getStats();

      expect(stats.totalKeys).toBe(3);
      expect(stats.activeKeys).toBeGreaterThan(0);
      expect(typeof stats.memoryUsage).toBe('number');
    });

    test('should track expired keys in stats', async () => {
      cacheManager.set('key1', 'value1', 100);
      cacheManager.set('key2', 'value2');

      // Wait for key1 to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const stats = cacheManager.getStats();

      expect(stats.totalKeys).toBe(2);
      expect(stats.expiredKeys).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Cache Keys Constants', () => {
    test('should have proper cache key constants', () => {
      expect(CACHE_KEYS.CATEGORIES).toBe('categories');
      expect(CACHE_KEYS.CATEGORY).toBe('category');
      expect(CACHE_KEYS.CATEGORY_TREE).toBe('category_tree');
      expect(CACHE_KEYS.PRODUCTS).toBe('products');
      expect(CACHE_KEYS.PRODUCT).toBe('product');
      expect(CACHE_KEYS.FEATURED_PRODUCTS).toBe('featured_products');
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully in get', () => {
      expect(() => cacheManager.get(null)).not.toThrow();
      expect(cacheManager.get(null)).toBeNull();
    });

    test('should handle errors gracefully in set', () => {
      expect(() => cacheManager.set(null, 'value')).not.toThrow();
      const result = cacheManager.set(null, 'value');
      expect(result).toBe(false);
    });

    test('should handle errors gracefully in delete', () => {
      expect(() => cacheManager.delete(null)).not.toThrow();
    });

    test('should handle invalid TTL values', () => {
      cacheManager.set('key', 'value', -1); // Invalid negative TTL
      expect(cacheManager.get('key')).toBe('value');

      cacheManager.set('key2', 'value2', 'invalid'); // Invalid string TTL
      expect(cacheManager.get('key2')).toBe('value2');
    });
  });

  describe('Cleanup', () => {
    test('should clean up expired entries', async () => {
      cacheManager.set('key1', 'value1', 100);
      cacheManager.set('key2', 'value2', 100);
      cacheManager.set('key3', 'value3'); // No TTL

      // Wait for keys to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const cleanedCount = cacheManager.cleanup();

      expect(cleanedCount).toBeGreaterThanOrEqual(2);
      expect(cacheManager.get('key3')).toBe('value3');
    });
  });
});
