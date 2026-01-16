import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress
} from '../controllers/addressController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/addresses
// @desc    Get all addresses for logged-in user
// @access  Private
router.get('/', getAddresses);

// @route   POST /api/addresses
// @desc    Add new address
// @access  Private
router.post('/', addAddress);

// @route   PUT /api/addresses/:id
// @desc    Update address
// @access  Private
router.put('/:id', updateAddress);

// @route   DELETE /api/addresses/:id
// @desc    Delete address
// @access  Private
router.delete('/:id', deleteAddress);

// @route   PUT /api/addresses/:id/default
// @desc    Set default address
// @access  Private
router.put('/:id/default', setDefaultAddress);

export default router;
