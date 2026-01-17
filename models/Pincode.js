import mongoose from 'mongoose';

const pincodeSchema = new mongoose.Schema(
  {
    pincode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      default: 'India',
      trim: true,
    },
    isServiceable: {
      type: Boolean,
      default: true,
    },
    deliveryZone: {
      type: String,
      enum: ['metro', 'urban', 'semi-urban', 'rural'],
      default: 'urban',
    },
    estimatedDeliveryDays: {
      min: { type: Number, default: 2 },
      max: { type: Number, default: 5 },
    },
    codAvailable: {
      type: Boolean,
      default: true,
    },
    shippingPartners: [
      {
        type: String,
        enum: ['delhivery', 'bluedart', 'dtdc', 'ekart', 'shadowfax'],
      },
    ],
    restrictedCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    surchargePercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster queries
pincodeSchema.index({ city: 1, state: 1 });
pincodeSchema.index({ isServiceable: 1, isActive: 1 });

// Virtual property for backward compatibility with frontend
pincodeSchema.virtual('deliveryDays').get(function () {
  return this.estimatedDeliveryDays?.min || 2;
});

// Ensure virtuals are included when converting to JSON
pincodeSchema.set('toJSON', { virtuals: true });
pincodeSchema.set('toObject', { virtuals: true });

// Methods
pincodeSchema.methods.getDeliveryEstimate = function () {
  const today = new Date();
  const minDate = new Date(today);
  const maxDate = new Date(today);

  minDate.setDate(today.getDate() + this.estimatedDeliveryDays.min);
  maxDate.setDate(today.getDate() + this.estimatedDeliveryDays.max);

  return {
    minDate: minDate.toDateString(),
    maxDate: maxDate.toDateString(),
    daysRange: `${this.estimatedDeliveryDays.min}-${this.estimatedDeliveryDays.max} days`,
  };
};

pincodeSchema.methods.canDeliverProduct = function (product) {
  if (!this.isServiceable || !this.isActive) {
    return {
      deliverable: false,
      reason: 'This pincode is not serviceable',
    };
  }

  // Check if product category is restricted
  if (this.restrictedCategories.includes(product.category)) {
    return {
      deliverable: false,
      reason: 'This product cannot be delivered to your location',
    };
  }

  return {
    deliverable: true,
    estimatedDelivery: this.getDeliveryEstimate(),
    codAvailable: this.codAvailable,
    deliveryZone: this.deliveryZone,
  };
};

// Statics
pincodeSchema.statics.checkServiceability = async function (pincode) {
  const pincodeData = await this.findOne({
    pincode,
    isServiceable: true,
    isActive: true,
  });

  if (!pincodeData) {
    return {
      serviceable: false,
      message: 'Sorry, we do not deliver to this pincode yet',
    };
  }

  return {
    serviceable: true,
    data: pincodeData,
    estimatedDelivery: pincodeData.getDeliveryEstimate(),
  };
};

const Pincode = mongoose.model('Pincode', pincodeSchema);

export default Pincode;
