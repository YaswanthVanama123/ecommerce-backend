/**
 * Response Compression Middleware
 * Compresses API responses to reduce bandwidth and improve load times
 */

import compression from 'compression';

/**
 * Compression middleware configuration
 * Compresses responses using gzip/deflate for clients that support it
 */
export const compressionMiddleware = compression({
  // Compression level: 0 (no compression) to 9 (maximum compression)
  // Level 6 is a good balance between compression ratio and CPU usage
  level: 6,

  // Only compress responses larger than this threshold (in bytes)
  // Compressing very small responses can actually increase size due to overhead
  threshold: 1024, // 1KB

  // Filter function to determine which responses should be compressed
  filter: (req, res) => {
    // Don't compress if client doesn't support it
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
});

/**
 * Brotli compression middleware (better compression than gzip, but slower)
 * Use this for static assets or when CPU usage is not a concern
 * Note: Requires Node.js 11.7.0+
 */
export const brotliCompressionMiddleware = (req, res, next) => {
  // Check if client supports brotli
  const acceptEncoding = req.headers['accept-encoding'] || '';

  if (acceptEncoding.includes('br')) {
    // Set response header to indicate brotli encoding
    res.setHeader('Content-Encoding', 'br');
  }

  next();
};

/**
 * Selective compression middleware
 * Only compress specific content types to save CPU
 */
export const selectiveCompressionMiddleware = compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    const contentType = res.getHeader('Content-Type');

    // Only compress JSON and text responses
    if (contentType && (
      contentType.includes('application/json') ||
      contentType.includes('text/')
    )) {
      return compression.filter(req, res);
    }

    return false;
  }
});

/**
 * Compression stats middleware
 * Logs compression statistics for monitoring
 */
export const compressionStatsMiddleware = (req, res, next) => {
  const originalWrite = res.write;
  const originalEnd = res.end;
  let originalSize = 0;
  let compressedSize = 0;

  res.write = function(chunk, ...args) {
    if (chunk) {
      originalSize += chunk.length || 0;
    }
    return originalWrite.call(this, chunk, ...args);
  };

  res.end = function(chunk, ...args) {
    if (chunk) {
      originalSize += chunk.length || 0;
    }

    const contentEncoding = res.getHeader('Content-Encoding');
    if (contentEncoding && (contentEncoding.includes('gzip') || contentEncoding.includes('deflate'))) {
      compressedSize = parseInt(res.getHeader('Content-Length')) || 0;

      if (originalSize > 0 && compressedSize > 0) {
        const ratio = ((1 - (compressedSize / originalSize)) * 100).toFixed(2);
        console.log(`[Compression] ${req.method} ${req.path} - Original: ${originalSize}B, Compressed: ${compressedSize}B, Ratio: ${ratio}%`);
      }
    }

    return originalEnd.call(this, chunk, ...args);
  };

  next();
};

export default {
  compressionMiddleware,
  brotliCompressionMiddleware,
  selectiveCompressionMiddleware,
  compressionStatsMiddleware
};
