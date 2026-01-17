import Joi from 'joi';

/**
 * MongoDB ObjectId validation pattern
 */
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Create review validation schema
 */
export const createReviewSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.integer': 'Rating must be a whole number',
      'number.min': 'Rating must be at least 1 star',
      'number.max': 'Rating must not exceed 5 stars',
      'any.required': 'Rating is required'
    }),

  title: Joi.string()
    .min(3)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.empty': 'Review title is required',
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title must not exceed 100 characters',
      'any.required': 'Review title is required'
    }),

  comment: Joi.string()
    .min(10)
    .max(2000)
    .required()
    .trim()
    .messages({
      'string.empty': 'Review comment is required',
      'string.min': 'Comment must be at least 10 characters',
      'string.max': 'Comment must not exceed 2000 characters',
      'any.required': 'Review comment is required'
    })
});

/**
 * Update review validation schema
 */
export const updateReviewSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.base': 'Rating must be a number',
      'number.integer': 'Rating must be a whole number',
      'number.min': 'Rating must be at least 1 star',
      'number.max': 'Rating must not exceed 5 stars'
    }),

  title: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title must not exceed 100 characters'
    }),

  comment: Joi.string()
    .min(10)
    .max(2000)
    .optional()
    .trim()
    .messages({
      'string.min': 'Comment must be at least 10 characters',
      'string.max': 'Comment must not exceed 2000 characters'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Product ID validation schema (for params)
 */
export const productIdSchema = Joi.object({
  productId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    })
});

/**
 * Review ID validation schema (for params)
 */
export const reviewIdSchema = Joi.object({
  id: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid review ID format',
      'any.required': 'Review ID is required'
    })
});

/**
 * Get reviews query validation schema
 */
export const getReviewsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    }),

  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.base': 'Rating filter must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating must not exceed 5'
    }),

  verified: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'Verified must be a boolean value'
    }),

  sort: Joi.string()
    .valid('newest', 'oldest', 'highest', 'lowest', 'helpful')
    .default('newest')
    .optional()
    .messages({
      'any.only': 'Sort must be one of: newest, oldest, highest, lowest, helpful'
    })
});

// Export all validators as a single object for convenience
export default {
  create: createReviewSchema,
  update: updateReviewSchema,
  productId: productIdSchema,
  reviewId: reviewIdSchema,
  getReviews: getReviewsQuerySchema
};
