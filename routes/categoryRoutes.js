import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryTree
} from '../controllers/categoryController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import categoryValidator from '../validators/categoryValidator.js';

const router = express.Router();

router.get('/tree', getCategoryTree);
router.get('/', getCategories);
router.get('/:id', validate(categoryValidator.id, 'params'), getCategoryById);
router.post('/', protect, isAdmin, validate(categoryValidator.create, 'body'), createCategory);
router.put('/:id', protect, isAdmin, validate(categoryValidator.id, 'params'), validate(categoryValidator.update, 'body'), updateCategory);
router.delete('/:id', protect, isAdmin, validate(categoryValidator.id, 'params'), deleteCategory);

export default router;
