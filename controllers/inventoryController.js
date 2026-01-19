import Product from '../models/Product.js';
import InventoryAdjustment from '../models/InventoryAdjustment.js';
import mongoose from 'mongoose';

// Get inventory overview
export const getInventoryOverview = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .select('name brand category price stock lowStockThreshold reorderPoint images')
      .lean();

    // Calculate inventory metrics for each product
    const inventoryData = products.map(product => {
      const totalStock = product.stock.reduce((sum, item) => sum + item.quantity, 0);
      const isLowStock = totalStock <= product.lowStockThreshold && totalStock > 0;
      const isOutOfStock = totalStock === 0;
      const needsReorder = totalStock <= product.reorderPoint;

      // Calculate stock value
      const stockValue = totalStock * product.price;

      return {
        _id: product._id,
        name: product.name,
        brand: product.brand,
        category: product.category?.name || 'Uncategorized',
        image: product.images?.[0] || '',
        totalStock,
        stockValue,
        lowStockThreshold: product.lowStockThreshold,
        reorderPoint: product.reorderPoint,
        status: isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : needsReorder ? 'Reorder' : 'In Stock',
        variants: product.stock.map(s => ({
          size: s.size,
          color: s.color,
          quantity: s.quantity
        }))
      };
    });

    // Calculate overall statistics
    const totalProducts = inventoryData.length;
    const lowStockCount = inventoryData.filter(p => p.status === 'Low Stock').length;
    const outOfStockCount = inventoryData.filter(p => p.status === 'Out of Stock').length;
    const reorderCount = inventoryData.filter(p => p.status === 'Reorder').length;
    const totalInventoryValue = inventoryData.reduce((sum, p) => sum + p.stockValue, 0);
    const totalStockItems = inventoryData.reduce((sum, p) => sum + p.totalStock, 0);

    res.json({
      success: true,
      statistics: {
        totalProducts,
        totalStockItems,
        totalInventoryValue,
        lowStockCount,
        outOfStockCount,
        reorderCount,
        inStockCount: totalProducts - lowStockCount - outOfStockCount
      },
      inventory: inventoryData
    });
  } catch (error) {
    console.error('Get inventory overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory overview',
      error: error.message
    });
  }
};

// Get low stock alerts
export const getLowStockAlerts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .populate('category', 'name')
      .select('name brand category price stock lowStockThreshold reorderPoint reorderQuantity images')
      .lean();

    // Filter products with low stock or out of stock
    const lowStockProducts = products
      .map(product => {
        const totalStock = product.stock.reduce((sum, item) => sum + item.quantity, 0);
        const isLowStock = totalStock <= product.lowStockThreshold && totalStock > 0;
        const isOutOfStock = totalStock === 0;
        const needsReorder = totalStock <= product.reorderPoint;

        if (isLowStock || isOutOfStock || needsReorder) {
          return {
            _id: product._id,
            name: product.name,
            brand: product.brand,
            category: product.category?.name || 'Uncategorized',
            image: product.images?.[0] || '',
            totalStock,
            lowStockThreshold: product.lowStockThreshold,
            reorderPoint: product.reorderPoint,
            reorderQuantity: product.reorderQuantity,
            alertType: isOutOfStock ? 'critical' : isLowStock ? 'warning' : 'info',
            status: isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Needs Reorder',
            variants: product.stock
              .filter(s => s.quantity <= product.lowStockThreshold)
              .map(s => ({
                size: s.size,
                color: s.color,
                quantity: s.quantity
              }))
          };
        }
        return null;
      })
      .filter(p => p !== null)
      .sort((a, b) => a.totalStock - b.totalStock);

    res.json({
      success: true,
      count: lowStockProducts.length,
      alerts: lowStockProducts
    });
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock alerts',
      error: error.message
    });
  }
};

// Manual stock adjustment
export const adjustStock = async (req, res) => {
  try {
    const { productId, size, color, adjustment, reason, notes, adjustmentType = 'manual' } = req.body;

    // Validate required fields
    if (!productId || !size || !color || adjustment === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Product ID, size, color, and adjustment quantity are required'
      });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find stock item
    const stockItem = product.stock.find(
      s => s.size === size && s.color === color
    );

    const previousQuantity = stockItem ? stockItem.quantity : 0;
    const newQuantity = Math.max(0, previousQuantity + adjustment);

    // Update stock
    product.adjustStock(size, color, adjustment);
    await product.save();

    // Log adjustment
    const adjustmentLog = await InventoryAdjustment.create({
      product: product._id,
      productName: product.name,
      size,
      color,
      adjustmentType,
      previousQuantity,
      adjustmentQuantity: adjustment,
      newQuantity,
      reason,
      notes,
      adjustedBy: req.user._id,
      adjustedByName: req.user.name || req.user.email
    });

    await adjustmentLog.populate('product', 'name brand images');

    res.json({
      success: true,
      message: 'Stock adjusted successfully',
      adjustment: adjustmentLog,
      newStock: newQuantity
    });
  } catch (error) {
    console.error('Adjust stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust stock',
      error: error.message
    });
  }
};

