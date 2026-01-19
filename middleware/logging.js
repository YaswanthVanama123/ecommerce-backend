/**
 * Logging Middleware
 * Provides request logging, error logging, and performance logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import monitoring from '../utils/monitoring.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log levels
 */
const LogLevel = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG'
};

/**
 * Write log to file
 */
const writeLog = (level, message, metadata = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...metadata
  };

  const logLine = JSON.stringify(logEntry) + '\n';

  // Write to appropriate log file
  const logFile = level === LogLevel.ERROR
    ? path.join(logsDir, 'error.log')
    : path.join(logsDir, 'combined.log');

  fs.appendFile(logFile, logLine, (err) => {
    if (err) {
      console.error('Failed to write to log file:', err);
    }
  });

  // Also log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log(logLine.trim());
  }
};

/**
 * Request logging middleware
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  writeLog(LogLevel.INFO, 'Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // Track connection
  monitoring.incrementConnections();

  // Capture response
  const originalSend = res.send;
  res.send = function (data) {
    res.send = originalSend;

    const responseTime = Date.now() - startTime;

    // Log response
    writeLog(LogLevel.INFO, 'Outgoing response', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      contentLength: res.get('content-length')
    });

    // Track in monitoring
    monitoring.trackRequest(req, res, responseTime);
    monitoring.decrementConnections();

    return res.send(data);
  };

  next();
};

/**
 * Error logging middleware
 */
export const errorLogger = (err, req, res, next) => {
  const errorData = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    body: req.body,
    params: req.params,
    query: req.query
  };

  // Write to error log
  writeLog(LogLevel.ERROR, 'Application error', errorData);

  // Track error in monitoring
  monitoring.trackError(err, {
    method: req.method,
    url: req.url,
    statusCode: err.statusCode || 500
  });

  next(err);
};

/**
 * Performance logging middleware
 */
export const performanceLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to ms

    // Log slow requests (> 1 second)
    if (duration > 1000) {
      writeLog(LogLevel.WARN, 'Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${duration.toFixed(2)}ms`,
        statusCode: res.statusCode
      });
    }

    // Track performance metric
    monitoring.trackCustomMetric('request.duration', duration, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode
    });
  });

  next();
};

/**
 * Security logging middleware
 */
export const securityLogger = (req, res, next) => {
  // Log suspicious activities
  const suspiciousPatterns = [
    /(\.\.|%2e%2e)/i, // Path traversal
    /(union|select|insert|update|delete|drop|create|alter)/i, // SQL injection
    /<script|javascript:|onerror=/i, // XSS
    /\$\{.*\}/, // Template injection
  ];

  const url = req.url.toLowerCase();
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(url));

  if (isSuspicious) {
    writeLog(LogLevel.WARN, 'Suspicious request detected', {
      method: req.method,
      url: req.url,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent')
    });
  }

  next();
};

/**
 * Authentication logging middleware
 */
export const authLogger = (req, res, next) => {
  const originalJson = res.json;

  res.json = function (data) {
    // Log authentication attempts
    if (req.url.includes('/auth/login') || req.url.includes('/auth/register')) {
      const success = res.statusCode >= 200 && res.statusCode < 300;

      writeLog(success ? LogLevel.INFO : LogLevel.WARN, 'Authentication attempt', {
        method: req.method,
        url: req.url,
        success,
        statusCode: res.statusCode,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent')
      });
    }

    return originalJson.call(this, data);
  };

  next();
};

/**
 * API versioning logger
 */
export const apiVersionLogger = (req, res, next) => {
  const apiVersion = req.get('api-version') || 'v1';

  monitoring.trackCustomMetric('api.version', 1, {
    version: apiVersion,
    endpoint: req.path
  });

  next();
};

/**
 * Log to file directly
 */
export const log = {
  error: (message, metadata) => writeLog(LogLevel.ERROR, message, metadata),
  warn: (message, metadata) => writeLog(LogLevel.WARN, message, metadata),
  info: (message, metadata) => writeLog(LogLevel.INFO, message, metadata),
  debug: (message, metadata) => writeLog(LogLevel.DEBUG, message, metadata)
};

/**
 * Rotate logs daily
 */
export const setupLogRotation = () => {
  const rotateLog = (logFile) => {
    const date = new Date().toISOString().split('T')[0];
    const archivePath = path.join(logsDir, `${path.basename(logFile, '.log')}-${date}.log`);

    if (fs.existsSync(logFile)) {
      fs.rename(logFile, archivePath, (err) => {
        if (err) {
          console.error('Failed to rotate log:', err);
        } else {
          console.log(`Log rotated: ${archivePath}`);

          // Compress old log (optional)
          // You can add compression logic here
        }
      });
    }
  };

  // Rotate logs daily at midnight
  const now = new Date();
  const night = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
    0, 0, 0
  );
  const msToMidnight = night.getTime() - now.getTime();

  setTimeout(() => {
    rotateLog(path.join(logsDir, 'combined.log'));
    rotateLog(path.join(logsDir, 'error.log'));

    // Set up daily rotation
    setInterval(() => {
      rotateLog(path.join(logsDir, 'combined.log'));
      rotateLog(path.join(logsDir, 'error.log'));
    }, 24 * 60 * 60 * 1000);
  }, msToMidnight);

  console.log('[Logging] Log rotation scheduled');
};

export default {
  requestLogger,
  errorLogger,
  performanceLogger,
  securityLogger,
  authLogger,
  apiVersionLogger,
  setupLogRotation,
  log
};
