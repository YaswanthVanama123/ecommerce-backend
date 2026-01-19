import Notification from '../models/Notification.js';
import NotificationPreference from '../models/NotificationPreference.js';
import User from '../models/User.js';
import { sendEmailNotification } from './emailNotificationService.js';
import { sendSMSNotification } from './smsNotificationService.js';
import { sendPushNotification } from './pushNotificationService.js';
import { sendWhatsAppNotification } from './whatsappNotificationService.js';

/**
 * Order Notifications Service
 *
 * Centralized service for sending multi-channel notifications for order events
 * Supports: Email, SMS, Push, In-App, WhatsApp
 *
 * Features:
 * - Respects user notification preferences
 * - Quiet hours support
 * - Priority-based filtering
 * - Multi-channel delivery
 * - Automatic retry logic
 * - Notification history tracking
 */

class OrderNotificationService {
  /**
   * Send notification across all enabled channels
   * @param {String} userId - User ID
   * @param {String} eventType - Event type (order_placed, order_shipped, etc.)
   * @param {Object} data - Notification data
   * @param {String} priority - Notification priority (low, medium, high, urgent)
   */
  async sendNotification(userId, eventType, data, priority = 'medium') {
    try {
      // Get user details
      const user = await User.findById(userId).select('email firstName lastName phone');
      if (!user) {
        console.error(`User not found: ${userId}`);
        return { success: false, error: 'User not found' };
      }

      // Get user notification preferences
      const preferences = await NotificationPreference.getOrCreateForUser(userId);

      const results = {
        email: null,
        sms: null,
        push: null,
        inApp: null,
        whatsapp: null
      };

      // Send in-app notification (always)
      if (preferences.shouldSendNotification('inApp', eventType, priority)) {
        results.inApp = await this.createInAppNotification(userId, eventType, data, priority);
      }

      // Send email notification
      if (preferences.shouldSendNotification('email', eventType, priority)) {
        results.email = await sendEmailNotification(user.email, eventType, {
          ...data,
          userName: `${user.firstName} ${user.lastName}`
        });
      }

      // Send SMS notification
      if (preferences.shouldSendNotification('sms', eventType, priority)) {
        const phoneNumber = preferences.channels.sms.phoneNumber || user.phone;
        if (phoneNumber) {
          results.sms = await sendSMSNotification(phoneNumber, eventType, data);
        }
      }

      // Send push notification
      if (preferences.shouldSendNotification('push', eventType, priority)) {
        const devices = preferences.channels.push.devices || [];
        if (devices.length > 0) {
          results.push = await sendPushNotification(devices, eventType, data, priority);
        }
      }

      // Send WhatsApp notification
      if (preferences.shouldSendNotification('whatsapp', eventType, priority)) {
        const phoneNumber = preferences.channels.whatsapp.phoneNumber || user.phone;
        if (phoneNumber) {
          results.whatsapp = await sendWhatsAppNotification(phoneNumber, eventType, data);
        }
      }

      return {
        success: true,
        results,
        message: 'Notifications sent successfully'
      };
    } catch (error) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create in-app notification
   */
  async createInAppNotification(userId, eventType, data, priority) {
    try {
      const notificationData = this.getNotificationContent(eventType, data);

      const notification = await Notification.create({
        user: userId,
        type: eventType,
        title: notificationData.title,
        message: notificationData.message,
        priority,
        data: {
          orderId: data.orderId,
          orderNumber: data.orderNumber,
          trackingNumber: data.trackingNumber,
          amount: data.amount,
          productName: data.productName,
          imageUrl: data.imageUrl,
          actionUrl: notificationData.actionUrl,
          metadata: data.metadata
        },
        actionUrl: notificationData.actionUrl,
        actionText: notificationData.actionText
      });

      return { success: true, notificationId: notification._id };
    } catch (error) {
      console.error('Error creating in-app notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification content based on event type
   */
  getNotificationContent(eventType, data) {
    const contents = {
      order_placed: {
        title: 'Order Placed Successfully',
        message: `Your order #${data.orderNumber} has been placed successfully. Total: ₹${data.amount}`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Order'
      },
      payment_received: {
        title: 'Payment Received',
        message: `Payment of ₹${data.amount} received for order #${data.orderNumber}`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Order'
      },
      order_confirmed: {
        title: 'Order Confirmed',
        message: `Your order #${data.orderNumber} has been confirmed and will be processed soon`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'Track Order'
      },
      order_processing: {
        title: 'Order Being Processed',
        message: `Your order #${data.orderNumber} is being processed`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'Track Order'
      },
      order_shipped: {
        title: 'Order Shipped',
        message: `Your order #${data.orderNumber} has been shipped. Tracking: ${data.trackingNumber}`,
        actionUrl: `/orders/${data.orderId}/track`,
        actionText: 'Track Shipment'
      },
      out_for_delivery: {
        title: 'Out for Delivery',
        message: `Your order #${data.orderNumber} is out for delivery and will arrive soon`,
        actionUrl: `/orders/${data.orderId}/track`,
        actionText: 'Track Delivery'
      },
      order_delivered: {
        title: 'Order Delivered',
        message: `Your order #${data.orderNumber} has been delivered. Thank you for shopping with us!`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Order'
      },
      order_cancelled: {
        title: 'Order Cancelled',
        message: `Your order #${data.orderNumber} has been cancelled. ${data.reason || ''}`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Details'
      },
      return_initiated: {
        title: 'Return Initiated',
        message: `Return request for order #${data.orderNumber} has been initiated`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Return'
      },
      return_approved: {
        title: 'Return Approved',
        message: `Return request for order #${data.orderNumber} has been approved`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Details'
      },
      refund_processed: {
        title: 'Refund Processed',
        message: `Refund of ₹${data.amount} for order #${data.orderNumber} has been processed`,
        actionUrl: `/orders/${data.orderId}`,
        actionText: 'View Order'
      }
    };

    return contents[eventType] || {
      title: 'Order Update',
      message: `Update for order #${data.orderNumber}`,
      actionUrl: `/orders/${data.orderId}`,
      actionText: 'View Order'
    };
  }

  /**
   * Order lifecycle notification methods
   */

  async notifyOrderPlaced(order, user) {
    return this.sendNotification(
      user._id,
      'order_placed',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        items: order.items,
        shippingAddress: order.shippingAddress,
        paymentMethod: order.paymentMethod
      },
      'high'
    );
  }

  async notifyPaymentReceived(order, user, paymentDetails) {
    return this.sendNotification(
      user._id,
      'payment_received',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        transactionId: paymentDetails.transactionId,
        paymentMethod: order.paymentMethod
      },
      'high'
    );
  }

  async notifyOrderConfirmed(order, user) {
    return this.sendNotification(
      user._id,
      'order_confirmed',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: order.totalAmount,
        estimatedDelivery: order.estimatedDelivery
      },
      'medium'
    );
  }

  async notifyOrderProcessing(order, user) {
    return this.sendNotification(
      user._id,
      'order_processing',
      {
        orderId: order._id,
        orderNumber: order.orderNumber
      },
      'low'
    );
  }

  async notifyOrderShipped(order, user, shipping) {
    return this.sendNotification(
      user._id,
      'order_shipped',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: shipping.trackingNumber,
        carrier: shipping.carrier,
        estimatedDelivery: shipping.estimatedDeliveryDate,
        trackingUrl: shipping.trackingUrl
      },
      'high'
    );
  }

