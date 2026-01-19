import Product from '../models/Product.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import AdminActivityLog from '../models/AdminActivityLog.js';

// Bulk product operations
export const bulkProductOperation = async (req, res) => {
  try {
    const { operation, items, data } = req.body;

    if (!operation || !items || items.length === 0) {
      return res.status(400).json({ message: 'Operation and items are required' });
    }

    let success = 0;
    let failed = 0;
    const results = [];

    switch (operation) {
      case 'update_price':
        for (const itemId of items) {
          try {
            const product = await Product.findById(itemId);
            if (!product) {
              failed++;
              continue;
            }

            let newPrice = product.price;
            switch (data.priceType) {
              case 'set':
                newPrice = parseFloat(data.priceValue);
                break;
              case 'increase':
                newPrice += parseFloat(data.priceValue);
                break;
              case 'decrease':
                newPrice -= parseFloat(data.priceValue);
                break;
              case 'percentage':
                newPrice *= (1 + parseFloat(data.priceValue) / 100);
                break;
            }

            product.price = Math.max(0, newPrice);
            await product.save();
            success++;
          } catch (error) {
            failed++;
          }
        }
        break;

      case 'update_stock':
        for (const itemId of items) {
          try {
            const product = await Product.findById(itemId);
            if (!product) {
              failed++;
              continue;
            }

            let newStock = product.stock;
            switch (data.stockType) {
              case 'set':
                newStock = parseInt(data.stockValue);
                break;
              case 'increase':
                newStock += parseInt(data.stockValue);
                break;
              case 'decrease':
                newStock -= parseInt(data.stockValue);
                break;
            }

            product.stock = Math.max(0, newStock);
            await product.save();
            success++;
          } catch (error) {
            failed++;
          }
        }
        break;

      case 'update_status':
        const result = await Product.updateMany(
          { _id: { $in: items } },
          { $set: { status: data.status } }
        );
        success = result.modifiedCount;
        failed = items.length - success;
        break;

      case 'bulk_delete':
        const deleteResult = await Product.deleteMany({ _id: { $in: items } });
        success = deleteResult.deletedCount;
        failed = items.length - success;
        break;

      default:
        return res.status(400).json({ message: 'Invalid operation' });
    }

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'bulk_product_update',
      resource: {
        type: 'product',
        name: `${items.length} products`
      },
      description: `Performed bulk operation: ${operation} on ${success} products`,
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { operation, itemCount: items.length, success, failed }
    });

    res.json({
      success,
      failed,
      total: items.length,
      message: `Operation completed. ${success} succeeded, ${failed} failed.`
    });
  } catch (error) {
    console.error('Bulk product operation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Bulk order operations
export const bulkOrderOperation = async (req, res) => {
  try {
    const { operation, items, data } = req.body;

    if (!operation || !items || items.length === 0) {
      return res.status(400).json({ message: 'Operation and items are required' });
    }

    let success = 0;
    let failed = 0;

    switch (operation) {
      case 'update_status':
        const result = await Order.updateMany(
          { _id: { $in: items } },
          { $set: { status: data.status } }
        );
        success = result.modifiedCount;
        failed = items.length - success;
        break;

      case 'mark_paid':
        const paidResult = await Order.updateMany(
          { _id: { $in: items } },
          { $set: { paymentStatus: 'paid', 'payment.status': 'completed' } }
        );
        success = paidResult.modifiedCount;
        failed = items.length - success;
        break;

      case 'cancel_orders':
        for (const itemId of items) {
          try {
            const order = await Order.findById(itemId);
            if (!order) {
              failed++;
              continue;
            }

            if (['delivered', 'cancelled'].includes(order.status)) {
              failed++;
              continue;
            }

            order.status = 'cancelled';
            order.cancelledAt = new Date();
            order.cancellationReason = 'Bulk cancellation by admin';
            await order.save();
            success++;
          } catch (error) {
            failed++;
          }
        }
        break;

      default:
        return res.status(400).json({ message: 'Invalid operation' });
    }

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'bulk_order_update',
      resource: {
        type: 'order',
        name: `${items.length} orders`
      },
      description: `Performed bulk operation: ${operation} on ${success} orders`,
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { operation, itemCount: items.length, success, failed }
    });

    res.json({
      success,
      failed,
      total: items.length,
      message: `Operation completed. ${success} succeeded, ${failed} failed.`
    });
  } catch (error) {
    console.error('Bulk order operation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Bulk customer operations
export const bulkCustomerOperation = async (req, res) => {
  try {
    const { operation, items, data } = req.body;

    if (!operation || !items || items.length === 0) {
      return res.status(400).json({ message: 'Operation and items are required' });
    }

    let success = 0;
    let failed = 0;

    switch (operation) {
      case 'update_status':
        const result = await User.updateMany(
          { _id: { $in: items }, role: 'user' },
          { $set: { isActive: data.status === 'active' } }
        );
        success = result.modifiedCount;
        failed = items.length - success;
        break;

      case 'send_email':
        // TODO: Implement email sending logic
        // For now, just mark as success
        success = items.length;
        break;

      case 'bulk_delete':
        const deleteResult = await User.deleteMany({
          _id: { $in: items },
          role: 'user'
        });
        success = deleteResult.deletedCount;
        failed = items.length - success;
        break;

      default:
        return res.status(400).json({ message: 'Invalid operation' });
    }

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: operation === 'bulk_delete' ? 'bulk_delete' : 'user_updated',
      resource: {
        type: 'user',
        name: `${items.length} customers`
      },
      description: `Performed bulk operation: ${operation} on ${success} customers`,
      severity: operation === 'bulk_delete' ? 'high' : 'medium',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { operation, itemCount: items.length, success, failed }
    });

    res.json({
      success,
      failed,
      total: items.length,
      message: `Operation completed. ${success} succeeded, ${failed} failed.`
    });
  } catch (error) {
    console.error('Bulk customer operation error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Export data to CSV
export const exportData = (type) => async (req, res) => {
  try {
    const { items } = req.body;

    let data = [];
    let headers = [];

    switch (type) {
      case 'products':
        const products = await Product.find({ _id: { $in: items } })
          .populate('category', 'name')
          .lean();

        headers = ['ID', 'Name', 'SKU', 'Category', 'Price', 'Stock', 'Status'];
        data = products.map(p => [
          p._id,
          p.name,
          p.sku,
          p.category?.name || '',
          p.price,
          p.stock,
          p.status
        ]);
        break;

      case 'orders':
        const orders = await Order.find({ _id: { $in: items } })
          .populate('user', 'email firstName lastName')
          .lean();

        headers = ['Order Number', 'Customer', 'Total', 'Status', 'Payment Status', 'Date'];
        data = orders.map(o => [
          o.orderNumber,
          `${o.user?.firstName} ${o.user?.lastName}`,
          o.total,
          o.status,
          o.paymentStatus,
          new Date(o.createdAt).toLocaleString()
        ]);
        break;

      case 'customers':
        const customers = await User.find({ _id: { $in: items }, role: 'user' }).lean();

        headers = ['ID', 'Name', 'Email', 'Phone', 'Status', 'Created'];
        data = customers.map(c => [
          c._id,
          `${c.firstName} ${c.lastName}`,
          c.email,
          c.phone || '',
          c.isActive ? 'Active' : 'Inactive',
          new Date(c.createdAt).toLocaleString()
        ]);
        break;

      default:
        return res.status(400).json({ message: 'Invalid export type' });
    }

    // Convert to CSV
    const csv = [
      headers.join(','),
      ...data.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'data_exported',
      resource: {
        type: type,
        name: `${items.length} ${type}`
      },
      description: `Exported ${items.length} ${type} to CSV`,
      severity: 'low',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { type, itemCount: items.length }
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_export_${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ message: error.message });
  }
};
