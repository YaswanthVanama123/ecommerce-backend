import nodemailer from 'nodemailer';

/**
 * Email Service for Order Management
 *
 * This is a placeholder implementation. In production:
 * 1. Configure SMTP settings in .env
 * 2. Use a proper email service (SendGrid, AWS SES, etc.)
 * 3. Implement proper email templates
 * 4. Add retry logic for failed emails
 */

// Create transporter (placeholder configuration)
const createTransporter = () => {
  // PLACEHOLDER: Configure with real SMTP settings
  // For development, you can use Gmail, SendGrid, or Mailtrap

  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  // Default: Ethereal (test email service)
  // Emails are not actually sent, but you can view them at ethereal.email
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'test@example.com',
      pass: process.env.EMAIL_PASSWORD || 'password'
    }
  });
};

/**
 * Send order confirmation email
 * @param {string} email - Customer email
 * @param {object} orderData - Order details
 */
export const sendOrderConfirmationEmail = async (email, orderData) => {
  try {
    // PLACEHOLDER: Log instead of sending in development
    console.log('📧 [EMAIL PLACEHOLDER] Order Confirmation Email');
    console.log('To:', email);
    console.log('Order Number:', orderData.orderNumber);
    console.log('Total Amount:', orderData.totalAmount);
    console.log('Items:', orderData.items?.length || 0);

    // Uncomment to actually send emails
    /*
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: email,
      subject: `Order Confirmation - ${orderData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Confirmation</h2>
          <p>Thank you for your order!</p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ₹${orderData.totalAmount}</p>
          </div>

          <div style="margin: 20px 0;">
            <h3>Shipping Address</h3>
            <p>${orderData.shippingAddress?.fullName}</p>
            <p>${orderData.shippingAddress?.addressLine1}</p>
            ${orderData.shippingAddress?.addressLine2 ? `<p>${orderData.shippingAddress.addressLine2}</p>` : ''}
            <p>${orderData.shippingAddress?.city}, ${orderData.shippingAddress?.state} ${orderData.shippingAddress?.zipCode}</p>
          </div>

          <p>We'll send you a confirmation when your order ships.</p>

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order confirmation email sent to:', email);
    */

    return { success: true, message: 'Email logged (placeholder)' };
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
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
    console.log('📧 [EMAIL PLACEHOLDER] Payment Success Email');
    console.log('To:', email);
    console.log('Order Number:', paymentData.orderNumber);
    console.log('Amount Paid:', paymentData.amount);
    console.log('Transaction ID:', paymentData.transactionId);

    // Uncomment to actually send emails
    /*
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: email,
      subject: `Payment Successful - ${paymentData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Payment Successful!</h2>
          <p>Your payment has been processed successfully.</p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Payment Details</h3>
            <p><strong>Order Number:</strong> ${paymentData.orderNumber}</p>
            <p><strong>Amount Paid:</strong> ₹${paymentData.amount}</p>
            <p><strong>Transaction ID:</strong> ${paymentData.transactionId}</p>
            <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          <p>Your order is now being processed and will be shipped soon.</p>

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Payment success email sent to:', email);
    */

    return { success: true, message: 'Email logged (placeholder)' };
  } catch (error) {
    console.error('Error sending payment success email:', error);
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
    console.log('📧 [EMAIL PLACEHOLDER] Order Status Update Email');
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
    if (statusData.trackingNumber) {
      console.log('Tracking Number:', statusData.trackingNumber);
    }

    // Uncomment to actually send emails
    /*
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: email,
      subject: `Order Update - ${statusData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Status Update</h2>
          <p>${message}</p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Order Information</h3>
            <p><strong>Order Number:</strong> ${statusData.orderNumber}</p>
            <p><strong>Status:</strong> ${statusData.status.toUpperCase()}</p>
            ${statusData.trackingNumber ? `<p><strong>Tracking Number:</strong> ${statusData.trackingNumber}</p>` : ''}
            <p><strong>Updated:</strong> ${new Date().toLocaleDateString()}</p>
          </div>

          ${statusData.note ? `<p><strong>Note:</strong> ${statusData.note}</p>` : ''}

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order status email sent to:', email);
    */

    return { success: true, message: 'Email logged (placeholder)' };
  } catch (error) {
    console.error('Error sending order status email:', error);
    throw error;
  }
};

/**
 * Send order cancellation email
 * @param {string} email - Customer email
 * @param {object} cancellationData - Cancellation details
 */
