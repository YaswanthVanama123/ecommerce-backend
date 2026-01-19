import mongoose from 'mongoose';
import crypto from 'crypto';

const savedCardSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  // Tokenized card reference from payment gateway
  cardToken: {
    type: String,
    required: true,
    unique: true
  },
  // Encrypted card details (never store full card number)
  cardLast4: {
    type: String,
    required: true,
    minlength: 4,
    maxlength: 4
  },
  cardBrand: {
    type: String,
    enum: ['visa', 'mastercard', 'amex', 'rupay', 'maestro', 'diners', 'discover', 'other'],
    required: true
  },
  cardNetwork: {
    type: String,
    enum: ['credit', 'debit', 'prepaid']
  },
  cardType: {
    type: String,
    enum: ['credit', 'debit']
  },
  // Encrypted cardholder name
  cardholderName: {
    type: String,
    required: true
  },
  expiryMonth: {
    type: String,
    required: true,
    match: /^(0[1-9]|1[0-2])$/
  },
  expiryYear: {
    type: String,
    required: true,
    match: /^\d{4}$/
  },
  // Issuing bank details
  bankName: String,
  bankCode: String,
  // Gateway specific token/reference
  gateway: {
    name: {
      type: String,
      enum: ['razorpay', 'paytm', 'cashfree', 'stripe'],
      required: true
    },
    customerId: String, // Gateway's customer ID
    tokenId: String, // Gateway's card token ID
    fingerprint: String // Card fingerprint for duplicate detection
  },
  // Card nickname for easy identification
  nickname: {
    type: String,
    trim: true,
    maxlength: 50
  },
  // Default card for payments
  isDefault: {
    type: Boolean,
    default: false
  },
  // Verification status
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedAt: Date,
  // Card status
  isActive: {
    type: Boolean,
    default: true
  },
  // Usage tracking
  lastUsedAt: Date,
  usageCount: {
    type: Number,
    default: 0
  },
  // Security
  securityHash: String, // Hash for additional security validation
  // Metadata
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Indexes
savedCardSchema.index({ user: 1, isDefault: 1 });
savedCardSchema.index({ user: 1, isActive: 1 });
savedCardSchema.index({ cardToken: 1 }, { unique: true });
savedCardSchema.index({ 'gateway.fingerprint': 1 }, { sparse: true });
savedCardSchema.index({ expiryYear: 1, expiryMonth: 1 });

// Virtual to check if card is expired
savedCardSchema.virtual('isExpired').get(function() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-indexed

  const expYear = parseInt(this.expiryYear);
  const expMonth = parseInt(this.expiryMonth);

  if (expYear < currentYear) return true;
  if (expYear === currentYear && expMonth < currentMonth) return true;
  return false;
});

// Virtual for masked card number display
savedCardSchema.virtual('maskedCardNumber').get(function() {
  return `•••• •••• •••• ${this.cardLast4}`;
});

// Virtual for card display name
savedCardSchema.virtual('displayName').get(function() {
  if (this.nickname) return this.nickname;
  return `${this.cardBrand.toUpperCase()} ${this.cardLast4}`;
});

// Pre-save middleware to ensure only one default card per user
savedCardSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    // Remove default status from other cards
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }

  // Generate security hash
  if (this.isModified('cardToken') || this.isModified('cardLast4')) {
    this.securityHash = this.generateSecurityHash();
  }

  next();
});

// Method to generate security hash
savedCardSchema.methods.generateSecurityHash = function() {
  const data = `${this.user}_${this.cardToken}_${this.cardLast4}`;
  return crypto.createHash('sha256').update(data).digest('hex');
};

// Method to verify security hash
savedCardSchema.methods.verifySecurityHash = function() {
  const expectedHash = this.generateSecurityHash();
  return this.securityHash === expectedHash;
};

// Method to mark card as used
savedCardSchema.methods.markAsUsed = async function() {
  this.lastUsedAt = new Date();
  this.usageCount += 1;
  await this.save();
};

// Method to deactivate card
savedCardSchema.methods.deactivate = async function() {
  this.isActive = false;
  await this.save();
};

// Method to set as default
savedCardSchema.methods.setAsDefault = async function() {
  // Remove default from all other cards for this user
  await this.constructor.updateMany(
    { user: this.user, _id: { $ne: this._id } },
    { $set: { isDefault: false } }
  );

  this.isDefault = true;
  await this.save();
};

// Static method to get active cards for user
savedCardSchema.statics.getActiveCards = async function(userId) {
  return this.find({
    user: userId,
    isActive: true
  }).sort({ isDefault: -1, lastUsedAt: -1 });
};

// Static method to check for duplicate cards
savedCardSchema.statics.checkDuplicate = async function(userId, cardFingerprint) {
  return this.findOne({
    user: userId,
    'gateway.fingerprint': cardFingerprint,
    isActive: true
  });
};

// Static method to cleanup expired cards
savedCardSchema.statics.cleanupExpiredCards = async function() {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear().toString();
  const currentMonth = (currentDate.getMonth() + 1).toString().padStart(2, '0');

  // Find and deactivate expired cards
  const expiredCards = await this.updateMany(
    {
      $or: [
        { expiryYear: { $lt: currentYear } },
        {
          expiryYear: currentYear,
          expiryMonth: { $lt: currentMonth }
        }
      ],
      isActive: true
    },
    {
      $set: { isActive: false }
    }
  );

  return expiredCards;
};

// Static method to get default card for user
savedCardSchema.statics.getDefaultCard = async function(userId) {
  return this.findOne({
    user: userId,
    isDefault: true,
    isActive: true
  });
};

const SavedCard = mongoose.model('SavedCard', savedCardSchema);

export default SavedCard;
