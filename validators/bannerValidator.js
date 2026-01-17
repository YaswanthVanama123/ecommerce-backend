import Joi from 'joi';

/**
 * Banner type validation
 */
const bannerTypeEnum = ['flash-sale', 'seasonal', 'new-arrival', 'discount', 'category-highlight'];

/**
 * Banner position validation
 */
const bannerPositionEnum = ['hero', 'sidebar', 'carousel', 'grid'];

/**
 * MongoDB ObjectId validation pattern
 */
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Create banner validation schema
 */
export const createBannerSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .required()
    .trim()
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required'
    }),

  subtitle: Joi.string()
    .max(200)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Subtitle cannot exceed 200 characters'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  image: Joi.string()
    .uri()
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.uri': 'Image must be a valid URL'
    }),

  backgroundImage: Joi.string()
    .uri()
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.uri': 'Background image must be a valid URL'
    }),

  buttonText: Joi.string()
    .max(50)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Button text cannot exceed 50 characters'
    }),

  buttonLink: Joi.string()
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.base': 'Button link must be a string'
    }),

  type: Joi.string()
    .valid(...bannerTypeEnum)
    .required()
    .messages({
      'any.only': `Type must be one of: ${bannerTypeEnum.join(', ')}`,
      'any.required': 'Type is required'
    }),

  discountPercentage: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Discount percentage must be a number',
      'number.min': 'Discount percentage cannot be negative',
      'number.max': 'Discount percentage cannot exceed 100'
    }),

  validFrom: Joi.date()
    .required()
    .messages({
      'date.base': 'Valid from must be a valid date',
      'any.required': 'Valid from date is required'
    }),

  validTo: Joi.date()
    .required()
    .greater(Joi.ref('validFrom'))
    .messages({
      'date.base': 'Valid to must be a valid date',
      'any.required': 'Valid to date is required',
      'date.greater': 'Valid to date must be after valid from date'
    }),

  isActive: Joi.boolean()
    .optional()
    .default(true)
    .messages({
      'boolean.base': 'IsActive must be a boolean'
    }),

  position: Joi.string()
    .valid(...bannerPositionEnum)
    .required()
    .messages({
      'any.only': `Position must be one of: ${bannerPositionEnum.join(', ')}`,
      'any.required': 'Position is required'
    }),

  priority: Joi.number()
    .integer()
    .min(0)
    .optional()
    .default(0)
    .messages({
      'number.base': 'Priority must be a number',
      'number.integer': 'Priority must be an integer',
      'number.min': 'Priority cannot be negative'
    }),

  targetCategory: Joi.string()
    .regex(objectIdPattern)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Target category must be a valid ObjectId'
    }),

  targetProducts: Joi.array()
    .items(
      Joi.string()
        .regex(objectIdPattern)
        .messages({
          'string.pattern.base': 'Each target product must be a valid ObjectId'
        })
    )
    .optional()
    .messages({
      'array.base': 'Target products must be an array'
    })
});

/**
 * Update banner validation schema
 */
export const updateBannerSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.min': 'Title must be at least 3 characters',
      'string.max': 'Title cannot exceed 100 characters'
    }),

  subtitle: Joi.string()
    .max(200)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Subtitle cannot exceed 200 characters'
    }),

  description: Joi.string()
    .max(500)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),

  image: Joi.string()
    .uri()
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.uri': 'Image must be a valid URL'
    }),

  backgroundImage: Joi.string()
    .uri()
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.uri': 'Background image must be a valid URL'
    }),

  buttonText: Joi.string()
    .max(50)
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.max': 'Button text cannot exceed 50 characters'
    }),

  buttonLink: Joi.string()
    .optional()
    .trim()
    .allow('')
    .messages({
      'string.base': 'Button link must be a string'
    }),

  type: Joi.string()
    .valid(...bannerTypeEnum)
    .optional()
    .messages({
      'any.only': `Type must be one of: ${bannerTypeEnum.join(', ')}`
    }),

  discountPercentage: Joi.number()
    .min(0)
    .max(100)
    .optional()
    .messages({
      'number.base': 'Discount percentage must be a number',
      'number.min': 'Discount percentage cannot be negative',
      'number.max': 'Discount percentage cannot exceed 100'
    }),

  validFrom: Joi.date()
    .optional()
    .messages({
      'date.base': 'Valid from must be a valid date'
    }),

  validTo: Joi.date()
    .optional()
    .when('validFrom', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('validFrom')),
      otherwise: Joi.date()
    })
    .messages({
      'date.base': 'Valid to must be a valid date',
      'date.greater': 'Valid to date must be after valid from date'
    }),

  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'IsActive must be a boolean'
    }),

  position: Joi.string()
    .valid(...bannerPositionEnum)
    .optional()
    .messages({
      'any.only': `Position must be one of: ${bannerPositionEnum.join(', ')}`
    }),

  priority: Joi.number()
    .integer()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Priority must be a number',
      'number.integer': 'Priority must be an integer',
      'number.min': 'Priority cannot be negative'
    }),

  targetCategory: Joi.string()
    .regex(objectIdPattern)
    .optional()
    .allow(null, '')
    .messages({
      'string.pattern.base': 'Target category must be a valid ObjectId'
    }),

  targetProducts: Joi.array()
    .items(
      Joi.string()
        .regex(objectIdPattern)
        .messages({
          'string.pattern.base': 'Each target product must be a valid ObjectId'
        })
    )
    .optional()
    .messages({
      'array.base': 'Target products must be an array'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Banner ID validation schema (for params)
 */
export const bannerIdSchema = Joi.object({
  id: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid banner ID',
      'any.required': 'Banner ID is required'
    })
});

/**
 * Get active banners query validation schema
 */
export const getActiveBannersQuerySchema = Joi.object({
  position: Joi.string()
    .valid(...bannerPositionEnum)
    .optional()
    .messages({
      'any.only': `Position must be one of: ${bannerPositionEnum.join(', ')}`
    }),

  type: Joi.string()
    .valid(...bannerTypeEnum)
    .optional()
    .messages({
      'any.only': `Type must be one of: ${bannerTypeEnum.join(', ')}`
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

/**
 * Get all banners query validation schema (admin)
 */
export const getAllBannersQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),

  position: Joi.string()
    .valid(...bannerPositionEnum)
    .optional()
    .messages({
      'any.only': `Position must be one of: ${bannerPositionEnum.join(', ')}`
    }),

  type: Joi.string()
    .valid(...bannerTypeEnum)
    .optional()
    .messages({
      'any.only': `Type must be one of: ${bannerTypeEnum.join(', ')}`
    }),

  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'IsActive must be a boolean'
    }),

  status: Joi.string()
    .valid('active', 'expired', 'upcoming', 'all')
    .optional()
    .default('all')
    .messages({
      'any.only': 'Status must be one of: active, expired, upcoming, all'
    }),

  sort: Joi.string()
    .valid('priority', '-priority', 'validFrom', '-validFrom', 'validTo', '-validTo', 'createdAt', '-createdAt')
    .optional()
    .default('-priority')
    .messages({
      'any.only': 'Sort must be one of: priority, -priority, validFrom, -validFrom, validTo, -validTo, createdAt, -createdAt'
    })
});

// Export all validators as a single object for convenience
export default {
  create: createBannerSchema,
  update: updateBannerSchema,
  id: bannerIdSchema,
  getActive: getActiveBannersQuerySchema,
  getAll: getAllBannersQuerySchema
};
