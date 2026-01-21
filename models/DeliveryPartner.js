import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const deliveryStatsSchema = new mongoose.Schema({
  today: {
    type: Number,
    default: 0
  },
  thisWeek: {
    type: Number,
    default: 0
  },
  thisMonth: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  }
}, { _id: false });

const deliveryPartnerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[0-9]{10}$/, 'Please provide a valid 10-digit phone number']
  },
  profilePhoto: {
    type: String,
    default: null
  },
  vehicleType: {
    type: String,
    enum: ['Bike', 'Scooter', 'Car', 'Van', 'Bicycle'],
    required: [true, 'Vehicle type is required']
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    trim: true,
    uppercase: true
  },
  isActive: {
    type: Boolean,
    default: false
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalRatings: {
    type: Number,
    default: 0
  },
  deliveryStats: deliveryStatsSchema,
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  role: {
    type: String,
    default: 'delivery'
  },
  refreshToken: {
    type: String
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
deliveryPartnerSchema.index({ currentLocation: '2dsphere' });

// Index for status queries
deliveryPartnerSchema.index({ isActive: 1, isOnline: 1 }, { name: 'status_idx' });

// Index for email lookups
deliveryPartnerSchema.index({ email: 1 }, { name: 'email_idx' });

// Hash password before saving
deliveryPartnerSchema.pre('save', async function() {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
deliveryPartnerSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get delivery partner without password
deliveryPartnerSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

// Method to calculate average rating
deliveryPartnerSchema.methods.updateRating = function(newRating) {
  const totalScore = this.rating * this.totalRatings + newRating;
  this.totalRatings += 1;
  this.rating = totalScore / this.totalRatings;
};

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);

export default DeliveryPartner;
