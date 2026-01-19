import User from '../models/User.js';
import Order from '../models/Order.js';

// Get all customers with pagination and filters
export const getCustomers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status;
    const dateFrom = req.query.dateFrom;
    const dateTo = req.query.dateTo;
    const minPurchase = parseFloat(req.query.minPurchase) || 0;
    const maxPurchase = parseFloat(req.query.maxPurchase);

    // Build filter query
    const filter = { role: 'customer' };

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      }
    }

    // Date filter
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        filter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.createdAt.$lte = new Date(dateTo);
      }
    }

    // Get customers
    const customers = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count
    const total = await User.countDocuments(filter);

    // Get order data for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({ user: customer._id });
        const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const orderCount = orders.length;
        const lastOrderDate = orders.length > 0
          ? orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0].createdAt
          : null;

        return {
          ...customer.toObject(),
          totalSpent,
          orderCount,
          lastOrderDate
        };
      })
    );

    // Apply purchase amount filter
    let filteredCustomers = customersWithStats;
    if (minPurchase > 0 || maxPurchase) {
      filteredCustomers = customersWithStats.filter(customer => {
        const spent = customer.totalSpent;
        if (minPurchase > 0 && spent < minPurchase) return false;
        if (maxPurchase && spent > maxPurchase) return false;
        return true;
      });
    }

    res.json({
      success: true,
      data: {
        customers: filteredCustomers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customers',
      error: error.message
    });
  }
};

// Get single customer details
export const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await User.findById(id).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer orders
    const orders = await Order.find({ user: customer._id })
      .sort({ createdAt: -1 });

    // Calculate statistics
    const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const orderCount = orders.length;
    const averageOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    const completedOrders = orders.filter(order => order.status === 'delivered').length;
    const pendingOrders = orders.filter(order =>
      ['pending', 'processing', 'shipped'].includes(order.status)
    ).length;
    const cancelledOrders = orders.filter(order => order.status === 'cancelled').length;

    const lastOrderDate = orders.length > 0 ? orders[0].createdAt : null;
    const firstOrderDate = orders.length > 0 ? orders[orders.length - 1].createdAt : null;

    res.json({
      success: true,
      data: {
        customer: {
          ...customer.toObject(),
          statistics: {
            totalSpent,
            orderCount,
            averageOrderValue,
            completedOrders,
            pendingOrders,
            cancelledOrders,
            lastOrderDate,
            firstOrderDate,
            lifetimeValue: totalSpent
          }
        }
      }
    });
  } catch (error) {
    console.error('Get customer by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer details',
      error: error.message
    });
  }
};

// Get customer order history
export const getCustomerOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Verify customer exists
    const customer = await User.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get orders
    const orders = await Order.find({ user: id })
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ user: id });

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer orders',
      error: error.message
    });
  }
};

// Update customer
export const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Don't allow password or role updates through this endpoint
    delete updates.password;
    delete updates.role;

    const customer = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer updated successfully',
      data: { customer }
    });
  } catch (error) {
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating customer',
      error: error.message
    });
  }
};

// Delete/deactivate customer
export const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { permanent } = req.query;

    if (permanent === 'true') {
      // Permanent deletion (use with caution)
      const customer = await User.findByIdAndDelete(id);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      res.json({
        success: true,
        message: 'Customer permanently deleted'
      });
    } else {
      // Soft delete - just deactivate
      const customer = await User.findByIdAndUpdate(
        id,
        { $set: { isActive: false } },
        { new: true }
      ).select('-password');

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      res.json({
        success: true,
        message: 'Customer deactivated successfully',
        data: { customer }
      });
    }
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting customer',
      error: error.message
    });
  }
};

// Get customer statistics
export const getCustomerStatistics = async (req, res) => {
  try {
    // Total customers
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const activeCustomers = await User.countDocuments({ role: 'customer', isActive: true });
    const inactiveCustomers = totalCustomers - activeCustomers;

    // New customers (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCustomers = await User.countDocuments({
      role: 'customer',
      createdAt: { $gte: thirtyDaysAgo }
    });

    // Get all customers with their orders
    const customers = await User.find({ role: 'customer' });

    let totalRevenue = 0;
    let totalOrders = 0;
    const customerLifetimeValues = [];

    for (const customer of customers) {
      const orders = await Order.find({ user: customer._id });
      const customerSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      totalRevenue += customerSpent;
      totalOrders += orders.length;

      if (customerSpent > 0) {
        customerLifetimeValues.push(customerSpent);
      }
    }

    const averageLifetimeValue = customerLifetimeValues.length > 0
      ? customerLifetimeValues.reduce((a, b) => a + b, 0) / customerLifetimeValues.length
      : 0;

    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top customers by spending
    const customersWithSpending = await Promise.all(
      customers.map(async (customer) => {
        const orders = await Order.find({ user: customer._id });
        const totalSpent = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        return {
          _id: customer._id,
          name: customer.name,
          email: customer.email,
          totalSpent,
          orderCount: orders.length
        };
      })
    );

    const topCustomers = customersWithSpending
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10);

    // Customer growth (last 6 months)
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const count = await User.countDocuments({
        role: 'customer',
        createdAt: { $gte: monthStart, $lte: monthEnd }
      });

      monthlyGrowth.push({
        month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
        count
      });
    }

    res.json({
      success: true,
      data: {
        overview: {
          totalCustomers,
          activeCustomers,
          inactiveCustomers,
          newCustomers
        },
        revenue: {
          totalRevenue,
          averageLifetimeValue,
          averageOrderValue
        },
        topCustomers,
        monthlyGrowth
      }
    });
  } catch (error) {
    console.error('Get customer statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching customer statistics',
      error: error.message
    });
  }
};
