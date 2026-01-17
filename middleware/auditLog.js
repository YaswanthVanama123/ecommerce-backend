import AuditLog from '../models/AuditLog.js';

/**
 * Middleware to automatically log actions to audit trail
 * This should be used on routes that require audit logging
 *
 * @param {string} action - The action being performed (e.g., 'USER_CREATED', 'PRODUCT_UPDATED')
 * @param {string} entity - The entity type (e.g., 'User', 'Product', 'Order')
 * @param {function} getEntityId - Optional function to extract entity ID from request
 */
export const auditLog = (action, entity, getEntityId = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json;

    // Override json method to capture response
    res.json = async function (data) {
      try {
        // Only log successful operations (2xx status codes)
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

        // Extract entity ID
        let entityId = null;
        if (getEntityId && typeof getEntityId === 'function') {
          entityId = getEntityId(req, data);
        } else if (req.params.id) {
          entityId = req.params.id;
        } else if (data && data.data && data.data._id) {
          entityId = data.data._id;
        }

        // Create audit log entry
        await AuditLog.create({
          user: req.user._id,
          action,
          entity,
          entityId,
          details: {
            method: req.method,
            path: req.path,
            query: req.query,
            body: sanitizeBody(req.body)
          },
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          status: isSuccess ? 'success' : 'failed',
          errorMessage: isSuccess ? null : data?.message
        });
      } catch (error) {
        // Log error but don't fail the request
        console.error('Audit logging error:', error);
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Sanitize request body to remove sensitive information
 */
const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'refreshToken', 'token', 'cardNumber', 'cvv'];

  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });

  return sanitized;
};

/**
 * Manual audit logging helper function
 * Use this when you need more control over what gets logged
 */
export const createAuditLog = async ({
  user,
  action,
  entity,
  entityId = null,
  details = {},
  changes = null,
  ipAddress = null,
  userAgent = null,
  status = 'success',
  errorMessage = null
}) => {
  try {
    await AuditLog.create({
      user,
      action,
      entity,
      entityId,
      details,
      changes,
      ipAddress,
      userAgent,
      status,
      errorMessage
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error - audit logging should not break the app
  }
};

/**
 * Middleware to log authentication attempts
 */
export const auditAuthAttempt = async (req, res, next) => {
  // Store original json method
  const originalJson = res.json;

  res.json = async function (data) {
    try {
      const isSuccess = res.statusCode === 200 || res.statusCode === 201;
      const action = req.path.includes('login') ? 'LOGIN_ATTEMPT' :
                     req.path.includes('logout') ? 'LOGOUT' :
                     req.path.includes('reset') ? 'PASSWORD_RESET' : 'OTHER';

      await AuditLog.create({
        user: req.user?._id || null,
        action,
        entity: 'Auth',
        details: {
          email: req.body.email,
          path: req.path
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('user-agent'),
        status: isSuccess ? 'success' : 'failed',
        errorMessage: isSuccess ? null : data?.message
      });
    } catch (error) {
      console.error('Auth audit logging error:', error);
    }

    return originalJson.call(this, data);
  };

  next();
};

export default {
  auditLog,
  createAuditLog,
  auditAuthAttempt
};
