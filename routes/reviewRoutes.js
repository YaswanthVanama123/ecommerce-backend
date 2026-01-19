import express from 'express';
import {
  checkReviewEligibility,
  getReviewableOrders,
  createReview,
  getProductReviews,
  getReviewById,
  updateReview,
  deleteReview,
  voteReview,
  reportReview,
  getUserReviews,
  getProductRatingSummary,
  // Admin routes
  getReviewsForModeration,
  approveReview,
  rejectReview,
  respondToReview,
  handleReviewReport,
  getReviewAnalytics
} from '../controllers/reviewController.js';
import { protect, optionalAuth } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';
import { validate } from '../middleware/validate.js';
import reviewValidator from '../validators/reviewValidator.js';
import { createUploadMiddleware } from '../middleware/upload.js';

const router = express.Router();

// Public routes (with optional auth for personalization)
router.get(
  '/product/:productId',
  optionalAuth,
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
  optionalAuth,
  validate(reviewValidator.reviewId, 'params'),
  getReviewById
);

// Protected routes (require authentication)

// Check review eligibility
router.get(
  '/eligibility/:orderId/:productId',
  protect,
  validate(reviewValidator.reviewEligibility, 'params'),
  checkReviewEligibility
);

// Get reviewable orders
router.get(
  '/reviewable-orders',
  protect,
  getReviewableOrders
);

// Create review with image upload (max 5 images)
const reviewImageUpload = createUploadMiddleware('images', 5);
router.post(
  '/',
  protect,
  ...reviewImageUpload,
  validate(reviewValidator.create, 'body'),
  createReview
);

// Get user's own reviews
router.get(
  '/user/me',
  protect,
  validate(reviewValidator.getReviews, 'query'),
  getUserReviews
);

// Update review with additional images (max 5 images)
router.put(
  '/:id',
  protect,
  ...reviewImageUpload,
  validate(reviewValidator.reviewId, 'params'),
  validate(reviewValidator.update, 'body'),
  updateReview
);

// Delete review
router.delete(
  '/:id',
  protect,
  validate(reviewValidator.reviewId, 'params'),
  deleteReview
);

// Vote on review (helpful/not helpful)
router.post(
  '/:id/vote',
  protect,
  validate(reviewValidator.reviewId, 'params'),
  validate(reviewValidator.vote, 'body'),
  voteReview
);

// Report review
router.post(
  '/:id/report',
  protect,
  validate(reviewValidator.reviewId, 'params'),
  validate(reviewValidator.report, 'body'),
  reportReview
);

// ============ ADMIN ROUTES ============

// Get reviews for moderation (with alias for frontend compatibility)
router.get(
  '/admin/moderation',
  protect,
  isAdmin,
  validate(reviewValidator.getReviews, 'query'),
  getReviewsForModeration
);

router.get(
  '/admin/pending',
  protect,
  isAdmin,
  validate(reviewValidator.getReviews, 'query'),
  getReviewsForModeration
);

// Get review analytics
router.get(
  '/admin/analytics',
  protect,
  isAdmin,
  getReviewAnalytics
);

// Approve review
router.put(
  '/:id/approve',
  protect,
  isAdmin,
  validate(reviewValidator.reviewId, 'params'),
  approveReview
);

router.put(
  '/admin/:id/approve',
  protect,
  isAdmin,
  validate(reviewValidator.reviewId, 'params'),
  approveReview
);

// Reject review
router.put(
  '/:id/reject',
  protect,
  isAdmin,
  validate(reviewValidator.reviewId, 'params'),
  validate(reviewValidator.reject, 'body'),
  rejectReview
);

router.put(
  '/admin/:id/reject',
  protect,
  isAdmin,
  validate(reviewValidator.reviewId, 'params'),
  validate(reviewValidator.reject, 'body'),
  rejectReview
);

// Respond to review
router.post(
  '/admin/:id/respond',
  protect,
  isAdmin,
  validate(reviewValidator.reviewId, 'params'),
  validate(reviewValidator.respond, 'body'),
  respondToReview
);

// Handle review report
router.put(
  '/admin/:id/report/:reportId',
  protect,
  isAdmin,
  validate(reviewValidator.reportId, 'params'),
  validate(reviewValidator.handleReport, 'body'),
  handleReviewReport
);

export default router;
