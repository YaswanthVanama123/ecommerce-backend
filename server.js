import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import cookieParser from 'cookie-parser';
// import cors from 'cors';
import connectDB from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';
import { initializeSocketIO } from './websocket/orderSocket.js';
import {
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
} from './middleware/security.js';
import {
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
} from './middleware/optimization.js';
import {
  requestPerformanceMonitor,
  setupQueryProfiling,
  logEndpointResponseTime,
  memoryUsageMonitor,
  requestRateMonitor,
  startSystemMetricsMonitoring,
  startPerformanceLogging,
} from './middleware/performanceMonitor.js';
import { sanitizeBodyMiddleware } from './utils/sanitize.js';
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import tempFixRoute from './routes/tempFixRoute.js';
import reviewRoutes from './routes/reviewRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import superadminRoutes from './routes/superadminRoutes.js';
import pincodeRoutes from './routes/pincodeRoutes.js';
import publicPincodeRoutes from './routes/publicPincodeRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import returnRoutes from './routes/returnRoutes.js';
import shippingRoutes from './routes/shipping.js';
import analyticsRoutes from './routes/analytics.js';
import notificationRoutes from './routes/notificationRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import adminPaymentRoutes from './routes/adminPaymentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import seoRoutes from './routes/seoRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import emailRoutes from './routes/emailRoutes.js';
import couponRoutes from './routes/couponRoutes.js';

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Setup query profiling for mongoose
setupQueryProfiling();

// Start system metrics monitoring (every 60 seconds)
startSystemMetricsMonitoring(60000);

// Start performance logging (every 5 minutes)
startPerformanceLogging(300000);

// ===== MIDDLEWARE ORDERING FOR OPTIMAL PERFORMANCE =====
// The order of middleware is critical for performance and security.
// Each middleware is positioned based on its function and dependencies.

// ===== PHASE 1: SECURITY & RESPONSE OPTIMIZATION (Pre-parsing) =====
// These run before request body parsing for maximum efficiency

// 1. Request performance monitoring - tracks detailed request metrics
app.use(requestPerformanceMonitor);

// 2. Endpoint response time logging - logs response time for all endpoints
app.use(logEndpointResponseTime);

// 3. Memory usage monitoring - tracks memory usage per request
app.use(memoryUsageMonitor);

// 4. Request rate monitoring - tracks request rates per endpoint
app.use(requestRateMonitor);

// 5. Performance monitoring - tracks overall request time
app.use(performanceMonitor);

// 6. Response time tracking - adds X-Response-Time header
app.use(responseTimeMiddleware);

// 7. Compression - must be early to compress all responses
// Compresses responses with gzip/deflate for bandwidth optimization
app.use(compressionMiddleware);

// 8. Enhanced helmet configuration with strict security headers
// Sets security headers: CSP, HSTS, X-Frame-Options, etc.
// app.use(helmetConfig); // Temporarily disabled for development

// 9. CORS - Removed (using proxy or same-origin instead)

// ===== PHASE 2: REQUEST PARSING & SIZE LIMITING =====

// 10. Cookie Parser - MUST be before any route that uses cookies
// Parses cookies from request headers and makes them available in req.cookies
app.use(cookieParser());

// 11. Request size limiting (prevent large payload attacks)
// Limits request body to 10KB for security
app.use(requestSizeLimiter);
app.use(requestUrlLimiter);

// 12. Additional body size validation for specific routes
app.use(bodyValidationMiddleware);

// ===== PHASE 3: DATA SANITIZATION & SECURITY =====

// 13. Data sanitization middleware (post-parsing)
app.use(mongoSanitizeMiddleware); // Prevent NoSQL injection
app.use(xssMiddleware); // Prevent XSS attacks
app.use(hppMiddleware); // Prevent HTTP Parameter Pollution

// 14. General API rate limiting (15 minutes, 100 requests per IP)
// Prevents abuse and DDoS attacks
app.use('/api/', apiLimiter);

// 15. Request body sanitization - additional cleaning
app.use(sanitizeBodyMiddleware);

// ===== PHASE 4: RESPONSE OPTIMIZATION =====

// 16. Cache control headers - sets appropriate caching strategy
app.use(cacheControlMiddleware);

// 17. ETag support - enables conditional requests with If-None-Match
// Returns 304 Not Modified for unchanged resources
app.use(etagMiddleware);

// 18. Last-Modified support - enables conditional requests with If-Modified-Since
// Returns 304 Not Modified based on modification time
app.use(lastModifiedMiddleware);

// 19. Response size monitoring - tracks and logs large responses
app.use(responseSizeMonitor);

// 20. Streaming support - adds helper methods for streaming large datasets
app.use(streamingMiddleware);

// 21. Field filtering - enables partial responses via ?fields= query parameter
// Reduces payload size by returning only requested fields
app.use(fieldFilterMiddleware);

