import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  method: {
    type: String,
    enum: ['razorpay', 'paytm', 'phonepe', 'gpay', 'cod', 'wallet', 'emi', 'card', 'upi', 'netbanking', 'split'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'partial_refund', 'cancelled'],
    default: 'pending',
    index: true
  },

  // Transaction details
  transactionId: {
    type: String,
    sparse: true,
    index: true
  },

  // Gateway specific details
  gateway: {
    name: {
      type: String,
      enum: ['razorpay', 'paytm', 'phonepe', 'cashfree', 'manual']
    },
    orderId: String,
    paymentId: String,
    signature: String,
    response: mongoose.Schema.Types.Mixed
  },

  // Payment method specific details
  methodDetails: {
    // For card payments
    cardLast4: String,
    cardBrand: String,
    cardNetwork: String,
    cardType: String, // credit/debit
    cardToken: String, // tokenized card reference

    // For UPI/wallet
    vpa: String, // UPI ID
    walletProvider: String,

    // For netbanking
    bankCode: String,
    bankName: String,

    // For EMI
    emiTenure: {
      type: Number,
      enum: [3, 6, 9, 12]
    },
    emiAmount: Number,
    emiInterestRate: Number,
    emiProvider: String,

    // For split payment
    splits: [{
      method: String,
      amount: Number,
      transactionId: String,
      status: String
    }]
  },

  // COD specific
  codCharge: {
    type: Number,
    default: 0
  },
  codVerified: {
    type: Boolean,
    default: false
  },
  codCollectedAt: Date,

  // Refund details
  refundDetails: {
    refundId: String,
    refundAmount: Number,
    refundReason: String,
    refundedAt: Date,
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed']
    },
    isPartialRefund: Boolean,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // Retry mechanism
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  lastRetryAt: Date,

  // Payment verification
  verified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,

  // Fraud detection
  fraudScore: {
    type: Number,
    min: 0,
    max: 100
  },
  fraudChecks: [{
    checkType: String,
    result: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Payment reminders
  remindersSent: {
    type: Number,
    default: 0
  },
  lastReminderAt: Date,
  nextReminderAt: Date,

  // Settlement tracking
  settlement: {
    settled: {
      type: Boolean,
      default: false
    },
    settledAt: Date,
    settlementId: String,
    settlementAmount: Number,
    settlementUtr: String
  },

  // Metadata
  metadata: mongoose.Schema.Types.Mixed,

  // Payment link (for retry/reminder)
  paymentLink: String,
  linkExpiresAt: Date,

  // Notes
  notes: String,

  // IP and device info for security
  ipAddress: String,
  userAgent: String,
  deviceFingerprint: String,

  // Timestamps for various stages
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  failedAt: Date,
  cancelledAt: Date
}, {
  timestamps: true
});

// Indexes for efficient queries
paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ user: 1, status: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 }, { sparse: true });
paymentSchema.index({ 'gateway.paymentId': 1 }, { sparse: true });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ method: 1, status: 1 });
paymentSchema.index({ 'settlement.settled': 1, 'settlement.settledAt': -1 });

// Method to mark payment as completed
paymentSchema.methods.markCompleted = function(transactionId, gatewayResponse = {}) {
  this.status = 'completed';
  this.verified = true;
  this.verifiedAt = new Date();
  this.completedAt = new Date();
  this.transactionId = transactionId;

  if (gatewayResponse) {
    this.gateway.response = gatewayResponse;
  }
};

// Method to mark payment as failed
paymentSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.notes = this.notes ? `${this.notes}; Failed: ${reason}` : `Failed: ${reason}`;
};

// Method to process refund
paymentSchema.methods.processRefund = function(refundAmount, refundReason, refundedBy) {
  const isPartial = refundAmount < this.amount;

  this.status = isPartial ? 'partial_refund' : 'refunded';
  this.refundDetails = {
    refundAmount,
    refundReason,
    refundedAt: new Date(),
    refundStatus: 'processing',
    isPartialRefund: isPartial,
    refundedBy
  };
};

// Method to check if retry is allowed
paymentSchema.methods.canRetry = function() {
  return this.status === 'failed' && this.retryCount < this.maxRetries;
};

// Method to increment retry count
paymentSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.status = 'pending';
};

// Method to calculate next reminder time
paymentSchema.methods.scheduleReminder = function() {
  const reminderIntervals = [24, 48, 72]; // hours
  if (this.remindersSent < reminderIntervals.length) {
    const hoursToAdd = reminderIntervals[this.remindersSent];
    this.nextReminderAt = new Date(Date.now() + hoursToAdd * 60 * 60 * 1000);
  }
};

// Static method to get payment statistics
paymentSchema.statics.getStatistics = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalAmount: { $sum: '$amount' }
      }
    }
  ]);
};

// Static method to get failed payments for retry
paymentSchema.statics.getFailedPaymentsForRetry = async function() {
  return this.find({
    status: 'failed',
    retryCount: { $lt: this.maxRetries },
    $or: [
      { lastRetryAt: { $exists: false } },
      { lastRetryAt: { $lte: new Date(Date.now() - 60 * 60 * 1000) } } // 1 hour ago
    ]
  }).populate('order user');
};

// Static method to get pending reminders
paymentSchema.statics.getPendingReminders = async function() {
  return this.find({
    status: 'pending',
    nextReminderAt: { $lte: new Date() },
    remindersSent: { $lt: 3 }
  }).populate('order user');
};

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
