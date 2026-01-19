/**
 * WhatsApp Notification Service
 *
 * Handles WhatsApp notifications via Twilio WhatsApp API or WhatsApp Business API
 * Features:
 * - Template-based messages
 * - Rich media support
 * - Quick reply buttons
 * - Important updates only
 */

/**
 * Send WhatsApp notification
 * @param {String} phoneNumber - Recipient phone number (with country code)
 * @param {String} eventType - Event type
 * @param {Object} data - WhatsApp message data
 */
export const sendWhatsAppNotification = async (phoneNumber, eventType, data) => {
  try {
    // Check if Twilio WhatsApp is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
      console.log(`💬 [WHATSAPP PLACEHOLDER] ${eventType} WhatsApp to ${phoneNumber}`);
      console.log('Message:', getWhatsAppMessage(eventType, data));
      return { success: true, message: 'WhatsApp notification logged (placeholder)' };
    }

    // Uncomment when Twilio WhatsApp is configured
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = getWhatsAppMessage(eventType, data);

    // Format phone number for WhatsApp (must include country code)
    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const whatsappNumber = `whatsapp:${formattedNumber}`;
    const whatsappFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

    const result = await client.messages.create({
      body: message,
      from: whatsappFrom,
      to: whatsappNumber
    });

    console.log(`✅ WhatsApp message sent successfully to ${phoneNumber}: ${result.sid}`);
    return { success: true, messageId: result.sid };
    */

    console.log(`💬 [WHATSAPP PLACEHOLDER] ${eventType} WhatsApp to ${phoneNumber}`);
    console.log('Message:', getWhatsAppMessage(eventType, data));
    return { success: true, message: 'WhatsApp notification logged (placeholder)' };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get WhatsApp message content based on event type
 */
const getWhatsAppMessage = (eventType, data) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const companyName = process.env.COMPANY_NAME || 'Your Store';
  const supportPhone = process.env.SUPPORT_PHONE || '+91-XXXXXXXXXX';

  const messages = {
    order_placed: `
🎉 *Order Placed Successfully*

Hello! Your order has been placed successfully.

*Order Details:*
📦 Order Number: *${data.orderNumber}*
💰 Total Amount: *₹${data.amount?.toLocaleString('en-IN')}*
📅 Date: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}

We'll send you updates as your order progresses.

Track your order: ${baseUrl}/orders/${data.orderId}

Thank you for shopping with ${companyName}!
    `.trim(),

    payment_received: `
✅ *Payment Received*

Your payment has been successfully processed!

*Payment Details:*
📦 Order Number: *${data.orderNumber}*
💳 Amount Paid: *₹${data.amount?.toLocaleString('en-IN')}*
🔢 Transaction ID: ${data.transactionId || 'N/A'}

Your order is now being prepared for shipment.

View order: ${baseUrl}/orders/${data.orderId}
    `.trim(),

    order_confirmed: `
✓ *Order Confirmed*

Great news! Your order has been confirmed.

*Order Number:* ${data.orderNumber}
${data.estimatedDelivery ? `*Estimated Delivery:* ${new Date(data.estimatedDelivery).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}` : ''}

Your order is being prepared and will be shipped soon.

Track order: ${baseUrl}/orders/${data.orderId}/track
    `.trim(),

    order_shipped: `
🚚 *Order Shipped!*

Your order is on its way!

*Shipping Details:*
📦 Order: *${data.orderNumber}*
🔢 Tracking: *${data.trackingNumber}*
${data.carrier ? `🚛 Carrier: ${data.carrier}` : ''}
${data.estimatedDelivery ? `📅 Est. Delivery: ${new Date(data.estimatedDelivery).toLocaleDateString('en-IN')}` : ''}

Track your shipment: ${data.trackingUrl || `${baseUrl}/orders/${data.orderId}/track`}

${companyName} - Happy Shopping! 🛍️
    `.trim(),

    out_for_delivery: `
📦 *Out for Delivery*

Your order is out for delivery and will arrive soon!

*Order Number:* ${data.orderNumber}
*Tracking Number:* ${data.trackingNumber}

⚠️ *Important:* Please ensure someone is available to receive the delivery.

Track live: ${baseUrl}/orders/${data.orderId}/track

Need help? Call ${supportPhone}
    `.trim(),

    order_delivered: `
🎁 *Order Delivered!*

Your order has been delivered successfully!

*Order Number:* ${data.orderNumber}
*Delivered On:* ${new Date(data.deliveredAt || Date.now()).toLocaleString('en-IN')}

Thank you for shopping with ${companyName}! ❤️

We'd love to hear your feedback. Please rate your experience:
${baseUrl}/orders/${data.orderId}/review

Questions? Contact us at ${supportPhone}
    `.trim(),

    order_cancelled: `
❌ *Order Cancelled*

Your order has been cancelled.

*Order Number:* ${data.orderNumber}
${data.reason ? `*Reason:* ${data.reason}` : ''}

${data.refundAmount > 0 ? `💰 *Refund:* ₹${data.refundAmount.toLocaleString('en-IN')} will be processed to your original payment method within 5-7 business days.` : ''}

View details: ${baseUrl}/orders/${data.orderId}

Need assistance? Contact ${supportPhone}
    `.trim(),

    return_initiated: `
↩️ *Return Request Initiated*

Your return request has been received.

*Order Number:* ${data.orderNumber}
*Return ID:* ${data.returnId || 'N/A'}
${data.returnReason ? `*Reason:* ${data.returnReason}` : ''}

We'll review your request and get back to you within 24-48 hours.

Track return: ${baseUrl}/orders/${data.orderId}
    `.trim(),

    return_approved: `
✓ *Return Approved*

Your return request has been approved!

*Order Number:* ${data.orderNumber}
${data.refundAmount ? `*Refund Amount:* ₹${data.refundAmount.toLocaleString('en-IN')}` : ''}

Please pack the items securely. Our courier partner will contact you for pickup.

View details: ${baseUrl}/orders/${data.orderId}
    `.trim(),

    refund_processed: `
💰 *Refund Processed*

Your refund has been processed successfully!

*Order Number:* ${data.orderNumber}
*Refund Amount:* ₹${data.amount?.toLocaleString('en-IN')}
${data.transactionId ? `*Transaction ID:* ${data.transactionId}` : ''}

The amount will be credited to your account within 5-7 business days.

View order: ${baseUrl}/orders/${data.orderId}

Thank you for your patience!
    `.trim()
  };

  return messages[eventType] || `
📬 *Order Update*

Update for order *${data.orderNumber}*

${data.message || 'Your order status has been updated.'}

View details: ${baseUrl}/orders/${data.orderId}
  `.trim();
};

