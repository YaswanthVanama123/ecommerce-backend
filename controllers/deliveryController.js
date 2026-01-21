import DeliveryPartner from '../models/DeliveryPartner.js';
import Order from '../models/Order.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// @desc    Get delivery partner profile
// @route   GET /api/delivery/profile
// @access  Private (Delivery Partner)
export const getProfile = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findById(req.user.id);

    if (!deliveryPartner) {
      return sendError(res, 404, 'Delivery partner not found');
    }

    // Calculate stats for today, this week, and this month
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get delivery counts
    const todayDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered',
      deliveredAt: { $gte: startOfToday }
    });

    const weekDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered',
      deliveredAt: { $gte: startOfWeek }
    });

    const monthDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered',
      deliveredAt: { $gte: startOfMonth }
    });

    const totalDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered'
    });

    // Update delivery stats
    deliveryPartner.deliveryStats = {
      today: todayDeliveries,
      thisWeek: weekDeliveries,
      thisMonth: monthDeliveries,
      total: totalDeliveries
    };

    await deliveryPartner.save();

    return sendSuccess(res, 200, 'Profile fetched successfully', {
      profile: deliveryPartner,
      stats: deliveryPartner.deliveryStats
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return sendError(res, 500, 'Error fetching profile', error.message);
  }
};

// @desc    Update delivery partner profile
// @route   PUT /api/delivery/profile
// @access  Private (Delivery Partner)
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, vehicleType, vehicleNumber } = req.body;

    const deliveryPartner = await DeliveryPartner.findById(req.user.id);

    if (!deliveryPartner) {
      return sendError(res, 404, 'Delivery partner not found');
    }

    // Update fields if provided
    if (name) deliveryPartner.name = name;
    if (phone) {
      // Validate phone format
      if (!/^[0-9]{10}$/.test(phone)) {
        return sendError(res, 400, 'Invalid phone number format. Must be 10 digits.');
      }
      deliveryPartner.phone = phone;
    }
    if (vehicleType) {
      const validVehicleTypes = ['Bike', 'Scooter', 'Car', 'Van', 'Bicycle'];
      if (!validVehicleTypes.includes(vehicleType)) {
        return sendError(res, 400, `Invalid vehicle type. Must be one of: ${validVehicleTypes.join(', ')}`);
      }
      deliveryPartner.vehicleType = vehicleType;
    }
    if (vehicleNumber) deliveryPartner.vehicleNumber = vehicleNumber.toUpperCase();

    await deliveryPartner.save();

    return sendSuccess(res, 200, 'Profile updated successfully', {
      profile: deliveryPartner
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return sendError(res, 500, 'Error updating profile', error.message);
  }
};

// @desc    Toggle delivery partner active status
// @route   POST /api/delivery/toggle-status
// @access  Private (Delivery Partner)
export const toggleStatus = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findById(req.user.id);

    if (!deliveryPartner) {
      return sendError(res, 404, 'Delivery partner not found');
    }

    // Toggle the isOnline status
    deliveryPartner.isOnline = !deliveryPartner.isOnline;

    // If going offline, also update isActive
    if (!deliveryPartner.isOnline) {
      deliveryPartner.isActive = false;
    } else {
      deliveryPartner.isActive = true;
    }

    await deliveryPartner.save();

    return sendSuccess(res, 200, `Status updated to ${deliveryPartner.isOnline ? 'Online' : 'Offline'}`, {
      isOnline: deliveryPartner.isOnline,
      isActive: deliveryPartner.isActive
    });
  } catch (error) {
    console.error('Toggle status error:', error);
    return sendError(res, 500, 'Error toggling status', error.message);
  }
};

