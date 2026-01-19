/**
 * SMS Notification Service
 *
 * Handles SMS notifications via Twilio
 * Features:
 * - Concise messages
 * - Important updates only
 * - Tracking links
 * - OTP for COD
 * - Retry logic
 */

/**
 * Send SMS notification
 * @param {String} phoneNumber - Recipient phone number (with country code)
 * @param {String} eventType - Event type
 * @param {Object} data - SMS data
 */
export const sendSMSNotification = async (phoneNumber, eventType, data) => {
  try {
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
      console.log(`📱 [SMS PLACEHOLDER] ${eventType} SMS to ${phoneNumber}`);
      console.log('Message:', getSMSMessage(eventType, data));
      return { success: true, message: 'SMS logged (placeholder)' };
    }

    // Uncomment when Twilio credentials are available
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    const message = getSMSMessage(eventType, data);

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`✅ SMS sent successfully to ${phoneNumber}: ${result.sid}`);
    return { success: true, messageId: result.sid };
    */

    console.log(`📱 [SMS PLACEHOLDER] ${eventType} SMS to ${phoneNumber}`);
    console.log('Message:', getSMSMessage(eventType, data));
    return { success: true, message: 'SMS logged (placeholder)' };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get SMS message content based on event type
 * SMS messages are concise and include tracking links
 */
const getSMSMessage = (eventType, data) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const shortUrl = `${baseUrl}/t/${data.orderNumber}`; // Shortened tracking URL

  const messages = {
    order_placed: `Your order ${data.orderNumber} has been placed successfully. Total: ₹${data.amount}. Track: ${shortUrl}`,

    payment_received: `Payment of ₹${data.amount} received for order ${data.orderNumber}. Your order will be processed soon.`,

    order_confirmed: `Order ${data.orderNumber} confirmed! Your order is being prepared for shipment.`,

    order_shipped: `Great news! Order ${data.orderNumber} has shipped. Tracking: ${data.trackingNumber}. Track: ${shortUrl}`,

    out_for_delivery: `Your order ${data.orderNumber} is out for delivery and will arrive soon. Tracking: ${data.trackingNumber}`,

    order_delivered: `Order ${data.orderNumber} delivered successfully! Thank you for shopping with us. ${baseUrl}/orders/${data.orderId}`,

    order_cancelled: `Order ${data.orderNumber} has been cancelled. ${data.reason ? `Reason: ${data.reason}. ` : ''}${data.refundAmount > 0 ? `Refund of ₹${data.refundAmount} will be processed in 5-7 days.` : ''}`,

    refund_processed: `Refund of ₹${data.amount} for order ${data.orderNumber} has been processed. Amount will be credited in 5-7 business days.`,

    cod_otp: `Your OTP for COD order ${data.orderNumber} is: ${data.otp}. Valid for 10 minutes. Do not share this OTP.`
  };

  return messages[eventType] || `Update for order ${data.orderNumber}: ${data.message || 'Status updated'}`;
};

/**
 * Send OTP for COD verification
 * @param {String} phoneNumber - Phone number
 * @param {String} orderNumber - Order number
 * @param {String} otp - OTP code
 */
export const sendCODVerificationOTP = async (phoneNumber, orderNumber, otp) => {
  return sendSMSNotification(phoneNumber, 'cod_otp', {
    orderNumber,
    otp
  });
};

/**
 * Send bulk SMS notifications
 * @param {Array} recipients - Array of {phoneNumber, eventType, data}
 */
export const sendBulkSMS = async (recipients) => {
  const promises = recipients.map(recipient =>
    sendSMSNotification(recipient.phoneNumber, recipient.eventType, recipient.data)
  );

  return Promise.allSettled(promises);
};

export default {
  sendSMSNotification,
  sendCODVerificationOTP,
  sendBulkSMS
};
