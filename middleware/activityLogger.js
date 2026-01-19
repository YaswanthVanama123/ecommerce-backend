import AdminActivityLog from '../models/AdminActivityLog.js';

// Extract IP address from request
const getIpAddress = (req) => {
  return req.ip ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         'unknown';
};

// Extract user agent
const getUserAgent = (req) => {
  return req.headers['user-agent'] || 'unknown';
};

// Activity logging middleware
export const logActivity = (action, resourceType, getSeverity = () => 'low') => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);

    // Track response
    let responseData = null;
    let resourceId = null;
    let resourceName = null;
    let changes = {};
    let description = '';

    // Override res.json to capture response
    res.json = function(data) {
      responseData = data;
      return originalJson(data);
    };

    // Override res.send to capture response
    res.send = function(data) {
      if (typeof data === 'string') {
        try {
          responseData = JSON.parse(data);
        } catch (e) {
          responseData = data;
        }
      } else {
        responseData = data;
      }
      return originalSend(data);
    };

    // Store original response end
    const originalEnd = res.end.bind(res);
    res.end = async function(...args) {
      try {
        // Only log if user is authenticated and is admin/superadmin
        if (req.user && ['admin', 'superadmin'].includes(req.user.role)) {
          const success = res.statusCode >= 200 && res.statusCode < 300;

          // Extract resource information from response or request
          if (responseData) {
            if (responseData._id) {
              resourceId = responseData._id;
            } else if (responseData.id) {
              resourceId = responseData.id;
            } else if (responseData.data && responseData.data._id) {
              resourceId = responseData.data._id;
            }

            if (responseData.name) {
              resourceName = responseData.name;
            } else if (responseData.title) {
              resourceName = responseData.title;
            } else if (responseData.email) {
              resourceName = responseData.email;
            } else if (responseData.orderNumber) {
              resourceName = responseData.orderNumber;
            }
          }

          // Get resource ID from params if not in response
          if (!resourceId && req.params.id) {
            resourceId = req.params.id;
          }

          // Build description based on action
          description = buildDescription(action, req, responseData);

          // Extract changes if applicable
          if (req.body && req.method === 'PUT') {
            changes = {
              before: req.originalData || {},
              after: req.body
            };
          }

          // Determine severity
          const severity = typeof getSeverity === 'function'
            ? getSeverity(req, responseData)
            : getSeverity;

          // Log the activity
          await AdminActivityLog.log({
            user: req.user._id,
            userName: `${req.user.firstName} ${req.user.lastName}`,
            userEmail: req.user.email,
            action,
            resource: {
              type: resourceType,
              id: resourceId,
              name: resourceName
            },
            changes,
            description,
            severity,
            ipAddress: getIpAddress(req),
            userAgent: getUserAgent(req),
            success,
            errorMessage: success ? '' : (responseData?.message || 'Operation failed'),
            metadata: {
              method: req.method,
              path: req.path,
              query: req.query,
              params: req.params
            }
          });
        }
      } catch (error) {
        console.error('Error logging activity:', error);
      }

      return originalEnd(...args);
    };

    next();
  };
};

