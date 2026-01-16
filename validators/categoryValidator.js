import Joi from 'joi';

/**
 * Category name validation
 */
const categoryNameSchema = Joi.string()
  .min(3)
  .max(100)
  .required()
  .trim()
  .messages({
    'string.min': 'Category name must be at least 3 characters',
    'string.max': 'Category name must not exceed 100 characters',
    'any.required': 'Category name is required'
  });

/**
 * Create category validation schema
 */
export const createCategorySchema = Joi.object({
  name: categoryNameSchema,

  description: Joi.string()
    .min(5)
    .max(1000)
    .optional()
    .trim()
    .messages({
      'string.min': 'Description must be at least 5 characters',
      'string.max': 'Description must not exceed 1000 characters'
    }),

  image: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'Image must be a valid URL'
    }),

  parentCategory: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid parent category ID'
    }),

  order: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Order must be a number',
      'number.integer': 'Order must be a whole number',
      'number.min': 'Order cannot be negative'
    })
});

/**
 * Update category validation schema
 */
export const updateCategorySchema = Joi.object({
  name: categoryNameSchema.optional(),

  description: Joi.string()
    .min(5)
    .max(1000)
    .optional()
    .trim()
    .allow(null)
    .messages({
      'string.min': 'Description must be at least 5 characters',
      'string.max': 'Description must not exceed 1000 characters'
    }),

  image: Joi.string()
    .uri()
    .optional()
    .allow(null)
    .messages({
      'string.uri': 'Image must be a valid URL'
    }),

  parentCategory: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .optional()
    .allow(null)
    .messages({
      'string.pattern.base': 'Invalid parent category ID'
    }),

  isActive: Joi.boolean().optional(),

  order: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Order must be a number',
      'number.integer': 'Order must be a whole number',
      'number.min': 'Order cannot be negative'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Category ID validation schema (for params)
 */
export const categoryIdSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid category ID',
      'any.required': 'Category ID is required'
    })
});

// Export all validators as a single object for convenience
export default {
  create: createCategorySchema,
  update: updateCategorySchema,
  id: categoryIdSchema
};
