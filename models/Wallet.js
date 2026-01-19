import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['credit', 'debit'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    required: true
  },
  source: {
    type: String,
    enum: ['refund', 'cashback', 'bonus', 'admin_credit', 'payment', 'withdrawal', 'order', 'cancellation'],
    required: true
  },
  reference: {
    type: String, // Order ID, Payment ID, etc.
    sparse: true
  },
  referenceModel: {
    type: String,
    enum: ['Order', 'Payment', 'Refund']
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed'
  },
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const walletSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  lockedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  transactions: [transactionSchema],

  // Wallet limits
  limits: {
    maxBalance: {
      type: Number,
      default: 100000 // Maximum wallet balance
    },
    minWithdrawal: {
      type: Number,
      default: 100
    },
    maxTransaction: {
      type: Number,
      default: 50000
    }
  },

  // Cashback and rewards
  totalCashbackEarned: {
    type: Number,
    default: 0
  },
  totalRefundsReceived: {
    type: Number,
    default: 0
  },

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isFrozen: {
    type: Boolean,
    default: false
  },
  freezeReason: String,
  frozenAt: Date,

  // KYC status (for regulatory compliance)
  kycStatus: {
    type: String,
    enum: ['not_submitted', 'pending', 'verified', 'rejected'],
    default: 'not_submitted'
  },
  kycVerifiedAt: Date,

  lastActivityAt: Date
}, {
  timestamps: true
});

// Indexes
walletSchema.index({ user: 1 }, { unique: true });
walletSchema.index({ 'transactions.createdAt': -1 });
walletSchema.index({ 'transactions.type': 1 });
walletSchema.index({ 'transactions.reference': 1 }, { sparse: true });

// Virtual for available balance
walletSchema.virtual('availableBalance').get(function() {
  return this.balance - this.lockedAmount;
});

// Method to add funds
walletSchema.methods.credit = async function(amount, description, source, reference = null, referenceModel = null, metadata = {}) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (this.isFrozen) {
    throw new Error('Wallet is frozen');
  }

  const balanceBefore = this.balance;
  this.balance += amount;
  const balanceAfter = this.balance;

  // Check max balance limit
  if (this.balance > this.limits.maxBalance) {
    throw new Error(`Wallet balance cannot exceed ₹${this.limits.maxBalance}`);
  }

  // Track cashback and refunds
  if (source === 'cashback' || source === 'bonus') {
    this.totalCashbackEarned += amount;
  } else if (source === 'refund' || source === 'cancellation') {
    this.totalRefundsReceived += amount;
  }

  this.transactions.push({
    type: 'credit',
    amount,
    description,
    source,
    reference,
    referenceModel,
    balanceBefore,
    balanceAfter,
    status: 'completed',
    metadata,
    createdAt: new Date()
  });

  this.lastActivityAt = new Date();
  await this.save();

  return this.transactions[this.transactions.length - 1];
};

// Method to deduct funds
walletSchema.methods.debit = async function(amount, description, source, reference = null, referenceModel = null, metadata = {}) {
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }

  if (this.isFrozen) {
    throw new Error('Wallet is frozen');
  }

  const availableBalance = this.balance - this.lockedAmount;
  if (amount > availableBalance) {
    throw new Error('Insufficient wallet balance');
  }

  const balanceBefore = this.balance;
  this.balance -= amount;
  const balanceAfter = this.balance;

  this.transactions.push({
    type: 'debit',
    amount,
    description,
    source,
    reference,
    referenceModel,
    balanceBefore,
    balanceAfter,
    status: 'completed',
    metadata,
    createdAt: new Date()
  });

  this.lastActivityAt = new Date();
  await this.save();

  return this.transactions[this.transactions.length - 1];
};

// Method to lock amount (for pending transactions)
walletSchema.methods.lockAmount = async function(amount) {
  const availableBalance = this.balance - this.lockedAmount;
  if (amount > availableBalance) {
    throw new Error('Insufficient balance to lock');
  }

  this.lockedAmount += amount;
  await this.save();
};

// Method to unlock amount
walletSchema.methods.unlockAmount = async function(amount) {
  if (amount > this.lockedAmount) {
    throw new Error('Cannot unlock more than locked amount');
  }

  this.lockedAmount -= amount;
  await this.save();
};

// Method to get transaction history with pagination
walletSchema.methods.getTransactionHistory = function(options = {}) {
  const { limit = 10, skip = 0, type = null, source = null, startDate = null, endDate = null } = options;

  let transactions = [...this.transactions];

  // Filter by type
  if (type) {
    transactions = transactions.filter(t => t.type === type);
  }

  // Filter by source
  if (source) {
    transactions = transactions.filter(t => t.source === source);
  }

  // Filter by date range
  if (startDate || endDate) {
    transactions = transactions.filter(t => {
      const txDate = new Date(t.createdAt);
      if (startDate && txDate < new Date(startDate)) return false;
      if (endDate && txDate > new Date(endDate)) return false;
      return true;
    });
  }

  // Sort by date (newest first)
  transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Paginate
  const total = transactions.length;
  transactions = transactions.slice(skip, skip + limit);

  return {
    transactions,
    total,
    hasMore: skip + limit < total
  };
};

// Method to freeze wallet
walletSchema.methods.freeze = async function(reason) {
  this.isFrozen = true;
  this.freezeReason = reason;
  this.frozenAt = new Date();
  await this.save();
};

// Method to unfreeze wallet
walletSchema.methods.unfreeze = async function() {
  this.isFrozen = false;
  this.freezeReason = null;
  this.frozenAt = null;
  await this.save();
};

// Static method to get or create wallet for user
walletSchema.statics.getOrCreateWallet = async function(userId) {
  let wallet = await this.findOne({ user: userId });

  if (!wallet) {
    wallet = await this.create({
      user: userId,
      balance: 0,
      lockedAmount: 0
    });
  }

  return wallet;
};

// Static method to process refund to wallet
walletSchema.statics.processRefund = async function(userId, amount, orderId, description = 'Order refund') {
  const wallet = await this.getOrCreateWallet(userId);

  return await wallet.credit(
    amount,
    description,
    'refund',
    orderId,
    'Order',
    { processedAt: new Date() }
  );
};

// Static method to process cashback
walletSchema.statics.processCashback = async function(userId, amount, orderId, description = 'Cashback reward') {
  const wallet = await this.getOrCreateWallet(userId);

  return await wallet.credit(
    amount,
    description,
    'cashback',
    orderId,
    'Order',
    { processedAt: new Date() }
  );
};

const Wallet = mongoose.model('Wallet', walletSchema);

export default Wallet;
