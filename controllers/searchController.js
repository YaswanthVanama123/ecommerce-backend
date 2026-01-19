import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Category from '../models/Category.js';

/**
 * Search Controller
 * Handles global search functionality
 */

/**
 * Global search across products, orders, and categories
 * @route GET /api/search/global
 * @access Public
 */
export const globalSearch = async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = query.trim();
    const limitNum = parseInt(limit) || 10;

    // Search regex pattern (case-insensitive)
    const searchRegex = new RegExp(searchTerm, 'i');

    // Parallel search across all entities
    const [products, categories, orders] = await Promise.all([
      // Search products by name, description, brand, category
      Product.find({
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { brand: searchRegex },
          { tags: searchRegex }
        ],
        isActive: true
      })
        .limit(limitNum)
        .select('name price images category discount stock rating')
        .populate('category', 'name slug')
        .lean(),

      // Search categories
      Category.find({
        $or: [
          { name: searchRegex },
          { slug: searchRegex },
          { description: searchRegex }
        ]
      })
        .limit(5)
        .select('name slug description')
        .lean(),

      // Search orders (only if user is authenticated)
      req.user
        ? Order.find({
            user: req.user.userId,
            $or: [
              { orderNumber: searchRegex },
              { status: searchRegex }
            ]
          })
            .limit(5)
            .select('orderNumber status total createdAt')
            .sort({ createdAt: -1 })
            .lean()
        : []
    ]);

    // Save search query for analytics (async, don't wait)
    saveSearchQuery(searchTerm, req.user?.userId);

    res.json({
      success: true,
      data: {
        products,
        categories,
        orders,
        query: searchTerm,
        totalResults: products.length + categories.length + orders.length
      }
    });
  } catch (error) {
    console.error('Global search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform search',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get search suggestions/autocomplete
 * @route GET /api/search/suggestions
 * @access Public
 */
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q: query, limit = 5 } = req.query;

    if (!query || !query.trim()) {
      return res.json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const searchTerm = query.trim();
    const limitNum = parseInt(limit) || 5;
    const searchRegex = new RegExp(`^${searchTerm}`, 'i');

    // Get suggestions from product names and tags
    const products = await Product.find({
      $or: [
        { name: searchRegex },
        { tags: searchRegex },
        { brand: searchRegex }
      ],
      isActive: true
    })
      .limit(limitNum)
      .select('name tags brand')
      .lean();

    // Extract unique suggestions
    const suggestions = new Set();

    products.forEach(product => {
      // Add product name
      if (product.name && product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        suggestions.add(product.name);
      }

      // Add matching tags
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach(tag => {
          if (tag.toLowerCase().includes(searchTerm.toLowerCase())) {
            suggestions.add(tag);
          }
        });
      }

      // Add brand if it matches
      if (product.brand && product.brand.toLowerCase().includes(searchTerm.toLowerCase())) {
        suggestions.add(product.brand);
      }
    });

    res.json({
      success: true,
      data: {
        suggestions: Array.from(suggestions).slice(0, limitNum)
      }
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.json({
      success: true,
      data: { suggestions: [] }
    });
  }
};

/**
 * Get trending searches
 * @route GET /api/search/trending
 * @access Public
 */
export const getTrendingSearches = async (req, res) => {
  try {
    // For now, return popular product categories and tags
    // In production, this would be based on actual search analytics
    const trendingProducts = await Product.find({ isActive: true })
      .sort({ views: -1, rating: -1 })
      .limit(10)
      .select('name tags')
      .lean();

    const trending = new Set();
    trendingProducts.forEach(product => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.slice(0, 2).forEach(tag => trending.add(tag));
      }
    });

    res.json({
      success: true,
      data: {
        trending: Array.from(trending).slice(0, 8)
      }
    });
  } catch (error) {
    console.error('Trending searches error:', error);
    res.json({
      success: true,
      data: { trending: [] }
    });
  }
};

/**
 * Get popular searches
 * @route GET /api/search/popular
 * @access Public
 */
export const getPopularSearches = async (req, res) => {
  try {
    // Return popular categories and common search terms
    const categories = await Category.find()
      .limit(5)
      .select('name')
      .lean();

    const popular = categories.map(cat => cat.name);

    res.json({
      success: true,
      data: {
        popular
      }
    });
  } catch (error) {
    console.error('Popular searches error:', error);
    res.json({
      success: true,
      data: { popular: [] }
    });
  }
};

/**
 * Search user orders
 * @route GET /api/search/orders
 * @access Private
 */
export const searchOrders = async (req, res) => {
  try {
    const { q: query } = req.query;
    const userId = req.user.userId;

    if (!query || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = query.trim();
    const searchRegex = new RegExp(searchTerm, 'i');

    const orders = await Order.find({
      user: userId,
      $or: [
        { orderNumber: searchRegex },
        { status: searchRegex },
        { 'items.name': searchRegex }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .select('orderNumber status total items createdAt')
      .lean();

    res.json({
      success: true,
      data: {
        orders,
        query: searchTerm
      }
    });
  } catch (error) {
    console.error('Order search error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Helper function to save search queries for analytics
 * This runs asynchronously and doesn't block the response
 */
async function saveSearchQuery(query, userId = null) {
  try {
    // In production, you would save this to a SearchLog model
    // For now, just log it
    console.log('Search query:', {
      query,
      userId,
      timestamp: new Date()
    });

    // Example: await SearchLog.create({ query, userId, timestamp: new Date() });
  } catch (error) {
    // Silently fail - don't affect user experience
    console.error('Failed to save search query:', error);
  }
}

export default {
  globalSearch,
  getSearchSuggestions,
  getTrendingSearches,
  getPopularSearches,
  searchOrders
};
