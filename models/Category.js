import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Generate slug from name before saving
categorySchema.pre('save', function() {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

// Indexes for category queries
// Unique index for slug lookups
categorySchema.index({ slug: 1 }, { name: 'slug_idx', unique: true });

// Compound index for active categories with ordering
categorySchema.index({ isActive: 1, order: 1 }, { name: 'active_order_idx' });

// Index for category hierarchy queries
categorySchema.index({ parentCategory: 1, isActive: 1 }, { name: 'parent_active_idx' });

// Index for name uniqueness (already defined in schema)
categorySchema.index({ name: 1 }, { name: 'name_idx', unique: true });

const Category = mongoose.model('Category', categorySchema);

export default Category;
