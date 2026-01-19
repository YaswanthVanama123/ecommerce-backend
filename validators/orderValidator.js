import Joi from 'joi';

/**
 * Create order validation schema
 */
export const createOrderSchema = Joi.object({
  shippingAddressId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid shipping address ID',
      'any.required': 'Shipping address ID is required'
    }),

  paymentMethod: Joi.string()
    .valid('COD', 'UPI', 'CARD', 'NETBANKING', 'WALLET')
    .required()
    .messages({
      'any.only': 'Payment method must be one of: COD, UPI, CARD, NETBANKING, WALLET',
      'any.required': 'Payment method is required'
    })
});

/**
 * Cancel order validation schema
 */
export const cancelOrderSchema = Joi.object({
  reason: Joi.string()
    .valid('changed_mind', 'found_better_price', 'ordered_by_mistake', 'delivery_delay', 'wrong_product', 'quality_concerns', 'other')
    .required()
    .messages({
      'any.required': 'Cancellation reason is required',
      'any.only': 'Invalid cancellation reason. Must be one of: changed_mind, found_better_price, ordered_by_mistake, delivery_delay, wrong_product, quality_concerns, other'
    }),
  comments: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .trim()
    .messages({
      'string.max': 'Comments must not exceed 500 characters'
    })
});

/**
 * Partial cancellation validation schema
 */
export const cancelItemsSchema = Joi.object({
  items: Joi.array()
    .items(
      Joi.object({
        productId: Joi.string()
          .regex(/^[0-9a-fA-F]{24}$/)
          .required()
          .messages({
            'any.required': 'Product ID is required',
            'string.pattern.base': 'Invalid product ID'
          }),
        quantity: Joi.number()
          .integer()
          .min(1)
          .required()
          .messages({
            'any.required': 'Quantity is required',
            'number.min': 'Quantity must be at least 1',
            'number.base': 'Quantity must be a number'
          }),
        reason: Joi.string()
          .valid('changed_mind', 'found_better_price', 'ordered_by_mistake', 'delivery_delay', 'wrong_product', 'quality_concerns', 'other')
          .optional()
      })
    )
    .min(1)
    .required()
    .messages({
      'any.required': 'Items array is required',
      'array.min': 'At least one item must be specified for cancellation'
    }),
  reason: Joi.string()
    .valid('changed_mind', 'found_better_price', 'ordered_by_mistake', 'delivery_delay', 'wrong_product', 'quality_concerns', 'other')
    .required()
    .messages({
      'any.required': 'Cancellation reason is required',
      'any.only': 'Invalid cancellation reason'
    }),
  comments: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .trim()
    .messages({
      'string.max': 'Comments must not exceed 500 characters'
    })
});

/**
 * Approve cancellation validation schema
 */
export const approveCancellationSchema = Joi.object({
  adminComments: Joi.string()
    .max(500)
    .allow('')
    .optional()
    .trim()
    .messages({
      'string.max': 'Admin comments must not exceed 500 characters'
    })
});

/**
 * Reject cancellation validation schema
 */
export const rejectCancellationSchema = Joi.object({
  adminComments: Joi.string()
    .max(500)
    .required()
    .trim()
    .messages({
      'any.required': 'Admin comments are required for rejection',
      'string.empty': 'Admin comments cannot be empty',
      'string.max': 'Admin comments must not exceed 500 characters'
    })
});

/**
 * Get cancellation requests query validation schema
 */
export const getCancellationRequestsSchema = Joi.object({
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
  status: Joi.string()
    .valid('pending', 'approved', 'rejected')
    .default('pending')
    .optional()
});

/**
 * Update order status validation schema
 */
export const updateOrderStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled',
      'any.required': 'Status is required'
    }),

  note: Joi.string()
    .min(3)
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.min': 'Note must be at least 3 characters',
      'string.max': 'Note must not exceed 500 characters'
    }),

  trackingNumber: Joi.string()
    .optional()
    .trim()
    .messages({
      'string.base': 'Tracking number must be a string'
    }),

  carrier: Joi.string()
    .optional()
    .trim()
    .messages({
      'string.base': 'Carrier must be a string'
    })
});

/**
 * Order ID validation schema (for params)
 */
export const orderIdSchema = Joi.object({
  id: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID',
      'any.required': 'Order ID is required'
    })
});

/**
 * Get orders query validation schema
 */
export const getOrdersQuerySchema = Joi.object({
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional(),

  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
});

/**
 * Get all orders (admin) query validation schema
 */
export const getAllOrdersQuerySchema = Joi.object({
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

  status: Joi.string()
    .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, confirmed, processing, shipped, delivered, cancelled'
    }),

  paymentStatus: Joi.string()
    .valid('pending', 'completed', 'failed', 'refunded')
    .optional()
    .messages({
      'any.only': 'Payment status must be one of: pending, completed, failed, refunded'
    })
});

/**
 * Modify order validation schema
 */
export const modifyOrderSchema = Joi.object({
  shippingAddress: Joi.object({
    fullName: Joi.string().trim().min(2).max(100).optional(),
    phone: Joi.string().trim().pattern(/^[0-9]{10}$/).optional(),
    addressLine1: Joi.string().trim().min(5).max(200).optional(),
    addressLine2: Joi.string().trim().max(200).allow('').optional(),
    city: Joi.string().trim().min(2).max(100).optional(),
    state: Joi.string().trim().min(2).max(100).optional(),
    zipCode: Joi.string().trim().pattern(/^[0-9]{6}$/).optional(),
    country: Joi.string().trim().default('India').optional()
  }).optional().messages({
    'object.base': 'Shipping address must be an object'
  }),

  items: Joi.array().items(
    Joi.object({
      product: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
      name: Joi.string().required(),
      image: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      size: Joi.string().optional(),
      color: Joi.string().optional(),
      price: Joi.number().min(0).required(),
      discountPrice: Joi.number().min(0).optional()
    })
  ).optional().messages({
    'array.base': 'Items must be an array'
  }),

  itemsToAdd: Joi.array().items(
    Joi.object({
      productId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required(),
      quantity: Joi.number().integer().min(1).required(),
      size: Joi.string().optional(),
      color: Joi.string().optional()
    })
  ).optional().messages({
    'array.base': 'Items to add must be an array'
  }),

  itemsToRemove: Joi.array().items(
    Joi.string().regex(/^[0-9a-fA-F]{24}$/)
  ).optional().messages({
    'array.base': 'Items to remove must be an array of item IDs'
  }),

  quantityChanges: Joi.object().pattern(
    Joi.string().regex(/^[0-9a-fA-F]{24}$/),
    Joi.number().integer().min(1)
  ).optional().messages({
    'object.base': 'Quantity changes must be an object'
  }),

  note: Joi.string().trim().min(5).max(500).optional().messages({
    'string.min': 'Note must be at least 5 characters',
    'string.max': 'Note must not exceed 500 characters'
  })
}).min(1).messages({
  'object.min': 'At least one field must be provided for modification'
});

// Export all validators as a single object for convenience
export default {
  create: createOrderSchema,
  cancel: cancelOrderSchema,
  cancelItems: cancelItemsSchema,
  approveCancellation: approveCancellationSchema,
  rejectCancellation: rejectCancellationSchema,
  getCancellationRequests: getCancellationRequestsSchema,
  updateStatus: updateOrderStatusSchema,
  modify: modifyOrderSchema,
  id: orderIdSchema,
  getOrders: getOrdersQuerySchema,
  getAllOrders: getAllOrdersQuerySchema
};
