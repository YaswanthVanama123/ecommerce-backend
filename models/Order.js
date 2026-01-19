import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  size: String,
  color: String,
  price: {
    type: Number,
    required: true
  },
  discountPrice: Number
});

const shippingAddressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
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
});

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  note: String,
  actor: {
    type: {
      type: String,
      enum: ['user', 'admin', 'system', 'delivery_agent'],
      default: 'system'
    },
    id: mongoose.Schema.Types.ObjectId,
    name: String,
    email: String
  },
  metadata: {
    ipAddress: String,
    userAgent: String,
    location: String,
    estimatedDate: Date,
    actualDate: Date
  },
  eventType: {
    type: String,
    enum: ['status_change', 'payment', 'shipment', 'modification', 'cancellation', 'return', 'refund', 'note'],
    default: 'status_change'
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  isImportant: {
    type: Boolean,
    default: false
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [orderItemSchema],
  shippingAddress: {
    type: shippingAddressSchema,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['COD', 'Card', 'UPI', 'Wallet'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paidAt: Date
  },
  itemsTotal: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  appliedCoupon: {
    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Coupon',
      default: null
    },
    code: {
      type: String,
      default: null
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: null
    },
    value: {
      type: Number,
      default: null
    },
    discountAmount: {
      type: Number,
      default: 0
    }
  },
  shippingCharge: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'cancellation_requested'],
    default: 'pending'
  },
  statusHistory: [statusHistorySchema],
  // Shipping integration fields
  shipping: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipping',
    default: null
  },
  shippingStatus: {
    type: String,
    enum: ['not_shipped', 'shipped', 'in_transit', 'delivered'],
    default: 'not_shipped'
  },
  trackingNumber: {
    type: String,
    default: null,
    sparse: true  // Allows null values without unique constraint conflicts
  },
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  // Return management fields
  returnEligible: {
    type: Boolean,
    default: false
  },
  returnWindowDays: {
    type: Number,
    default: 7
  },
  hasReturn: {
    type: Boolean,
    default: false
  },
  returnStatus: {
    type: String,
    enum: ['none', 'requested', 'approved', 'completed', 'rejected'],
    default: 'none'
  },
  returnId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Return',
    default: null
  },
  // Enhanced cancellation fields
  cancellationRequest: {
    status: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    reason: {
      type: String,
      enum: ['changed_mind', 'found_better_price', 'ordered_by_mistake', 'delivery_delay', 'wrong_product', 'quality_concerns', 'other'],
      default: null
    },
    comments: {
      type: String,
      maxlength: 500
    },
    requestedAt: Date,
    respondedAt: Date,
    respondedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adminComments: {
      type: String,
      maxlength: 500
    }
  },
  // Cancellation time window (in hours)
  cancellationWindowHours: {
    type: Number,
    default: 24
  },
  // Partial cancellation support
  partialCancellation: {
    enabled: {
      type: Boolean,
      default: false
    },
    cancelledItems: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: Number,
      reason: String,
      refundAmount: Number
    }]
  },
  // Refund information
  refund: {
    status: {
      type: String,
      enum: ['none', 'pending', 'processing', 'completed', 'failed'],
      default: 'none'
    },
    amount: {
      type: Number,
      default: 0
    },
    method: {
      type: String,
      enum: ['original_payment_method', 'wallet', 'bank_transfer'],
      default: 'original_payment_method'
    },
    initiatedAt: Date,
    completedAt: Date,
    transactionId: String,
    estimatedDays: {
      type: Number,
      default: 7
    }
  },
  // Invoice details
  invoice: {
    invoiceNumber: {
      type: String,
      sparse: true,
      unique: true
    },
    generatedAt: Date,
    path: String
  }
}, {
  timestamps: true
});