// @desc    Get delivery partner stats
// @route   GET /api/delivery/stats
// @access  Private (Delivery Partner)
export const getStats = async (req, res) => {
  try {
    const deliveryPartner = await DeliveryPartner.findById(req.user.id);

    if (!deliveryPartner) {
      return sendError(res, 404, 'Delivery partner not found');
    }

    // Get detailed stats
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered',
      deliveredAt: { $gte: startOfToday }
    });

    const weekDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered',
      deliveredAt: { $gte: startOfWeek }
    });

    const monthDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered',
      deliveredAt: { $gte: startOfMonth }
    });

    const totalDeliveries = await Order.countDocuments({
      deliveryPartner: req.user.id,
      status: 'delivered'
    });

    // Get average delivery time (in hours)
    const completedOrders = await Order.find({
      deliveryPartner: req.user.id,
      status: 'delivered',
      deliveredAt: { $exists: true }
    }).select('createdAt deliveredAt');

    let avgDeliveryTime = 0;
    if (completedOrders.length > 0) {
      const totalTime = completedOrders.reduce((sum, order) => {
        const timeDiff = order.deliveredAt - order.createdAt;
        return sum + timeDiff;
      }, 0);
      avgDeliveryTime = (totalTime / completedOrders.length) / (1000 * 60 * 60); // Convert to hours
    }

    return sendSuccess(res, 200, 'Stats fetched successfully', {
      todayDeliveries,
      weekDeliveries,
      monthDeliveries,
      totalDeliveries,
      rating: deliveryPartner.rating,
      totalRatings: deliveryPartner.totalRatings,
      avgDeliveryTime: avgDeliveryTime.toFixed(2)
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return sendError(res, 500, 'Error fetching stats', error.message);
  }
};

// @desc    Update delivery partner location
// @route   PUT /api/delivery/location
// @access  Private (Delivery Partner)
export const updateLocation = async (req, res) => {
  try {
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return sendError(res, 400, 'Latitude and longitude are required');
    }

    const deliveryPartner = await DeliveryPartner.findById(req.user.id);

    if (!deliveryPartner) {
      return sendError(res, 404, 'Delivery partner not found');
    }

    deliveryPartner.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    await deliveryPartner.save();

    return sendSuccess(res, 200, 'Location updated successfully', {
      location: deliveryPartner.currentLocation
    });
  } catch (error) {
    console.error('Update location error:', error);
    return sendError(res, 500, 'Error updating location', error.message);
  }
};

