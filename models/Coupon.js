import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: 0
  },
  minPurchase: {
    type: Number,
    default: 0,
    min: 0
  },
  maxDiscount: {
    type: Number,
    default: null
  },
  validFrom: {
    type: Date,
    required: true
  },
  validTo: {
    type: Date,
    required: true
  },
  usageLimit: {
    type: Number,
    default: null
  },
  usedCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster coupon code lookups
couponSchema.index({ code: 1 });

// Virtual to check if coupon is expired
couponSchema.virtual('isExpired').get(function() {
  return new Date() > this.validTo;
});

// Virtual to check if coupon is valid (not expired and active)
couponSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.isActive && now >= this.validFrom && now <= this.validTo;
});

// Virtual to check if usage limit reached
couponSchema.virtual('isUsageLimitReached').get(function() {
  if (this.usageLimit === null) return false;
  return this.usedCount >= this.usageLimit;
});

// Method to validate coupon for a specific order
couponSchema.methods.validateForOrder = function(orderTotal, productIds = [], categoryIds = []) {
  const errors = [];

  // Check if coupon is active
  if (!this.isActive) {
    errors.push('Coupon is not active');
  }

  // Check if coupon is within valid date range
  const now = new Date();
  if (now < this.validFrom) {
    errors.push('Coupon is not yet valid');
  }
  if (now > this.validTo) {
    errors.push('Coupon has expired');
  }

  // Check usage limit
  if (this.usageLimit !== null && this.usedCount >= this.usageLimit) {
    errors.push('Coupon usage limit has been reached');
  }

  // Check minimum purchase
  if (orderTotal < this.minPurchase) {
    errors.push(`Minimum purchase of $${this.minPurchase} required`);
  }

  // Check applicable categories (if specified)
  if (this.applicableCategories.length > 0 && categoryIds.length > 0) {
    const hasValidCategory = categoryIds.some(catId =>
      this.applicableCategories.some(appCat => appCat.toString() === catId.toString())
    );
    if (!hasValidCategory) {
      errors.push('Coupon not applicable to selected products');
    }
  }

  // Check applicable products (if specified)
  if (this.applicableProducts.length > 0 && productIds.length > 0) {
    const hasValidProduct = productIds.some(prodId =>
      this.applicableProducts.some(appProd => appProd.toString() === prodId.toString())
    );
    if (!hasValidProduct) {
      errors.push('Coupon not applicable to selected products');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Method to calculate discount amount
couponSchema.methods.calculateDiscount = function(orderTotal) {
  let discount = 0;

  if (this.type === 'percentage') {
    discount = (orderTotal * this.value) / 100;
    // Apply max discount limit if specified
    if (this.maxDiscount !== null && discount > this.maxDiscount) {
      discount = this.maxDiscount;
    }
  } else if (this.type === 'fixed') {
    discount = this.value;
    // Discount cannot exceed order total
    if (discount > orderTotal) {
      discount = orderTotal;
    }
  }

  return Math.round(discount * 100) / 100; // Round to 2 decimal places
};

// Method to increment usage count
couponSchema.methods.incrementUsage = async function() {
  this.usedCount += 1;
  return await this.save();
};

const Coupon = mongoose.model('Coupon', couponSchema);

export default Coupon;
