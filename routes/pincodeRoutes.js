import express from 'express';
import {
  getAllPincodes,
  addPincode,
  updatePincode,
  deletePincode,
  bulkUploadPincodes,
  getPincodeStats,
} from '../controllers/pincodeController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Apply protect and superadmin middleware to all routes
router.use(protect);
router.use(isSuperAdmin);

// ==================== PINCODE MANAGEMENT ROUTES ====================
// @route   /api/superadmin/pincodes

// Get pincode statistics
router.get('/stats', getPincodeStats);

// Get all pincodes with filtering
router.get('/', getAllPincodes);

// Add new pincode
router.post('/', addPincode);

// Bulk upload pincodes
router.post('/bulk-upload', bulkUploadPincodes);

// Update pincode
router.put('/:id', updatePincode);

// Delete pincode
router.delete('/:id', deletePincode);

export default router;