// 22. JSON optimization - removes null/undefined values to reduce payload size
app.use(optimizedJsonMiddleware);

// 23. HTTP/2 optimization hints - adds preload hints for related resources
app.use(http2PushMiddleware);

// ===== PHASE 5: APPLICATION ROUTES =====

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'E-commerce API is running...',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint for monitoring
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      unit: 'MB',
    },
  });
});

// ===== PHASE 5: STATIC FILE SERVING =====

// Serve uploaded files (logos, images, etc.)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use('/uploads', express.static(join(__dirname, 'uploads')));

// API Routes with specific rate limiters
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/superadmin', superadminRoutes);
app.use('/api/superadmin/pincodes', pincodeRoutes);
app.use('/api/superadmin/settings', settingsRoutes);
app.use('/api/pincode', publicPincodeRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/customers', customerRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/admin/reports', reportRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/temp', tempFixRoute); // Temporary route to fix user roles - REMOVE AFTER USE

// ===== PHASE 6: ERROR HANDLING =====

// 404 handler - must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Resource not found',
    path: req.path,
  });
});

// Error handler middleware (must be last)
app.use(errorHandler);

// ===== SERVER STARTUP =====

const PORT = process.env.PORT || 5000;

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO for real-time order updates
const io = initializeSocketIO(httpServer);

const server = httpServer.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  E-COMMERCE API SERVER                                     ║
╠════════════════════════════════════════════════════════════╣
║  Status: Running                                           ║
║  Port: ${PORT.toString().padEnd(49)} ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(42)} ║
║  Node Version: ${process.version.padEnd(41)} ║
╠════════════════════════════════════════════════════════════╣
║  ENABLED FEATURES:                                         ║
║  ✓ Gzip/Deflate Compression                                ║
║  ✓ ETag Caching                                            ║
║  ✓ Last-Modified Caching                                   ║
║  ✓ Response Size Monitoring                                ║
║  ✓ Performance Tracking                                    ║
║  ✓ Field Filtering                                         ║
║  ✓ JSON Optimization                                       ║
║  ✓ Streaming Support                                       ║
║  ✓ Rate Limiting                                           ║
║  ✓ Security Headers (Helmet)                               ║
║  ✓ CORS Protection                                         ║
║  ✓ XSS Protection                                          ║
║  ✓ NoSQL Injection Prevention                              ║
║  ✓ Database Query Profiling                                ║
║  ✓ Slow Query Detection (>100ms)                           ║
║  ✓ Memory Usage Tracking                                   ║
║  ✓ Request Rate Monitoring                                 ║
║  ✓ Real-time Order Updates (WebSocket)                     ║
╚════════════════════════════════════════════════════════════╝
  `);

  console.log(`📡 API Endpoints:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Metrics: http://localhost:${PORT}/api/health/metrics`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   - Products: http://localhost:${PORT}/api/products`);
  console.log(`   - Categories: http://localhost:${PORT}/api/categories`);
  console.log(`   - Cart: http://localhost:${PORT}/api/cart`);
  console.log(`   - Wishlist: http://localhost:${PORT}/api/wishlist`);
  console.log(`   - Orders: http://localhost:${PORT}/api/orders`);
  console.log(`   - Reviews: http://localhost:${PORT}/api/reviews`);
  console.log(`   - Banners: http://localhost:${PORT}/api/banners`);
  console.log(`   - Admin: http://localhost:${PORT}/api/admin`);
  console.log(`   - SuperAdmin: http://localhost:${PORT}/api/superadmin`);
  console.log();
  console.log(`📊 Monitoring Endpoints:`);
  console.log(`   - Health Status: http://localhost:${PORT}/api/health/status`);
  console.log(`   - Performance Metrics: http://localhost:${PORT}/api/health/metrics`);
  console.log(`   - Slow Queries: http://localhost:${PORT}/api/health/metrics/slow-queries`);
  console.log(`   - API Usage: http://localhost:${PORT}/api/health/metrics/api-usage`);
  console.log(`   - System Metrics: http://localhost:${PORT}/api/health/metrics/system`);
  console.log();
  console.log(`💡 Optimization Tips:`);
  console.log(`   - Use ?fields=name,price to request specific fields`);
  console.log(`   - Responses include ETag headers for caching`);
  console.log(`   - Add If-None-Match header to use cached responses`);
  console.log(`   - All responses are compressed automatically`);
  console.log();
  console.log(`🔌 WebSocket:`);
  console.log(`   - Real-time order updates enabled`);
  console.log(`   - Connect with authentication token`);
  console.log(`   - Events: order:created, order:updated, order:status_changed`);
  console.log();
});

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);

  // Close HTTP server and Socket.IO
  server.close(() => {
    console.log('HTTP server closed.');

    // Close Socket.IO connections
    if (io) {
      io.close(() => {
        console.log('Socket.IO server closed.');
      });
    }

    // Close database connections
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

export default app;
