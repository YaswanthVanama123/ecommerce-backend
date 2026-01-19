import express from 'express';
import searchController from '../controllers/searchController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * Search Routes
 * Global search functionality for products, orders, and categories
 */

// Public search routes
router.get('/global', searchController.globalSearch);
router.get('/suggestions', searchController.getSearchSuggestions);
router.get('/trending', searchController.getTrendingSearches);
router.get('/popular', searchController.getPopularSearches);

// Protected search routes (require authentication)
router.get('/orders', authenticateToken, searchController.searchOrders);

export default router;
