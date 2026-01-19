import { doubleCsrf } from 'csrf-csrf';

// CSRF Protection Configuration
const csrfOptions = {
  getSecret: () => process.env.CSRF_SECRET || 'your-csrf-secret-key-change-in-production',
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
  getTokenFromRequest: (req) => {
    // Check multiple sources for CSRF token
    return req.headers['x-csrf-token'] ||
           req.headers['csrf-token'] ||
           req.body?._csrf ||
           req.query?._csrf;
  }
};

// Initialize CSRF protection
const {
  generateToken, // Generates a CSRF token pair
  doubleCsrfProtection, // Middleware to validate CSRF tokens
} = doubleCsrf(csrfOptions);

// Middleware to generate and send CSRF token
export const csrfTokenMiddleware = (req, res, next) => {
  const { token } = generateToken(req, res);
  res.locals.csrfToken = token;
  next();
};

// Export CSRF protection middleware
export const csrfProtection = doubleCsrfProtection;

// Endpoint to get CSRF token
export const getCsrfToken = (req, res) => {
  const { token } = generateToken(req, res);
  res.json({
    success: true,
    data: {
      csrfToken: token
    }
  });
};

export default {
  csrfTokenMiddleware,
  csrfProtection,
  getCsrfToken
};
