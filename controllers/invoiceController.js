import Order from '../models/Order.js';
import { generateInvoicePDF, autoGenerateInvoice } from '../services/invoiceGenerator.js';
import {
  sendInvoiceEmail,
  regenerateInvoice,
  getInvoiceStream,
  bulkDownloadInvoices,
  getInvoiceDetails
} from '../utils/invoiceHelpers.js';
import archiver from 'archiver';

/**
 * Generate invoice for an order
 * GET /api/orders/:id/invoice/generate
 */
export const generateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to generate invoice for this order'
      });
    }

    // Generate invoice
    const result = await generateInvoicePDF(id);

    res.status(200).json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        invoiceNumber: result.invoiceNumber,
        orderNumber: order.orderNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download invoice
 * GET /api/orders/:id/invoice/download
 */
export const downloadInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to download invoice for this order'
      });
    }

    // Get invoice stream
    const { stream, filename, contentType } = await getInvoiceStream(id);

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe stream to response
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * View invoice (inline)
 * GET /api/orders/:id/invoice/view
 */
export const viewInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view invoice for this order'
      });
    }

    // Get invoice stream
    const { stream, filename, contentType } = await getInvoiceStream(id);

    // Set response headers for inline viewing
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    // Pipe stream to response
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

/**
 * Send invoice via email
 * POST /api/orders/:id/invoice/email
 */
export const emailInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to email invoice for this order'
      });
    }

    // Send invoice email
    const result = await sendInvoiceEmail(id, email);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get invoice details
 * GET /api/orders/:id/invoice
 */
export const getInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this invoice'
      });
    }

    const invoiceDetails = await getInvoiceDetails(id);

    if (!invoiceDetails) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.status(200).json({
      success: true,
      data: invoiceDetails
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate invoice (Admin only)
 * POST /api/orders/:id/invoice/regenerate
 */
export const regenerateInvoiceForOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await regenerateInvoice(id);

    res.status(200).json({
      success: true,
      message: result.message,
      data: {
        invoiceNumber: result.invoiceNumber
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk download invoices (Admin only)
 * POST /api/orders/invoices/bulk-download
 */
export const bulkDownloadInvoicesController = async (req, res, next) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs are required'
      });
    }

    const invoices = await bulkDownloadInvoices(orderIds);

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No invoices found for the specified orders'
      });
    }

    // Create zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="invoices-${Date.now()}.zip"`);

    // Pipe archive to response
    archive.pipe(res);

    // Add invoices to archive
    invoices.forEach(invoice => {
      archive.file(invoice.path, { name: invoice.filename });
    });

    // Finalize archive
    await archive.finalize();
  } catch (error) {
    next(error);
  }
};
