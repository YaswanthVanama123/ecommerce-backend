import express from 'express';
import {
  getProducts,
  getFeaturedProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadImages,
  addReview
} from '../controllers/productController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import upload, { processMultipleFiles, handleMulterError } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import productValidator from '../validators/productValidator.js';

const router = express.Router();

router.get('/featured', validate(productValidator.getFeatured, 'query'), getFeaturedProducts);
router.get('/', validate(productValidator.getProducts, 'query'), getProducts);
router.get('/:id', validate(productValidator.id, 'params'), getProductById);
router.post('/', protect, isAdmin, validate(productValidator.create, 'body'), createProduct);
router.put('/:id', protect, isAdmin, validate(productValidator.id, 'params'), validate(productValidator.update, 'body'), updateProduct);
router.delete('/:id', protect, isAdmin, validate(productValidator.id, 'params'), deleteProduct);
router.post('/upload', protect, isAdmin, upload.array('images', 10), processMultipleFiles, handleMulterError, uploadImages);
router.post('/:id/reviews', protect, validate(productValidator.id, 'params'), validate(productValidator.addReview, 'body'), addReview);

export default router;
