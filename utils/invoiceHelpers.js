import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import Settings from '../models/Settings.js';
import Order from '../models/Order.js';
import { generateInvoicePDF } from '../services/invoiceGenerator.js';

/**
 * Send invoice via email
 */
export const sendInvoiceEmail = async (orderId, recipientEmail = null) => {
  try {
    const order = await Order.findById(orderId).populate('user', 'email name');
    if (!order) {
      throw new Error('Order not found');
    }

    // Generate invoice if it doesn't exist
    if (!order.invoice || !order.invoice.path || !fs.existsSync(order.invoice.path)) {
      await generateInvoicePDF(orderId);
      await order.reload(); // Reload to get updated invoice info
    }

    const settings = await Settings.getInstance();
    const email = recipientEmail || order.user?.email;

    if (!email) {
      throw new Error('Recipient email not found');
    }

    // Create email transporter
    const transporter = nodemailer.createTransporter({
      host: settings.email?.smtpHost || process.env.SMTP_HOST,
      port: settings.email?.smtpPort || process.env.SMTP_PORT || 587,
      secure: settings.email?.smtpSecure || false,
      auth: {
        user: settings.email?.smtpUser || process.env.SMTP_USER,
        pass: settings.email?.smtpPassword || process.env.SMTP_PASSWORD
      }
    });

    // Email options
    const mailOptions = {
      from: `${settings.email?.fromName || settings.general?.siteName || 'E-Commerce Store'} <${settings.email?.fromEmail || process.env.SMTP_FROM}>`,
      to: email,
      subject: `Invoice ${order.invoice.invoiceNumber} - Order ${order.orderNumber}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Tax Invoice</h2>
          <p>Dear ${order.user?.name || 'Customer'},</p>
          <p>Please find attached the tax invoice for your order.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Invoice Number:</strong></td>
                <td style="padding: 8px 0;">${order.invoice.invoiceNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
                <td style="padding: 8px 0;">${order.orderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Invoice Date:</strong></td>
                <td style="padding: 8px 0;">${new Date(order.invoice.generatedAt).toLocaleDateString('en-IN')}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; font-size: 18px; color: #2563eb;"><strong>₹${order.totalAmount.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          <p>If you have any questions about your invoice, please contact us at ${settings.general?.contactEmail || settings.general?.supportEmail || 'support@example.com'}.</p>

          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This is an automated email. Please do not reply to this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            ${settings.company?.name || settings.general?.siteName || 'Your Company'}
            <br>
            ${settings.company?.address || settings.general?.address || ''}
          </p>
        </div>
      `,
      attachments: [
        {
          filename: `Invoice-${order.orderNumber}.pdf`,
          path: order.invoice.path
        }
      ]
    };

    // Send email
    await transporter.sendMail(mailOptions);

    return {
      success: true,
      message: 'Invoice email sent successfully'
    };

  } catch (error) {
    console.error('Invoice email error:', error);
    throw new Error(`Failed to send invoice email: ${error.message}`);
  }
};

/**
 * Regenerate invoice
 */
export const regenerateInvoice = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Delete existing invoice file if it exists
    if (order.invoice?.path && fs.existsSync(order.invoice.path)) {
      fs.unlinkSync(order.invoice.path);
    }

    // Clear invoice data
    order.invoice = {
      invoiceNumber: order.invoice?.invoiceNumber, // Keep the same invoice number
      generatedAt: new Date(),
      path: null
    };
    await order.save();

    // Generate new invoice
    const result = await generateInvoicePDF(orderId);

    return {
      success: true,
      message: 'Invoice regenerated successfully',
      invoiceNumber: result.invoiceNumber,
      path: result.path
    };

  } catch (error) {
    console.error('Invoice regeneration error:', error);
    throw new Error(`Failed to regenerate invoice: ${error.message}`);
  }
};

/**
 * Download invoice (returns file stream)
 */
export const getInvoiceStream = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Generate invoice if it doesn't exist
    if (!order.invoice || !order.invoice.path || !fs.existsSync(order.invoice.path)) {
      await generateInvoicePDF(orderId);
      await order.reload();
    }

    if (!fs.existsSync(order.invoice.path)) {
      throw new Error('Invoice file not found');
    }

    return {
      stream: fs.createReadStream(order.invoice.path),
      filename: `Invoice-${order.orderNumber}.pdf`,
      contentType: 'application/pdf'
    };

  } catch (error) {
    console.error('Invoice stream error:', error);
    throw new Error(`Failed to get invoice: ${error.message}`);
  }
};

/**
 * Bulk download invoices (zip multiple invoices)
 */
export const bulkDownloadInvoices = async (orderIds) => {
  try {
    const invoices = [];

    for (const orderId of orderIds) {
      const order = await Order.findById(orderId);
      if (!order) continue;

      // Generate invoice if it doesn't exist
      if (!order.invoice || !order.invoice.path || !fs.existsSync(order.invoice.path)) {
        await generateInvoicePDF(orderId);
        await order.reload();
      }

      if (fs.existsSync(order.invoice.path)) {
        invoices.push({
          path: order.invoice.path,
          filename: `Invoice-${order.orderNumber}.pdf`
        });
      }
    }

    return invoices;

  } catch (error) {
    console.error('Bulk invoice download error:', error);
    throw new Error(`Failed to bulk download invoices: ${error.message}`);
  }
};

/**
 * Check if invoice exists for order
 */
export const invoiceExists = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return false;
    }

    return !!(order.invoice && order.invoice.invoiceNumber && order.invoice.path && fs.existsSync(order.invoice.path));

  } catch (error) {
    console.error('Invoice check error:', error);
    return false;
  }
};

/**
 * Get invoice details
 */
export const getInvoiceDetails = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order || !order.invoice) {
      return null;
    }

    return {
      invoiceNumber: order.invoice.invoiceNumber,
      generatedAt: order.invoice.generatedAt,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      exists: !!(order.invoice.path && fs.existsSync(order.invoice.path))
    };

  } catch (error) {
    console.error('Invoice details error:', error);
    return null;
  }
};

/**
 * Delete invoice
 */
export const deleteInvoice = async (orderId) => {
  try {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new Error('Order not found');
    }

    // Delete invoice file if it exists
    if (order.invoice?.path && fs.existsSync(order.invoice.path)) {
      fs.unlinkSync(order.invoice.path);
    }

    // Clear invoice data
    order.invoice = undefined;
    await order.save();

    return {
      success: true,
      message: 'Invoice deleted successfully'
    };

  } catch (error) {
    console.error('Invoice deletion error:', error);
    throw new Error(`Failed to delete invoice: ${error.message}`);
  }
};

export default {
  sendInvoiceEmail,
  regenerateInvoice,
  getInvoiceStream,
  bulkDownloadInvoices,
  invoiceExists,
  getInvoiceDetails,
  deleteInvoice
};
