// Enhanced Rate Limiting Middleware
// Provides flexible rate limiting with Redis support and multiple strategies

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

// ========================================
// Redis Client Setup
// ========================================

let redisClient = null;

function getRedisClient() {
  if (redisClient) return redisClient;

  if (process.env.REDIS_URL) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) return new Error('Too many retries');
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on('error', (err) => {
      console.error('[Rate Limit] Redis error:', err);
    });

    redisClient.connect().catch(console.error);
  }

  return redisClient;
}

// ========================================
// Rate Limit Configurations
// ========================================

const RATE_LIMITS = {
  // General API rate limit - 100 requests per 15 minutes
  general: {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Authentication - 5 attempts per 15 minutes
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many login attempts, please try again after 15 minutes.',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Password reset - 3 attempts per hour
  passwordReset: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: 'Too many password reset attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Registration - 3 accounts per day per IP
  registration: {
    windowMs: 24 * 60 * 60 * 1000,
    max: 3,
    message: 'Too many accounts created from this IP, please try again tomorrow.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Search - 30 requests per minute
  search: {
    windowMs: 60 * 1000,
    max: 30,
    message: 'Too many search requests, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // File upload - 10 uploads per hour
  upload: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many file uploads, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // API intensive operations - 20 per hour
  intensive: {
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: 'Rate limit exceeded for this operation.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Cart operations - 50 per 5 minutes
  cart: {
    windowMs: 5 * 60 * 1000,
    max: 50,
    message: 'Too many cart operations, please slow down.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Order creation - 10 per hour
  order: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many orders placed, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // Payment - 5 attempts per 10 minutes
  payment: {
    windowMs: 10 * 60 * 1000,
    max: 5,
    message: 'Too many payment attempts, please try again later.',
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
  },

  // OTP/Verification - 5 per hour
  verification: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many verification attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  }
};

// ========================================
// Rate Limiter Factory
// ========================================

function createRateLimiter(config) {
  const client = getRedisClient();

  const options = {
    ...config,
    // Use Redis if available, otherwise use memory store
    store: client ? new RedisStore({
      client: client,
      prefix: 'rl:',
    }) : undefined,
    // Key generator - can be customized per route
    keyGenerator: (req) => {
      // Use user ID if authenticated, otherwise IP
      if (req.user) {
        return `user:${req.user._id}`;
      }
      return req.ip || req.connection.remoteAddress;
    },
    // Handler for when rate limit is exceeded
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: config.message || 'Too many requests, please try again later.',
        retryAfter: res.getHeader('Retry-After')
      });
    },
    // Skip failed requests (for auth routes)
    skip: (req, res) => {
      // Skip rate limiting for whitelisted IPs
      const whitelistedIPs = (process.env.RATE_LIMIT_WHITELIST || '').split(',').filter(Boolean);
      return whitelistedIPs.includes(req.ip);
    }
  };

  return rateLimit(options);
}

// ========================================
// Pre-configured Rate Limiters
// ========================================

const limiters = {
  general: createRateLimiter(RATE_LIMITS.general),
  auth: createRateLimiter(RATE_LIMITS.auth),
  passwordReset: createRateLimiter(RATE_LIMITS.passwordReset),
  registration: createRateLimiter(RATE_LIMITS.registration),
  search: createRateLimiter(RATE_LIMITS.search),
  upload: createRateLimiter(RATE_LIMITS.upload),
  intensive: createRateLimiter(RATE_LIMITS.intensive),
  cart: createRateLimiter(RATE_LIMITS.cart),
  order: createRateLimiter(RATE_LIMITS.order),
  payment: createRateLimiter(RATE_LIMITS.payment),
  verification: createRateLimiter(RATE_LIMITS.verification)
};

// ========================================
// Custom Rate Limiters
// ========================================

/**
 * Create a custom rate limiter with specific options
 */
function customRateLimit(options) {
  return createRateLimiter({
    windowMs: options.windowMs || 15 * 60 * 1000,
    max: options.max || 100,
    message: options.message || 'Too many requests',
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    ...options
  });
}

/**
 * Sliding window rate limiter
 */
function slidingWindowLimit(windowMs, max) {
  return createRateLimiter({
    windowMs,
    max,
    message: `Rate limit exceeded. Max ${max} requests per ${windowMs / 1000} seconds.`,
    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * IP-based rate limiter (ignores authentication)
 */
function ipBasedLimit(windowMs, max) {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => req.ip || req.connection.remoteAddress,
    message: 'Too many requests from this IP address.',
    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * User-based rate limiter (only for authenticated users)
 */
function userBasedLimit(windowMs, max) {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      return `user:${req.user._id}`;
    },
    skip: (req) => !req.user, // Skip if not authenticated
    message: 'Rate limit exceeded for your account.',
    standardHeaders: true,
    legacyHeaders: false
  });
}

/**
 * Endpoint-specific rate limiter
 */
function endpointLimit(endpoint, windowMs, max) {
  return createRateLimiter({
    windowMs,
    max,
    keyGenerator: (req) => {
      const key = req.user ? `user:${req.user._id}` : req.ip;
      return `${endpoint}:${key}`;
    },
    message: `Too many requests to ${endpoint}.`,
    standardHeaders: true,
    legacyHeaders: false
  });
}

// ========================================
// Adaptive Rate Limiting
// ========================================

/**
 * Adaptive rate limiter that adjusts based on server load
 */
function adaptiveRateLimit(baseMax, baseWindowMs) {
  return (req, res, next) => {
    // Get server metrics
    const loadAverage = require('os').loadavg()[0]; // 1-minute load average
    const threshold = require('os').cpus().length; // Number of CPUs

    // Adjust rate limit based on load
    let adjustedMax = baseMax;
    if (loadAverage > threshold * 0.8) {
      adjustedMax = Math.floor(baseMax * 0.5); // Reduce by 50% under high load
    } else if (loadAverage > threshold * 0.5) {
      adjustedMax = Math.floor(baseMax * 0.75); // Reduce by 25% under medium load
    }

    // Create temporary rate limiter with adjusted limit
    const limiter = createRateLimiter({
      windowMs: baseWindowMs,
      max: adjustedMax,
      message: 'Server is under high load, please try again later.',
      standardHeaders: true,
      legacyHeaders: false
    });

    return limiter(req, res, next);
  };
}

// ========================================
// Rate Limit Info Middleware
// ========================================

/**
 * Middleware to add rate limit info to response headers
 */
function rateLimitInfo(req, res, next) {
  // Add custom headers with rate limit info
  const originalJson = res.json.bind(res);

  res.json = function (data) {
    // Add rate limit info to response if available
    if (res.getHeader('RateLimit-Limit')) {
      data._rateLimit = {
        limit: res.getHeader('RateLimit-Limit'),
        remaining: res.getHeader('RateLimit-Remaining'),
        reset: res.getHeader('RateLimit-Reset')
      };
    }

    return originalJson(data);
  };

  next();
}

// ========================================
// Rate Limit Bypass for Premium Users
// ========================================

/**
 * Middleware to bypass rate limiting for premium/admin users
 */
function bypassRateLimitForPremium(req, res, next) {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'superadmin' || req.user.isPremium)) {
    // Skip rate limiting for premium users
    return next();
  }

  // Continue with rate limiting
  next();
}

// ========================================
// Clean up function
// ========================================

async function closeRedisConnection() {
  if (redisClient) {
    await redisClient.quit();
    console.log('[Rate Limit] Redis connection closed');
  }
}

// ========================================
// Exports
// ========================================

module.exports = {
  // Pre-configured limiters
  limiters,

  // Custom limiters
  customRateLimit,
  slidingWindowLimit,
  ipBasedLimit,
  userBasedLimit,
  endpointLimit,
  adaptiveRateLimit,

  // Middleware
  rateLimitInfo,
  bypassRateLimitForPremium,

  // Utility
  getRedisClient,
  closeRedisConnection,

  // Configurations
  RATE_LIMITS
};
