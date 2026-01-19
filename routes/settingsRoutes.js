import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  getSystemSettings,
  updateGeneralSettings,
  updateEmailSettings,
  testEmailConnection,
  updatePaymentSettings,
  updateShippingSettings,
  updateSecuritySettings,
  updateAppearanceSettings,
  uploadLogo
} from '../controllers/settingsController.js';
import { protect } from '../middleware/auth.js';
import { isSuperAdmin } from '../middleware/roleCheck.js';

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads', 'logos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|svg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Apply protect and superadmin middleware to all routes
router.use(protect);
router.use(isSuperAdmin);

// ==================== SETTINGS ROUTES ====================
// @route   /api/superadmin/settings

// Get all system settings
router.get('/', getSystemSettings);

// Update general settings
router.put('/general', updateGeneralSettings);

// Update email settings
router.put('/email', updateEmailSettings);

// Test email connection
router.post('/email/test', testEmailConnection);

// Update payment settings
router.put('/payment', updatePaymentSettings);

// Update shipping settings
router.put('/shipping', updateShippingSettings);

// Update security settings
router.put('/security', updateSecuritySettings);

// Update appearance settings
router.put('/appearance', updateAppearanceSettings);

// Upload logo
router.post('/upload-logo', upload.single('logo'), uploadLogo);

export default router;
