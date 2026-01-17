import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema({
  // General Settings
  siteName: {
    type: String,
    default: 'E-Commerce Store'
  },
  siteDescription: String,
  siteEmail: String,
  sitePhone: String,

  // Business Settings
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  currency: {
    type: String,
    default: 'INR',
    enum: ['INR', 'USD', 'EUR', 'GBP']
  },
  currencySymbol: {
    type: String,
    default: '₹'
  },

  // Shipping Settings
  shippingMethods: [{
    name: String,
    price: Number,
    estimatedDays: Number,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  freeShippingThreshold: {
    type: Number,
    default: 0
  },

  // Order Settings
  minOrderValue: {
    type: Number,
    default: 0
  },
  maxOrderValue: {
    type: Number,
    default: 1000000
  },
  allowCOD: {
    type: Boolean,
    default: true
  },
  codCharges: {
    type: Number,
    default: 0
  },

  // Email Settings
  emailNotifications: {
    orderConfirmation: {
      type: Boolean,
      default: true
    },
    orderShipped: {
      type: Boolean,
      default: true
    },
    orderDelivered: {
      type: Boolean,
      default: true
    },
    orderCancelled: {
      type: Boolean,
      default: true
    },
    welcomeEmail: {
      type: Boolean,
      default: true
    }
  },

  // Security Settings
  security: {
    enableTwoFactorAuth: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 3600 // seconds
    },
    maxLoginAttempts: {
      type: Number,
      default: 5
    },
    lockoutDuration: {
      type: Number,
      default: 900 // 15 minutes in seconds
    }
  },

  // Feature Flags
  features: {
    enableReviews: {
      type: Boolean,
      default: true
    },
    enableWishlist: {
      type: Boolean,
      default: true
    },
    enableReferral: {
      type: Boolean,
      default: false
    },
    enableLoyaltyPoints: {
      type: Boolean,
      default: false
    },
    enableGuestCheckout: {
      type: Boolean,
      default: true
    }
  },

  // Payment Settings
  paymentMethods: {
    cod: {
      type: Boolean,
      default: true
    },
    card: {
      type: Boolean,
      default: true
    },
    upi: {
      type: Boolean,
      default: true
    },
    wallet: {
      type: Boolean,
      default: true
    }
  },

  // Maintenance Mode
  maintenance: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: 'Site is under maintenance. Please check back soon.'
    },
    allowedIPs: [String]
  },

  // Social Media Links
  socialMedia: {
    facebook: String,
    instagram: String,
    twitter: String,
    youtube: String,
    linkedin: String
  },

  // SEO Settings
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    googleAnalyticsId: String,
    googleTagManagerId: String
  },

  // Return/Refund Policy
  policies: {
    returnDays: {
      type: Number,
      default: 7
    },
    refundProcessingDays: {
      type: Number,
      default: 7
    },
    termsAndConditions: String,
    privacyPolicy: String,
    returnPolicy: String
  },

  // Updated by
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Method to get active shipping methods
settingsSchema.methods.getActiveShippingMethods = function() {
  return this.shippingMethods.filter(method => method.isActive);
};

// Method to calculate shipping cost
settingsSchema.methods.calculateShipping = function(orderTotal) {
  if (orderTotal >= this.freeShippingThreshold && this.freeShippingThreshold > 0) {
    return 0;
  }
  // Return cheapest shipping method by default
  const activeMethods = this.getActiveShippingMethods();
  if (activeMethods.length === 0) return 0;
  return Math.min(...activeMethods.map(m => m.price));
};

// Ensure only one settings document exists
settingsSchema.statics.getInstance = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
