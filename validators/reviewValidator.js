import Joi from 'joi';

/**
 * MongoDB ObjectId validation pattern
 */
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Create review validation schema
 */
export const createReviewSchema = Joi.object({
  productId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID format',
      'any.required': 'Product ID is required'
    }),

  orderId: Joi.string()
    .regex(objectIdPattern)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid order ID format'
    }),

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
    .max(2000)
    .optional()
    .trim()
    .messages({
      'string.max': 'Comment must not exceed 2000 characters'
    }),

  qualityRating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.base': 'Quality rating must be a number',
      'number.integer': 'Quality rating must be a whole number',
      'number.min': 'Quality rating must be at least 1',
      'number.max': 'Quality rating must not exceed 5'
    }),

  valueRating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.base': 'Value rating must be a number',
      'number.integer': 'Value rating must be a whole number',
      'number.min': 'Value rating must be at least 1',
      'number.max': 'Value rating must not exceed 5'
    }),

  sizeRating: Joi.string()
    .valid('too_small', 'perfect_fit', 'too_large')
    .optional()
    .messages({
      'any.only': 'Size rating must be one of: too_small, perfect_fit, too_large'
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
    .max(2000)
    .optional()
    .trim()
    .messages({
      'string.max': 'Comment must not exceed 2000 characters'
    }),

  qualityRating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.base': 'Quality rating must be a number',
      'number.integer': 'Quality rating must be a whole number',
      'number.min': 'Quality rating must be at least 1',
      'number.max': 'Quality rating must not exceed 5'
    }),

  valueRating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .optional()
    .messages({
      'number.base': 'Value rating must be a number',
      'number.integer': 'Value rating must be a whole number',
      'number.min': 'Value rating must be at least 1',
      'number.max': 'Value rating must not exceed 5'
    }),

  sizeRating: Joi.string()
    .valid('too_small', 'perfect_fit', 'too_large')
    .optional()
    .messages({
      'any.only': 'Size rating must be one of: too_small, perfect_fit, too_large'
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
 * Review eligibility params validation
 */
export const reviewEligibilitySchema = Joi.object({
  orderId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID format',
      'any.required': 'Order ID is required'
    }),
  productId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID format',
      'any.required': 'Product ID is required'
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

  rating: Joi.alternatives()
    .try(
      Joi.number().integer().min(1).max(5),
      Joi.string().valid('').allow('')
    )
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

  hasImages: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'HasImages must be a boolean value'
    }),

  status: Joi.string()
    .valid('pending', 'approved', 'rejected')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, approved, rejected'
    }),

  search: Joi.string()
    .optional()
    .allow('')
    .messages({
      'string.base': 'Search must be a string'
    }),

  sort: Joi.string()
    .valid('newest', 'oldest', 'highest', 'lowest', 'helpful')
    .default('newest')
    .optional()
    .messages({
      'any.only': 'Sort must be one of: newest, oldest, highest, lowest, helpful'
    })
});

/**
 * Vote review validation
 */
export const voteReviewSchema = Joi.object({
  type: Joi.string()
    .valid('helpful', 'notHelpful')
    .required()
    .messages({
      'any.only': 'Vote type must be either "helpful" or "notHelpful"',
      'any.required': 'Vote type is required'
    })
});

/**
 * Report review validation
 */
export const reportReviewSchema = Joi.object({
  reason: Joi.string()
    .valid('spam', 'offensive', 'misleading', 'other')
    .required()
    .messages({
      'any.only': 'Reason must be one of: spam, offensive, misleading, other',
      'any.required': 'Report reason is required'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    })
});

/**
 * Admin reject review validation
 */
export const rejectReviewSchema = Joi.object({
  reason: Joi.string()
    .min(10)
    .max(500)
    .required()
    .trim()
    .messages({
      'string.empty': 'Rejection reason is required',
      'string.min': 'Reason must be at least 10 characters',
      'string.max': 'Reason must not exceed 500 characters',
      'any.required': 'Rejection reason is required'
    })
});

/**
 * Admin respond to review validation
 */
export const respondReviewSchema = Joi.object({
  response: Joi.string()
    .min(10)
    .max(1000)
    .required()
    .trim()
    .messages({
      'string.empty': 'Response is required',
      'string.min': 'Response must be at least 10 characters',
      'string.max': 'Response must not exceed 1000 characters',
      'any.required': 'Response is required'
    })
});

/**
 * Handle report validation
 */
export const handleReportSchema = Joi.object({
  action: Joi.string()
    .valid('resolved', 'dismissed')
    .required()
    .messages({
      'any.only': 'Action must be either "resolved" or "dismissed"',
      'any.required': 'Action is required'
    })
});

/**
 * Report ID params validation
 */
export const reportIdSchema = Joi.object({
  id: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid review ID format',
      'any.required': 'Review ID is required'
    }),
  reportId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid report ID format',
      'any.required': 'Report ID is required'
    })
});

// Export all validators as a single object for convenience
export default {
  create: createReviewSchema,
  update: updateReviewSchema,
  productId: productIdSchema,
  reviewId: reviewIdSchema,
  reviewEligibility: reviewEligibilitySchema,
  getReviews: getReviewsQuerySchema,
  vote: voteReviewSchema,
  report: reportReviewSchema,
  reject: rejectReviewSchema,
  respond: respondReviewSchema,
  handleReport: handleReportSchema,
  reportId: reportIdSchema
};
