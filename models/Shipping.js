import mongoose from 'mongoose';

const locationHistorySchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  }
}, { _id: false });

const shipmentDetailsSchema = new mongoose.Schema({
  weight: {
    type: Number,
    required: true,
    min: 0
  },
  dimensions: {
    length: {
      type: Number,
      min: 0
    },
    width: {
      type: Number,
      min: 0
    },
    height: {
      type: Number,
      min: 0
    },
    unit: {
      type: String,
      enum: ['cm', 'in'],
      default: 'cm'
    }
  },
  package_count: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  }
});

const recipientInfoSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  address: {
    addressLine1: {
      type: String,
      required: true
    },
    addressLine2: String,
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      default: 'India'
    }
  }
});

const shippingSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  trackingNumber: {
    type: String,
    unique: true,
    required: true
  },
  carrier: {
    type: String,
    enum: ['bluedart', 'delhivery', 'dtdc', 'fedex', 'aramex', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'],
    default: 'pending'
  },
  estimatedDeliveryDate: {
    type: Date,
    required: true
  },
  actualDeliveryDate: {
    type: Date
  },
  currentLocation: {
    location: {
      type: String,
      trim: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  },
  locationHistory: [locationHistorySchema],
  shipmentDetails: {
    type: shipmentDetailsSchema,
    required: true
  },
  recipientInfo: {
    type: recipientInfoSchema,
    required: true
  },
  notes: {
    type: String,
    default: '',
    trim: true
  },
  pickupDate: {
    type: Date
  },
  shippingCharge: {
    type: Number,
    default: 0,
    min: 0
  },
  deliveryInstructions: {
    type: String,
    trim: true
  },
  failureReason: {
    type: String,
    trim: true
  },
  returnReason: {
    type: String,
    trim: true
  },
  deliveryAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  signature: {
    type: String,
    trim: true
  },
  recipientName: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Generate unique tracking number before saving
shippingSchema.pre('save', async function(next) {
  if (this.isNew && !this.trackingNumber) {
    const carrierPrefix = {
      bluedart: 'BD',
      delhivery: 'DV',
      dtdc: 'DT',
      fedex: 'FX',
      aramex: 'AX',
      other: 'OT'
    };

    const prefix = carrierPrefix[this.carrier] || 'OT';
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    this.trackingNumber = `${prefix}${timestamp}${random}`;

    // Initialize location history with initial status
    this.locationHistory.push({
      location: this.currentLocation?.location || 'Origin',
      status: this.status,
      timestamp: new Date(),
      description: 'Shipment created'
    });
  }
  next();
});

// Method to update shipping status and add to location history
shippingSchema.methods.updateShippingStatus = function(status, location, description = '', coordinates = null) {
  this.status = status;

  // Update current location if provided
  if (location) {
    this.currentLocation = {
      location,
      coordinates,
      updatedAt: new Date()
    };
  }

  // Add to location history
  this.locationHistory.push({
    location: location || this.currentLocation?.location || 'Unknown',
    status,
    timestamp: new Date(),
    description,
    coordinates
  });

  // Update specific date fields based on status
  switch (status) {
    case 'picked_up':
      if (!this.pickupDate) {
        this.pickupDate = new Date();
      }
      break;
    case 'delivered':
      if (!this.actualDeliveryDate) {
        this.actualDeliveryDate = new Date();
      }
      break;
    case 'failed':
    case 'out_for_delivery':
      this.deliveryAttempts += 1;
      break;
  }
};

// Method to update current location only
shippingSchema.methods.updateLocation = function(location, coordinates = null, description = '') {
  this.currentLocation = {
    location,
    coordinates,
    updatedAt: new Date()
  };

  // Add to location history
  this.locationHistory.push({
    location,
    status: this.status,
    timestamp: new Date(),
    description,
    coordinates
  });
};

// Virtual for delivery status
shippingSchema.virtual('isDelivered').get(function() {
  return this.status === 'delivered';
});

// Virtual for days in transit
shippingSchema.virtual('daysInTransit').get(function() {
  if (this.pickupDate) {
    const endDate = this.actualDeliveryDate || new Date();
    const diffTime = Math.abs(endDate - this.pickupDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for estimated days remaining
shippingSchema.virtual('estimatedDaysRemaining').get(function() {
  if (this.estimatedDeliveryDate && this.status !== 'delivered') {
    const diffTime = this.estimatedDeliveryDate - new Date();
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }
  return 0;
});

// Virtual for delay check
shippingSchema.virtual('isDelayed').get(function() {
  if (this.status === 'delivered') {
    return false;
  }
  return new Date() > this.estimatedDeliveryDate;
});

// Ensure virtuals are included in JSON
shippingSchema.set('toJSON', { virtuals: true });
shippingSchema.set('toObject', { virtuals: true });

// Indexes for efficient queries
// Unique index for tracking number
shippingSchema.index({ trackingNumber: 1 }, { name: 'tracking_number_idx', unique: true });

// Index for order reference (to find shipping for an order)
shippingSchema.index({ order: 1 }, { name: 'order_idx' });

// Index for status queries (for dashboard and filtering)
shippingSchema.index({ status: 1 }, { name: 'status_idx' });

// Compound index for carrier and status
shippingSchema.index({ carrier: 1, status: 1 }, { name: 'carrier_status_idx' });

// Compound index for status and estimated delivery date
shippingSchema.index({ status: 1, estimatedDeliveryDate: 1 }, { name: 'status_delivery_idx' });

// Index for created date (for reporting and analytics)
shippingSchema.index({ createdAt: -1 }, { name: 'created_idx' });

// Compound index for delivered shipments with actual delivery date
shippingSchema.index({ status: 1, actualDeliveryDate: 1 }, { name: 'status_actual_delivery_idx' });

// Text index for searching by current location or recipient name
shippingSchema.index({
  currentLocation: 'text',
  'recipientInfo.name': 'text',
  notes: 'text'
}, { name: 'text_search_idx' });

const Shipping = mongoose.model('Shipping', shippingSchema);

export default Shipping;
