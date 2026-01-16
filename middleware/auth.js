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
