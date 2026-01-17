import express from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  bulkUpdateCartItems,
  validateCart
} from '../controllers/cartController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import cartValidator from '../validators/cartValidator.js';

const router = express.Router();

// Main cart routes
router.get('/', protect, getCart);
router.post('/', protect, validate(cartValidator.addToCart, 'body'), addToCart);
router.delete('/', protect, clearCart);

// Cart item routes
router.put('/:itemId', protect, validate(cartValidator.itemId, 'params'), validate(cartValidator.updateItem, 'body'), updateCartItem);
router.delete('/:itemId', protect, validate(cartValidator.itemId, 'params'), removeFromCart);

// Bulk operations
router.put('/items/bulk', protect, bulkUpdateCartItems);

// Validation endpoint
router.post('/validate', protect, validateCart);

export default router;
