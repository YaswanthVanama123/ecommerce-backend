import express from 'express';
import {
  getActiveBanners,
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner
} from '../controllers/bannerController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import bannerValidator from '../validators/bannerValidator.js';

const router = express.Router();

// Public route - Get active banners for users
router.get('/active', validate(bannerValidator.getActive, 'query'), getActiveBanners);

// Superadmin-only routes - Banners are marketing-level controls that affect all users
// Only superadmins should be able to create, modify, or delete site-wide banners
router.get('/', protect, isSuperAdmin, validate(bannerValidator.getAll, 'query'), getAllBanners);
router.get('/:id', protect, isSuperAdmin, validate(bannerValidator.id, 'params'), getBannerById);
router.post('/', protect, isSuperAdmin, validate(bannerValidator.create, 'body'), createBanner);
router.put('/:id', protect, isSuperAdmin, validate(bannerValidator.id, 'params'), validate(bannerValidator.update, 'body'), updateBanner);
router.delete('/:id', protect, isSuperAdmin, validate(bannerValidator.id, 'params'), deleteBanner);

export default router;