// @desc    Update delivery location during active delivery
// @route   POST /api/delivery/location
// @access  Private (Delivery Partner)
export const updateDeliveryLocation = async (req, res) => {
  try {
    const { orderId, latitude, longitude, accuracy, timestamp } = req.body;

    if (!orderId) {
      return sendError(res, 400, 'Order ID is required');
    }

    if (!latitude || !longitude) {
      return sendError(res, 400, 'Latitude and longitude are required');
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return sendError(res, 400, 'Invalid coordinates');
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Verify delivery partner is assigned to this order
    if (order.deliveryPartner && order.deliveryPartner.toString() !== req.user.id) {
      return sendError(res, 403, 'You are not assigned to this order');
    }

    // Update delivery partner's current location
    const deliveryPartner = await DeliveryPartner.findById(req.user.id);

    if (!deliveryPartner) {
      return sendError(res, 404, 'Delivery partner not found');
    }

    // Update current location
    deliveryPartner.currentLocation = {
      type: 'Point',
      coordinates: [longitude, latitude]
    };

    // Add to location history if it doesn't exist, or update if tracking is not implemented in model
    if (!order.deliveryTracking) {
      order.deliveryTracking = {
        locationHistory: []
      };
    }

    // Add location to tracking history
    if (!order.deliveryTracking.locationHistory) {
      order.deliveryTracking.locationHistory = [];
    }

    order.deliveryTracking.locationHistory.push({
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      timestamp: timestamp || new Date(),
      accuracy: accuracy || null
    });

    // Keep only last 100 location points to prevent excessive data
    if (order.deliveryTracking.locationHistory.length > 100) {
      order.deliveryTracking.locationHistory = order.deliveryTracking.locationHistory.slice(-100);
    }

    // Update last location update time
    order.deliveryTracking.lastLocationUpdate = new Date();

    // Save both documents
    await Promise.all([deliveryPartner.save(), order.save()]);

    return sendSuccess(res, 200, 'Location updated successfully', {
      location: {
        latitude,
        longitude,
        accuracy,
        timestamp: timestamp || new Date()
      },
      historyCount: order.deliveryTracking.locationHistory.length
    });
  } catch (error) {
    console.error('Update delivery location error:', error);
    return sendError(res, 500, 'Error updating location', error.message);
  }
};

// @desc    Get directions to customer
// @route   GET /api/delivery/orders/:orderId/directions
// @access  Private (Delivery Partner)
export const getDirections = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { fromLat, fromLng, toLat, toLng } = req.query;

    if (!orderId) {
      return sendError(res, 400, 'Order ID is required');
    }

    // Find the order
    const order = await Order.findById(orderId).populate('user', 'name email');

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Get customer location from shipping address
    const customerLocation = {
      latitude: toLat ? parseFloat(toLat) : null,
      longitude: toLng ? parseFloat(toLng) : null,
      address: order.shippingAddress
    };

    // Get delivery partner's current location
    let deliveryLocation = null;
    if (fromLat && fromLng) {
      deliveryLocation = {
        latitude: parseFloat(fromLat),
        longitude: parseFloat(fromLng)
      };
    } else {
      const deliveryPartner = await DeliveryPartner.findById(req.user.id);
      if (deliveryPartner && deliveryPartner.currentLocation) {
        deliveryLocation = {
          latitude: deliveryPartner.currentLocation.coordinates[1],
          longitude: deliveryPartner.currentLocation.coordinates[0]
        };
      }
    }

    if (!deliveryLocation || !customerLocation.latitude || !customerLocation.longitude) {
      return sendError(res, 400, 'Location coordinates are required');
    }

    // Calculate distance using Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      const R = 6371; // Earth's radius in kilometers
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) *
          Math.cos(toRadians(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const toRadians = (degrees) => {
      return degrees * (Math.PI / 180);
    };

    const distance = calculateDistance(
      deliveryLocation.latitude,
      deliveryLocation.longitude,
      customerLocation.latitude,
      customerLocation.longitude
    );

    // Estimate duration (assuming average speed of 30 km/h in city traffic)
    const avgSpeedKmh = 30;
    const durationMinutes = Math.round((distance / avgSpeedKmh) * 60);

    // Calculate ETA
    const eta = new Date();
    eta.setMinutes(eta.getMinutes() + durationMinutes);

    // Get simple cardinal directions
    const latDiff = customerLocation.latitude - deliveryLocation.latitude;
    const lngDiff = customerLocation.longitude - deliveryLocation.longitude;

    let direction = '';
    if (Math.abs(latDiff) > 0.001 && Math.abs(lngDiff) > 0.001) {
      const latDirection = latDiff > 0 ? 'North' : 'South';
      const lngDirection = lngDiff > 0 ? 'East' : 'West';
      direction = `${latDirection}${lngDirection}`;
    } else if (Math.abs(latDiff) > 0.001) {
      direction = latDiff > 0 ? 'North' : 'South';
    } else if (Math.abs(lngDiff) > 0.001) {
      direction = lngDiff > 0 ? 'East' : 'West';
    } else {
      direction = 'You are very close';
    }

    return sendSuccess(res, 200, 'Directions fetched successfully', {
      distance: parseFloat(distance.toFixed(2)), // in km
      duration: durationMinutes, // in minutes
      eta: eta.toISOString(),
      direction,
      from: deliveryLocation,
      to: customerLocation,
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        customerName: order.shippingAddress.fullName,
        customerPhone: order.shippingAddress.phone,
        address: order.shippingAddress
      }
    });
  } catch (error) {
    console.error('Get directions error:', error);
    return sendError(res, 500, 'Error fetching directions', error.message);
  }
};

// @desc    Get delivery order details with location
// @route   GET /api/delivery/orders/:orderId
// @access  Private (Delivery Partner)
export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('user', 'name email phone')
      .populate('items.product', 'name image');

    if (!order) {
      return sendError(res, 404, 'Order not found');
    }

    // Verify delivery partner is assigned to this order (optional check)
    if (order.deliveryPartner && order.deliveryPartner.toString() !== req.user.id) {
      return sendError(res, 403, 'You are not assigned to this order');
    }

    // Get delivery partner's current location
    const deliveryPartner = await DeliveryPartner.findById(req.user.id);
    let currentLocation = null;
    if (deliveryPartner && deliveryPartner.currentLocation) {
      currentLocation = {
        latitude: deliveryPartner.currentLocation.coordinates[1],
        longitude: deliveryPartner.currentLocation.coordinates[0]
      };
    }

    return sendSuccess(res, 200, 'Order details fetched successfully', {
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        shippingStatus: order.shippingStatus,
        items: order.items,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        customer: {
          name: order.shippingAddress.fullName,
          phone: order.shippingAddress.phone,
          address: order.shippingAddress
        },
        deliveryTracking: order.deliveryTracking,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      deliveryPartnerLocation: currentLocation
    });
  } catch (error) {
    console.error('Get order details error:', error);
    return sendError(res, 500, 'Error fetching order details', error.message);
  }
};
