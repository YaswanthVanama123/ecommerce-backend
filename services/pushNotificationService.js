/**
 * Push Notification Service
 *
 * Handles push notifications via Firebase Cloud Messaging (FCM)
 * Features:
 * - Web push notifications
 * - Mobile push (Android/iOS)
 * - Rich notifications with images
 * - Action buttons
 * - Badge counts
 * - Silent/background notifications
 */

/**
 * Send push notification to devices
 * @param {Array} devices - Array of device tokens with platform info
 * @param {String} eventType - Event type
 * @param {Object} data - Notification data
 * @param {String} priority - Notification priority
 */
export const sendPushNotification = async (devices, eventType, data, priority = 'high') => {
  try {
    // Check if Firebase Admin is configured
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
      console.log(`🔔 [PUSH PLACEHOLDER] ${eventType} push notification to ${devices.length} devices`);
      console.log('Notification:', getPushNotificationPayload(eventType, data, priority));
      return { success: true, message: 'Push notification logged (placeholder)' };
    }

    // Uncomment when Firebase credentials are available
    /*
    const admin = require('firebase-admin');

    // Initialize Firebase Admin if not already initialized
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }

    const payload = getPushNotificationPayload(eventType, data, priority);
    const tokens = devices.map(device => device.token);

    // Send multicast message
    const response = await admin.messaging().sendMulticast({
      tokens,
      ...payload
    });

    console.log(`✅ Push notifications sent: ${response.successCount} successful, ${response.failureCount} failed`);

    // Handle failed tokens (remove invalid tokens)
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log('Failed tokens:', failedTokens);
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
    */

    console.log(`🔔 [PUSH PLACEHOLDER] ${eventType} push notification to ${devices.length} devices`);
    console.log('Notification:', getPushNotificationPayload(eventType, data, priority));
    return { success: true, message: 'Push notification logged (placeholder)' };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get push notification payload based on event type
 */
const getPushNotificationPayload = (eventType, data, priority) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  const notificationContent = {
    order_placed: {
      title: '🎉 Order Placed Successfully',
      body: `Your order #${data.orderNumber} has been placed. Total: ₹${data.amount}`,
      icon: '/icons/order-placed.png',
      badge: '/icons/badge.png',
      image: data.imageUrl,
      clickAction: `${baseUrl}/orders/${data.orderId}`
    },

    payment_received: {
      title: '✅ Payment Received',
      body: `Payment of ₹${data.amount} received for order #${data.orderNumber}`,
      icon: '/icons/payment.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}`
    },

    order_confirmed: {
      title: '✓ Order Confirmed',
      body: `Order #${data.orderNumber} confirmed and being prepared`,
      icon: '/icons/confirmed.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}/track`
    },

    order_processing: {
      title: '⚙️ Order Processing',
      body: `Your order #${data.orderNumber} is being processed`,
      icon: '/icons/processing.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}`
    },

    order_shipped: {
      title: '🚚 Order Shipped',
      body: `Order #${data.orderNumber} shipped! Tracking: ${data.trackingNumber}`,
      icon: '/icons/shipped.png',
      badge: '/icons/badge.png',
      image: data.imageUrl,
      clickAction: `${baseUrl}/orders/${data.orderId}/track`,
      actions: [
        { action: 'track', title: 'Track Shipment', icon: '/icons/track.png' },
        { action: 'view', title: 'View Order', icon: '/icons/view.png' }
      ]
    },

    out_for_delivery: {
      title: '📦 Out for Delivery',
      body: `Order #${data.orderNumber} is out for delivery and will arrive soon!`,
      icon: '/icons/delivery.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}/track`,
      requireInteraction: true,
      vibrate: [200, 100, 200]
    },

    order_delivered: {
      title: '🎁 Order Delivered',
      body: `Order #${data.orderNumber} delivered! Thank you for shopping with us`,
      icon: '/icons/delivered.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}`,
      actions: [
        { action: 'review', title: 'Write Review', icon: '/icons/star.png' },
        { action: 'view', title: 'View Order', icon: '/icons/view.png' }
      ]
    },

    order_cancelled: {
      title: '❌ Order Cancelled',
      body: `Order #${data.orderNumber} has been cancelled${data.reason ? `: ${data.reason}` : ''}`,
      icon: '/icons/cancelled.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}`
    },

    return_initiated: {
      title: '↩️ Return Initiated',
      body: `Return request for order #${data.orderNumber} has been initiated`,
      icon: '/icons/return.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}`
    },

    return_approved: {
      title: '✓ Return Approved',
      body: `Return for order #${data.orderNumber} approved. Refund will be processed`,
      icon: '/icons/return-approved.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}`
    },

    refund_processed: {
      title: '💰 Refund Processed',
      body: `Refund of ₹${data.amount} for order #${data.orderNumber} has been processed`,
      icon: '/icons/refund.png',
      badge: '/icons/badge.png',
      clickAction: `${baseUrl}/orders/${data.orderId}`
    }
  };

  const content = notificationContent[eventType] || {
    title: 'Order Update',
    body: `Update for order #${data.orderNumber}`,
    icon: '/icons/notification.png',
    badge: '/icons/badge.png',
    clickAction: `${baseUrl}/orders/${data.orderId}`
  };

  // FCM payload structure
  return {
    notification: {
      title: content.title,
      body: content.body,
      icon: content.icon,
      badge: content.badge,
      image: content.image,
      clickAction: content.clickAction
    },
    data: {
      orderId: String(data.orderId || ''),
      orderNumber: String(data.orderNumber || ''),
      trackingNumber: String(data.trackingNumber || ''),
      eventType,
      clickAction: content.clickAction,
      timestamp: String(Date.now())
    },
    webpush: content.actions ? {
      notification: {
        actions: content.actions,
        requireInteraction: content.requireInteraction || false,
        vibrate: content.vibrate || [200, 100, 200],
        badge: content.badge,
        icon: content.icon,
        image: content.image
      },
      fcmOptions: {
        link: content.clickAction
      }
    } : undefined,
    android: {
      priority: priority === 'urgent' ? 'high' : 'normal',
      notification: {
        sound: 'default',
        color: '#ec4899',
        channelId: 'order_updates',
        priority: priority === 'urgent' ? 'high' : 'default',
        defaultSound: true,
        defaultVibrateTimings: true,
        icon: 'notification_icon',
        imageUrl: content.image,
        clickAction: content.clickAction
      }
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
          contentAvailable: true,
          category: 'ORDER_UPDATE',
          threadId: data.orderNumber
        }
      },
      fcmOptions: {
        imageUrl: content.image
      }
    }
  };
};

