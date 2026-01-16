import mongoose from 'mongoose';

/**
 * Batch Operations Utility
 * Provides optimized bulk operations for various database operations
 */

/**
 * Batch update products stock
 * @param {Array} stockUpdates - Array of { productId, size, color, quantityChange }
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise} Bulk write result
 */
export const batchUpdateProductStock = async (stockUpdates, session = null) => {
  if (!stockUpdates || stockUpdates.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }

  const { default: Product } = await import('../models/Product.js');

  const bulkOps = stockUpdates.map(update => ({
    updateOne: {
      filter: {
        _id: update.productId,
        'stock.size': update.size,
        'stock.color': update.color
      },
      update: {
        $inc: { 'stock.$.quantity': update.quantityChange }
      }
    }
  }));

  const options = { ordered: false };
  if (session) {
    options.session = session;
  }

  return await Product.bulkWrite(bulkOps, options);
};

/**
 * Batch create orders
 * @param {Array} orders - Array of order objects
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise} Insert result
 */
export const batchCreateOrders = async (orders, session = null) => {
  if (!orders || orders.length === 0) {
    return [];
  }

  const { default: Order } = await import('../models/Order.js');

  const options = { ordered: false };
  if (session) {
    options.session = session;
  }

  return await Order.insertMany(orders, options);
};

/**
 * Batch update order statuses
 * @param {Array} orderIds - Array of order IDs
 * @param {String} status - New status
 * @param {String} note - Optional note
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise} Bulk write result
 */
export const batchUpdateOrderStatus = async (orderIds, status, note = '', session = null) => {
  if (!orderIds || orderIds.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }

  const { default: Order } = await import('../models/Order.js');

  const statusHistoryEntry = {
    status,
    updatedAt: new Date(),
    note
  };

  const updateObj = {
    orderStatus: status,
    $push: { statusHistory: statusHistoryEntry }
  };

  // Handle specific status updates
  if (status === 'delivered') {
    updateObj.deliveredAt = new Date();
  } else if (status === 'cancelled') {
    updateObj.cancelledAt = new Date();
  }

  const bulkOps = orderIds.map(orderId => ({
    updateOne: {
      filter: { _id: orderId },
      update: updateObj
    }
  }));

  const options = { ordered: false };
  if (session) {
    options.session = session;
  }

  return await Order.bulkWrite(bulkOps, options);
};

/**
 * Batch update product prices
 * @param {Array} priceUpdates - Array of { productId, price, discountPrice }
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise} Bulk write result
 */
export const batchUpdateProductPrices = async (priceUpdates, session = null) => {
  if (!priceUpdates || priceUpdates.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }

  const { default: Product } = await import('../models/Product.js');

  const bulkOps = priceUpdates.map(update => {
    const updateFields = { price: update.price };

    if (update.discountPrice !== undefined) {
      updateFields.discountPrice = update.discountPrice;
    }

    return {
      updateOne: {
        filter: { _id: update.productId },
        update: { $set: updateFields }
      }
    };
  });

  const options = { ordered: false };
  if (session) {
    options.session = session;
  }

  return await Product.bulkWrite(bulkOps, options);
};

/**
 * Batch activate/deactivate products
 * @param {Array} productIds - Array of product IDs
 * @param {Boolean} isActive - Active status
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise} Bulk write result
 */
export const batchUpdateProductStatus = async (productIds, isActive, session = null) => {
  if (!productIds || productIds.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }

  const { default: Product } = await import('../models/Product.js');

  const bulkOps = productIds.map(productId => ({
    updateOne: {
      filter: { _id: productId },
      update: { $set: { isActive } }
    }
  }));

  const options = { ordered: false };
  if (session) {
    options.session = session;
  }

  return await Product.bulkWrite(bulkOps, options);
};

/**
 * Batch delete carts (cleanup old/abandoned carts)
 * @param {Date} olderThan - Delete carts older than this date
 * @returns {Promise} Delete result
 */
