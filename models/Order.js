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
  firstName: {
    type: String,
    required: true
  },
  lastName: {
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
  pincode: {
    type: String,
    required: true
  },
  country: {
    type: String,
    default: 'India'
  },
  phone: {
    type: String,
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
  note: String
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
    enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  statusHistory: [statusHistorySchema],
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: String
}, {
  timestamps: true
});

// Generate unique order number before saving
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD${Date.now()}${count + 1}`;

    // Initialize status history
    this.statusHistory.push({
      status: this.orderStatus,
      updatedAt: new Date()
    });
  }
  next();
});

// Method to update order status
orderSchema.methods.updateStatus = function(newStatus, note = '') {
  this.orderStatus = newStatus;
  this.statusHistory.push({
    status: newStatus,
    updatedAt: new Date(),
    note
  });

  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
    this.paymentStatus = 'completed';
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
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

const Order = mongoose.model('Order', orderSchema);

export default Order;
