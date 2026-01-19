import nodemailer from 'nodemailer';

/**
 * Email Notification Service
 *
 * Handles all email notifications with professional HTML templates
 * Features:
 * - Professional HTML templates
 * - Responsive design
 * - Company branding
 * - CTA buttons
 * - Order summaries with images
 * - Automatic retry logic
 */

// Create reusable transporter
const createTransporter = () => {
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }

  if (process.env.EMAIL_SERVICE === 'sendgrid') {
    return nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: process.env.SENDGRID_API_KEY
      }
    });
  }

  // Default SMTP configuration
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Email templates
const getEmailTemplate = (eventType, data) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const companyName = process.env.COMPANY_NAME || 'Your Store';
  const supportEmail = process.env.SUPPORT_EMAIL || 'support@yourstore.com';

  const templates = {
    order_placed: {
      subject: `Order Confirmation - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">${companyName}</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Order Confirmation</p>
                    </td>
                  </tr>

                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Thank You, ${data.userName}!</h2>
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Your order has been placed successfully. We'll send you a confirmation when your order ships.
                      </p>

                      <!-- Order Details Box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Details</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Total Amount:</strong> ₹${data.amount?.toLocaleString('en-IN')}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
                          </td>
                        </tr>
                      </table>

                      ${data.items ? `
                        <!-- Order Items -->
                        <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Items</h3>
                        ${data.items.map(item => `
                          <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom: 1px solid #e5e7eb; padding: 15px 0; margin-bottom: 15px;">
                            <tr>
                              <td width="80" style="padding-right: 15px;">
                                ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 4px;">` : ''}
                              </td>
                              <td>
                                <p style="color: #333; margin: 0 0 5px 0; font-weight: bold; font-size: 14px;">${item.name}</p>
                                ${item.size || item.color ? `<p style="color: #666; margin: 0 0 5px 0; font-size: 12px;">${item.size ? `Size: ${item.size}` : ''} ${item.color ? `Color: ${item.color}` : ''}</p>` : ''}
                                <p style="color: #666; margin: 0; font-size: 14px;">Qty: ${item.quantity} × ₹${item.price.toLocaleString('en-IN')}</p>
                              </td>
                              <td align="right" style="padding-left: 15px;">
                                <p style="color: #333; margin: 0; font-weight: bold; font-size: 16px;">₹${(item.quantity * item.price).toLocaleString('en-IN')}</p>
                              </td>
                            </tr>
                          </table>
                        `).join('')}
                      ` : ''}

                      ${data.shippingAddress ? `
                        <!-- Shipping Address -->
                        <h3 style="color: #333; margin: 30px 0 15px 0; font-size: 18px;">Shipping Address</h3>
                        <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                          <p style="color: #333; margin: 0 0 5px 0; font-weight: bold;">${data.shippingAddress.fullName}</p>
                          <p style="color: #666; margin: 0 0 5px 0;">${data.shippingAddress.addressLine1}</p>
                          ${data.shippingAddress.addressLine2 ? `<p style="color: #666; margin: 0 0 5px 0;">${data.shippingAddress.addressLine2}</p>` : ''}
                          <p style="color: #666; margin: 0 0 5px 0;">${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zipCode}</p>
                          <p style="color: #666; margin: 0;">${data.shippingAddress.phone}</p>
                        </div>
                      ` : ''}

                      <!-- CTA Buttons -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 40px;">
                        <tr>
                          <td align="center">
                            <a href="${baseUrl}/orders/${data.orderId}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 0 10px 10px 0;">View Order</a>
                            <a href="${baseUrl}/orders/${data.orderId}/track" style="display: inline-block; background-color: #6b7280; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 0 0 10px 0;">Track Order</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">This is an automated email. Please do not reply.</p>
                      <p style="color: #999; margin: 10px 0 0 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },

    payment_received: {
      subject: `Payment Received - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payment Received</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                      <div style="background-color: #ffffff; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 40px;">✓</span>
                      </div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Payment Successful!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Your payment has been processed successfully. Your order is now being prepared for shipment.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Amount Paid:</strong> ₹${data.amount?.toLocaleString('en-IN')}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Transaction ID:</strong> ${data.transactionId || 'N/A'}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Payment Date:</strong> ${new Date().toLocaleString('en-IN')}</p>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${baseUrl}/orders/${data.orderId}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">View Order</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },

    order_confirmed: {
      subject: `Order Confirmed - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Confirmed!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Great news! Your order has been confirmed and is being prepared for shipment.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Order Information</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            ${data.estimatedDelivery ? `<p style="color: #666; margin: 5px 0;"><strong>Estimated Delivery:</strong> ${new Date(data.estimatedDelivery).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${baseUrl}/orders/${data.orderId}/track" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">Track Order</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },

    order_shipped: {
      subject: `Order Shipped - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Shipped</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚚 Your Order is On Its Way!</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Great news! Your order has been shipped and is on its way to you.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Shipping Details</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
                            ${data.carrier ? `<p style="color: #666; margin: 5px 0;"><strong>Carrier:</strong> ${data.carrier}</p>` : ''}
                            ${data.estimatedDelivery ? `<p style="color: #666; margin: 5px 0;"><strong>Estimated Delivery:</strong> ${new Date(data.estimatedDelivery).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>` : ''}
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${data.trackingUrl || `${baseUrl}/orders/${data.orderId}/track`}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">Track Shipment</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },

    out_for_delivery: {
      subject: `Out for Delivery - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Out for Delivery</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">🚚 Out for Delivery!</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Your order will arrive soon</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Your order is out for delivery and will arrive soon. Please be available to receive it.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <p style="color: #92400e; margin: 0; font-size: 14px;"><strong>Important:</strong> Please ensure someone is available to receive the delivery.</p>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Delivery Details</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
                            ${data.estimatedDelivery ? `<p style="color: #666; margin: 5px 0;"><strong>Expected Today:</strong> ${new Date(data.estimatedDelivery).toLocaleDateString('en-IN')}</p>` : ''}
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${baseUrl}/orders/${data.orderId}/track" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">Track Delivery</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },

    order_delivered: {
      subject: `Order Delivered - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Delivered</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                      <div style="background-color: #ffffff; width: 80px; height: 80px; border-radius: 50%; margin: 0 auto 20px; display: inline-flex; align-items: center; justify-content: center;">
                        <span style="font-size: 40px;">✓</span>
                      </div>
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Delivered!</h1>
                      <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">Thank you for shopping with us</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Your order has been delivered successfully. We hope you love your purchase!
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Delivery Details</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Delivered On:</strong> ${new Date(data.deliveredAt || Date.now()).toLocaleString('en-IN')}</p>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                        We'd love to hear about your experience! Your feedback helps us improve and serve you better.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${baseUrl}/orders/${data.orderId}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 0 5px 10px 0;">View Order</a>
                            <a href="${baseUrl}/orders/${data.orderId}/review" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px; margin: 0 5px 10px 0;">Write Review</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },

    order_cancelled: {
      subject: `Order Cancelled - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Cancelled</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Order Cancelled</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Your order has been cancelled as requested.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Cancellation Details</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            ${data.reason ? `<p style="color: #666; margin: 5px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ''}
                            <p style="color: #666; margin: 5px 0;"><strong>Cancelled On:</strong> ${new Date().toLocaleString('en-IN')}</p>
                          </td>
                        </tr>
                      </table>

                      ${data.refundAmount > 0 ? `
                        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                          <tr>
                            <td>
                              <p style="color: #1e40af; margin: 0; font-size: 14px;"><strong>Refund Information:</strong> A refund of ₹${data.refundAmount.toLocaleString('en-IN')} will be processed to your original payment method within 5-7 business days.</p>
                            </td>
                          </tr>
                        </table>
                      ` : ''}

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${baseUrl}/products" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">Continue Shopping</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    },

    refund_processed: {
      subject: `Refund Processed - ${data.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Refund Processed</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Refund Processed</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Your refund has been processed successfully. The amount will be credited to your account within 5-7 business days.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">Refund Details</h3>
                            <p style="color: #666; margin: 5px 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
                            <p style="color: #666; margin: 5px 0;"><strong>Refund Amount:</strong> ₹${data.amount?.toLocaleString('en-IN')}</p>
                            ${data.transactionId ? `<p style="color: #666; margin: 5px 0;"><strong>Transaction ID:</strong> ${data.transactionId}</p>` : ''}
                            ${data.refundMethod ? `<p style="color: #666; margin: 5px 0;"><strong>Refund Method:</strong> ${data.refundMethod}</p>` : ''}
                            <p style="color: #666; margin: 5px 0;"><strong>Processed On:</strong> ${new Date().toLocaleString('en-IN')}</p>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #dbeafe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <p style="color: #1e40af; margin: 0; font-size: 14px;"><strong>Note:</strong> It may take 5-7 business days for the refund to reflect in your account, depending on your bank or payment provider.</p>
                          </td>
                        </tr>
                      </table>

                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                        <tr>
                          <td align="center">
                            <a href="${baseUrl}/orders/${data.orderId}" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-weight: bold; font-size: 16px;">View Order</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Need help? <a href="mailto:${supportEmail}" style="color: #ec4899; text-decoration: none;">Contact Support</a></p>
                      <p style="color: #999; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} ${companyName}. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `
    }
  };

  return templates[eventType] || {
    subject: `Order Update - ${data.orderNumber}`,
    html: `<p>Your order ${data.orderNumber} has been updated.</p>`
  };
};

/**
 * Send email notification
 * @param {String} to - Recipient email
 * @param {String} eventType - Event type
 * @param {Object} data - Email data
 */
export const sendEmailNotification = async (to, eventType, data) => {
  try {
    // Skip if email service is not configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log(`📧 [EMAIL PLACEHOLDER] ${eventType} email to ${to}`);
      console.log('Data:', JSON.stringify(data, null, 2));
      return { success: true, message: 'Email logged (placeholder)' };
    }

    const transporter = createTransporter();
    const template = getEmailTemplate(eventType, data);

    const mailOptions = {
      from: `${process.env.COMPANY_NAME || 'Your Store'} <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to,
      subject: template.subject,
      html: template.html
    };

    await transporter.sendMail(mailOptions);

    console.log(`✅ Email sent successfully to ${to} for ${eventType}`);
    return { success: true, message: 'Email sent successfully' };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendEmailNotification
};