// Get inventory history
export const getInventoryHistory = async (req, res) => {
  try {
    const {
      productId,
      adjustmentType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    // Build query
    const query = {};

    if (productId) {
      query.product = productId;
    }

    if (adjustmentType) {
      query.adjustmentType = adjustmentType;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [history, totalCount] = await Promise.all([
      InventoryAdjustment.find(query)
        .populate('product', 'name brand images')
        .populate('adjustedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      InventoryAdjustment.countDocuments(query)
    ]);

    res.json({
      success: true,
      history,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get inventory history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory history',
      error: error.message
    });
  }
};

// Create reorder
export const createReorder = async (req, res) => {
  try {
    const { productId, size, color, quantity, notes } = req.body;

    // Validate required fields
    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    // Find product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Determine reorder quantity
    const reorderQty = quantity || product.reorderQuantity;

    // If specific variant is provided
    if (size && color) {
      const stockItem = product.stock.find(
        s => s.size === size && s.color === color
      );
      const previousQuantity = stockItem ? stockItem.quantity : 0;
      const newQuantity = previousQuantity + reorderQty;

      // Update stock
      product.adjustStock(size, color, reorderQty);
      await product.save();

      // Log reorder
      const adjustmentLog = await InventoryAdjustment.create({
        product: product._id,
        productName: product.name,
        size,
        color,
        adjustmentType: 'reorder',
        previousQuantity,
        adjustmentQuantity: reorderQty,
        newQuantity,
        reason: 'Stock reorder',
        notes,
        adjustedBy: req.user._id,
        adjustedByName: req.user.name || req.user.email,
        cost: reorderQty * product.price * 0.5 // Assuming cost is 50% of price
      });

      return res.json({
        success: true,
        message: 'Reorder created successfully',
        reorder: adjustmentLog
      });
    }

    // If no specific variant, reorder all low stock variants
    const reorders = [];
    for (const stockItem of product.stock) {
      if (stockItem.quantity <= product.reorderPoint) {
        const previousQuantity = stockItem.quantity;
        const newQuantity = previousQuantity + reorderQty;

        product.adjustStock(stockItem.size, stockItem.color, reorderQty);

        const adjustmentLog = await InventoryAdjustment.create({
          product: product._id,
          productName: product.name,
          size: stockItem.size,
          color: stockItem.color,
          adjustmentType: 'reorder',
          previousQuantity,
          adjustmentQuantity: reorderQty,
          newQuantity,
          reason: 'Automatic reorder for low stock',
          notes,
          adjustedBy: req.user._id,
          adjustedByName: req.user.name || req.user.email,
          cost: reorderQty * product.price * 0.5
        });

        reorders.push(adjustmentLog);
      }
    }

    await product.save();

    res.json({
      success: true,
      message: `Created ${reorders.length} reorder(s) successfully`,
      reorders
    });
  } catch (error) {
    console.error('Create reorder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create reorder',
      error: error.message
    });
  }
};

// Get inventory statistics
export const getInventoryStatistics = async (req, res) => {
  try {
    const { period = '7days' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (period) {
      case '24hours':
        startDate.setHours(now.getHours() - 24);
        break;
      case '7days':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate.setDate(now.getDate() - 7);
    }

    // Get adjustment statistics
    const adjustments = await InventoryAdjustment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$adjustmentType',
          count: { $sum: 1 },
          totalAdjustment: { $sum: '$adjustmentQuantity' }
        }
      }
    ]);

    // Get daily trend
    const dailyTrend = await InventoryAdjustment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          adjustments: { $sum: 1 },
          totalChange: { $sum: '$adjustmentQuantity' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get top adjusted products
    const topAdjustedProducts = await InventoryAdjustment.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productName' },
          adjustmentCount: { $sum: 1 },
          totalChange: { $sum: '$adjustmentQuantity' }
        }
      },
      {
        $sort: { adjustmentCount: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.json({
      success: true,
      period,
      statistics: {
        adjustmentsByType: adjustments,
        dailyTrend,
        topAdjustedProducts
      }
    });
  } catch (error) {
    console.error('Get inventory statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory statistics',
      error: error.message
    });
  }
};

// Bulk stock update
export const bulkStockUpdate = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Updates array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const { productId, size, color, quantity, adjustment } = update;

        const product = await Product.findById(productId);
        if (!product) {
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        const stockItem = product.stock.find(
          s => s.size === size && s.color === color
        );
        const previousQuantity = stockItem ? stockItem.quantity : 0;

        // Use quantity if provided, otherwise use adjustment
        const newQuantity = quantity !== undefined ? quantity : previousQuantity + adjustment;

        if (quantity !== undefined) {
          product.updateStock(size, color, quantity);
        } else {
          product.adjustStock(size, color, adjustment);
        }

        await product.save();

        // Log adjustment
        await InventoryAdjustment.create({
          product: product._id,
          productName: product.name,
          size,
          color,
          adjustmentType: 'manual',
          previousQuantity,
          adjustmentQuantity: newQuantity - previousQuantity,
          newQuantity,
          reason: 'Bulk stock update',
          adjustedBy: req.user._id,
          adjustedByName: req.user.name || req.user.email
        });

        results.push({
          productId,
          size,
          color,
          previousQuantity,
          newQuantity,
          success: true
        });
      } catch (error) {
        errors.push({
          productId: update.productId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`,
      results,
      errors
    });
  } catch (error) {
    console.error('Bulk stock update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk stock update',
      error: error.message
    });
  }
};