export const sendOrderCancellationEmail = async (email, cancellationData) => {
  try {
    console.log('📧 [EMAIL PLACEHOLDER] Order Cancellation Email');
    console.log('To:', email);
    console.log('Order Number:', cancellationData.orderNumber);
    console.log('Reason:', cancellationData.reason);

    // Uncomment to actually send emails
    /*
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: email,
      subject: `Order Cancelled - ${cancellationData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Order Cancellation</h2>
          <p>Your order has been cancelled.</p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Cancellation Details</h3>
            <p><strong>Order Number:</strong> ${cancellationData.orderNumber}</p>
            <p><strong>Cancelled Date:</strong> ${new Date().toLocaleDateString()}</p>
            ${cancellationData.reason ? `<p><strong>Reason:</strong> ${cancellationData.reason}</p>` : ''}
          </div>

          ${cancellationData.refundAmount ? `
            <p>A refund of ₹${cancellationData.refundAmount} will be processed to your original payment method within 5-7 business days.</p>
          ` : ''}

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order cancellation email sent to:', email);
    */

    return { success: true, message: 'Email logged (placeholder)' };
  } catch (error) {
    console.error('Error sending order cancellation email:', error);
    throw error;
  }
};

/**
 * Send refund confirmation email
 * @param {string} email - Customer email
 * @param {object} refundData - Refund details
 */
export const sendRefundEmail = async (email, refundData) => {
  try {
    console.log('📧 [EMAIL PLACEHOLDER] Refund Confirmation Email');
    console.log('To:', email);
    console.log('Order Number:', refundData.orderNumber);
    console.log('Refund Amount:', refundData.refundAmount);

    // Uncomment to actually send emails
    /*
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: email,
      subject: `Refund Processed - ${refundData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Refund Processed</h2>
          <p>Your refund has been processed successfully.</p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Refund Details</h3>
            <p><strong>Order Number:</strong> ${refundData.orderNumber}</p>
            <p><strong>Refund Amount:</strong> ₹${refundData.refundAmount}</p>
            <p><strong>Processed Date:</strong> ${new Date().toLocaleDateString()}</p>
            ${refundData.reason ? `<p><strong>Reason:</strong> ${refundData.reason}</p>` : ''}
          </div>

          <p>The refund will be credited to your original payment method within 5-7 business days.</p>

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Refund email sent to:', email);
    */

    return { success: true, message: 'Email logged (placeholder)' };
  } catch (error) {
    console.error('Error sending refund email:', error);
    throw error;
  }
};

/**
 * Send order shipped email with tracking
 * @param {string} email - Customer email
 * @param {object} shippingData - Shipping details
 */
export const sendOrderShippedEmail = async (email, shippingData) => {
  try {
    console.log('📧 [EMAIL PLACEHOLDER] Order Shipped Email');
    console.log('To:', email);
    console.log('Order Number:', shippingData.orderNumber);
    console.log('Tracking Number:', shippingData.trackingNumber);
    console.log('Carrier:', shippingData.carrier);

    // Uncomment to actually send emails
    /*
    const transporter = createTransporter();

    const trackingUrl = shippingData.trackingUrl ||
      `https://tracking.example.com/${shippingData.trackingNumber}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: email,
      subject: `Your Order Has Shipped - ${shippingData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Your Order Has Shipped!</h2>
          <p>Great news! Your order is on its way.</p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Shipping Details</h3>
            <p><strong>Order Number:</strong> ${shippingData.orderNumber}</p>
            <p><strong>Tracking Number:</strong> ${shippingData.trackingNumber}</p>
            <p><strong>Carrier:</strong> ${shippingData.carrier || 'Standard Shipping'}</p>
            <p><strong>Shipped Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Estimated Delivery:</strong> ${shippingData.estimatedDelivery || '3-5 business days'}</p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${trackingUrl}"
               style="background-color: #007bff; color: white; padding: 12px 30px;
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Track Your Order
            </a>
          </div>

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Order shipped email sent to:', email);
    */

    return { success: true, message: 'Email logged (placeholder)' };
  } catch (error) {
    console.error('Error sending order shipped email:', error);
    throw error;
  }
};

/**
 * Test email configuration
 */
export const testEmailConfiguration = async () => {
  try {
    const transporter = createTransporter();

    // Verify transporter configuration
    await transporter.verify();

    console.log('✅ Email configuration is valid');
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return { success: false, message: error.message };
  }
};
