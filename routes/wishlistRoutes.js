import express from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
  checkProductInWishlist,
  moveToCart
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import wishlistValidator from '../validators/wishlistValidator.js';

const router = express.Router();

// Main wishlist routes
router.get('/', protect, getWishlist);
router.post('/', protect, validate(wishlistValidator.addToWishlist, 'body'), addToWishlist);
router.delete('/', protect, clearWishlist);

// Wishlist item routes
router.delete('/:productId', protect, validate(wishlistValidator.productId, 'params'), removeFromWishlist);

// Check if product is in wishlist
router.get('/check/:productId', protect, validate(wishlistValidator.productId, 'params'), checkProductInWishlist);

// Move to cart
router.post('/:productId/move-to-cart', protect, validate(wishlistValidator.productId, 'params'), validate(wishlistValidator.moveToCart, 'body'), moveToCart);

export default router;
