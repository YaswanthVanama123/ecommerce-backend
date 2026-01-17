import Joi from 'joi';

/**
 * Add to wishlist validation schema
 */
export const addToWishlistSchema = Joi.object({
  productId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID',
      'any.required': 'Product ID is required'
    })
});

/**
 * Product ID validation schema (for params)
 */
export const productIdSchema = Joi.object({
  productId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID',
      'any.required': 'Product ID is required'
    })
});

/**
 * Move to cart validation schema
 */
export const moveToCartSchema = Joi.object({
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(999)
    .default(1)
    .optional()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity must be at least 1',
      'number.max': 'Quantity cannot exceed 999'
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

// Export all validators as a single object for convenience
export default {
  addToWishlist: addToWishlistSchema,
  productId: productIdSchema,
  moveToCart: moveToCartSchema
};
