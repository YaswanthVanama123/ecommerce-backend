import Joi from 'joi';

/**
 * Add to cart validation schema
 */
export const addToCartSchema = Joi.object({
  productId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID',
      'any.required': 'Product ID is required'
    }),

  quantity: Joi.number()
    .integer()
    .min(1)
    .max(999)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 999',
      'any.required': 'Quantity is required'
    }),

  size: Joi.string()
    .max(50)
    .optional()
    .trim()
    .messages({
      'string.max': 'Size must not exceed 50 characters'
    }),

  color: Joi.string()
    .max(50)
    .optional()
    .trim()
    .messages({
      'string.max': 'Color must not exceed 50 characters'
    })
});

/**
 * Update cart item validation schema
 */
export const updateCartItemSchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(999)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 999',
      'any.required': 'Quantity is required'
    })
});

/**
 * Cart item ID validation schema (for params)
 */
export const cartItemIdSchema = Joi.object({
  itemId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid item ID',
      'any.required': 'Item ID is required'
    })
});

// Export all validators as a single object for convenience
export default {
  addToCart: addToCartSchema,
  updateItem: updateCartItemSchema,
  itemId: cartItemIdSchema
};