// Build human-readable description
const buildDescription = (action, req, responseData) => {
  const userName = `${req.user.firstName} ${req.user.lastName}`;

  switch (action) {
    // User Management
    case 'user_created':
      return `${userName} created a new user account`;
    case 'user_updated':
      return `${userName} updated user information`;
    case 'user_deleted':
      return `${userName} deleted a user account`;
    case 'user_activated':
      return `${userName} activated a user account`;
    case 'user_deactivated':
      return `${userName} deactivated a user account`;
    case 'user_role_changed':
      return `${userName} changed user role`;
    case 'password_reset':
      return `${userName} reset user password`;

    // Product Management
    case 'product_created':
      return `${userName} created a new product`;
    case 'product_updated':
      return `${userName} updated product information`;
    case 'product_deleted':
      return `${userName} deleted a product`;
    case 'product_status_changed':
      return `${userName} changed product status`;
    case 'bulk_product_update':
      return `${userName} performed bulk update on products`;
    case 'inventory_adjusted':
      return `${userName} adjusted product inventory`;

    // Order Management
    case 'order_created':
      return `${userName} created a new order`;
    case 'order_updated':
      return `${userName} updated order information`;
    case 'order_status_changed':
      return `${userName} changed order status`;
    case 'order_cancelled':
      return `${userName} cancelled an order`;
    case 'bulk_order_update':
      return `${userName} performed bulk update on orders`;
    case 'refund_issued':
      return `${userName} issued a refund`;

    // Category Management
    case 'category_created':
      return `${userName} created a new category`;
    case 'category_updated':
      return `${userName} updated category information`;
    case 'category_deleted':
      return `${userName} deleted a category`;

    // Coupon Management
    case 'coupon_created':
      return `${userName} created a new coupon`;
    case 'coupon_updated':
      return `${userName} updated coupon information`;
    case 'coupon_deleted':
      return `${userName} deleted a coupon`;

    // Settings
    case 'settings_updated':
      return `${userName} updated system settings`;
    case 'payment_settings_updated':
      return `${userName} updated payment settings`;
    case 'shipping_settings_updated':
      return `${userName} updated shipping settings`;
    case 'email_settings_updated':
      return `${userName} updated email settings`;

    // Banner Management
    case 'banner_created':
      return `${userName} created a new banner`;
    case 'banner_updated':
      return `${userName} updated banner information`;
    case 'banner_deleted':
      return `${userName} deleted a banner`;

    // Security
    case 'login':
      return `${userName} logged in`;
    case 'logout':
      return `${userName} logged out`;
    case 'login_failed':
      return `Failed login attempt for ${req.body?.email || 'unknown'}`;
    case 'password_changed':
      return `${userName} changed their password`;
    case 'two_factor_enabled':
      return `${userName} enabled two-factor authentication`;
    case 'two_factor_disabled':
      return `${userName} disabled two-factor authentication`;

    // System
    case 'backup_created':
      return `${userName} created a system backup`;
    case 'backup_restored':
      return `${userName} restored system from backup`;
    case 'system_settings_changed':
      return `${userName} changed system settings`;
    case 'admin_user_created':
      return `${userName} created a new admin user`;
    case 'admin_user_updated':
      return `${userName} updated admin user`;
    case 'admin_user_deleted':
      return `${userName} deleted an admin user`;

    // Export/Import
    case 'data_exported':
      return `${userName} exported data`;
    case 'data_imported':
      return `${userName} imported data`;
    case 'bulk_delete':
      return `${userName} performed bulk delete operation`;

    default:
      return `${userName} performed ${action}`;
  }
};

// Middleware to capture original data before update
export const captureOriginalData = (Model) => {
  return async (req, res, next) => {
    try {
      if (req.params.id && req.method === 'PUT') {
        const original = await Model.findById(req.params.id).lean();
        req.originalData = original;
      }
    } catch (error) {
      console.error('Error capturing original data:', error);
    }
    next();
  };
};

// Log login activity
export const logLogin = async (user, req, success = true, errorMessage = '') => {
  try {
    await AdminActivityLog.log({
      user: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: success ? 'login' : 'login_failed',
      resource: {
        type: 'admin',
        id: user._id,
        name: user.email
      },
      description: success
        ? `${user.firstName} ${user.lastName} logged in successfully`
        : `Failed login attempt for ${user.email}`,
      severity: success ? 'low' : 'medium',
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      success,
      errorMessage
    });
  } catch (error) {
    console.error('Error logging login activity:', error);
  }
};

// Log logout activity
export const logLogout = async (user, req) => {
  try {
    await AdminActivityLog.log({
      user: user._id,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      action: 'logout',
      resource: {
        type: 'admin',
        id: user._id,
        name: user.email
      },
      description: `${user.firstName} ${user.lastName} logged out`,
      severity: 'low',
      ipAddress: getIpAddress(req),
      userAgent: getUserAgent(req),
      success: true
    });
  } catch (error) {
    console.error('Error logging logout activity:', error);
  }
};

export default {
  logActivity,
  captureOriginalData,
  logLogin,
  logLogout
};
