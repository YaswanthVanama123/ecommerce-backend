import mongoose from 'mongoose';
import Shipping from '../models/Shipping.js';
import Order from '../models/Order.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { sendOrderShippedEmail } from '../utils/emailService.js';

// Helper function to generate tracking number
const generateTrackingNumber = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `SHIP-${year}${month}${day}-${random}`;
};

// @desc    Create shipping entry for an order
// @route   POST /api/shipping
// @access  Private/Admin
export const createShipping = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const {
      orderId,
      carrier = 'other',
      estimatedDeliveryDate,
      weight,
      dimensions,
      notes = ''
    } = req.body;

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user', 'email firstName lastName')
      .session(session);

    if (!order) {
      await session.abortTransaction();
      return sendError(res, 404, 'Order not found');
    }

    // Check if shipping entry already exists
    const existingShipping = await Shipping.findOne({ order: orderId }).session(session);
    if (existingShipping) {
      await session.abortTransaction();
      return sendError(res, 400, 'Shipping entry already exists for this order');
    }

    // Generate tracking number
    const trackingNumber = generateTrackingNumber();

    // Prepare recipient info from order
    const recipientInfo = {
      name: order.shippingAddress.fullName || `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
      phone: order.shippingAddress.phone,
      address: {
        addressLine1: order.shippingAddress.addressLine1,
        addressLine2: order.shippingAddress.addressLine2 || '',
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        zipCode: order.shippingAddress.zipCode || order.shippingAddress.pincode,
        country: order.shippingAddress.country || 'India'
      }
    };

    // Create shipping entry
    const shipping = await Shipping.create([{
      order: orderId,
      trackingNumber,
      carrier,
      status: 'pending',
      estimatedDeliveryDate: estimatedDeliveryDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
      currentLocation: 'Warehouse',
      shipmentDetails: {
        weight: weight || 1,
        dimensions: dimensions || { length: 10, width: 10, height: 10, unit: 'cm' },
        package_count: 1
      },
      recipientInfo,
      notes
    }], { session });

    // Update order with shipping reference and tracking number
    order.shipping = shipping[0]._id;
    order.trackingNumber = trackingNumber;
    order.shippingStatus = 'shipped';

    // Update order status to shipped if it's processing
    if (order.orderStatus === 'processing') {
      order.updateStatus('shipped', 'Order shipped');
    }

    await order.save({ session });

    await session.commitTransaction();

    // Send shipping notification email (non-blocking)
    try {
      if (order.user && order.user.email) {
        await sendOrderShippedEmail(order.user.email, {
          orderNumber: order.orderNumber,
          trackingNumber: trackingNumber,
          carrier: carrier,
          estimatedDelivery: shipping[0].estimatedDeliveryDate
        });
      }
    } catch (emailError) {
      console.error('Failed to send shipping email:', emailError);
    }

    sendSuccess(res, 201, shipping[0], 'Shipping entry created successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Track shipment by tracking number
// @route   GET /api/shipping/track/:trackingNumber
// @access  Public
export const trackShipment = async (req, res, next) => {
  try {
    const { trackingNumber } = req.params;

    const shipping = await Shipping.findOne({
      trackingNumber: trackingNumber.toUpperCase()
    })
      .populate('order', 'orderNumber totalAmount orderStatus createdAt')
      .lean();

    if (!shipping) {
      return sendError(res, 404, 'Tracking number not found');
    }

    // Sort location history by timestamp (most recent first)
    if (shipping.locationHistory && shipping.locationHistory.length > 0) {
      shipping.locationHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    sendSuccess(res, 200, shipping, 'Shipping tracking information fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Alias for compatibility
export const getShippingByTrackingNumber = trackShipment;

// @desc    Get shipping details by order ID
// @route   GET /api/shipping/:orderId
// @access  Private
export const getShippingByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    // Validate order ID
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return sendError(res, 400, 'Invalid order ID');
    }

    const shipping = await Shipping.findOne({ order: orderId })
      .populate('order', 'orderNumber user totalAmount orderStatus paymentStatus createdAt')
      .lean();

    if (!shipping) {
      return sendError(res, 404, 'Shipping entry not found for this order');
    }

    // Check if user is authorized (user owns the order or is admin)
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      const order = await Order.findById(orderId).select('user');
      if (!order || order.user.toString() !== req.user._id.toString()) {
        return sendError(res, 403, 'Not authorized to view this shipping information');
      }
    }

    sendSuccess(res, 200, shipping, 'Shipping details fetched successfully');
  } catch (error) {
    next(error);
  }
};

// Alias for compatibility
export const getShippingByOrderId = getShippingByOrder;

// @desc    Update shipping status
// @route   PUT /api/shipping/:id/update
// @access  Private/Admin
export const updateShippingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, location, description, coordinates, failureReason, returnReason, signature, recipientName } = req.body;

    // Validate shipping ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid shipping ID');
    }

    const shipping = await Shipping.findById(id);

    if (!shipping) {
      return sendError(res, 404, 'Shipping entry not found');
    }

    // Update shipping status using the model method
    shipping.updateShippingStatus(status, location, description, coordinates);

    // Update additional fields based on status
    if (status === 'failed' && failureReason) {
      shipping.failureReason = failureReason;
    }

    if (status === 'returned' && returnReason) {
      shipping.returnReason = returnReason;
    }

    if (status === 'delivered') {
      if (signature) {
        shipping.signature = signature;
      }
      if (recipientName) {
        shipping.recipientName = recipientName;
      }
    }

    await shipping.save();

    // Populate order details for response
    await shipping.populate('order', 'orderNumber user totalAmount orderStatus');

    sendSuccess(res, 200, shipping, 'Shipping status updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update tracking information
// @route   PUT /api/shipping/:id/tracking
// @access  Private/Admin
export const updateTrackingInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trackingNumber, carrier, estimatedDeliveryDate, notes } = req.body;

    const shipping = await Shipping.findById(id);

    if (!shipping) {
      return sendError(res, 404, 'Shipping not found');
    }

    if (trackingNumber) shipping.trackingNumber = trackingNumber;
    if (carrier) shipping.carrier = carrier;
    if (estimatedDeliveryDate) shipping.estimatedDeliveryDate = estimatedDeliveryDate;
    if (notes !== undefined) shipping.notes = notes;

    await shipping.save();

    // Update order tracking number if changed
    if (trackingNumber) {
      await Order.findByIdAndUpdate(shipping.order, { trackingNumber });
    }

    sendSuccess(res, 200, shipping, 'Tracking information updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get all shipments (Admin)
// @route   GET /api/shipping/admin/shipments
// @access  Private/Admin
export const getAllShipments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.carrier) {
      filter.carrier = req.query.carrier;
    }

    const shipments = await Shipping.find(filter)
      .populate({
        path: 'order',
        select: 'orderNumber user totalAmount orderStatus',
        populate: {
          path: 'user',
          select: 'firstName lastName email'
        }
      })
      .select('trackingNumber carrier status estimatedDeliveryDate actualDeliveryDate currentLocation createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Shipping.countDocuments(filter);

    sendSuccess(res, 200, {
      shipments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Shipments fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Webhook endpoint for carrier updates
// @route   POST /api/shipping/webhook/carrier-update
// @access  Public (with validation)
export const handleCarrierWebhook = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { trackingNumber, status, location, timestamp, description } = req.body;

    if (!trackingNumber || !status) {
      await session.abortTransaction();
      return sendError(res, 400, 'Tracking number and status are required');
    }

    const shipping = await Shipping.findOne({ trackingNumber }).session(session);

    if (!shipping) {
      await session.abortTransaction();
      return sendError(res, 404, 'Shipping not found');
    }

    // Map carrier status to our status
    const statusMap = {
      'PICKED_UP': 'picked_up',
      'IN_TRANSIT': 'in_transit',
      'OUT_FOR_DELIVERY': 'out_for_delivery',
      'DELIVERED': 'delivered',
      'FAILED': 'failed',
      'RETURNED': 'returned'
    };

    const mappedStatus = statusMap[status.toUpperCase()] || status;

    // Update shipping
    if (location) {
      await shipping.addLocationUpdate(location, mappedStatus, description || '');
    } else {
      await shipping.changeStatus(mappedStatus, description || '');
    }

    // Update related order
    const order = await Order.findById(shipping.order).session(session);
    if (order) {
      order.shippingStatus = mappedStatus === 'delivered' ? 'delivered' :
                             mappedStatus === 'out_for_delivery' ? 'in_transit' :
                             mappedStatus === 'in_transit' ? 'in_transit' :
                             mappedStatus === 'picked_up' ? 'shipped' : order.shippingStatus;

      if (mappedStatus === 'delivered' && order.orderStatus !== 'delivered') {
        order.updateStatus('delivered', 'Order delivered successfully');
      }

      await order.save({ session });
    }

    await session.commitTransaction();

    sendSuccess(res, 200, { updated: true }, 'Carrier update processed successfully');
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// @desc    Get delivery timeline for an order
// @route   GET /api/shipping/:id/timeline
// @access  Private
export const getDeliveryTimeline = async (req, res, next) => {
  try {
    const { id } = req.params;

    const shipping = await Shipping.findById(id)
      .populate('order', 'orderNumber user')
      .lean();

    if (!shipping) {
      return sendError(res, 404, 'Shipping not found');
    }

    // Check authorization
    const order = await Order.findById(shipping.order._id);
    if (
      order.user.toString() !== req.user._id.toString() &&
      req.user.role === 'user'
    ) {
      return sendError(res, 403, 'Not authorized to view this timeline');
    }

    const timeline = shipping.locationHistory.sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    sendSuccess(res, 200, {
      trackingNumber: shipping.trackingNumber,
      status: shipping.status,
      estimatedDeliveryDate: shipping.estimatedDeliveryDate,
      actualDeliveryDate: shipping.actualDeliveryDate,
      timeline
    }, 'Delivery timeline fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Update current location
// @route   PUT /api/shipping/:id/location
// @access  Private/Admin
export const updateShippingLocation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { location, coordinates, description } = req.body;

    // Validate shipping ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'Invalid shipping ID');
    }

    const shipping = await Shipping.findById(id);

    if (!shipping) {
      return sendError(res, 404, 'Shipping entry not found');
    }

    // Update location using the model method
    shipping.updateLocation(location, coordinates, description);

    await shipping.save();

    sendSuccess(res, 200, shipping, 'Location updated successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get all shipments by carrier
// @route   GET /api/shipping/carrier/:carrier
// @access  Private/Admin
export const getShipmentsByCarrier = async (req, res, next) => {
  try {
    const { carrier } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    // Validate carrier
    const validCarriers = ['bluedart', 'delhivery', 'dtdc', 'fedex', 'aramex', 'other'];
    if (!validCarriers.includes(carrier.toLowerCase())) {
      return sendError(res, 400, 'Invalid carrier. Must be one of: bluedart, delhivery, dtdc, fedex, aramex, other');
    }

    // Build filter
    const filter = { carrier: carrier.toLowerCase() };
    if (status) {
      const validStatuses = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned'];
      if (!validStatuses.includes(status)) {
        return sendError(res, 400, 'Invalid status');
      }
      filter.status = status;
    }

    // Get shipments with pagination
    const shipments = await Shipping.find(filter)
      .populate('order', 'orderNumber user totalAmount orderStatus')
      .select('trackingNumber status currentLocation estimatedDeliveryDate actualDeliveryDate createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Shipping.countDocuments(filter);

    sendSuccess(res, 200, {
      shipments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    }, 'Shipments fetched successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get shipping statistics (Admin)
// @route   GET /api/shipping/admin/statistics
// @access  Private/Admin
export const getShippingStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.createdAt.$lte = end;
      }
    }

    // Run aggregations in parallel
    const [
      totalShipments,
      statusStats,
      carrierStats,
      deliveryPerformance,
      avgDeliveryTime
    ] = await Promise.all([
      // Total shipments
      Shipping.countDocuments(dateFilter),

      // Shipments by status
      Shipping.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),

      // Shipments by carrier
      Shipping.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$carrier',
            count: { $sum: 1 }
          }
        }
      ]),

      // Delivery performance (on-time vs delayed)
      Shipping.aggregate([
        {
          $match: {
            ...dateFilter,
            status: 'delivered'
          }
        },
        {
          $group: {
            _id: null,
            onTime: {
              $sum: {
                $cond: [
                  { $lte: ['$actualDeliveryDate', '$estimatedDeliveryDate'] },
                  1,
                  0
                ]
              }
            },
            delayed: {
              $sum: {
                $cond: [
                  { $gt: ['$actualDeliveryDate', '$estimatedDeliveryDate'] },
                  1,
                  0
                ]
              }
            },
            total: { $sum: 1 }
          }
        }
      ]),

      // Average delivery time
      Shipping.aggregate([
        {
          $match: {
            ...dateFilter,
            status: 'delivered',
            pickupDate: { $exists: true },
            actualDeliveryDate: { $exists: true }
          }
        },
        {
          $project: {
            deliveryDays: {
              $divide: [
                { $subtract: ['$actualDeliveryDate', '$pickupDate'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgDays: { $avg: '$deliveryDays' }
          }
        }
      ])
    ]);

    sendSuccess(res, 200, {
      totalShipments,
      statusStats,
      carrierStats,
      deliveryPerformance: deliveryPerformance[0] || { onTime: 0, delayed: 0, total: 0 },
      avgDeliveryTime: avgDeliveryTime[0]?.avgDays || 0
    }, 'Shipping statistics fetched successfully');
  } catch (error) {
    next(error);
  }
};

