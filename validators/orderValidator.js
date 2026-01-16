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
    .min(5)
    .max(500)
    .optional()
    .trim()
    .messages({
      'string.min': 'Cancellation reason must be at least 5 characters',
      'string.max': 'Cancellation reason must not exceed 500 characters'
    })
}).unknown(true);

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

// Export all validators as a single object for convenience
export default {
  create: createOrderSchema,
  cancel: cancelOrderSchema,
  updateStatus: updateOrderStatusSchema,
  id: orderIdSchema,
  getOrders: getOrdersQuerySchema,
  getAllOrders: getAllOrdersQuerySchema
};
