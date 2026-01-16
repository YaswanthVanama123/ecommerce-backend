import Joi from 'joi';

/**
 * Product name validation schema
 */
const productNameSchema = Joi.string()
  .min(3)
  .max(200)
  .required()
  .trim()
  .messages({
    'string.min': 'Product name must be at least 3 characters',
    'string.max': 'Product name must not exceed 200 characters',
    'any.required': 'Product name is required'
  });

/**
 * Price validation schema
 */
const priceSchema = Joi.number()
  .positive()
  .precision(2)
  .required()
  .messages({
    'number.base': 'Price must be a number',
    'number.positive': 'Price must be greater than 0',
    'any.required': 'Price is required'
  });

/**
 * Stock item validation schema (for size and color combinations)
 */
const stockItemSchema = Joi.object({
  size: Joi.string()
    .max(50)
    .optional()
    .trim(),
  color: Joi.string()
    .max(50)
    .optional()
    .trim(),
  quantity: Joi.number()
    .integer()
    .min(0)
    .required()
    .messages({
      'number.base': 'Quantity must be a number',
      'number.integer': 'Quantity must be a whole number',
      'number.min': 'Quantity cannot be negative',
      'any.required': 'Quantity is required'
    })
});

/**
 * Color validation schema
 */
const colorSchema = Joi.object({
  name: Joi.string()
    .max(50)
    .required()
    .trim(),
  code: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .optional()
    .messages({
      'string.pattern.base': 'Color code must be a valid hex color (#RRGGBB)'
    })
});

/**
 * Create product validation schema
 */
export const createProductSchema = Joi.object({
  name: productNameSchema,

  description: Joi.string()
    .min(10)
    .max(5000)
    .optional()
    .trim()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 5000 characters'
    }),

  category: Joi.string()
    .required()
    .trim()
    .messages({
      'any.required': 'Category is required'
    }),

  subCategory: Joi.string()
    .optional()
    .trim(),

  brand: Joi.string()
    .max(100)
    .optional()
    .trim()
    .messages({
      'string.max': 'Brand must not exceed 100 characters'
    }),

  price: priceSchema,

  discountPrice: Joi.number()
    .positive()
    .precision(2)
    .max(Joi.ref('price'))
    .optional()
    .messages({
      'number.base': 'Discount price must be a number',
      'number.positive': 'Discount price must be greater than 0',
      'any.max': 'Discount price cannot be greater than the original price'
    }),

  images: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .messages({
      'array.base': 'Images must be an array',
      'string.uri': 'Each image must be a valid URL'
    }),

  sizes: Joi.array()
    .items(Joi.string().max(50).trim())
    .optional()
    .messages({
      'array.base': 'Sizes must be an array'
    }),

  colors: Joi.array()
    .items(colorSchema)
    .optional()
    .messages({
      'array.base': 'Colors must be an array'
    }),

  stock: Joi.array()
    .items(stockItemSchema)
    .optional()
    .messages({
      'array.base': 'Stock must be an array'
    }),

  tags: Joi.array()
    .items(Joi.string().max(50).trim())
    .optional()
    .max(10)
    .messages({
      'array.base': 'Tags must be an array',
      'array.max': 'Maximum 10 tags allowed'
    }),

  isFeatured: Joi.boolean()
    .optional()
    .default(false),

  isActive: Joi.boolean()
    .optional()
    .default(true)
});

/**
 * Update product validation schema
 */
export const updateProductSchema = Joi.object({
  name: productNameSchema.optional(),

  description: Joi.string()
    .min(10)
    .max(5000)
    .optional()
    .trim()
    .messages({
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description must not exceed 5000 characters'
    }),

  category: Joi.string()
    .optional()
    .trim(),

  subCategory: Joi.string()
    .optional()
    .trim(),

  brand: Joi.string()
    .max(100)
    .optional()
    .trim(),

  price: Joi.number()
    .positive()
    .precision(2)
    .optional(),

  discountPrice: Joi.number()
    .positive()
    .precision(2)
    .max(Joi.ref('price'))
    .optional(),

  images: Joi.array()
    .items(Joi.string().uri())
    .optional(),

  sizes: Joi.array()
    .items(Joi.string().max(50).trim())
    .optional(),

  colors: Joi.array()
    .items(colorSchema)
    .optional(),

  stock: Joi.array()
    .items(stockItemSchema)
    .optional(),

  tags: Joi.array()
    .items(Joi.string().max(50).trim())
    .optional()
    .max(10),

  isFeatured: Joi.boolean().optional(),

  isActive: Joi.boolean().optional()
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});

/**
 * Product ID validation schema (for params)
 */
export const productIdSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid product ID',
      'any.required': 'Product ID is required'
    })
});

/**
 * Get products query validation schema
 */
export const getProductsQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),

  category: Joi.string()
    .optional()
    .trim(),

  minPrice: Joi.number()
    .positive()
    .optional(),

  maxPrice: Joi.number()
    .positive()
    .optional(),

  brand: Joi.string()
    .optional()
    .trim(),

  size: Joi.string()
    .optional()
    .trim(),

  color: Joi.string()
    .optional()
    .trim(),

  search: Joi.string()
    .max(200)
    .optional()
    .trim(),

  sort: Joi.string()
    .valid('price-low', 'price-high', 'rating', 'newest')
    .optional()
});

/**
 * Featured products query validation schema
 */
export const getFeaturedProductsQuerySchema = Joi.object({
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
});

/**
 * Add review validation schema
 */
export const addReviewSchema = Joi.object({
  rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': 'Rating must be a number',
      'number.min': 'Rating must be at least 1',
      'number.max': 'Rating must not exceed 5',
      'any.required': 'Rating is required'
    }),

  comment: Joi.string()
    .min(5)
    .max(1000)
    .required()
    .trim()
    .messages({
      'string.min': 'Comment must be at least 5 characters',
      'string.max': 'Comment must not exceed 1000 characters',
      'any.required': 'Comment is required'
    })
});

// Export all validators as a single object for convenience
export default {
  create: createProductSchema,
  update: updateProductSchema,
  id: productIdSchema,
  getProducts: getProductsQuerySchema,
  getFeatured: getFeaturedProductsQuerySchema,
  addReview: addReviewSchema
};
