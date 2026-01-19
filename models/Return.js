import mongoose from 'mongoose';

const returnItemSchema = new mongoose.Schema({
  orderItem: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
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
  discountPrice: Number,
  returnQuantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const pickupAddressSchema = new mongoose.Schema({
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

const refundBreakdownSchema = new mongoose.Schema({
  itemsTotal: {
    type: Number,
    required: true
  },
  shippingRefund: {
    type: Number,
    default: 0
  },
  deductions: {
    type: Number,
    default: 0
  },
  deductionReason: String,
  finalRefundAmount: {
    type: Number,
    required: true
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
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  note: String,
  adminComment: String
});

const qualityCheckSchema = new mongoose.Schema({
  checkedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  checkedAt: {
    type: Date,
    default: Date.now
  },
  condition: {
    type: String,
    enum: ['good', 'damaged', 'used', 'defective', 'unopened'],
    required: true
  },
  packagingIntact: {
    type: Boolean,
    default: false
  },
  tagsAttached: {
    type: Boolean,
    default: false
  },
  notes: String,
  images: [String],
  approved: {
    type: Boolean,
    required: true
  },
  rejectionReason: String
});

const returnSchema = new mongoose.Schema({
  returnNumber: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [returnItemSchema],
  returnType: {
    type: String,
    enum: ['return', 'exchange'],
    default: 'return'
  },
  reason: {
    type: String,
    enum: [
      'defective',
      'wrong_item',
      'size_issue',
      'not_as_described',
      'damaged',
      'quality_issue',
      'color_mismatch',
      'missing_parts',
      'other'
    ],
    required: true
  },
  detailedReason: {
    type: String,
    required: true,
    maxlength: 500
  },
  images: {
    type: [String],
    validate: [arrayMinMax, 'Return must have between 2 and 5 images']
  },
  status: {
    type: String,
    enum: [
      'requested',
      'approved',
      'rejected',
      'pickup_scheduled',
      'picked_up',
      'in_transit',
      'received',
      'inspected',
      'refund_initiated',
      'refund_completed',
      'cancelled'
    ],
    default: 'requested'
  },
  statusHistory: [statusHistorySchema],
  pickupAddress: {
    type: pickupAddressSchema,
    required: true
  },
  pickupDetails: {
    scheduledDate: Date,
    scheduledTimeSlot: String,
    pickupPartner: String,
    trackingNumber: String,
    pickedUpAt: Date,
    deliveredToWarehouseAt: Date
  },
  qualityCheck: qualityCheckSchema,
  refundMethod: {
    type: String,
    enum: ['original_payment', 'wallet', 'bank_transfer'],
    default: 'original_payment'
  },
  refundBreakdown: refundBreakdownSchema,
  refundDetails: {
    refundId: String,
    initiatedAt: Date,
    completedAt: Date,
    failedAt: Date,
    failureReason: String
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  },
  returnWindow: {
    type: Number,
    required: true
  },
  returnWindowExpiry: {
    type: Date,
    required: true
  },
  isEligible: {
    type: Boolean,
    default: true
  },
  ineligibilityReason: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  tags: [String],
  adminNotes: String,
  customerNotes: String
}, {
  timestamps: true
});

// Validation function for images array
function arrayMinMax(val) {
  return val.length >= 2 && val.length <= 5;
}

// Generate unique return number before saving
returnSchema.pre('save', async function() {
  if (this.isNew) {
    const count = await mongoose.model('Return').countDocuments();
    this.returnNumber = `RET${Date.now()}${count + 1}`;

    // Initialize status history
    this.statusHistory.push({
      status: this.status,
      updatedAt: new Date(),
      note: 'Return request created'
    });
  }
});

// Method to update return status
returnSchema.methods.updateStatus = function(newStatus, updatedBy = null, note = '', adminComment = '') {
  this.status = newStatus;
  this.statusHistory.push({
    status: newStatus,
    updatedAt: new Date(),
    updatedBy,
    note,
    adminComment
  });

  // Update timestamps based on status
  if (newStatus === 'picked_up' && this.pickupDetails) {
    this.pickupDetails.pickedUpAt = new Date();
  } else if (newStatus === 'received' && this.pickupDetails) {
    this.pickupDetails.deliveredToWarehouseAt = new Date();
  } else if (newStatus === 'refund_initiated' && this.refundDetails) {
    this.refundDetails.initiatedAt = new Date();
  } else if (newStatus === 'refund_completed' && this.refundDetails) {
    this.refundDetails.completedAt = new Date();
  }
};

// Method to calculate refund amount
returnSchema.methods.calculateRefund = function(deductions = 0, deductionReason = '', includeShipping = false) {
  const itemsTotal = this.items.reduce((sum, item) => {
    const itemPrice = item.discountPrice || item.price;
    return sum + (itemPrice * item.returnQuantity);
  }, 0);

  const shippingRefund = includeShipping ? (this.order?.shippingCharge || 0) : 0;
  const finalRefundAmount = Math.max(0, itemsTotal + shippingRefund - deductions);

  this.refundBreakdown = {
    itemsTotal,
    shippingRefund,
    deductions,
    deductionReason,
    finalRefundAmount
  };

  return finalRefundAmount;
};

// Method to check return eligibility
returnSchema.statics.checkEligibility = async function(orderId, itemIds) {
  const Order = mongoose.model('Order');
  const order = await Order.findById(orderId);

  if (!order) {
    return { eligible: false, reason: 'Order not found' };
  }

  if (order.orderStatus === 'cancelled') {
    return { eligible: false, reason: 'Cancelled orders are not eligible for returns' };
  }

  if (order.orderStatus !== 'delivered') {
    return { eligible: false, reason: 'Order must be delivered before initiating a return' };
  }

  if (!order.deliveredAt) {
    return { eligible: false, reason: 'Delivery date not found' };
  }

  // Check if return already exists for these items
  const existingReturn = await this.findOne({
    order: orderId,
    'items.orderItem': { $in: itemIds },
    status: { $nin: ['rejected', 'cancelled'] }
  });

  if (existingReturn) {
    return { eligible: false, reason: 'Return already requested for selected items' };
  }

  return { eligible: true, order };
};

// Method to get return window based on category
returnSchema.statics.getReturnWindow = async function(productId) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId).populate('category');

  if (!product) {
    return 7; // Default 7 days
  }

  // Return window based on category
  const categoryReturnWindows = {
    'Electronics': 7,
    'Clothing': 15,
    'Footwear': 15,
    'Fashion Accessories': 15,
    'Home & Living': 15,
    'Beauty & Personal Care': 7,
    'Sports & Fitness': 15,
    'Books': 7,
    'Toys': 15,
    'default': 7
  };

  const categoryName = product.category?.name || 'default';
  return categoryReturnWindows[categoryName] || categoryReturnWindows['default'];
};

// Indexes for return queries
// Unique index for return number
returnSchema.index({ returnNumber: 1 }, { name: 'return_number_idx', unique: true });

// Compound index for user returns with status and creation date
returnSchema.index({ user: 1, status: 1, createdAt: -1 }, { name: 'user_status_created_idx' });

// Index for order returns
returnSchema.index({ order: 1, status: 1 }, { name: 'order_status_idx' });

// Index for return status queries (used by admin dashboard)
returnSchema.index({ status: 1, priority: 1, createdAt: -1 }, { name: 'status_priority_created_idx' });

// Index for date range queries (for analytics)
returnSchema.index({ createdAt: -1 }, { name: 'created_idx' });

// Index for refund status queries
returnSchema.index({ status: 1, 'refundDetails.completedAt': 1 }, { name: 'status_refund_completed_idx' });

// Compound index for eligibility checks
returnSchema.index({ returnWindowExpiry: 1, isEligible: 1 }, { name: 'expiry_eligible_idx' });

// Text search index
returnSchema.index({ returnNumber: 'text', orderNumber: 'text', reason: 'text' }, { name: 'text_search_idx' });

const Return = mongoose.model('Return', returnSchema);

export default Return;
