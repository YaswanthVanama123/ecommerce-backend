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

router.get('/', protect, getCart);
router.post('/items', protect, validate(cartValidator.addToCart, 'body'), addToCart);
router.put('/items/:itemId', protect, validate(cartValidator.itemId, 'params'), validate(cartValidator.updateItem, 'body'), updateCartItem);
router.delete('/items/:itemId', protect, validate(cartValidator.itemId, 'params'), removeFromCart);
router.delete('/', protect, clearCart);

// Bulk operations
router.put('/items/bulk', protect, bulkUpdateCartItems);

// Validation endpoint
router.post('/validate', protect, validateCart);

export default router;
