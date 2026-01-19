/**
 * Advanced Order Query Builder Service
 * Handles complex search, filter, and sort operations for orders
 * Similar to Myntra/Meesho advanced search capabilities
 */

import Order from '../models/Order.js';
import User from '../models/User.js';

class OrderQueryBuilder {
  constructor() {
    this.query = {};
    this.sortOptions = {};
    this.populateOptions = [];
    this.selectFields = '';
    this.page = 1;
    this.limit = 10;
  }

  /**
   * Filter by order status
   */
  filterByStatus(status) {
    if (status && Array.isArray(status) && status.length > 0) {
      this.query.orderStatus = { $in: status };
    } else if (status && status !== 'all') {
      this.query.orderStatus = status;
    }
    return this;
  }

  /**
   * Filter by payment status
   */
  filterByPaymentStatus(paymentStatus) {
    if (paymentStatus && Array.isArray(paymentStatus) && paymentStatus.length > 0) {
      this.query.paymentStatus = { $in: paymentStatus };
    } else if (paymentStatus && paymentStatus !== 'all') {
      this.query.paymentStatus = paymentStatus;
    }
    return this;
  }

  /**
   * Filter by payment method
   */
  filterByPaymentMethod(paymentMethod) {
    if (paymentMethod && Array.isArray(paymentMethod) && paymentMethod.length > 0) {
      this.query.paymentMethod = { $in: paymentMethod };
    } else if (paymentMethod && paymentMethod !== 'all') {
      this.query.paymentMethod = paymentMethod;
    }
    return this;
  }

  /**
   * Filter by shipping status
   */
  filterByShippingStatus(shippingStatus) {
    if (shippingStatus && Array.isArray(shippingStatus) && shippingStatus.length > 0) {
      this.query.shippingStatus = { $in: shippingStatus };
    } else if (shippingStatus && shippingStatus !== 'all') {
      this.query.shippingStatus = shippingStatus;
    }
    return this;
  }

