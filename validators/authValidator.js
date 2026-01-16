import Joi from 'joi';

/**
 * Password validation pattern
 * Requires: minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
 */
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Phone number validation pattern
 * Accepts 10-15 digit numbers, can include + at the beginning
 */
const phonePattern = /^\+?[1-9]\d{1,14}$/;

/**
 * Register validation schema
 */
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .min(8)
    .max(50)
    .pattern(passwordPattern)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character (@$!%*?&)',
      'string.min': 'Password must be at least 8 characters',
      'string.max': 'Password must not exceed 50 characters',
      'any.required': 'Password is required'
    }),

  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 50 characters',
      'any.required': 'First name is required'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .trim()
    .messages({
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 50 characters',
      'any.required': 'Last name is required'
    }),

  phone: Joi.string()
    .pattern(phonePattern)
    .optional()
    .messages({
      'string.pattern.base': 'Phone number must be valid (10-15 digits, can include + at the beginning)'
    })
});

/**
 * Login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required'
    }),

  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .trim()
    .messages({
      'any.required': 'Refresh token is required',
      'string.empty': 'Refresh token cannot be empty'
    })
});

/**
 * Logout validation schema (body is optional but if provided, validate it)
 */
export const logoutSchema = Joi.object({}).unknown(true).optional();

/**
 * Get current user validation schema (no body validation needed)
 */
export const getMeSchema = Joi.object({}).unknown(true).optional();

// Export all validators as a single object for convenience
export default {
  register: registerSchema,
  login: loginSchema,
  refresh: refreshTokenSchema,
  logout: logoutSchema,
  getMe: getMeSchema
};
