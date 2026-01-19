import Order from '../models/Order.js';
import { generateInvoicePDF, autoGenerateInvoice } from '../services/invoiceGenerator.js';
import {
  sendInvoiceEmail,
  regenerateInvoice as regenerateInvoiceHelper,
  getInvoiceStream,
  bulkDownloadInvoices as bulkDownloadHelper,
  getInvoiceDetails
} from '../utils/invoiceHelpers.js';
import archiver from 'archiver';
import mongoose from 'mongoose';

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

    const result = await regenerateInvoiceHelper(id);

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

    const invoices = await bulkDownloadHelper(orderIds);

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

// =====================================================
// NEW INVOICE MANAGEMENT ENDPOINTS
// =====================================================

/**
 * Get all invoices with pagination and filters
 * GET /api/invoices
 */
export const getAllInvoices = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      startDate = '',
      endDate = '',
      sortBy = 'createdAt',
      order = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build query
    const query = {
      'invoice.invoiceNumber': { $exists: true, $ne: null }
    };

    // Search by order number or invoice number
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'invoice.invoiceNumber': { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by order status
    if (status) {
      query.orderStatus = status;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    // Execute query
    const [invoices, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .select('orderNumber invoice totalAmount orderStatus paymentStatus createdAt shippingAddress items')
        .sort(sortOptions)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        invoices,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalInvoices: total,
          hasMore: skip + invoices.length < total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get invoice by ID
 * GET /api/invoices/:id
 */
export const getInvoiceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('user', 'name email phone')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    if (!order.invoice || !order.invoice.invoiceNumber) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not generated for this order'
      });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate invoice for an order
 * POST /api/invoices/generate
 */
export const generateInvoiceForOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if invoice already exists
    if (order.invoice && order.invoice.invoiceNumber) {
      return res.status(400).json({
        success: false,
        message: 'Invoice already exists for this order. Use regenerate endpoint to create a new one.'
      });
    }

    // Generate invoice
    const result = await generateInvoicePDF(orderId);

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
 * Download invoice PDF
 * GET /api/invoices/:id/download
 */
export const downloadInvoicePDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.invoice || !order.invoice.invoiceNumber) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this order'
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
 * Email invoice to customer
 * POST /api/invoices/:id/email
 */
export const emailInvoiceToCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    const order = await Order.findById(id).populate('user', 'email name');
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.invoice || !order.invoice.invoiceNumber) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found for this order'
      });
    }

    // Use provided email or customer's email
    const recipientEmail = email || order.user.email;

    // Send invoice email
    const result = await sendInvoiceEmail(id, recipientEmail);

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Regenerate invoice
 * POST /api/invoices/:id/regenerate
 */
export const regenerateInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await regenerateInvoiceHelper(id);

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
 * Bulk download invoices
 * POST /api/invoices/bulk/download
 */
export const bulkDownloadInvoices = async (req, res, next) => {
  try {
    const { orderIds } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs are required'
      });
    }

    const invoices = await bulkDownloadHelper(orderIds);

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

/**
 * Get invoice statistics
 * GET /api/invoices/statistics
 */
export const getInvoiceStatistics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const [
      totalInvoices,
      paidInvoices,
      pendingInvoices,
      totalRevenue,
      recentInvoices
    ] = await Promise.all([
      Order.countDocuments({
        'invoice.invoiceNumber': { $exists: true, $ne: null },
        ...dateFilter
      }),
      Order.countDocuments({
        'invoice.invoiceNumber': { $exists: true, $ne: null },
        paymentStatus: 'completed',
        ...dateFilter
      }),
      Order.countDocuments({
        'invoice.invoiceNumber': { $exists: true, $ne: null },
        paymentStatus: 'pending',
        ...dateFilter
      }),
      Order.aggregate([
        {
          $match: {
            'invoice.invoiceNumber': { $exists: true, $ne: null },
            paymentStatus: 'completed',
            ...dateFilter
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalAmount' }
          }
        }
      ]),
      Order.find({
        'invoice.invoiceNumber': { $exists: true, $ne: null },
        ...dateFilter
      })
        .populate('user', 'name email')
        .select('orderNumber invoice totalAmount orderStatus paymentStatus createdAt')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentInvoices
      }
    });
  } catch (error) {
    next(error);
  }
};