  /**
   * Filter by date range
   */
  filterByDateRange(startDate, endDate) {
    if (startDate || endDate) {
      this.query.createdAt = {};

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        this.query.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        this.query.createdAt.$lte = end;
      }
    }
    return this;
  }

  /**
   * Filter by date preset (last 7 days, 30 days, etc.)
   */
  filterByDatePreset(preset) {
    const now = new Date();
    const presets = {
      'today': () => {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        return { $gte: start };
      },
      'yesterday': () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { $gte: start, $lte: end };
      },
      'last_7_days': () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        return { $gte: start };
      },
      'last_30_days': () => {
        const start = new Date(now);
        start.setDate(start.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        return { $gte: start };
      },
      'last_3_months': () => {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 3);
        start.setHours(0, 0, 0, 0);
        return { $gte: start };
      },
      'last_6_months': () => {
        const start = new Date(now);
        start.setMonth(start.getMonth() - 6);
        start.setHours(0, 0, 0, 0);
        return { $gte: start };
      },
      'this_month': () => {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { $gte: start };
      },
      'last_month': () => {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return { $gte: start, $lte: end };
      }
    };

    if (preset && presets[preset]) {
      this.query.createdAt = presets[preset]();
    }
    return this;
  }

  /**
   * Filter by price range
   */
  filterByPriceRange(minPrice, maxPrice) {
    if (minPrice !== undefined || maxPrice !== undefined) {
      this.query.totalAmount = {};

      if (minPrice !== undefined && minPrice !== '') {
        this.query.totalAmount.$gte = parseFloat(minPrice);
      }

      if (maxPrice !== undefined && maxPrice !== '') {
        this.query.totalAmount.$lte = parseFloat(maxPrice);
      }
    }
    return this;
  }

  /**
   * Search by order ID or order number
   */
  searchByOrderId(orderId) {
    if (orderId) {
      // Search in both _id and orderNumber
      const searchPattern = new RegExp(orderId, 'i');
      this.query.$or = [
        { orderNumber: searchPattern }
      ];

      // If it's a valid ObjectId format, also search by _id
      if (orderId.match(/^[0-9a-fA-F]{24}$/)) {
        this.query.$or.push({ _id: orderId });
      }
    }
    return this;
  }

  /**
   * Search by tracking number
   */
  searchByTrackingNumber(trackingNumber) {
    if (trackingNumber) {
      this.query.trackingNumber = new RegExp(trackingNumber, 'i');
    }
    return this;
  }

  /**
   * Full-text search on product names in order items
   */
  searchByProductName(productName) {
    if (productName) {
      this.query['items.name'] = new RegExp(productName, 'i');
    }
    return this;
  }

  /**
   * Search by customer name, email, or phone
   * This requires populating the user and searching in shipping address
   */
  async searchByCustomer(searchText) {
    if (searchText) {
      const searchPattern = new RegExp(searchText, 'i');

      // Search in User collection first to get user IDs
      const users = await User.find({
        $or: [
          { firstName: searchPattern },
          { lastName: searchPattern },
          { email: searchPattern },
          { phone: searchPattern }
        ]
      }).select('_id').lean();

      const userIds = users.map(u => u._id);

      // Build query to search in both user references and shipping address
      const customerQuery = {
        $or: [
          { user: { $in: userIds } },
          { 'shippingAddress.fullName': searchPattern },
          { 'shippingAddress.phone': searchPattern }
        ]
      };

      // Merge with existing query
      if (this.query.$or) {
        this.query.$and = [
          { $or: this.query.$or },
          customerQuery
        ];
        delete this.query.$or;
      } else {
        Object.assign(this.query, customerQuery);
      }
    }
    return this;
  }

  /**
   * Filter by user ID (for user's own orders)
   */
  filterByUser(userId) {
    if (userId) {
      this.query.user = userId;
    }
    return this;
  }

  /**
   * Combined search across multiple fields
   */
  async globalSearch(searchText) {
    if (searchText) {
      const searchPattern = new RegExp(searchText, 'i');

      // Search in User collection
      const users = await User.find({
        $or: [
          { firstName: searchPattern },
          { lastName: searchPattern },
          { email: searchPattern },
          { phone: searchPattern }
        ]
      }).select('_id').lean();

      const userIds = users.map(u => u._id);

      // Build comprehensive search query
      const searchQueries = [
        { orderNumber: searchPattern },
        { trackingNumber: searchPattern },
        { 'items.name': searchPattern },
        { 'shippingAddress.fullName': searchPattern },
        { 'shippingAddress.phone': searchPattern },
        { user: { $in: userIds } }
      ];

      // If it looks like an ObjectId, search by _id too
      if (searchText.match(/^[0-9a-fA-F]{24}$/)) {
        searchQueries.push({ _id: searchText });
      }

      this.query.$or = searchQueries;
    }
    return this;
  }

  /**
   * Sort results
   */
  sortBy(sortField, sortOrder = 'desc') {
    const sortMap = {
      'date_desc': { createdAt: -1 },
      'date_asc': { createdAt: 1 },
      'amount_desc': { totalAmount: -1 },
      'amount_asc': { totalAmount: 1 },
      'status': { orderStatus: 1, createdAt: -1 },
      'customer': { 'shippingAddress.fullName': 1 }
    };

    if (sortField && sortMap[sortField]) {
      this.sortOptions = sortMap[sortField];
    } else {
      // Default or custom sort
      const order = sortOrder === 'asc' ? 1 : -1;
      this.sortOptions = { [sortField || 'createdAt']: order };
    }

    return this;
  }

  /**
   * Set pagination
   */
  paginate(page = 1, limit = 10) {
    this.page = parseInt(page) || 1;
    this.limit = parseInt(limit) || 10;

    // Ensure limit doesn't exceed maximum
    if (this.limit > 100) {
      this.limit = 100;
    }

    return this;
  }

  /**
   * Select specific fields
   */
  select(fields) {
    this.selectFields = fields;
    return this;
  }

  /**
   * Add population
   */
  populate(field, select = '') {
    this.populateOptions.push({ path: field, select });
    return this;
  }

  /**
   * Execute the query
   */
  async execute() {
    const skip = (this.page - 1) * this.limit;

    // Build the query
    let queryBuilder = Order.find(this.query);

    // Apply sorting
    if (Object.keys(this.sortOptions).length > 0) {
      queryBuilder = queryBuilder.sort(this.sortOptions);
    }

    // Apply population
    if (this.populateOptions.length > 0) {
      this.populateOptions.forEach(pop => {
        queryBuilder = queryBuilder.populate(pop.path, pop.select);
      });
    }

    // Apply field selection
    if (this.selectFields) {
      queryBuilder = queryBuilder.select(this.selectFields);
    }

    // Apply pagination
    queryBuilder = queryBuilder.skip(skip).limit(this.limit).lean();

    // Execute query and count in parallel
    const [orders, total] = await Promise.all([
      queryBuilder.exec(),
      Order.countDocuments(this.query)
    ]);

    return {
      orders,
      pagination: {
        page: this.page,
        limit: this.limit,
        total,
        pages: Math.ceil(total / this.limit),
        hasNextPage: this.page < Math.ceil(total / this.limit),
        hasPrevPage: this.page > 1
      }
    };
  }

  /**
   * Get the raw query (for debugging or custom execution)
   */
  getQuery() {
    return this.query;
  }

  /**
   * Reset the query builder
   */
  reset() {
    this.query = {};
    this.sortOptions = {};
    this.populateOptions = [];
    this.selectFields = '';
    this.page = 1;
    this.limit = 10;
    return this;
  }
}

export default OrderQueryBuilder;
