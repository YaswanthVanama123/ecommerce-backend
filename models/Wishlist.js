import mongoose from 'mongoose';

const wishlistItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [wishlistItemSchema]
}, {
  timestamps: true
});

// Method to check if product exists in wishlist
wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(item => item.product.toString() === productId.toString());
};

// Method to get total items count
wishlistSchema.methods.getTotalItems = function() {
  return this.items.length;
};

// Index for quick user wishlist lookups
wishlistSchema.index({ user: 1 }, { name: 'user_idx', unique: true });

// Index for product lookups within wishlist
wishlistSchema.index({ 'items.product': 1 }, { name: 'items_product_idx' });

// Index for item timestamps (for cleanup of old wishlists)
wishlistSchema.index({ updatedAt: 1 }, { name: 'updated_idx' });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

export default Wishlist;
