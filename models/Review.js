import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1'],
    max: [5, 'Rating cannot exceed 5'],
    validate: {
      validator: Number.isInteger,
      message: 'Rating must be a whole number'
    }
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    minlength: [10, 'Comment must be at least 10 characters'],
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  helpfulCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to ensure one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true, name: 'product_user_unique_idx' });

// Compound index for product reviews with active status and creation date
reviewSchema.index({ product: 1, isActive: 1, createdAt: -1 }, { name: 'product_active_created_idx' });

// Index for verified reviews (for filtering)
reviewSchema.index({ product: 1, verified: 1, isActive: 1 }, { name: 'product_verified_active_idx' });

// Index for user reviews
reviewSchema.index({ user: 1, createdAt: -1 }, { name: 'user_created_idx' });

// Index for rating queries (for filtering by rating)
reviewSchema.index({ product: 1, rating: -1, isActive: 1 }, { name: 'product_rating_active_idx' });

// Index for helpful reviews (for sorting)
reviewSchema.index({ product: 1, helpfulCount: -1, isActive: 1 }, { name: 'product_helpful_active_idx' });

// Update helpfulCount when helpful array changes
reviewSchema.pre('save', function() {
  if (this.isModified('helpful')) {
    this.helpfulCount = this.helpful.length;
  }
});

// Static method to calculate product ratings
reviewSchema.statics.calculateProductRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        isActive: true
      }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        ratingDistribution: {
          $push: '$rating'
        }
      }
    }
  ]);

  if (stats.length > 0) {
    // Calculate rating distribution
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    stats[0].ratingDistribution.forEach(rating => {
      distribution[rating] = (distribution[rating] || 0) + 1;
    });

    return {
      averageRating: Math.round(stats[0].averageRating * 10) / 10, // Round to 1 decimal
      totalReviews: stats[0].totalReviews,
      ratingDistribution: distribution
    };
  }

  return {
    averageRating: 0,
    totalReviews: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  };
};

// Instance method to check if user found this review helpful
reviewSchema.methods.isHelpfulByUser = function(userId) {
  return this.helpful.some(id => id.toString() === userId.toString());
};

// Virtual for helpful count (if not using pre-save hook)
reviewSchema.virtual('helpfulUsersCount').get(function() {
  return this.helpful.length;
});

// Ensure virtuals are included in JSON
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
