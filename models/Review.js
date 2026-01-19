import mongoose from 'mongoose';

const reviewResponseSchema = new mongoose.Schema({
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  response: {
    type: String,
    required: true,
    maxlength: 1000
  },
  respondedAt: {
    type: Date,
    default: Date.now
  }
});

const reviewReportSchema = new mongoose.Schema({
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: ['spam', 'offensive', 'misleading', 'other'],
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  },
  reportedAt: {
    type: Date,
    default: Date.now
  }
});

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
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
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
    trim: true,
    maxlength: [2000, 'Comment cannot exceed 2000 characters']
  },
  images: [{
    type: String
  }],
  // Additional ratings for detailed feedback
  qualityRating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Quality rating must be a whole number'
    }
  },
  valueRating: {
    type: Number,
    min: 1,
    max: 5,
    validate: {
      validator: Number.isInteger,
      message: 'Value rating must be a whole number'
    }
  },
  // For apparel products
  sizeRating: {
    type: String,
    enum: ['too_small', 'perfect_fit', 'too_large']
  },
  verified: {
    type: Boolean,
    default: false,
    index: true
  },
  // Review moderation
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  moderatedAt: {
    type: Date
  },
  // Seller/Admin response
  response: reviewResponseSchema,
  // Helpful votes
  helpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  notHelpful: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  helpfulCount: {
    type: Number,
    default: 0
  },
  notHelpfulCount: {
    type: Number,
    default: 0
  },
  // Reports
  reports: [reviewReportSchema],
  // Review edit tracking
  editedAt: {
    type: Date
  },
  canEdit: {
    type: Boolean,
    default: true
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

// Compound index for product reviews with status and creation date
reviewSchema.index({ product: 1, status: 1, isActive: 1, createdAt: -1 }, { name: 'product_status_active_created_idx' });

// Index for verified reviews (for filtering)
reviewSchema.index({ product: 1, verified: 1, status: 1, isActive: 1 }, { name: 'product_verified_status_active_idx' });

// Index for user reviews
reviewSchema.index({ user: 1, createdAt: -1 }, { name: 'user_created_idx' });

// Index for order reviews (for checking review eligibility)
reviewSchema.index({ order: 1, user: 1 }, { name: 'order_user_idx' });

// Index for rating queries (for filtering by rating)
reviewSchema.index({ product: 1, rating: -1, status: 1, isActive: 1 }, { name: 'product_rating_status_active_idx' });

// Index for helpful reviews (for sorting)
reviewSchema.index({ product: 1, helpfulCount: -1, status: 1, isActive: 1 }, { name: 'product_helpful_status_active_idx' });

// Index for moderation queue
reviewSchema.index({ status: 1, createdAt: -1 }, { name: 'status_created_idx' });

// Index for reported reviews
reviewSchema.index({ 'reports.status': 1, createdAt: -1 }, { name: 'reports_status_created_idx' });

// Update helpful and notHelpful counts when arrays change
reviewSchema.pre('save', function() {
  if (this.isModified('helpful')) {
    this.helpfulCount = this.helpful.length;
  }
  if (this.isModified('notHelpful')) {
    this.notHelpfulCount = this.notHelpful.length;
  }

  // Lock editing after 48 hours
  if (this.createdAt) {
    const hoursSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 48) {
      this.canEdit = false;
    }
  }
});

// Static method to calculate product ratings
reviewSchema.statics.calculateProductRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        status: 'approved',
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

// Static method to check if user can review product from specific order
reviewSchema.statics.canReviewFromOrder = async function(userId, orderId, productId) {
  const Review = this;
  const Order = mongoose.model('Order');

  // Check if order exists and is delivered
  const order = await Order.findOne({
    _id: orderId,
    user: userId,
    orderStatus: 'delivered',
    'items.product': productId
  });

  if (!order) {
    return { canReview: false, reason: 'Order not found or not delivered' };
  }

  // Check if delivered within review window (7-15 days)
  const deliveredDate = order.deliveredAt;
  const now = new Date();
  const daysSinceDelivery = (now - deliveredDate) / (1000 * 60 * 60 * 24);

  if (daysSinceDelivery < 7) {
    return {
      canReview: false,
      reason: 'Please wait at least 7 days after delivery to leave a review',
      daysRemaining: Math.ceil(7 - daysSinceDelivery)
    };
  }

  if (daysSinceDelivery > 15) {
    return {
      canReview: false,
      reason: 'Review window has expired (15 days after delivery)'
    };
  }

  // Check if review already exists for this order and product
  const existingReview = await Review.findOne({
    order: orderId,
    product: productId,
    user: userId
  });

  if (existingReview) {
    return {
      canReview: false,
      reason: 'You have already reviewed this product from this order'
    };
  }

  return { canReview: true };
};

// Instance method to check if user found this review helpful
reviewSchema.methods.isHelpfulByUser = function(userId) {
  return this.helpful.some(id => id.toString() === userId.toString());
};

// Instance method to check if user found this review not helpful
reviewSchema.methods.isNotHelpfulByUser = function(userId) {
  return this.notHelpful.some(id => id.toString() === userId.toString());
};

// Instance method to check if review can be edited
reviewSchema.methods.canBeEdited = function() {
  if (!this.canEdit) return false;

  const hoursSinceCreation = (Date.now() - this.createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation <= 48;
};

// Virtual for helpful count (if not using pre-save hook)
reviewSchema.virtual('helpfulUsersCount').get(function() {
  return this.helpful.length;
});

// Virtual for not helpful count
reviewSchema.virtual('notHelpfulUsersCount').get(function() {
  return this.notHelpful.length;
});

// Virtual for pending reports count
reviewSchema.virtual('pendingReportsCount').get(function() {
  return this.reports.filter(r => r.status === 'pending').length;
});

// Ensure virtuals are included in JSON
reviewSchema.set('toJSON', { virtuals: true });
reviewSchema.set('toObject', { virtuals: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review;
