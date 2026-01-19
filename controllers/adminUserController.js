import User from '../models/User.js';
import AdminActivityLog from '../models/AdminActivityLog.js';

// Get all admin users
export const getAdminUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: { $in: ['admin', 'superadmin'] }
    })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .lean();

    res.json(users);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single admin user
export const getAdminUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'User is not an admin' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get admin user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create admin user
export const createAdminUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, isActive } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Validate role
    if (!['admin', 'superadmin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      role,
      phone,
      isActive: isActive !== undefined ? isActive : true
    });

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'admin_user_created',
      resource: {
        type: 'admin',
        id: user._id,
        name: user.email
      },
      description: `Created new admin user: ${user.firstName} ${user.lastName}`,
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { role: user.role }
    });

    // Remove password from response
    const userResponse = user.toJSON();

    res.status(201).json(userResponse);
  } catch (error) {
    console.error('Create admin user error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: error.message });
  }
};

// Update admin user
export const updateAdminUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role, phone, isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'User is not an admin' });
    }

    // Prevent changing own role or status
    if (user._id.toString() === req.user._id.toString()) {
      if (role && role !== user.role) {
        return res.status(403).json({ message: 'Cannot change your own role' });
      }
      if (isActive !== undefined && isActive !== user.isActive) {
        return res.status(403).json({ message: 'Cannot change your own status' });
      }
    }

    // Store old values for logging
    const oldValues = {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (password) user.password = password;
    if (role) user.role = role;
    if (phone !== undefined) user.phone = phone;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'admin_user_updated',
      resource: {
        type: 'admin',
        id: user._id,
        name: user.email
      },
      changes: {
        before: oldValues,
        after: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      },
      description: `Updated admin user: ${user.firstName} ${user.lastName}`,
      severity: 'high',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    // Remove password from response
    const userResponse = user.toJSON();

    res.json(userResponse);
  } catch (error) {
    console.error('Update admin user error:', error);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }

    res.status(500).json({ message: error.message });
  }
};

// Delete admin user
export const deleteAdminUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'User is not an admin' });
    }

    // Prevent deleting yourself
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    // Prevent deleting superadmin
    if (user.role === 'superadmin') {
      return res.status(403).json({ message: 'Cannot delete superadmin account' });
    }

    await User.findByIdAndDelete(req.params.id);

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: 'admin_user_deleted',
      resource: {
        type: 'admin',
        id: user._id,
        name: user.email
      },
      description: `Deleted admin user: ${user.firstName} ${user.lastName}`,
      severity: 'critical',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Admin user deleted successfully' });
  } catch (error) {
    console.error('Delete admin user error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Toggle admin user status
export const toggleAdminUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'Admin user not found' });
    }

    if (!['admin', 'superadmin'].includes(user.role)) {
      return res.status(403).json({ message: 'User is not an admin' });
    }

    // Prevent changing own status
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'Cannot change your own status' });
    }

    user.isActive = isActive;
    await user.save();

    // Log the activity
    await AdminActivityLog.log({
      user: req.user._id,
      userName: `${req.user.firstName} ${req.user.lastName}`,
      userEmail: req.user.email,
      action: isActive ? 'user_activated' : 'user_deactivated',
      resource: {
        type: 'admin',
        id: user._id,
        name: user.email
      },
      description: `${isActive ? 'Activated' : 'Deactivated'} admin user: ${user.firstName} ${user.lastName}`,
      severity: 'medium',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Admin user status updated successfully', user: user.toJSON() });
  } catch (error) {
    console.error('Toggle admin user status error:', error);
    res.status(500).json({ message: error.message });
  }
};