/**
 * Send WhatsApp message with media
 * @param {String} phoneNumber - Recipient phone number
 * @param {String} message - Message text
 * @param {String} mediaUrl - URL of media file (image, pdf, etc.)
 */
export const sendWhatsAppWithMedia = async (phoneNumber, message, mediaUrl) => {
  try {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log(`💬 [WHATSAPP MEDIA PLACEHOLDER] to ${phoneNumber}`);
      console.log('Message:', message);
      console.log('Media:', mediaUrl);
      return { success: true, message: 'WhatsApp media message logged (placeholder)' };
    }

    // Uncomment when Twilio is configured
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
    const whatsappNumber = `whatsapp:${formattedNumber}`;
    const whatsappFrom = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

    const result = await client.messages.create({
      body: message,
      from: whatsappFrom,
      to: whatsappNumber,
      mediaUrl: [mediaUrl]
    });

    return { success: true, messageId: result.sid };
    */

    console.log(`💬 [WHATSAPP MEDIA PLACEHOLDER] to ${phoneNumber}`);
    return { success: true, message: 'WhatsApp media message logged (placeholder)' };
  } catch (error) {
    console.error('Error sending WhatsApp media message:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send order invoice via WhatsApp
 * @param {String} phoneNumber - Phone number
 * @param {String} orderNumber - Order number
 * @param {String} invoiceUrl - Invoice PDF URL
 */
export const sendWhatsAppInvoice = async (phoneNumber, orderNumber, invoiceUrl) => {
  const message = `
📄 *Invoice for Order ${orderNumber}*

Please find your invoice attached.

Thank you for shopping with us!
  `.trim();

  return sendWhatsAppWithMedia(phoneNumber, message, invoiceUrl);
};

/**
 * Send bulk WhatsApp notifications
 * @param {Array} recipients - Array of {phoneNumber, eventType, data}
 */
export const sendBulkWhatsApp = async (recipients) => {
  const promises = recipients.map(recipient =>
    sendWhatsAppNotification(recipient.phoneNumber, recipient.eventType, recipient.data)
  );

  return Promise.allSettled(promises);
};

export default {
  sendWhatsAppNotification,
  sendWhatsAppWithMedia,
  sendWhatsAppInvoice,
  sendBulkWhatsApp
};
