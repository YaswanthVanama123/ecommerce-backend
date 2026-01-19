import mongoose from 'mongoose';

const inventoryAdjustmentSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  size: {
    type: String,
    required: true
  },
  color: {
    type: String,
    required: true
  },
  adjustmentType: {
    type: String,
    enum: ['manual', 'reorder', 'sale', 'return', 'damage', 'loss', 'correction'],
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  adjustmentQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  adjustedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adjustedByName: {
    type: String,
    required: true
  },
  reference: {
    type: String,
    trim: true
  },
  cost: {
    type: Number,
    min: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
inventoryAdjustmentSchema.index({ product: 1, createdAt: -1 });
inventoryAdjustmentSchema.index({ adjustmentType: 1, createdAt: -1 });
inventoryAdjustmentSchema.index({ adjustedBy: 1, createdAt: -1 });
inventoryAdjustmentSchema.index({ createdAt: -1 });

const InventoryAdjustment = mongoose.model('InventoryAdjustment', inventoryAdjustmentSchema);

export default InventoryAdjustment;
