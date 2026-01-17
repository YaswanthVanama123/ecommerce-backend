import express from 'express';
import {
  createReview,
  getProductReviews,
  getReviewById,
  updateReview,
  deleteReview,
  markReviewHelpful,
  getUserReviews,
  getProductRatingSummary
} from '../controllers/reviewController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import reviewValidator from '../validators/reviewValidator.js';

const router = express.Router();

// Public routes
router.get(
  '/product/:productId',
  validate(reviewValidator.productId, 'params'),
  validate(reviewValidator.getReviews, 'query'),
  getProductReviews
);

router.get(
  '/product/:productId/summary',
  validate(reviewValidator.productId, 'params'),
  getProductRatingSummary
);

router.get(
  '/:id',
  validate(reviewValidator.reviewId, 'params'),
  getReviewById
);

// Protected routes (require authentication)
router.post(
  '/',
  protect,
  validate(reviewValidator.create, 'body'),
  createReview
);

router.get(
  '/user/me',
  protect,
  validate(reviewValidator.getReviews, 'query'),
  getUserReviews
);

router.put(
  '/:id',
  protect,
  validate(reviewValidator.reviewId, 'params'),
  validate(reviewValidator.update, 'body'),
  updateReview
);

router.delete(
  '/:id',
  protect,
  validate(reviewValidator.reviewId, 'params'),
  deleteReview
);

router.post(
  '/:id/helpful',
  protect,
  validate(reviewValidator.reviewId, 'params'),
  markReviewHelpful
);

export default router;
