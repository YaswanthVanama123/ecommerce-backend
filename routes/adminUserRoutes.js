import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  getAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  toggleAdminUserStatus
} from '../controllers/adminUserController.js';

const router = express.Router();

// Protect all routes and require superadmin access
router.use(protect);
router.use(authorize('superadmin'));

// Admin user routes
router.get('/', getAdminUsers);
router.get('/:id', getAdminUser);
router.post('/', createAdminUser);
router.put('/:id', updateAdminUser);
router.delete('/:id', deleteAdminUser);
router.patch('/:id/status', toggleAdminUserStatus);

export default router;
