import Order from '../models/Order.js';
import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware to verify if a user has purchased a product
 * Checks if user has a delivered order containing the product
 *
 * Usage: Add this middleware before allowing reviews
 * Note: This is optional - the review controller handles verification
 * and marks reviews as verified/unverified automatically
 */
export const verifyPurchase = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const productId = req.body.productId || req.params.productId;

    if (!productId) {
      return sendError(res, 400, 'Product ID is required');
    }

    // Check if user has purchased this product
    const order = await Order.findOne({
      user: userId,
      'items.product': productId,
      orderStatus: 'delivered'
    })
      .select('_id orderNumber')
      .lean();

    if (!order) {
      return sendError(
        res,
        403,
        'You must purchase this product before reviewing it',
        {
          info: 'Only customers who have purchased and received this product can leave a review'
        }
      );
    }

    // Attach purchase verification to request
    req.purchaseVerified = true;
    req.verifiedOrderId = order._id;

    next();
  } catch (error) {
    console.error('[Verify Purchase Error]:', error);
    return sendError(res, 500, 'Failed to verify purchase', error.message);
  }
};

/**
 * Middleware to check purchase status (non-blocking)
 * Adds purchase information to request without blocking
 * Useful for optional verification where unverified reviews are allowed
 */
export const checkPurchaseStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const productId = req.body.productId || req.params.productId;

    if (!productId) {
      req.purchaseVerified = false;
      return next();
    }

    // Check if user has purchased this product
    const order = await Order.findOne({
      user: userId,
      'items.product': productId,
      orderStatus: 'delivered'
    })
      .select('_id orderNumber deliveredAt')
      .lean();

    if (order) {
      req.purchaseVerified = true;
      req.verifiedOrderId = order._id;
      req.purchaseDeliveredAt = order.deliveredAt;
    } else {
      req.purchaseVerified = false;
    }

    next();
  } catch (error) {
    console.error('[Check Purchase Status Error]:', error);
    // Don't block the request on error, just mark as unverified
    req.purchaseVerified = false;
    next();
  }
};

/**
 * Middleware to get user's purchase history for a product
 * Provides detailed purchase information
 */
export const getUserProductPurchases = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const productId = req.body.productId || req.params.productId;

    if (!productId) {
      req.productPurchases = [];
      return next();
    }

    // Get all orders containing this product
    const orders = await Order.find({
      user: userId,
      'items.product': productId
    })
      .select('orderNumber orderStatus deliveredAt createdAt items.$')
      .lean();

    req.productPurchases = orders;
    req.hasDeliveredPurchase = orders.some(order => order.orderStatus === 'delivered');

    next();
  } catch (error) {
    console.error('[Get User Product Purchases Error]:', error);
    req.productPurchases = [];
    req.hasDeliveredPurchase = false;
    next();
  }
};

export default {
  verifyPurchase,
  checkPurchaseStatus,
  getUserProductPurchases
};
