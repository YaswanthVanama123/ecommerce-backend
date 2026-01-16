import User from '../models/User.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/generateToken.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import { validatePasswordStrength } from '../utils/sanitize.js';

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      return sendError(res, 400, 'Password does not meet security requirements', {
        errors: passwordValidation.errors
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return sendError(res, 400, 'User already exists with this email');
    }

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      role: role || 'user' // Use provided role or default to 'user'
    });

    if (user) {
      const accessToken = generateAccessToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id, user.role);

      // Save refresh token to user
      user.refreshToken = refreshToken;
      await user.save();

      sendSuccess(res, 201, {
        user: user.toJSON(),
        accessToken,
        refreshToken
      }, 'User registered successfully');
    } else {
      return sendError(res, 400, 'Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Check for user email
    const user = await User.findOne({ email });

    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      return sendError(res, 403, 'Your account has been deactivated');
    }

    // Check password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id, user.role);

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    sendSuccess(res, 200, {
      user: user.toJSON(),
      accessToken,
      refreshToken
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendError(res, 401, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return sendError(res, 401, 'Invalid or expired refresh token');
    }

    // Find user
    const user = await User.findById(decoded.id);

    if (!user || user.refreshToken !== refreshToken) {
      return sendError(res, 401, 'Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user._id, user.role);

    sendSuccess(res, 200, {
      accessToken: newAccessToken
    }, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res, next) => {
  try {
    // Clear refresh token from database
    req.user.refreshToken = undefined;
    await req.user.save();

    sendSuccess(res, 200, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res, next) => {
  try {
    sendSuccess(res, 200, req.user, 'User fetched successfully');
  } catch (error) {
    next(error);
  }
};