export const batchDeleteOldCarts = async (olderThan) => {
  const { default: Cart } = await import('../models/Cart.js');

  return await Cart.deleteMany({
    updatedAt: { $lt: olderThan },
    items: { $size: 0 }
  });
};

/**
 * Batch update user status
 * @param {Array} userIds - Array of user IDs
 * @param {Boolean} isActive - Active status
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise} Bulk write result
 */
export const batchUpdateUserStatus = async (userIds, isActive, session = null) => {
  if (!userIds || userIds.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }

  const { default: User } = await import('../models/User.js');

  const bulkOps = userIds.map(userId => ({
    updateOne: {
      filter: { _id: userId },
      update: { $set: { isActive } }
    }
  }));

  const options = { ordered: false };
  if (session) {
    options.session = session;
  }

  return await User.bulkWrite(bulkOps, options);
};

/**
 * Batch sync cart prices with current product prices
 * This is useful to ensure cart items reflect current pricing
 * @returns {Promise} Update result
 */
export const batchSyncCartPrices = async () => {
  const { default: Cart } = await import('../models/Cart.js');
  const { default: Product } = await import('../models/Product.js');

  // Get all carts with items
  const carts = await Cart.find({ items: { $exists: true, $ne: [] } })
    .select('items')
    .lean();

  if (carts.length === 0) {
    return { updated: 0 };
  }

  // Collect all unique product IDs
  const productIds = new Set();
  for (const cart of carts) {
    for (const item of cart.items) {
      productIds.add(item.product.toString());
    }
  }

  // Get current prices for all products
  const products = await Product.find({
    _id: { $in: Array.from(productIds) },
    isActive: true
  })
    .select('_id price discountPrice')
    .lean();

  // Create price map
  const priceMap = new Map();
  for (const product of products) {
    priceMap.set(
      product._id.toString(),
      product.discountPrice || product.price
    );
  }

  // Prepare bulk operations
  const bulkOps = [];

  for (const cart of carts) {
    const updates = {};
    let hasUpdates = false;

    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const productId = item.product.toString();
      const currentPrice = priceMap.get(productId);

      if (currentPrice && item.price !== currentPrice) {
        updates[`items.${i}.price`] = currentPrice;
        hasUpdates = true;
      }
    }

    if (hasUpdates) {
      bulkOps.push({
        updateOne: {
          filter: { _id: cart._id },
          update: { $set: updates }
        }
      });
    }
  }

  if (bulkOps.length === 0) {
    return { updated: 0 };
  }

  const result = await Cart.bulkWrite(bulkOps, { ordered: false });
  return { updated: result.modifiedCount };
};

/**
 * Batch process refunds (mark orders as refunded and restore stock)
 * @param {Array} orderIds - Array of order IDs to refund
 * @param {String} reason - Refund reason
 * @returns {Promise} Processing result
 */
