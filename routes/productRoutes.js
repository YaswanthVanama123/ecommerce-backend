import express from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getTrendingProducts,
  getProductById,
  getProductCategories,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages,
  addReview,
  getProductReviews,
  getReviewStats,
  getSimilarProducts,
  getFrequentlyBoughtTogether,
  getPersonalizedRecommendations,
  getTrendingProductsNow,
  getNewArrivals,
  getBestSellers
} from '../controllers/productController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import upload, { processMultipleFiles, handleMulterError } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import productValidator from '../validators/productValidator.js';

const router = express.Router();

// Specific routes MUST come before dynamic routes
router.get('/featured', getFeaturedProducts);
router.get('/trending', getTrendingProducts);
router.get('/categories', getProductCategories);
// Recommendation endpoints (must be before /:id route)
router.get('/recommended', optionalAuth, getPersonalizedRecommendations);
router.get('/trending-now', getTrendingProductsNow);
router.get('/new-arrivals', getNewArrivals);
router.get('/best-sellers', getBestSellers);
// Main product routes
router.get('/', validate(productValidator.getProducts, 'query'), getProducts);
router.get('/:id', optionalAuth, validate(productValidator.id, 'params'), getProductById);
// Product-specific recommendation routes
router.get('/:id/recommendations', validate(productValidator.id, 'params'), getSimilarProducts);
router.get('/:id/frequently-bought', validate(productValidator.id, 'params'), getFrequentlyBoughtTogether);
// Review routes - stats must come before reviews (more specific route first)
router.get('/:id/reviews/stats', validate(productValidator.id, 'params'), getReviewStats);
router.get('/:id/reviews', validate(productValidator.id, 'params'), getProductReviews);
router.post('/', protect, isAdmin, validate(productValidator.create, 'body'), createProduct);
router.put('/:id', protect, isAdmin, validate(productValidator.id, 'params'), validate(productValidator.update, 'body'), updateProduct);
router.delete('/:id', protect, isAdmin, validate(productValidator.id, 'params'), deleteProduct);
router.post('/upload', protect, isAdmin, upload.array('images', 10), processMultipleFiles, handleMulterError, uploadImages);
router.post('/:id/reviews', protect, validate(productValidator.id, 'params'), validate(productValidator.addReview, 'body'), addReview);

export default router;