  async notifyOutForDelivery(order, user, shipping) {
    return this.sendNotification(
      user._id,
      'out_for_delivery',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        trackingNumber: shipping.trackingNumber,
        estimatedDelivery: shipping.estimatedDeliveryDate
      },
      'urgent'
    );
  }

  async notifyOrderDelivered(order, user) {
    return this.sendNotification(
      user._id,
      'order_delivered',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        deliveredAt: order.deliveredAt
      },
      'high'
    );
  }

  async notifyOrderCancelled(order, user, reason) {
    return this.sendNotification(
      user._id,
      'order_cancelled',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        reason: reason,
        refundAmount: order.paymentStatus === 'completed' ? order.totalAmount : 0
      },
      'high'
    );
  }

  async notifyReturnInitiated(order, user, returnDetails) {
    return this.sendNotification(
      user._id,
      'return_initiated',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnReason: returnDetails.reason,
        returnId: returnDetails.returnId
      },
      'medium'
    );
  }

  async notifyReturnApproved(order, user, returnDetails) {
    return this.sendNotification(
      user._id,
      'return_approved',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnId: returnDetails.returnId,
        refundAmount: returnDetails.refundAmount
      },
      'high'
    );
  }

  async notifyRefundProcessed(order, user, refundDetails) {
    return this.sendNotification(
      user._id,
      'refund_processed',
      {
        orderId: order._id,
        orderNumber: order.orderNumber,
        amount: refundDetails.amount,
        transactionId: refundDetails.transactionId,
        refundMethod: refundDetails.method
      },
      'high'
    );
  }

  /**
   * Admin notifications
   */

  async notifyAdminNewOrder(order) {
    // Get all admin users
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });

    const notificationPromises = admins.map(admin =>
      this.createInAppNotification(
        admin._id,
        'order_placed',
        {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.totalAmount,
          customerName: `${order.shippingAddress.fullName}`,
          metadata: { isAdminNotification: true }
        },
        'high'
      )
    );

    return Promise.allSettled(notificationPromises);
  }

  async notifyAdminLowStock(product, currentStock) {
    const admins = await User.find({ role: { $in: ['admin', 'superadmin'] } });

    const notificationPromises = admins.map(admin =>
      this.createInAppNotification(
        admin._id,
        'low_stock',
        {
          productId: product._id,
          productName: product.name,
          currentStock,
          metadata: { isAdminNotification: true, alertType: 'inventory' }
        },
        'urgent'
      )
    );

    return Promise.allSettled(notificationPromises);
  }

  /**
   * Bulk notification methods
   */

  async sendBulkNotification(userIds, eventType, data, priority = 'medium') {
    const promises = userIds.map(userId =>
      this.sendNotification(userId, eventType, data, priority)
    );

    return Promise.allSettled(promises);
  }

  /**
   * Get notification statistics
   */

  async getNotificationStats(userId) {
    const [total, unread, byType] = await Promise.all([
      Notification.countDocuments({ user: userId }),
      Notification.countDocuments({ user: userId, read: false }),
      Notification.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    return {
      total,
      unread,
      byType: byType.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {})
    };
  }
}

// Export singleton instance
export default new OrderNotificationService();
