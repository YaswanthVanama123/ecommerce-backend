import mongoose from 'mongoose';

// NOTE: The old embedded review schema has been deprecated.
// Reviews are now stored in a separate Review collection for better scalability.
// See models/Review.js for the new review schema.

const colorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  hexCode: {
    type: String
  },
  images: [String]
});

const stockSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  }
});

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required']
  },
  subCategory: {
    type: String
  },
  gender: {
    type: String,
    enum: ['Women', 'Men', 'Kids', 'Unisex'],
    default: 'Unisex'
  },
  material: {
    type: String,
    trim: true
  },
  brand: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: 0
  },
  discountPrice: {
    type: Number,
    min: 0
  },
  discountPercentage: {
    type: Number,
    min: 0,
    max: 100
  },
  images: [String],
  sizes: [String],
  colors: [colorSchema],
  stock: [stockSchema],
  tags: [String],
  isFeatured: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  // NOTE: reviews field has been deprecated. Use the separate Review model instead.
  // This field is kept for backward compatibility but should not be used.
  reviews: {
    type: [mongoose.Schema.Types.Mixed],
    default: [],
    select: false // Don't include in queries by default
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Calculate discount percentage when discountPrice is set
productSchema.pre('save', function() {
  if (this.discountPrice && this.discountPrice < this.price) {
    this.discountPercentage = Math.round(((this.price - this.discountPrice) / this.price) * 100);
  } else {
    this.discountPercentage = 0;
  }
});

// Update rating average when reviews change
productSchema.methods.updateRatings = function() {
  if (this.reviews.length === 0) {
    this.ratings.average = 0;
    this.ratings.count = 0;
  } else {
    const total = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = parseFloat((total / this.reviews.length).toFixed(1));
    this.ratings.count = this.reviews.length;
  }
};

// Indexes for search and filtering
// Full-text search index for product discovery
productSchema.index({ name: 'text', brand: 'text', tags: 'text' }, { name: 'text_search_idx' });

// Compound index for category filtering with price sorting and active status
productSchema.index({ category: 1, price: 1, isActive: 1 }, { name: 'category_price_active_idx' });

// Compound index for featured products with ratings
productSchema.index({ isFeatured: 1, isActive: 1, 'ratings.average': -1 }, { name: 'featured_active_rating_idx' });

// Index for product status and availability
productSchema.index({ isActive: 1, createdAt: -1 }, { name: 'active_created_idx' });

// Index for brand and price filtering with active status
productSchema.index({ brand: 1, price: 1, isActive: 1 }, { name: 'brand_price_active_idx' });

// Index for review queries (user-specific reviews)
productSchema.index({ 'reviews.user': 1 }, { name: 'reviews_user_idx' });

// Index for stock availability checks
productSchema.index({ 'stock.size': 1, 'stock.color': 1, 'stock.quantity': 1 }, { name: 'stock_idx' });

const Product = mongoose.model('Product', productSchema);

export default Product;
