import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getBackups,
  createBackup,
  downloadBackup,
  restoreBackup,
  deleteBackup,
  getBackupSettings,
  updateBackupSettings
} from '../controllers/backupController.js';

const router = express.Router();

// Protect all routes and require superadmin access
router.use(protect);
router.use(authorize('superadmin'));

// Backup routes
router.get('/', getBackups);
router.post('/create', createBackup);
router.get('/:id/download', downloadBackup);
router.post('/:id/restore', restoreBackup);
router.delete('/:id', deleteBackup);

// Backup settings
router.get('/settings', getBackupSettings);
router.put('/settings', updateBackupSettings);

export default router;
