import express from 'express';
import multer from 'multer';
import {
  getAllPincodes,
  addPincode,
  updatePincode,
  deletePincode,
  bulkUploadPincodes,
  getPincodeStats,
  downloadPincodeTemplate,
} from '../controllers/pincodeController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Configure multer for CSV file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

// Apply protect and superadmin middleware to all routes
router.use(protect);
router.use(isSuperAdmin);

// ==================== PINCODE MANAGEMENT ROUTES ====================
// @route   /api/superadmin/pincodes

// Get pincode statistics
router.get('/stats', getPincodeStats);

// Download CSV template
router.get('/download-template', downloadPincodeTemplate);

// Get all pincodes with filtering
router.get('/', getAllPincodes);

// Add new pincode
router.post('/', addPincode);

// Bulk upload pincodes (with file upload middleware)
router.post('/bulk-upload', upload.single('file'), bulkUploadPincodes);

// Update pincode
router.put('/:id', updatePincode);

// Delete pincode
router.delete('/:id', deletePincode);

export default router;
