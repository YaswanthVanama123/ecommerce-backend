import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

/**
 * Sanitize string input to prevent XSS attacks
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return '';

  // First use validator.escape to escape HTML characters
  let sanitized = validator.escape(input);

  // Additional sanitization using DOMPurify for HTML content
  sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });

  return sanitized.trim();
};

/**
 * Sanitize email input
 * @param {string} email - Email address
 * @returns {string} - Sanitized and validated email
 */
export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return '';

  const sanitized = email.toLowerCase().trim();

  if (!validator.isEmail(sanitized)) {
    return '';
  }

  return sanitized;
};

/**
 * Sanitize phone number input
 * @param {string} phone - Phone number
 * @returns {string} - Sanitized phone number
 */
export const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return '';

  // Remove all non-digit characters except +
  const sanitized = phone.replace(/[^\d+]/g, '').trim();

  // Validate phone format (basic international format check)
  if (!validator.isMobilePhone(sanitized, 'any', { strictMode: false })) {
    return '';
  }

  return sanitized;
};

/**
 * Sanitize numeric input
 * @param {*} input - Numeric input
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} - Sanitized number or null
 */
export const sanitizeNumber = (input, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const num = Number(input);

  if (isNaN(num) || !Number.isFinite(num)) {
    return null;
  }

  if (num < min || num > max) {
    return null;
  }

  return num;
};

/**
 * Sanitize password input
 * @param {string} password - Password string
 * @returns {string} - Sanitized password (without trimming to preserve intentional spaces)
 */
export const sanitizePassword = (password) => {
  if (typeof password !== 'string') return '';

  // Don't trim password as spaces may be intentional
  // Just perform basic XSS sanitization
  return validator.escape(password);
};

/**
 * Sanitize URL input
 * @param {string} url - URL string
 * @returns {string} - Sanitized URL
 */
export const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return '';

  try {
    const urlObject = new URL(url);

    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(urlObject.protocol)) {
      return '';
    }

    return urlObject.toString();
  } catch (error) {
    return '';
  }
};

/**
 * Sanitize object by removing dangerous keys (prevent NoSQL injection)
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
export const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const sanitized = {};

  for (const key in obj) {
    // Skip keys that start with $ or . (MongoDB operators)
    if (key.startsWith('$') || key.startsWith('.')) {
      continue;
    }

    const value = obj[key];

    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item =>
        typeof item === 'object' ? sanitizeObject(item) : sanitizeString(String(item))
      );
    }
  }

  return sanitized;
};

/**
 * Validate and sanitize request body for common fields
 * @param {object} body - Request body
 * @returns {object} - Validated and sanitized body
 */
export const sanitizeRequestBody = (body) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(body)) {
    if (key === 'email' && value) {
      sanitized[key] = sanitizeEmail(value);
    } else if (key === 'phone' && value) {
      sanitized[key] = sanitizePhone(value);
    } else if (key === 'password' && value) {
      sanitized[key] = sanitizePassword(value);
    } else if (key.toLowerCase().includes('url') && value) {
      sanitized[key] = sanitizeUrl(value);
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    }
  }

  return sanitized;
};

/**
 * Middleware to automatically sanitize request body
 * @returns {function} - Express middleware function
 */
export const sanitizeBodyMiddleware = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeRequestBody(req.body);
  }
  next();
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with errors array
 */
export const validatePasswordStrength = (password) => {
  const errors = [];

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export default {
  sanitizeString,
  sanitizeEmail,
  sanitizePhone,
  sanitizeNumber,
  sanitizePassword,
  sanitizeUrl,
  sanitizeObject,
  sanitizeRequestBody,
  sanitizeBodyMiddleware,
  validatePasswordStrength,
};
