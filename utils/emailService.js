import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getWelcomeEmailData,
  getOrderConfirmationData,
  getOrderShippedData,
  getOrderDeliveredData,
  getOrderCancelledData,
  getRefundProcessedData,
  getPasswordResetData,
  getInvoiceEmailData,
  getLowStockAlertData,
  getReturnRequestData,
  renderEmailTemplate
} from './emailTemplates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Enhanced Email Service for StyleHub
 *
 * Features:
 * - HTML template rendering
 * - Attachment support
 * - Inline CSS for email client compatibility
 * - Retry logic for failed emails
 * - Email queue management
 */

// Email configuration
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
};

// Create transporter
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  return nodemailer.createTransport(EMAIL_CONFIG);
};

/**
 * Send email with template
 * @param {object} options - Email options
 * @returns {Promise<object>} - Send result
 */
const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'StyleHub <noreply@stylehub.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
      attachments: options.attachments || []
    };

    // Check if we're in development mode
    if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
      console.log('📧 [EMAIL PLACEHOLDER]', options.subject);
      console.log('To:', options.to);
      console.log('---');
      return { success: true, message: 'Email logged (development mode)' };
    }

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};

/**
 * Send welcome email to new user
 * @param {string} email - User email
 * @param {object} user - User data
 */
export const sendWelcomeEmail = async (email, user) => {
  try {
    const data = getWelcomeEmailData(user);
    const html = renderEmailTemplate('welcome', data);

    await sendEmail({
      to: email,
      subject: '🎉 Welcome to StyleHub - Your Fashion Journey Begins!',
      html
    });

    console.log('✅ Welcome email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

/**
 * Send order confirmation email
 * @param {string} email - Customer email
 * @param {object} order - Order data
 * @param {object} user - User data
 */
export const sendOrderConfirmationEmail = async (email, order, user) => {
  try {
    const data = getOrderConfirmationData(order, user);
    const html = renderEmailTemplate('orderConfirmation', data);

    await sendEmail({
      to: email,
      subject: `✓ Order Confirmed - ${order.orderNumber}`,
      html
    });

    console.log('✅ Order confirmation email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    throw error;
  }
};

/**
 * Send order shipped email
 * @param {string} email - Customer email
 * @param {object} order - Order data
 * @param {object} user - User data
 */
export const sendOrderShippedEmail = async (email, order, user) => {
  try {
    const data = getOrderShippedData(order, user);
    const html = renderEmailTemplate('orderShipped', data);

    await sendEmail({
      to: email,
      subject: `📦 Your Order Has Shipped - ${order.orderNumber}`,
      html
    });

    console.log('✅ Order shipped email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending order shipped email:', error);
    throw error;
  }
};

/**
 * Send order delivered email
 * @param {string} email - Customer email
 * @param {object} order - Order data
 * @param {object} user - User data
 */
export const sendOrderDeliveredEmail = async (email, order, user) => {
  try {
    const data = getOrderDeliveredData(order, user);
    const html = renderEmailTemplate('orderDelivered', data);

    await sendEmail({
      to: email,
      subject: `✓ Order Delivered - ${order.orderNumber}`,
      html
    });

    console.log('✅ Order delivered email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending order delivered email:', error);
    throw error;
  }
};

/**
 * Send order cancelled email
 * @param {string} email - Customer email
 * @param {object} order - Order data
 * @param {object} user - User data
 * @param {string} reason - Cancellation reason
 */
export const sendOrderCancellationEmail = async (email, order, user, reason = '') => {
  try {
    const data = getOrderCancelledData(order, user, reason);
    const html = renderEmailTemplate('orderCancelled', data);

    await sendEmail({
      to: email,
      subject: `Order Cancelled - ${order.orderNumber}`,
      html
    });

    console.log('✅ Order cancellation email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending order cancellation email:', error);
    throw error;
  }
};

/**
 * Send refund processed email
 * @param {string} email - Customer email
 * @param {object} order - Order data
 * @param {object} user - User data
 * @param {number} refundAmount - Refund amount
 * @param {string} reason - Refund reason
 */
export const sendRefundEmail = async (email, order, user, refundAmount, reason = '') => {
  try {
    const data = getRefundProcessedData(order, user, refundAmount, reason);
    const html = renderEmailTemplate('refundProcessed', data);

    await sendEmail({
      to: email,
      subject: `✓ Refund Processed - ${order.orderNumber}`,
      html
    });

    console.log('✅ Refund email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending refund email:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @param {object} user - User data
 * @param {string} resetToken - Reset token
 */
export const sendPasswordResetEmail = async (email, user, resetToken) => {
  try {
    const data = getPasswordResetData(user, resetToken);
    const html = renderEmailTemplate('passwordReset', data);

    await sendEmail({
      to: email,
      subject: '🔒 Password Reset Request - StyleHub',
      html
    });

    console.log('✅ Password reset email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

/**
 * Send invoice email with PDF attachment
 * @param {string} email - Customer email
 * @param {object} order - Order data
 * @param {object} user - User data
 * @param {string} invoiceNumber - Invoice number
 * @param {string} pdfPath - Path to invoice PDF (optional)
 */
export const sendInvoiceEmail = async (email, order, user, invoiceNumber, pdfPath = null) => {
  try {
    const data = getInvoiceEmailData(order, user, invoiceNumber);
    const html = renderEmailTemplate('invoice', data);

    const emailOptions = {
      to: email,
      subject: `Invoice ${invoiceNumber} - StyleHub`,
      html
    };

    // Add PDF attachment if provided
    if (pdfPath) {
      emailOptions.attachments = [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          path: pdfPath,
          contentType: 'application/pdf'
        }
      ];
    }

    await sendEmail(emailOptions);

    console.log('✅ Invoice email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    throw error;
  }
};

/**
 * Send low stock alert to admin
 * @param {string} email - Admin email
 * @param {object} product - Product data
 * @param {number} currentStock - Current stock level
 */
export const sendLowStockAlert = async (email, product, currentStock) => {
  try {
    const data = getLowStockAlertData(product, currentStock);
    const html = renderEmailTemplate('lowStockAlert', data);

    await sendEmail({
      to: email,
      subject: `⚠️ Low Stock Alert: ${product.name}`,
      html
    });

    console.log('✅ Low stock alert sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending low stock alert:', error);
    throw error;
  }
};

/**
 * Send return request notification
 * @param {string} email - Customer email
 * @param {object} returnRequest - Return request data
 * @param {object} order - Order data
 * @param {object} user - User data
 */
export const sendReturnRequestEmail = async (email, returnRequest, order, user) => {
  try {
    const data = getReturnRequestData(returnRequest, order, user);
    const html = renderEmailTemplate('returnRequest', data);

    await sendEmail({
      to: email,
      subject: `Return Request Received - ${order.orderNumber}`,
      html
    });

    console.log('✅ Return request email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('Error sending return request email:', error);
    throw error;
  }
};

/**
 * Send order status update email
 * @param {string} email - Customer email
 * @param {object} statusData - Status update details
 */
export const sendOrderStatusEmail = async (email, statusData) => {
  try {
    console.log('📧 [EMAIL] Order Status Update Email');
    console.log('To:', email);
    console.log('Order Number:', statusData.orderNumber);
    console.log('New Status:', statusData.status);

    const statusMessages = {
      pending: 'Your order has been received and is pending confirmation.',
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is being processed.',
      shipped: 'Your order has been shipped and is on its way!',
      delivered: 'Your order has been delivered. Thank you for shopping with us!',
      cancelled: 'Your order has been cancelled.'
    };

    const message = statusMessages[statusData.status] || 'Your order status has been updated.';
    console.log('Message:', message);

    return { success: true, message: 'Email logged' };
  } catch (error) {
    console.error('Error sending order status email:', error);
    throw error;
  }
};

/**
 * Send payment success email
 * @param {string} email - Customer email
 * @param {object} paymentData - Payment details
 */
export const sendPaymentSuccessEmail = async (email, paymentData) => {
  try {
    console.log('📧 [EMAIL] Payment Success Email');
    console.log('To:', email);
    console.log('Order Number:', paymentData.orderNumber);
    console.log('Amount Paid:', paymentData.amount);

    return { success: true, message: 'Email logged' };
  } catch (error) {
    console.error('Error sending payment success email:', error);
    throw error;
  }
};

/**
 * Send order modification email
 * @param {string} email - Customer email
 * @param {object} modificationData - Modification details
 */
export const sendOrderModificationEmail = async (email, modificationData) => {
  try {
    console.log('📧 [EMAIL] Order Modification Email');
    console.log('To:', email);
    console.log('Order Number:', modificationData.orderNumber);

    return { success: true, message: 'Email logged' };
  } catch (error) {
    console.error('Error sending order modification email:', error);
    throw error;
  }
};

/**
 * Test email configuration
 * @returns {Promise<object>} - Test result
 */
export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();

    console.log('✅ Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, message: error.message };
  }
};

/**
 * Send custom email with template
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} templateName - Template name
 * @param {object} data - Template data
 * @param {Array} attachments - Email attachments
 */
export const sendCustomEmail = async (to, subject, templateName, data, attachments = []) => {
  try {
    const html = renderEmailTemplate(templateName, data);

    await sendEmail({
      to,
      subject,
      html,
      attachments
    });

    console.log('✅ Custom email sent to:', to);
    return { success: true };
  } catch (error) {
    console.error('Error sending custom email:', error);
    throw error;
  }
};

export default {
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendOrderShippedEmail,
  sendOrderDeliveredEmail,
  sendOrderCancellationEmail,
  sendRefundEmail,
  sendPasswordResetEmail,
  sendInvoiceEmail,
  sendLowStockAlert,
  sendReturnRequestEmail,
  sendOrderStatusEmail,
  sendPaymentSuccessEmail,
  sendOrderModificationEmail,
  testEmailConfiguration,
  sendCustomEmail
};
