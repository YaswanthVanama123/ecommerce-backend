import { verifyAccessToken } from '../utils/generateToken.js';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = verifyAccessToken(token);

      if (!decoded) {
        res.status(401);
        return next(new Error('Not authorized, token failed'));
      }

      // Get user from the token
      req.user = await User.findById(decoded.id).select('-password -refreshToken');

      if (!req.user) {
        res.status(401);
        return next(new Error('User not found'));
      }

      if (!req.user.isActive) {
        res.status(403);
        return next(new Error('User account is inactive'));
      }

      // Set role from token (more efficient than database lookup)
      if (decoded.role) {
        req.user.role = decoded.role;
      }

      next();
    } catch (error) {
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }
};

// Optional authentication - sets req.user if token is present, but doesn't fail if missing
export const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = verifyAccessToken(token);

      if (decoded) {
        // Get user from the token
        req.user = await User.findById(decoded.id).select('-password -refreshToken');

        // Only set user if found and active
        if (req.user && req.user.isActive) {
          // Set role from token
          if (decoded.role) {
            req.user.role = decoded.role;
          }
        } else {
          req.user = null;
        }
      }
    } catch (error) {
      // Silently fail - just continue without user
      console.log('Optional auth failed:', error.message);
      req.user = null;
    }
  }

  // Continue regardless of authentication status
  next();
};

// Alias for protect (used by some routes)
export const authenticateToken = protect;

// Role-based access control middleware
export const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error('Not authorized'));
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error('Insufficient permissions - requires one of: ' + roles.join(', ')));
    }

    next();
  };
};
