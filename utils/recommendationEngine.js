import Product from '../models/Product.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import User from '../models/User.js';

/**
 * Recommendation Engine for E-commerce Platform
 * Implements collaborative filtering, content-based recommendations, and trending algorithms
 */

class RecommendationEngine {
  /**
   * Get personalized product recommendations for a user
   * Uses collaborative filtering based on purchase history and similar users
   * @param {String} userId - User ID
   * @param {Number} limit - Number of recommendations to return
   * @returns {Array} Array of recommended products
   */
  static async getPersonalizedRecommendations(userId, limit = 10) {
    try {
      // Get user's order history
      const userOrders = await Order.find({
        user: userId,
        status: { $in: ['delivered', 'processing', 'shipped'] }
      })
        .select('items')
        .lean();

      // Extract product IDs and categories from user's orders
      const purchasedProductIds = new Set();
      const userCategories = new Set();
      const userBrands = new Set();

      for (const order of userOrders) {
        for (const item of order.items) {
          purchasedProductIds.add(item.product.toString());
        }
      }

      // If user has purchase history, get product details
      if (purchasedProductIds.size > 0) {
        const purchasedProducts = await Product.find({
          _id: { $in: Array.from(purchasedProductIds) }
        })
          .select('category brand')
          .lean();

        purchasedProducts.forEach(product => {
          if (product.category) userCategories.add(product.category.toString());
          if (product.brand) userBrands.add(product.brand);
        });
      }

      // Find users who bought similar products (collaborative filtering)
      const similarUsers = await Order.aggregate([
        {
          $match: {
            'items.product': { $in: Array.from(purchasedProductIds) },
            user: { $ne: userId },
            status: { $in: ['delivered', 'processing', 'shipped'] }
          }
        },
        {
          $group: {
            _id: '$user',
            commonProducts: { $sum: 1 }
          }
        },
        {
          $sort: { commonProducts: -1 }
        },
        {
          $limit: 20
        }
      ]);

      const similarUserIds = similarUsers.map(u => u._id);

      // Get products bought by similar users
      const similarUserProducts = await Order.find({
        user: { $in: similarUserIds },
        status: { $in: ['delivered', 'processing', 'shipped'] }
      })
        .select('items')
        .lean();

      const collaborativeProductIds = new Set();
      for (const order of similarUserProducts) {
        for (const item of order.items) {
          const productId = item.product.toString();
          if (!purchasedProductIds.has(productId)) {
            collaborativeProductIds.add(productId);
          }
        }
      }

      // Get content-based recommendations (same category/brand)
      const contentBasedQuery = {
        _id: { $nin: Array.from(purchasedProductIds) },
        isActive: true,
        $or: []
      };

      if (userCategories.size > 0) {
        contentBasedQuery.$or.push({ category: { $in: Array.from(userCategories) } });
      }
      if (userBrands.size > 0) {
        contentBasedQuery.$or.push({ brand: { $in: Array.from(userBrands) } });
      }

      // Build final recommendation query
      let recommendationQuery = {
        isActive: true,
        _id: { $nin: Array.from(purchasedProductIds) }
      };

      // Prioritize collaborative filtering results, then content-based
      if (collaborativeProductIds.size > 0 || contentBasedQuery.$or.length > 0) {
        const priorityIds = Array.from(collaborativeProductIds);

        if (contentBasedQuery.$or.length > 0) {
          recommendationQuery = {
            $or: [
              { _id: { $in: priorityIds } },
              contentBasedQuery
            ]
          };
        } else if (priorityIds.length > 0) {
          recommendationQuery._id = { $in: priorityIds };
        }
      }

      // Fetch recommended products
      const recommendations = await Product.find(recommendationQuery)
        .populate('category', 'name')
        .select('name description price discount images category brand rating reviewCount stock isActive')
        .sort({ rating: -1, reviewCount: -1 })
        .limit(limit)
        .lean();

      // If we don't have enough recommendations, add trending products
      if (recommendations.length < limit) {
        const trendingProducts = await this.getTrendingProducts(limit - recommendations.length, Array.from(purchasedProductIds));
        recommendations.push(...trendingProducts);
      }

      return recommendations;
    } catch (error) {
      console.error('Error in getPersonalizedRecommendations:', error);
      // Fallback to trending products
      return await this.getTrendingProducts(limit);
    }
  }

