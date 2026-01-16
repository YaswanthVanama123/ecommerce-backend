import express from 'express';
import User from '../models/User.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

const router = express.Router();

// Temporary route to fix user roles - REMOVE AFTER USE
router.put('/fix-admin-role', async (req, res) => {
  try {
    const { email, newRole } = req.body;

    if (!email || !newRole) {
      return sendError(res, 400, 'Email and newRole are required');
    }

    if (!['user', 'admin', 'superadmin'].includes(newRole)) {
      return sendError(res, 400, 'Invalid role. Must be: user, admin, or superadmin');
    }

    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, 404, `User with email ${email} not found`);
    }

    const oldRole = user.role;
    user.role = newRole;
    await user.save();

    console.log(`\n✅ Role updated for ${email}: ${oldRole} -> ${newRole}\n`);

    sendSuccess(res, 200, {
      email: user.email,
      oldRole,
      newRole: user.role
    }, 'User role updated successfully');
  } catch (error) {
    console.error('Error updating role:', error);
    sendError(res, 500, error.message);
  }
});

export default router;
