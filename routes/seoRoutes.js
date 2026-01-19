/**
 * SEO Routes
 * Handles sitemap, robots.txt, and RSS feed endpoints
 */

import express from 'express';
import {
  generateSitemap,
  generateSitemapIndex,
  generateProductSitemap,
  generateCategorySitemap,
  generateRSSFeed,
  getSitemapStats
} from '../utils/sitemapGenerator.js';

const router = express.Router();

// Get base URL from environment or use default
const getBaseUrl = (req) => {
  return process.env.BASE_URL ||
         process.env.FRONTEND_URL ||
         `${req.protocol}://${req.get('host')}`;
};

/**
 * @route   GET /api/seo/sitemap.xml
 * @desc    Get main sitemap
 * @access  Public
 */
router.get('/sitemap.xml', async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const sitemap = await generateSitemap(baseUrl);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sitemap',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/sitemap-index.xml
 * @desc    Get sitemap index (for large sites)
 * @access  Public
 */
router.get('/sitemap-index.xml', async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const sitemapIndex = await generateSitemapIndex(baseUrl);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(sitemapIndex);
  } catch (error) {
    console.error('Error generating sitemap index:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sitemap index',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/sitemap-products.xml
 * @desc    Get products sitemap
 * @access  Public
 */
router.get('/sitemap-products.xml', async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const sitemap = await generateProductSitemap(baseUrl);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating product sitemap:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating product sitemap',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/sitemap-categories.xml
 * @desc    Get categories sitemap
 * @access  Public
 */
router.get('/sitemap-categories.xml', async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const sitemap = await generateCategorySitemap(baseUrl);

    res.header('Content-Type', 'application/xml');
    res.header('Cache-Control', 'public, max-age=3600');
    res.send(sitemap);
  } catch (error) {
    console.error('Error generating category sitemap:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating category sitemap',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/rss.xml
 * @desc    Get RSS feed
 * @access  Public
 */
router.get('/rss.xml', async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);
    const rssFeed = await generateRSSFeed(baseUrl);

    res.header('Content-Type', 'application/rss+xml');
    res.header('Cache-Control', 'public, max-age=1800'); // Cache for 30 minutes
    res.send(rssFeed);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating RSS feed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/robots.txt
 * @desc    Get robots.txt content dynamically
 * @access  Public
 */
router.get('/robots.txt', (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);

    const robotsTxt = `# robots.txt for StyleHub
User-agent: *
Allow: /

# Disallow specific paths
Disallow: /api/
Disallow: /admin/
Disallow: /checkout/
Disallow: /cart/
Disallow: /profile/
Disallow: /wishlist/
Disallow: /my-orders/
Disallow: /returns/
Disallow: /track-order/
Disallow: /my-shipments/
Disallow: /notifications/

# Allow crawling of product and category pages
Allow: /products/
Allow: /product/
Allow: /categories/
Allow: /category/

# Crawl-delay
Crawl-delay: 1

# Sitemap location
Sitemap: ${baseUrl}/api/seo/sitemap.xml
`;

    res.header('Content-Type', 'text/plain');
    res.header('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(robotsTxt);
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating robots.txt',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/stats
 * @desc    Get sitemap statistics
 * @access  Public
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await getSitemapStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting sitemap stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting sitemap stats',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/seo/regenerate
 * @desc    Manually trigger sitemap regeneration
 * @access  Public (Should be protected in production)
 */
router.post('/regenerate', async (req, res) => {
  try {
    const baseUrl = getBaseUrl(req);

    // Generate all sitemaps
    await Promise.all([
      generateSitemap(baseUrl),
      generateProductSitemap(baseUrl),
      generateCategorySitemap(baseUrl),
      generateRSSFeed(baseUrl)
    ]);

    const stats = await getSitemapStats();

    res.json({
      success: true,
      message: 'Sitemaps regenerated successfully',
      data: stats
    });
  } catch (error) {
    console.error('Error regenerating sitemaps:', error);
    res.status(500).json({
      success: false,
      message: 'Error regenerating sitemaps',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/seo/meta/:type/:id
 * @desc    Get SEO meta data for specific entities
 * @access  Public
 */
router.get('/meta/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    let metaData = {};

    switch (type) {
      case 'product':
        const Product = (await import('../models/Product.js')).default;
        const product = await Product.findById(id)
          .select('name description images price category')
          .populate('category', 'name')
          .lean();

        if (!product) {
          return res.status(404).json({
            success: false,
            message: 'Product not found'
          });
        }

        metaData = {
          title: product.name,
          description: product.description,
          keywords: `${product.name}, ${product.category?.name || ''}, fashion, online shopping`,
          ogImage: product.images?.[0] || '',
          canonicalUrl: `/product/${id}`,
          ogType: 'product',
          price: product.price
        };
        break;

      case 'category':
        const Category = (await import('../models/Category.js')).default;
        const category = await Category.findById(id)
          .select('name description image')
          .lean();

        if (!category) {
          return res.status(404).json({
            success: false,
            message: 'Category not found'
          });
        }

        metaData = {
          title: `${category.name} - Shop Now`,
          description: category.description || `Browse our collection of ${category.name}`,
          keywords: `${category.name}, fashion, online shopping, StyleHub`,
          ogImage: category.image || '',
          canonicalUrl: `/category/${id}`,
          ogType: 'website'
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid type specified'
        });
    }

    res.json({
      success: true,
      data: metaData
    });

  } catch (error) {
    console.error('Error getting meta data:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting meta data',
      error: error.message
    });
  }
});

export default router;
