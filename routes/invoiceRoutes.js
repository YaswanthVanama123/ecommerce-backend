import express from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  generateInvoiceForOrder,
  downloadInvoicePDF,
  bulkDownloadInvoices,
  emailInvoiceToCustomer,
  regenerateInvoice,
  getInvoiceStatistics
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';
import { isAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// =====================================================
// INVOICE MANAGEMENT ROUTES (Admin Only)
// =====================================================

// Get all invoices with pagination and filters
router.get('/', protect, isAdmin, getAllInvoices);

// Get invoice statistics
router.get('/statistics', protect, isAdmin, getInvoiceStatistics);

// Get specific invoice details
router.get('/:id', protect, isAdmin, getInvoiceById);

// Generate invoice for an order
router.post('/generate', protect, isAdmin, generateInvoiceForOrder);

// Download invoice PDF
router.get('/:id/download', protect, isAdmin, downloadInvoicePDF);

// Email invoice to customer
router.post('/:id/email', protect, isAdmin, emailInvoiceToCustomer);

// Regenerate invoice
router.post('/:id/regenerate', protect, isAdmin, regenerateInvoice);

// Bulk download invoices
router.post('/bulk/download', protect, isAdmin, bulkDownloadInvoices);

export default router;
