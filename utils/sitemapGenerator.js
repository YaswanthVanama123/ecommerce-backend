/**
 * Sitemap Generator Utility
 * Generates XML sitemaps for SEO optimization
 * Follows sitemap.org protocol standards
 */

import Product from '../models/Product.js';
import Category from '../models/Category.js';

/**
 * Generate XML sitemap for all pages
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<string>} - XML sitemap string
 */
export const generateSitemap = async (baseUrl = 'https://stylehub.com') => {
  try {
    const urls = [];

    // Static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/products', priority: '0.9', changefreq: 'daily' },
      { url: '/categories', priority: '0.8', changefreq: 'weekly' },
      { url: '/about', priority: '0.5', changefreq: 'monthly' },
      { url: '/contact', priority: '0.5', changefreq: 'monthly' },
      { url: '/login', priority: '0.3', changefreq: 'monthly' },
      { url: '/register', priority: '0.3', changefreq: 'monthly' }
    ];

    staticPages.forEach(page => {
      urls.push({
        loc: `${baseUrl}${page.url}`,
        lastmod: new Date().toISOString(),
        changefreq: page.changefreq,
        priority: page.priority
      });
    });

    // Get all active products
    const products = await Product.find({
      isActive: true,
      isDeleted: false
    })
      .select('_id name slug updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    // Add product pages
    products.forEach(product => {
      urls.push({
        loc: `${baseUrl}/product/${product._id}`,
        lastmod: product.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: '0.8',
        image: product.images && product.images.length > 0
          ? product.images[0]
          : null
      });
    });

    // Get all active categories
    const categories = await Category.find({
      isActive: true,
      isDeleted: false
    })
      .select('_id name slug updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    // Add category pages
    categories.forEach(category => {
      urls.push({
        loc: `${baseUrl}/category/${category._id}`,
        lastmod: category.updatedAt.toISOString(),
        changefreq: 'weekly',
        priority: '0.7'
      });
    });

    // Generate XML
    const xml = generateSitemapXML(urls);
    return xml;

  } catch (error) {
    console.error('Error generating sitemap:', error);
    throw error;
  }
};

/**
 * Generate XML string from URL array
 * @param {Array} urls - Array of URL objects
 * @returns {string} - XML string
 */
export const generateSitemapXML = (urls) => {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
  xml += ' xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

  urls.forEach(url => {
    xml += '  <url>\n';
    xml += `    <loc>${escapeXML(url.loc)}</loc>\n`;
    xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    xml += `    <priority>${url.priority}</priority>\n`;

    // Add image if available
    if (url.image) {
      xml += '    <image:image>\n';
      xml += `      <image:loc>${escapeXML(url.image)}</image:loc>\n`;
      xml += '    </image:image>\n';
    }

    xml += '  </url>\n';
  });

  xml += '</urlset>';
  return xml;
};

/**
 * Generate sitemap index for large sites
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<string>} - XML sitemap index string
 */
export const generateSitemapIndex = async (baseUrl = 'https://stylehub.com') => {
  const now = new Date().toISOString();

  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  // Main sitemap
  xml += '  <sitemap>\n';
  xml += `    <loc>${baseUrl}/sitemap.xml</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += '  </sitemap>\n';

  // Products sitemap
  xml += '  <sitemap>\n';
  xml += `    <loc>${baseUrl}/sitemap-products.xml</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += '  </sitemap>\n';

  // Categories sitemap
  xml += '  <sitemap>\n';
  xml += `    <loc>${baseUrl}/sitemap-categories.xml</loc>\n`;
  xml += `    <lastmod>${now}</lastmod>\n`;
  xml += '  </sitemap>\n';

  xml += '</sitemapindex>';
  return xml;
};

/**
 * Generate product-specific sitemap
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<string>} - XML sitemap string for products
 */
export const generateProductSitemap = async (baseUrl = 'https://stylehub.com') => {
  try {
    const products = await Product.find({
      isActive: true,
      isDeleted: false
    })
      .select('_id name slug images updatedAt price')
      .sort({ updatedAt: -1 })
      .lean();

    const urls = products.map(product => ({
      loc: `${baseUrl}/product/${product._id}`,
      lastmod: product.updatedAt.toISOString(),
      changefreq: 'weekly',
      priority: '0.8',
      image: product.images && product.images.length > 0
        ? product.images[0]
        : null
    }));

    return generateSitemapXML(urls);
  } catch (error) {
    console.error('Error generating product sitemap:', error);
    throw error;
  }
};

/**
 * Generate category-specific sitemap
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<string>} - XML sitemap string for categories
 */
export const generateCategorySitemap = async (baseUrl = 'https://stylehub.com') => {
  try {
    const categories = await Category.find({
      isActive: true,
      isDeleted: false
    })
      .select('_id name slug updatedAt')
      .sort({ updatedAt: -1 })
      .lean();

    const urls = categories.map(category => ({
      loc: `${baseUrl}/category/${category._id}`,
      lastmod: category.updatedAt.toISOString(),
      changefreq: 'weekly',
      priority: '0.7'
    }));

    return generateSitemapXML(urls);
  } catch (error) {
    console.error('Error generating category sitemap:', error);
    throw error;
  }
};

/**
 * Generate RSS feed for recent products
 * @param {string} baseUrl - Base URL of the website
 * @returns {Promise<string>} - RSS feed XML string
 */
export const generateRSSFeed = async (baseUrl = 'https://stylehub.com') => {
  try {
    const products = await Product.find({
      isActive: true,
      isDeleted: false
    })
      .select('_id name description images price createdAt')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    let rss = '<?xml version="1.0" encoding="UTF-8"?>\n';
    rss += '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n';
    rss += '  <channel>\n';
    rss += '    <title>StyleHub - Latest Products</title>\n';
    rss += `    <link>${baseUrl}</link>\n`;
    rss += '    <description>Latest products from StyleHub</description>\n';
    rss += '    <language>en-us</language>\n';
    rss += `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n`;
    rss += `    <atom:link href="${baseUrl}/rss.xml" rel="self" type="application/rss+xml"/>\n`;

    products.forEach(product => {
      rss += '    <item>\n';
      rss += `      <title>${escapeXML(product.name)}</title>\n`;
      rss += `      <link>${baseUrl}/product/${product._id}</link>\n`;
      rss += `      <description>${escapeXML(product.description || '')}</description>\n`;
      rss += `      <pubDate>${new Date(product.createdAt).toUTCString()}</pubDate>\n`;
      rss += `      <guid>${baseUrl}/product/${product._id}</guid>\n`;

      if (product.images && product.images.length > 0) {
        rss += '      <enclosure';
        rss += ` url="${escapeXML(product.images[0])}"`;
        rss += ' type="image/jpeg"/>\n';
      }

      rss += '    </item>\n';
    });

    rss += '  </channel>\n';
    rss += '</rss>';
    return rss;
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    throw error;
  }
};

/**
 * Escape special XML characters
 * @param {string} str - String to escape
 * @returns {string} - Escaped string
 */
export const escapeXML = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Get sitemap stats
 * @returns {Promise<Object>} - Sitemap statistics
 */
export const getSitemapStats = async () => {
  try {
    const productCount = await Product.countDocuments({
      isActive: true,
      isDeleted: false
    });

    const categoryCount = await Category.countDocuments({
      isActive: true,
      isDeleted: false
    });

    const staticPageCount = 7; // Number of static pages

    return {
      totalUrls: productCount + categoryCount + staticPageCount,
      productUrls: productCount,
      categoryUrls: categoryCount,
      staticUrls: staticPageCount,
      lastGenerated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error getting sitemap stats:', error);
    throw error;
  }
};

export default {
  generateSitemap,
  generateSitemapIndex,
  generateProductSitemap,
  generateCategorySitemap,
  generateRSSFeed,
  getSitemapStats,
  escapeXML
};
