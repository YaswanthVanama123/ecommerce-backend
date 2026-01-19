import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

let io = null;

// Initialize Socket.IO server
export const initializeSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from database
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.user = user;
      next();
    } catch (error) {
      console.error('WebSocket authentication error:', error.message);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`WebSocket: User connected - ${socket.user.email} (${socket.user.role})`);

    // Join user-specific room
    socket.join(`user:${socket.user._id}`);

    // Join role-based rooms
    if (socket.user.role === 'admin' || socket.user.role === 'superadmin') {
      socket.join('admin:room');
      console.log(`WebSocket: Admin joined admin room - ${socket.user.email}`);
    }

    // Send connection confirmation
    socket.emit('connected', {
      message: 'Connected to real-time order updates',
      userId: socket.user._id,
      role: socket.user.role
    });

    // Handle subscription to specific order
    socket.on('subscribe:order', (orderId) => {
      socket.join(`order:${orderId}`);
      console.log(`WebSocket: User ${socket.user.email} subscribed to order ${orderId}`);
    });

    // Handle unsubscription from specific order
    socket.on('unsubscribe:order', (orderId) => {
      socket.leave(`order:${orderId}`);
      console.log(`WebSocket: User ${socket.user.email} unsubscribed from order ${orderId}`);
    });

    // Handle manual disconnect
    socket.on('disconnect', (reason) => {
      console.log(`WebSocket: User disconnected - ${socket.user.email}, Reason: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`WebSocket error for ${socket.user.email}:`, error);
    });
  });

  console.log('WebSocket server initialized successfully');
  return io;
};

// Get Socket.IO instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Emit order created event
export const emitOrderCreated = (order, userId) => {
  if (!io) return;

  try {
    const orderData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      items: order.items,
      createdAt: order.createdAt
    };

    // Emit to specific user
    io.to(`user:${userId}`).emit('order:created', orderData);

    // Emit to all admins
    io.to('admin:room').emit('order:new', orderData);

    console.log(`WebSocket: Order created event emitted - ${order.orderNumber}`);
  } catch (error) {
    console.error('Error emitting order created event:', error);
  }
};

// Emit order updated event
export const emitOrderUpdated = (order, userId) => {
  if (!io) return;

  try {
    const orderData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      items: order.items,
      updatedAt: order.updatedAt || new Date()
    };

    // Emit to specific user
    io.to(`user:${userId}`).emit('order:updated', orderData);

    // Emit to specific order subscribers
    io.to(`order:${order._id}`).emit('order:updated', orderData);

    // Emit to all admins
    io.to('admin:room').emit('order:updated', orderData);

    console.log(`WebSocket: Order updated event emitted - ${order.orderNumber}`);
  } catch (error) {
    console.error('Error emitting order updated event:', error);
  }
};

// Emit order status changed event
export const emitOrderStatusChanged = (order, userId, previousStatus) => {
  if (!io) return;

  try {
    const statusData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      previousStatus,
      newStatus: order.orderStatus,
      statusHistory: order.statusHistory,
      updatedAt: new Date()
    };

    // Emit to specific user with notification
    io.to(`user:${userId}`).emit('order:status_changed', {
      ...statusData,
      notification: {
        title: 'Order Status Updated',
        message: `Your order #${order.orderNumber} is now ${order.orderStatus}`,
        type: 'info'
      }
    });

    // Emit to specific order subscribers
    io.to(`order:${order._id}`).emit('order:status_changed', statusData);

    // Emit to all admins
    io.to('admin:room').emit('order:status_changed', statusData);

    console.log(`WebSocket: Order status changed - ${order.orderNumber} (${previousStatus} -> ${order.orderStatus})`);
  } catch (error) {
    console.error('Error emitting order status changed event:', error);
  }
};

// Emit payment status updated event
export const emitPaymentStatusUpdated = (order, userId) => {
  if (!io) return;

  try {
    const paymentData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      paymentDetails: order.paymentDetails,
      updatedAt: new Date()
    };

    // Emit to specific user with notification
    io.to(`user:${userId}`).emit('order:payment_updated', {
      ...paymentData,
      notification: {
        title: 'Payment Status Updated',
        message: `Payment for order #${order.orderNumber} is ${order.paymentStatus}`,
        type: order.paymentStatus === 'completed' ? 'success' : 'info'
      }
    });

    // Emit to specific order subscribers
    io.to(`order:${order._id}`).emit('order:payment_updated', paymentData);

    // Emit to all admins
    io.to('admin:room').emit('order:payment_updated', paymentData);

    console.log(`WebSocket: Payment status updated - ${order.orderNumber} (${order.paymentStatus})`);
  } catch (error) {
    console.error('Error emitting payment status updated event:', error);
  }
};

// Emit order cancelled event
export const emitOrderCancelled = (order, userId, reason) => {
  if (!io) return;

  try {
    const cancelData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      cancellationReason: reason,
      cancelledAt: order.cancelledAt || new Date()
    };

    // Emit to specific user with notification
    io.to(`user:${userId}`).emit('order:cancelled', {
      ...cancelData,
      notification: {
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} has been cancelled`,
        type: 'warning'
      }
    });

    // Emit to specific order subscribers
    io.to(`order:${order._id}`).emit('order:cancelled', cancelData);

    // Emit to all admins
    io.to('admin:room').emit('order:cancelled', cancelData);

    console.log(`WebSocket: Order cancelled - ${order.orderNumber}`);
  } catch (error) {
    console.error('Error emitting order cancelled event:', error);
  }
};

// Emit order assignment notification (for admins)
export const emitOrderAssigned = (order, adminId) => {
  if (!io) return;

  try {
    const assignmentData = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      assignedTo: adminId,
      assignedAt: new Date()
    };

    // Emit to specific admin
    io.to(`user:${adminId}`).emit('order:assigned', {
      ...assignmentData,
      notification: {
        title: 'New Order Assigned',
        message: `Order #${order.orderNumber} has been assigned to you`,
        type: 'info'
      }
    });

    // Emit to all admins
    io.to('admin:room').emit('order:assigned', assignmentData);

    console.log(`WebSocket: Order assigned - ${order.orderNumber} to admin ${adminId}`);
  } catch (error) {
    console.error('Error emitting order assigned event:', error);
  }
};

// Emit bulk order count update for admins
export const emitOrderCountUpdate = (counts) => {
  if (!io) return;

  try {
    io.to('admin:room').emit('orders:count_update', {
      total: counts.total || 0,
      pending: counts.pending || 0,
      processing: counts.processing || 0,
      shipped: counts.shipped || 0,
      delivered: counts.delivered || 0,
      cancelled: counts.cancelled || 0,
      updatedAt: new Date()
    });

    console.log('WebSocket: Order count update emitted to admins');
  } catch (error) {
    console.error('Error emitting order count update:', error);
  }
};

// Emit new order alert for admins
export const emitNewOrderAlert = (order) => {
  if (!io) return;

  try {
    io.to('admin:room').emit('order:alert', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      itemsCount: order.items.length,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      notification: {
        title: 'New Order Received',
        message: `Order #${order.orderNumber} - Rs. ${order.totalAmount}`,
        type: 'success'
      }
    });

    console.log(`WebSocket: New order alert emitted - ${order.orderNumber}`);
  } catch (error) {
    console.error('Error emitting new order alert:', error);
  }
};

export default {
  initializeSocketIO,
  getIO,
  emitOrderCreated,
  emitOrderUpdated,
  emitOrderStatusChanged,
  emitPaymentStatusUpdated,
  emitOrderCancelled,
  emitOrderAssigned,
  emitOrderCountUpdate,
  emitNewOrderAlert
};