  /**
   * Get similar products based on a specific product
   * Uses content-based filtering (category, brand, price range)
   * @param {String} productId - Product ID
   * @param {Number} limit - Number of similar products to return
   * @returns {Array} Array of similar products
   */
  static async getSimilarProducts(productId, limit = 8) {
    try {
      // Get the source product
      const sourceProduct = await Product.findById(productId)
        .select('category brand price name')
        .lean();

      if (!sourceProduct) {
        return [];
      }

      // Calculate price range (±30%)
      const priceMin = sourceProduct.price * 0.7;
      const priceMax = sourceProduct.price * 1.3;

      // Build similarity query
      const query = {
        _id: { $ne: productId },
        isActive: true,
        $or: [
          { category: sourceProduct.category },
          { brand: sourceProduct.brand }
        ]
      };

      // Find similar products
      let similarProducts = await Product.find(query)
        .populate('category', 'name')
        .select('name description price discount images category brand rating reviewCount stock isActive')
        .lean();

      // Score products based on similarity
      similarProducts = similarProducts.map(product => {
        let score = 0;

        // Category match (highest weight)
        if (product.category?._id?.toString() === sourceProduct.category?.toString()) {
          score += 50;
        }

        // Brand match
        if (product.brand === sourceProduct.brand) {
          score += 30;
        }

        // Price similarity
        if (product.price >= priceMin && product.price <= priceMax) {
          score += 20;
        }

        // Rating boost
        if (product.rating >= 4) {
          score += 10;
        }

        return { ...product, similarityScore: score };
      });

      // Sort by similarity score and rating
      similarProducts.sort((a, b) => {
        if (b.similarityScore !== a.similarityScore) {
          return b.similarityScore - a.similarityScore;
        }
        return (b.rating || 0) - (a.rating || 0);
      });

      return similarProducts.slice(0, limit);
    } catch (error) {
      console.error('Error in getSimilarProducts:', error);
      return [];
    }
  }

  /**
   * Get products that customers also bought
   * Uses order co-occurrence analysis
   * @param {String} productId - Product ID
   * @param {Number} limit - Number of products to return
   * @returns {Array} Array of frequently bought together products
   */
  static async getFrequentlyBoughtTogether(productId, limit = 6) {
    try {
      // Find orders containing this product
      const orders = await Order.find({
        'items.product': productId,
        status: { $in: ['delivered', 'processing', 'shipped'] }
      })
        .select('items')
        .lean();

      // Count co-occurrences
      const coOccurrenceMap = new Map();

      for (const order of orders) {
        for (const item of order.items) {
          const itemProductId = item.product.toString();
          if (itemProductId !== productId) {
            const count = coOccurrenceMap.get(itemProductId) || 0;
            coOccurrenceMap.set(itemProductId, count + 1);
          }
        }
      }

      // Sort by frequency
      const sortedProducts = Array.from(coOccurrenceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(entry => entry[0]);

      if (sortedProducts.length === 0) {
        return [];
      }

      // Fetch product details
      const products = await Product.find({
        _id: { $in: sortedProducts },
        isActive: true
      })
        .populate('category', 'name')
        .select('name description price discount images category brand rating reviewCount stock isActive')
        .lean();

      // Maintain the sorted order
      const productMap = new Map(products.map(p => [p._id.toString(), p]));
      return sortedProducts
        .map(id => productMap.get(id))
        .filter(p => p !== undefined);
    } catch (error) {
      console.error('Error in getFrequentlyBoughtTogether:', error);
      return [];
    }
  }

  /**
   * Get trending products
   * Based on recent orders, reviews, and popularity
   * @param {Number} limit - Number of products to return
   * @param {Array} excludeIds - Product IDs to exclude
   * @returns {Array} Array of trending products
   */
  static async getTrendingProducts(limit = 10, excludeIds = []) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get products with recent activity
      const recentOrders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
            status: { $in: ['delivered', 'processing', 'shipped'] }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $group: {
            _id: '$items.product',
            orderCount: { $sum: 1 },
            totalQuantity: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        {
          $sort: { orderCount: -1, totalRevenue: -1 }
        },
        {
          $limit: limit * 2
        }
      ]);

