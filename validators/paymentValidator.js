import Joi from 'joi';

/**
 * Create payment intent validation schema
 */
export const createPaymentIntentSchema = Joi.object({
  orderId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID',
      'any.required': 'Order ID is required'
    }),

  paymentMethod: Joi.string()
    .valid('Card', 'UPI', 'Wallet')
    .required()
    .messages({
      'any.only': 'Payment method must be one of: Card, UPI, Wallet',
      'any.required': 'Payment method is required'
    }),

  savePaymentMethod: Joi.boolean()
    .optional()
    .default(false)
});

/**
 * Verify payment validation schema
 */
export const verifyPaymentSchema = Joi.object({
  orderId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID',
      'any.required': 'Order ID is required'
    }),

  paymentIntentId: Joi.string()
    .required()
    .messages({
      'any.required': 'Payment intent ID is required'
    }),

  transactionId: Joi.string()
    .required()
    .messages({
      'any.required': 'Transaction ID is required'
    }),

  signature: Joi.string()
    .when('paymentMethod', {
      is: 'UPI',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
    .messages({
      'any.required': 'Payment signature is required for UPI payments'
    }),

  paymentMethod: Joi.string()
    .valid('Card', 'UPI', 'Wallet')
    .optional()
});

/**
 * Process refund validation schema
 */
export const refundSchema = Joi.object({
  orderId: Joi.string()
    .regex(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID',
      'any.required': 'Order ID is required'
    }),

  amount: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.positive': 'Refund amount must be positive'
    }),

  reason: Joi.string()
    .min(5)
    .max(500)
    .required()
    .trim()
    .messages({
      'string.min': 'Refund reason must be at least 5 characters',
      'string.max': 'Refund reason must not exceed 500 characters',
      'any.required': 'Refund reason is required'
    })
});

// Export all validators as a single object for convenience
export default {
  createIntent: createPaymentIntentSchema,
  verify: verifyPaymentSchema,
  refund: refundSchema
};
