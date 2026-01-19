import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Authenticate WebSocket connection
export const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database with minimal fields
    const user = await User.findById(decoded.id)
      .select('_id email firstName lastName role isActive')
      .lean();

    if (!user) {
      return next(new Error('User not found'));
    }

    if (!user.isActive) {
      return next(new Error('User account is disabled'));
    }

    // Attach user to socket
    socket.user = user;
    socket.userId = user._id.toString();
    socket.userRole = user.role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new Error('Invalid authentication token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Authentication token expired'));
    }

    console.error('WebSocket authentication error:', error.message);
    next(new Error('Authentication failed'));
  }
};

// Check if user is admin
export const isAdmin = (socket) => {
  return socket.user && (socket.user.role === 'admin' || socket.user.role === 'superadmin');
};

// Check if user is superadmin
export const isSuperAdmin = (socket) => {
  return socket.user && socket.user.role === 'superadmin';
};

// Verify user has access to order
export const canAccessOrder = async (socket, orderId) => {
  try {
    if (isAdmin(socket)) {
      return true;
    }

    const Order = (await import('../models/Order.js')).default;
    const order = await Order.findById(orderId).select('user').lean();

    if (!order) {
      return false;
    }

    return order.user.toString() === socket.userId;
  } catch (error) {
    console.error('Error checking order access:', error);
    return false;
  }
};

export default {
  authenticateSocket,
  isAdmin,
  isSuperAdmin,
  canAccessOrder
};
