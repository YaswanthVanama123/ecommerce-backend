import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [200, 'Subtitle cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  image: {
    type: String,
    trim: true
  },
  backgroundImage: {
    type: String,
    trim: true
  },
  buttonText: {
    type: String,
    trim: true,
    maxlength: [50, 'Button text cannot exceed 50 characters']
  },
  buttonLink: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    required: [true, 'Banner type is required'],
    enum: {
      values: ['flash-sale', 'seasonal', 'new-arrival', 'discount', 'category-highlight'],
      message: 'Type must be one of: flash-sale, seasonal, new-arrival, discount, category-highlight'
    }
  },
  discountPercentage: {
    type: Number,
    min: [0, 'Discount percentage cannot be negative'],
    max: [100, 'Discount percentage cannot exceed 100']
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },
  validTo: {
    type: Date,
    required: [true, 'Valid to date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  position: {
    type: String,
    required: [true, 'Banner position is required'],
    enum: {
      values: ['hero', 'sidebar', 'carousel', 'grid'],
      message: 'Position must be one of: hero, sidebar, carousel, grid'
    }
  },
  priority: {
    type: Number,
    default: 0,
    min: [0, 'Priority cannot be negative']
  },
  targetCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },
  targetProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validate that validTo is after validFrom
bannerSchema.pre('save', function(next) {
  if (this.validTo <= this.validFrom) {
    next(new Error('Valid to date must be after valid from date'));
  }
  next();
});

// Virtual property to check if banner is currently valid
bannerSchema.virtual('isCurrentlyValid').get(function() {
  const now = new Date();
  return this.isActive && now >= this.validFrom && now <= this.validTo;
});

// Method to check if banner is expired
bannerSchema.methods.isExpired = function() {
  return new Date() > this.validTo;
};

// Method to check if banner is upcoming
bannerSchema.methods.isUpcoming = function() {
  return new Date() < this.validFrom;
};

// Indexes for efficient querying
// Compound index for active banners by position and priority
bannerSchema.index({ isActive: 1, position: 1, priority: -1 }, { name: 'active_position_priority_idx' });

// Compound index for date range queries with active status
bannerSchema.index({ validFrom: 1, validTo: 1, isActive: 1 }, { name: 'date_range_active_idx' });

// Index for type-based filtering
bannerSchema.index({ type: 1, isActive: 1 }, { name: 'type_active_idx' });

// Index for category targeting
bannerSchema.index({ targetCategory: 1, isActive: 1 }, { name: 'category_active_idx' });

// Index for created by (admin queries)
bannerSchema.index({ createdBy: 1 }, { name: 'created_by_idx' });

// Ensure virtuals are included in JSON
bannerSchema.set('toJSON', { virtuals: true });
bannerSchema.set('toObject', { virtuals: true });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