      const trendingProductIds = recentOrders
        .map(item => item._id.toString())
        .filter(id => !excludeIds.includes(id));

      if (trendingProductIds.length === 0) {
        // Fallback to highest rated products
        return await Product.find({
          _id: { $nin: excludeIds },
          isActive: true
        })
          .populate('category', 'name')
          .select('name description price discount images category brand rating reviewCount stock isActive')
          .sort({ rating: -1, reviewCount: -1 })
          .limit(limit)
          .lean();
      }

      // Fetch product details with trending scores
      const products = await Product.find({
        _id: { $in: trendingProductIds },
        isActive: true
      })
        .populate('category', 'name')
        .select('name description price discount images category brand rating reviewCount stock isActive')
        .lean();

      // Add trending scores
      const orderMap = new Map(recentOrders.map(item => [item._id.toString(), item]));

      const productsWithScores = products.map(product => {
        const orderData = orderMap.get(product._id.toString());
        const trendingScore = (orderData?.orderCount || 0) * 10 +
                             (orderData?.totalQuantity || 0) * 5 +
                             (product.rating || 0) * 2;

        return {
          ...product,
          trendingScore,
          recentOrders: orderData?.orderCount || 0
        };
      });

      // Sort by trending score
      productsWithScores.sort((a, b) => b.trendingScore - a.trendingScore);

      return productsWithScores.slice(0, limit);
    } catch (error) {
      console.error('Error in getTrendingProducts:', error);
      return [];
    }
  }

  /**
   * Get new arrivals
   * Products added recently
   * @param {Number} limit - Number of products to return
   * @returns {Array} Array of new products
   */
  static async getNewArrivals(limit = 10) {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const products = await Product.find({
        isActive: true,
        createdAt: { $gte: thirtyDaysAgo }
      })
        .populate('category', 'name')
        .select('name description price discount images category brand rating reviewCount stock isActive createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();

      return products;
    } catch (error) {
      console.error('Error in getNewArrivals:', error);
      return [];
    }
  }

  /**
   * Get best sellers
   * Products with highest sales
   * @param {Number} limit - Number of products to return
   * @returns {Array} Array of best selling products
   */
  static async getBestSellers(limit = 10) {
    try {
      // Get all-time sales data
      const bestSellers = await Order.aggregate([
        {
          $match: {
            status: { $in: ['delivered', 'processing', 'shipped'] }
          }
        },
        {
          $unwind: '$items'
        },
        {
          $group: {
            _id: '$items.product',
            totalSales: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
          }
        },
        {
          $sort: { totalSales: -1, totalRevenue: -1 }
        },
        {
          $limit: limit
        }
      ]);

      const productIds = bestSellers.map(item => item._id);

      if (productIds.length === 0) {
        return [];
      }

      // Fetch product details
      const products = await Product.find({
        _id: { $in: productIds },
        isActive: true
      })
        .populate('category', 'name')
        .select('name description price discount images category brand rating reviewCount stock isActive')
        .lean();

      // Add sales data and maintain order
      const salesMap = new Map(bestSellers.map(item => [item._id.toString(), item]));
      const productMap = new Map(products.map(p => [p._id.toString(), p]));

      return productIds
        .map(id => {
          const product = productMap.get(id.toString());
          const sales = salesMap.get(id.toString());
          if (product) {
            return {
              ...product,
              totalSales: sales?.totalSales || 0,
              totalRevenue: sales?.totalRevenue || 0
            };
          }
          return null;
        })
        .filter(p => p !== null);
    } catch (error) {
      console.error('Error in getBestSellers:', error);
      return [];
    }
  }
}

export default RecommendationEngine;