/**
 * Send silent/data-only notification (for background sync)
 * @param {Array} tokens - Device tokens
 * @param {Object} data - Data payload
 */
export const sendSilentNotification = async (tokens, data) => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.log(`🔕 [SILENT PUSH PLACEHOLDER] to ${tokens.length} devices`);
      return { success: true, message: 'Silent notification logged (placeholder)' };
    }

    // Uncomment when Firebase is configured
    /*
    const admin = require('firebase-admin');

    const response = await admin.messaging().sendMulticast({
      tokens,
      data: {
        ...data,
        timestamp: String(Date.now())
      },
      android: {
        priority: 'high'
      },
      apns: {
        headers: {
          'apns-priority': '5',
          'apns-push-type': 'background'
        },
        payload: {
          aps: {
            contentAvailable: true
          }
        }
      }
    });

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount
    };
    */

    console.log(`🔕 [SILENT PUSH PLACEHOLDER] to ${tokens.length} devices`);
    return { success: true, message: 'Silent notification logged (placeholder)' };
  } catch (error) {
    console.error('Error sending silent notification:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Subscribe device token to topic
 * @param {String} token - Device token
 * @param {String} topic - Topic name (e.g., 'order_updates', 'promotions')
 */
export const subscribeToTopic = async (token, topic) => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.log(`📌 [TOPIC SUBSCRIBE PLACEHOLDER] ${token} to ${topic}`);
      return { success: true, message: 'Topic subscription logged (placeholder)' };
    }

    // Uncomment when Firebase is configured
    /*
    const admin = require('firebase-admin');

    const response = await admin.messaging().subscribeToTopic(token, topic);

    return { success: true, message: `Subscribed to ${topic}` };
    */

    console.log(`📌 [TOPIC SUBSCRIBE PLACEHOLDER] ${token} to ${topic}`);
    return { success: true, message: 'Topic subscription logged (placeholder)' };
  } catch (error) {
    console.error('Error subscribing to topic:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Unsubscribe device token from topic
 * @param {String} token - Device token
 * @param {String} topic - Topic name
 */
export const unsubscribeFromTopic = async (token, topic) => {
  try {
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.log(`📌 [TOPIC UNSUBSCRIBE PLACEHOLDER] ${token} from ${topic}`);
      return { success: true, message: 'Topic unsubscription logged (placeholder)' };
    }

    // Uncomment when Firebase is configured
    /*
    const admin = require('firebase-admin');

    const response = await admin.messaging().unsubscribeFromTopic(token, topic);

    return { success: true, message: `Unsubscribed from ${topic}` };
    */

    console.log(`📌 [TOPIC UNSUBSCRIBE PLACEHOLDER] ${token} from ${topic}`);
    return { success: true, message: 'Topic unsubscription logged (placeholder)' };
  } catch (error) {
    console.error('Error unsubscribing from topic:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendPushNotification,
  sendSilentNotification,
  subscribeToTopic,
  unsubscribeFromTopic
};
