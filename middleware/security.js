import express from 'express';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import rateLimit from 'express-rate-limit';

// Configure helmet for security headers
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  frameguard: {
    action: 'deny',
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
});

// MongoDB data sanitization middleware - removes $ and . from keys
export const mongoSanitizeMiddleware = mongoSanitize();

// Data sanitization against XSS
export const xssMiddleware = xss();

// Prevent HTTP Parameter Pollution attacks
export const hppMiddleware = hpp({
  whitelist: [
    'search',
    'sort',
    'fields',
    'page',
    'limit',
    'price',
    'category',
    'rating',
  ],
});

// Request size limiter - prevent large payload attacks
export const requestSizeLimiter = express.json({ limit: '10kb' });
export const requestUrlLimiter = express.urlencoded({ limit: '10kb', extended: true });

// General rate limiter for all API endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
  keyGenerator: (req) => {
    // Use X-Forwarded-For header if available (for proxied requests)
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  },
});

// Rate limiter for login endpoint - 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts, please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  keyGenerator: (req) => {
    // Rate limit by email + IP for more precise tracking
    const email = req.body?.email || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return `${email}-${ip}`;
  },
});

// Rate limiter for register endpoint - 3 attempts per hour
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many registration attempts from this IP, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by IP
    return req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  },
});

// Rate limiter for password reset endpoint - 3 attempts per hour
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many password reset attempts, please try again after an hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by email + IP
    const email = req.body?.email || '';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    return `${email}-${ip}`;
  },
});

// Strict rate limiter for sensitive operations
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3,
  message: 'Too many requests for this operation, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export default {
  helmetConfig,
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
  requestSizeLimiter,
  requestUrlLimiter,
  apiLimiter,
  loginLimiter,
  registerLimiter,
  passwordResetLimiter,
  strictLimiter,
};
