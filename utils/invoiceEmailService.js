import fs from 'fs';

/**
 * Send order delivered email with invoice attachment
 * @param {string} email - Customer email
 * @param {object} orderData - Order details with invoice
 */
export const sendOrderDeliveredWithInvoice = async (email, orderData) => {
  try {
    console.log('📧 [EMAIL PLACEHOLDER] Order Delivered Email with Invoice');
    console.log('To:', email);
    console.log('Order Number:', orderData.orderNumber);
    console.log('Invoice Number:', orderData.invoice?.invoiceNumber);
    console.log('Has Invoice Attachment:', !!orderData.invoice?.path);

    // NOTE: Uncomment to actually send emails
    /*
    import nodemailer from 'nodemailer';

    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });

    const attachments = [];

    // Add invoice if available
    if (orderData.invoice && orderData.invoice.path && fs.existsSync(orderData.invoice.path)) {
      attachments.push({
        filename: `Invoice-${orderData.orderNumber}.pdf`,
        path: orderData.invoice.path
      });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@ecommerce.com',
      to: email,
      subject: `Order Delivered - ${orderData.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">Order Delivered Successfully!</h2>
          <p>Your order has been delivered. We hope you enjoy your purchase!</p>

          <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0;">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
            <p><strong>Delivered Date:</strong> ${new Date(orderData.deliveredAt).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ₹${orderData.totalAmount}</p>
            ${orderData.invoice?.invoiceNumber ? `<p><strong>Invoice Number:</strong> ${orderData.invoice.invoiceNumber}</p>` : ''}
          </div>

          ${orderData.invoice ? `
            <div style="background-color: #d1ecf1; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <p><strong>📄 Tax Invoice Attached</strong></p>
              <p>Please find your tax invoice attached to this email. Keep it for your records and warranty claims.</p>
            </div>
          ` : ''}

          <div style="margin: 30px 0;">
            <p>Please take a moment to review your purchase. Your feedback helps us improve our service!</p>
          </div>

          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message, please do not reply to this email.
            <br>
            For any issues or queries, please contact our support team.
          </p>
        </div>
      `,
      attachments: attachments
    };

    await transporter.sendMail(mailOptions);
    console.log('Order delivered email with invoice sent to:', email);
    */

    return { success: true, message: 'Email logged (placeholder)' };
  } catch (error) {
    console.error('Error sending order delivered email:', error);
    throw error;
  }
};

export default {
  sendOrderDeliveredWithInvoice
};
