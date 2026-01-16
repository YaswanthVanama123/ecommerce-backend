/**
 * SERVER.JS UPDATE INSTRUCTIONS
 *
 * Add compression middleware to your existing server.js file
 * Place it after security middleware but before API routes
 */

// ====================
// STEP 1: Add import at the top of server.js
// ====================

import compression from 'compression';

// ====================
// STEP 2: Add compression middleware after security middleware
// Place this AFTER your security middleware but BEFORE your routes
// ====================

// ===== RESPONSE COMPRESSION =====
// Compress API responses to reduce bandwidth and improve load times
// This should be placed after security middleware but before routes
app.use(compression({
  // Compression level: 0 (no compression) to 9 (maximum compression)
  // Level 6 provides good balance between compression ratio and CPU usage
  level: 6,

  // Only compress responses larger than 1KB
  // Smaller responses may actually increase in size due to compression overhead
  threshold: 1024,

  // Custom filter function to determine which responses should be compressed
  filter: (req, res) => {
    // Don't compress if client explicitly requests no compression
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Don't compress responses with Cache-Control: no-transform
    const cacheControl = res.getHeader('Cache-Control');
    if (cacheControl && cacheControl.includes('no-transform')) {
      return false;
    }

    // Use compression's default filter for determining compressibility
    return compression.filter(req, res);
  }
}));

// ====================
// COMPLETE EXAMPLE: Updated server.js snippet
// ====================

/*
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import compression from 'compression'; // <-- ADD THIS
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import {
  helmetConfig,
  mongoSanitizeMiddleware,
  xssMiddleware,
  hppMiddleware,
  requestSizeLimiter,
  requestUrlLimiter,
  apiLimiter,
} from './middleware/security.js';
import { sanitizeBodyMiddleware } from './utils/sanitize.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// ===== SECURITY MIDDLEWARE (Order is important) =====

// 1. Enhanced helmet configuration with strict security headers
app.use(helmetConfig);

// 2. CORS configuration
const corsOptions = {
  origin: [
    process.env.CLIENT_URL,
    process.env.ADMIN_CLIENT_URL,
    process.env.SUPERADMIN_CLIENT_URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
app.use(cors(corsOptions));

// 3. Request size limiting (prevent large payload attacks)
app.use(requestSizeLimiter);
app.use(requestUrlLimiter);

// 4. Data sanitization middleware
app.use(mongoSanitizeMiddleware);
app.use(xssMiddleware);
app.use(hppMiddleware);

// 5. General API rate limiting
app.use('/api/', apiLimiter);

// 6. Request body sanitization
app.use(sanitizeBodyMiddleware);

// ===== RESPONSE COMPRESSION ===== <-- ADD THIS SECTION
// Compress API responses for better performance
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'E-commerce API is running...' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// Error handler middleware (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
*/

// ====================
// VERIFICATION
// ====================

/**
 * To verify compression is working:
 *
 * 1. Start your server:
 *    npm start
 *
 * 2. Make a request and check response headers:
 *    curl -H "Accept-Encoding: gzip, deflate" -i http://localhost:5000/api/products
 *
 * 3. Look for this header in the response:
 *    Content-Encoding: gzip
 *
 * 4. Compare sizes:
 *    - Without compression: Content-Length: 145231 (145KB)
 *    - With compression: Content-Length: 43517 (43KB)
 *    - Savings: ~70%
 */

// ====================
// EXPECTED BENEFITS
// ====================

/**
 * 1. Reduced Bandwidth:
 *    - JSON responses: 40-80% smaller
 *    - API costs reduced by 50-70%
 *
 * 2. Faster Load Times:
 *    - Mobile users: 2-3x faster
 *    - Slow connections: 3-5x faster
 *
 * 3. Better Performance:
 *    - Lower latency
 *    - More concurrent users supported
 *
 * 4. Cost Savings:
 *    - Reduced bandwidth costs
 *    - Less CDN usage
 */
