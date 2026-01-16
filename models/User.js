import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['Home', 'Work', 'Other'],
    default: 'Home'
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
    required: true,
    alias: 'pincode'
  },
  country: {
    type: String,
    default: 'India'
  },
  isDefault: {
    type: Boolean,
    default: false
  }
});

const userSchema = new mongoose.Schema({
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
    minlength: [6, 'Password must be at least 6 characters']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superadmin'],
    default: 'user'
  },
  addresses: [addressSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  refreshToken: {
    type: String
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Method to get user without password
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  return obj;
};

// Indexes for user queries
// Index for email lookups (already unique, but explicit index helps)
userSchema.index({ email: 1 }, { name: 'email_idx' });

// Index for role-based queries (for admin panels)
userSchema.index({ role: 1, isActive: 1 }, { name: 'role_active_idx' });

// Index for account status queries
userSchema.index({ isActive: 1, createdAt: -1 }, { name: 'active_created_idx' });

const User = mongoose.model('User', userSchema);

export default User;