export const batchProcessRefunds = async (orderIds, reason = 'Refund processed') => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { default: Order } = await import('../models/Order.js');
    const { default: Product } = await import('../models/Product.js');

    // Get all orders
    const orders = await Order.find({ _id: { $in: orderIds } }).session(session);

    if (orders.length === 0) {
      await session.abortTransaction();
      return { success: false, message: 'No orders found' };
    }

    // Collect stock restoration data
    const stockUpdates = [];

    for (const order of orders) {
      // Only process completed orders
      if (order.paymentStatus !== 'completed') {
        continue;
      }

      // Collect stock restoration for each item
      for (const item of order.items) {
        if (item.size && item.color) {
          stockUpdates.push({
            productId: item.product,
            size: item.size,
            color: item.color,
            quantityChange: item.quantity // Restore stock
          });
        }
      }
    }

    // Update orders to refunded status
    const orderBulkOps = orderIds.map(orderId => ({
      updateOne: {
        filter: { _id: orderId },
        update: {
          $set: {
            paymentStatus: 'refunded',
            orderStatus: 'cancelled',
            cancellationReason: reason,
            cancelledAt: new Date()
          },
          $push: {
            statusHistory: {
              status: 'cancelled',
              updatedAt: new Date(),
              note: reason
            }
          }
        }
      }
    }));

    await Order.bulkWrite(orderBulkOps, { session, ordered: false });

    // Restore stock
    if (stockUpdates.length > 0) {
      await batchUpdateProductStock(stockUpdates, session);
    }

    await session.commitTransaction();

    return {
      success: true,
      ordersProcessed: orders.length,
      stockRestored: stockUpdates.length
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Batch update product categories
 * @param {Array} updates - Array of { productId, categoryId }
 * @param {Object} session - MongoDB session (optional)
 * @returns {Promise} Bulk write result
 */
export const batchUpdateProductCategories = async (updates, session = null) => {
  if (!updates || updates.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }

  const { default: Product } = await import('../models/Product.js');

  const bulkOps = updates.map(update => ({
    updateOne: {
      filter: { _id: update.productId },
      update: { $set: { category: update.categoryId } }
    }
  }));

  const options = { ordered: false };
  if (session) {
    options.session = session;
  }

  return await Product.bulkWrite(bulkOps, options);
};

/**
 * Batch delete products
 * @param {Array} productIds - Array of product IDs
 * @param {Boolean} softDelete - If true, just deactivate; if false, actually delete
 * @returns {Promise} Delete result
 */
export const batchDeleteProducts = async (productIds, softDelete = true) => {
  if (!productIds || productIds.length === 0) {
    return { deletedCount: 0 };
  }

  const { default: Product } = await import('../models/Product.js');

  if (softDelete) {
    // Soft delete - just deactivate
    return await batchUpdateProductStatus(productIds, false);
  } else {
    // Hard delete
    return await Product.deleteMany({ _id: { $in: productIds } });
  }
};

/**
 * Batch process order confirmations
 * Updates multiple orders from pending to confirmed
 * @param {Array} orderIds - Array of order IDs
 * @param {String} note - Optional note
 * @returns {Promise} Bulk write result
 */
export const batchConfirmOrders = async (orderIds, note = 'Order confirmed') => {
  return await batchUpdateOrderStatus(orderIds, 'confirmed', note);
};

/**
 * Batch process order shipments
 * Updates multiple orders to shipped status
 * @param {Array} shipments - Array of { orderId, trackingNumber, carrier }
 * @returns {Promise} Bulk write result
 */
export const batchShipOrders = async (shipments) => {
  if (!shipments || shipments.length === 0) {
    return { modifiedCount: 0, matchedCount: 0 };
  }

  const { default: Order } = await import('../models/Order.js');

  const bulkOps = shipments.map(shipment => ({
    updateOne: {
      filter: { _id: shipment.orderId },
      update: {
        $set: {
          orderStatus: 'shipped',
          'shippingDetails.trackingNumber': shipment.trackingNumber,
          'shippingDetails.carrier': shipment.carrier,
          'shippingDetails.shippedAt': new Date()
        },
        $push: {
          statusHistory: {
            status: 'shipped',
            updatedAt: new Date(),
            note: `Shipped via ${shipment.carrier} - Tracking: ${shipment.trackingNumber}`
          }
        }
      }
    }
  }));

  return await Order.bulkWrite(bulkOps, { ordered: false });
};

export default {
  batchUpdateProductStock,
  batchCreateOrders,
  batchUpdateOrderStatus,
  batchUpdateProductPrices,
  batchUpdateProductStatus,
  batchDeleteOldCarts,
  batchUpdateUserStatus,
  batchSyncCartPrices,
  batchProcessRefunds,
  batchUpdateProductCategories,
  batchDeleteProducts,
  batchConfirmOrders,
  batchShipOrders
};