// Generate unique order number before saving
orderSchema.pre('save', async function() {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${count + 1}`;

    // Initialize status history
    this.statusHistory.push({
      status: this.orderStatus,
      updatedAt: new Date()
    });
  }
});

// Method to update order status with enhanced history tracking
orderSchema.methods.updateStatus = function(newStatus, note = '', actor = null, metadata = {}) {
  const oldStatus = this.orderStatus;
  this.orderStatus = newStatus;

  this.statusHistory.push({
    status: newStatus,
    updatedAt: new Date(),
    note,
    actor: actor || { type: 'system', name: 'System' },
    metadata: {
      ...metadata,
      actualDate: new Date()
    },
    eventType: newStatus === 'cancelled' ? 'cancellation' : 'status_change',
    oldValue: oldStatus,
    newValue: newStatus,
    isImportant: ['confirmed', 'shipped', 'delivered', 'cancelled'].includes(newStatus)
  });

  // Sync shipping status with order status
  if (newStatus === 'shipped') {
    this.shippingStatus = 'shipped';
  } else if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
    this.returnEligible = true;
    this.paymentStatus = 'completed';
    this.shippingStatus = 'delivered';
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
  }
};

// Method to update shipping status
orderSchema.methods.updateShippingStatus = function(newShippingStatus, trackingNumber = null, note = '') {
  this.shippingStatus = newShippingStatus;

  // Update tracking number if provided
  if (trackingNumber) {
    this.trackingNumber = trackingNumber;
  }

  // Sync order status with shipping status
  if (newShippingStatus === 'shipped' && this.orderStatus === 'processing') {
    this.orderStatus = 'shipped';
    this.statusHistory.push({
      status: 'shipped',
      updatedAt: new Date(),
      note: note || 'Order shipped'
    });
  } else if (newShippingStatus === 'delivered' && this.orderStatus === 'shipped') {
    this.orderStatus = 'delivered';
    this.deliveredAt = new Date();
    this.returnEligible = true;
    this.paymentStatus = 'completed';
    this.statusHistory.push({
      status: 'delivered',
      updatedAt: new Date(),
      note: note || 'Order delivered'
    });
  }
};

// Indexes for order queries
// Unique index for order number
orderSchema.index({ orderNumber: 1 }, { name: 'order_number_idx', unique: true });

// Compound index for user orders with status and creation date
orderSchema.index({ user: 1, orderStatus: 1, createdAt: -1 }, { name: 'user_status_created_idx' });

// Index for order status queries (used by admin dashboard)
orderSchema.index({ orderStatus: 1, paymentStatus: 1 }, { name: 'status_payment_idx' });

// Index for payment status queries (used for reporting)
orderSchema.index({ paymentStatus: 1, createdAt: -1 }, { name: 'payment_created_idx' });

// Index for date range queries (for analytics)
orderSchema.index({ createdAt: -1 }, { name: 'created_idx' });

// Compound index for delivered orders (for analytics)
orderSchema.index({ orderStatus: 1, deliveredAt: 1 }, { name: 'status_delivered_idx' });

// Shipping integration indexes
// Index for shipping status queries (for tracking shipments)
orderSchema.index({ shippingStatus: 1, createdAt: -1 }, { name: 'shipping_status_created_idx' });

// Index for tracking number lookups (sparse to handle null values)
orderSchema.index({ trackingNumber: 1 }, { name: 'tracking_number_idx', sparse: true });

// Compound index for user shipping queries
orderSchema.index({ user: 1, shippingStatus: 1 }, { name: 'user_shipping_status_idx' });

// Compound index for shipping reference queries
orderSchema.index({ shipping: 1, shippingStatus: 1 }, { name: 'shipping_ref_status_idx', sparse: true });

// Advanced search indexes for Myntra/Meesho-like filtering
// Index for payment method filtering
orderSchema.index({ paymentMethod: 1, createdAt: -1 }, { name: 'payment_method_created_idx' });

// Index for total amount range queries
orderSchema.index({ totalAmount: 1, createdAt: -1 }, { name: 'total_amount_created_idx' });

// Compound index for admin filtering (status + payment + date)
orderSchema.index({ orderStatus: 1, paymentStatus: 1, createdAt: -1 }, { name: 'admin_filter_idx' });

// Text index for full-text search on product names
orderSchema.index({ 'items.name': 'text' }, { name: 'product_name_text_idx' });

// Index for shipping address search
orderSchema.index({ 'shippingAddress.fullName': 1 }, { name: 'shipping_name_idx' });
orderSchema.index({ 'shippingAddress.phone': 1 }, { name: 'shipping_phone_idx' });

// Compound index for multi-status filtering
orderSchema.index({ orderStatus: 1, shippingStatus: 1, paymentStatus: 1 }, { name: 'multi_status_idx' });

const Order = mongoose.model('Order', orderSchema);

export default Order;
