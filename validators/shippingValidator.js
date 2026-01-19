import Joi from 'joi';

/**
 * MongoDB ObjectId validation pattern
 */
const objectIdPattern = /^[0-9a-fA-F]{24}$/;

/**
 * Coordinates validation schema
 */
const coordinatesSchema = Joi.object({
  latitude: Joi.number()
    .min(-90)
    .max(90)
    .optional()
    .messages({
      'number.base': 'Latitude must be a number',
      'number.min': 'Latitude must be at least -90',
      'number.max': 'Latitude must not exceed 90'
    }),
  longitude: Joi.number()
    .min(-180)
    .max(180)
    .optional()
    .messages({
      'number.base': 'Longitude must be a number',
      'number.min': 'Longitude must be at least -180',
      'number.max': 'Longitude must not exceed 180'
    })
});

/**
 * Shipment details validation schema
 */
const shipmentDetailsSchema = Joi.object({
  weight: Joi.number()
    .positive()
    .optional()
    .messages({
      'number.base': 'Weight must be a number',
      'number.positive': 'Weight must be a positive number'
    }),
  dimensions: Joi.object({
    length: Joi.number().positive().optional(),
    width: Joi.number().positive().optional(),
    height: Joi.number().positive().optional(),
    unit: Joi.string().valid('cm', 'inch').optional()
  }).optional(),
  package_count: Joi.number()
    .integer()
    .positive()
    .optional()
});

/**
 * Create shipping validation schema
 */
export const createShippingSchema = Joi.object({
  orderId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID',
      'any.required': 'Order ID is required'
    }),

  carrier: Joi.string()
    .valid('bluedart', 'delhivery', 'dtdc', 'fedex', 'aramex', 'other')
    .required()
    .messages({
      'any.only': 'Carrier must be one of: bluedart, delhivery, dtdc, fedex, aramex, other',
      'any.required': 'Carrier is required'
    }),

  estimatedDeliveryDate: Joi.date()
    .min('now')
    .required()
    .messages({
      'date.base': 'Estimated delivery date must be a valid date',
      'date.min': 'Estimated delivery date must be in the future',
      'any.required': 'Estimated delivery date is required'
    }),

  currentLocation: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Current location must not exceed 200 characters'
    }),

  coordinates: coordinatesSchema.optional(),

  shipmentDetails: shipmentDetailsSchema.optional(),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Notes must not exceed 1000 characters'
    }),

  deliveryInstructions: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Delivery instructions must not exceed 500 characters'
    }),

  shippingCharge: Joi.number()
    .min(0)
    .optional()
    .messages({
      'number.base': 'Shipping charge must be a number',
      'number.min': 'Shipping charge must be at least 0'
    })
});

/**
 * Update shipping status validation schema
 */
export const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')
    .required()
    .messages({
      'any.only': 'Status must be one of: pending, picked_up, in_transit, out_for_delivery, delivered, failed, returned',
      'any.required': 'Status is required'
    }),

  location: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Location must not exceed 200 characters'
    }),

  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),

  coordinates: coordinatesSchema.optional(),

  failureReason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Failure reason must not exceed 500 characters'
    }),

  returnReason: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Return reason must not exceed 500 characters'
    }),

  signature: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Signature must not exceed 200 characters'
    }),

  recipientName: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Recipient name must not exceed 100 characters'
    })
});

/**
 * Update location validation schema
 */
export const updateLocationSchema = Joi.object({
  location: Joi.string()
    .trim()
    .max(200)
    .required()
    .messages({
      'string.max': 'Location must not exceed 200 characters',
      'any.required': 'Location is required'
    }),

  coordinates: coordinatesSchema.optional(),

  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    })
});

/**
 * Update tracking info validation schema
 */
export const updateTrackingSchema = Joi.object({
  trackingNumber: Joi.string()
    .trim()
    .uppercase()
    .max(50)
    .optional()
    .messages({
      'string.max': 'Tracking number must not exceed 50 characters'
    }),

  carrier: Joi.string()
    .valid('bluedart', 'delhivery', 'dtdc', 'fedex', 'aramex', 'other')
    .optional()
    .messages({
      'any.only': 'Carrier must be one of: bluedart, delhivery, dtdc, fedex, aramex, other'
    }),

  estimatedDeliveryDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Estimated delivery date must be a valid date'
    }),

  notes: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .messages({
      'string.max': 'Notes must not exceed 1000 characters'
    })
});

/**
 * Shipping ID validation schema (for params)
 */
export const shippingIdSchema = Joi.object({
  id: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid shipping ID',
      'any.required': 'Shipping ID is required'
    })
});

/**
 * Order ID validation schema (for params)
 */
export const orderIdSchema = Joi.object({
  orderId: Joi.string()
    .regex(objectIdPattern)
    .required()
    .messages({
      'string.pattern.base': 'Invalid order ID',
      'any.required': 'Order ID is required'
    })
});

/**
 * Carrier validation schema (for params)
 */
export const carrierSchema = Joi.object({
  carrier: Joi.string()
    .valid('bluedart', 'delhivery', 'dtdc', 'fedex', 'aramex', 'other')
    .required()
    .messages({
      'any.only': 'Carrier must be one of: bluedart, delhivery, dtdc, fedex, aramex, other',
      'any.required': 'Carrier is required'
    })
});

/**
 * Get all shipments query validation schema
 */
export const getAllShipmentsQuerySchema = Joi.object({
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
    .max(100)
    .default(20)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit must not exceed 100'
    }),

  status: Joi.string()
    .valid('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')
    .optional()
    .messages({
      'any.only': 'Status must be one of: pending, picked_up, in_transit, out_for_delivery, delivered, failed, returned'
    }),

  carrier: Joi.string()
    .valid('bluedart', 'delhivery', 'dtdc', 'fedex', 'aramex', 'other')
    .optional()
    .messages({
      'any.only': 'Carrier must be one of: bluedart, delhivery, dtdc, fedex, aramex, other'
    }),

  startDate: Joi.date()
    .optional()
    .messages({
      'date.base': 'Start date must be a valid date'
    }),

  endDate: Joi.date()
    .min(Joi.ref('startDate'))
    .optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.min': 'End date must be after start date'
    })
});

/**
 * Tracking number validation schema (for params)
 */
export const trackingNumberSchema = Joi.object({
  trackingNumber: Joi.string()
    .trim()
    .uppercase()
    .required()
    .messages({
      'string.empty': 'Tracking number is required',
      'any.required': 'Tracking number is required'
    })
});

// Export all validators as a single object for convenience
export default {
  create: createShippingSchema,
  updateStatus: updateStatusSchema,
  updateLocation: updateLocationSchema,
  updateTracking: updateTrackingSchema,
  id: shippingIdSchema,
  orderId: orderIdSchema,
  carrier: carrierSchema,
  getAll: getAllShipmentsQuerySchema,
  trackingNumber: trackingNumberSchema
};
