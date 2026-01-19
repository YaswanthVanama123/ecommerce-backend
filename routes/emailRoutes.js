import express from 'express';
import {
  testConfig,
  sendTestEmail,
  previewEmail,
  resendOrderConfirmation,
  resendOrderShipped,
  resendInvoice,
  getTemplates
} from '../controllers/emailController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

/**
 * Email Routes
 *
 * All routes require authentication
 * Admin-only routes are marked with adminOnly middleware
 */

// Test email configuration (Admin only)
router.get('/test-config', protect, adminOnly, testConfig);

// Send test email (Admin only)
router.post('/send-test', protect, adminOnly, sendTestEmail);

// Preview email template (Admin only)
router.post('/preview', protect, adminOnly, previewEmail);

// Resend order confirmation
router.post('/resend-order-confirmation', protect, resendOrderConfirmation);

// Resend order shipped email
router.post('/resend-order-shipped', protect, resendOrderShipped);

// Resend invoice
router.post('/resend-invoice', protect, resendInvoice);

// Get list of available templates (Admin only)
router.get('/templates', protect, adminOnly, getTemplates);

export default router;
