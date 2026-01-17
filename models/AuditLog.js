import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      // User actions
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'USER_ROLE_CHANGED',
      'USER_STATUS_CHANGED',
      // Admin actions
      'ADMIN_PROMOTED',
      'ADMIN_DEMOTED',
      // Product actions
      'PRODUCT_CREATED',
      'PRODUCT_UPDATED',
      'PRODUCT_DELETED',
      // Category actions
      'CATEGORY_CREATED',
      'CATEGORY_UPDATED',
      'CATEGORY_DELETED',
      // Order actions
      'ORDER_STATUS_CHANGED',
      'ORDER_CANCELLED',
      // Settings actions
      'SETTINGS_UPDATED',
      // System actions
      'SYSTEM_BACKUP',
      'SYSTEM_RESTORE',
      // Authentication actions
      'LOGIN_ATTEMPT',
      'LOGOUT',
      'PASSWORD_RESET',
      // Other
      'OTHER'
    ]
  },
  entity: {
    type: String,
    required: true,
    enum: ['User', 'Product', 'Category', 'Order', 'Settings', 'System', 'Auth']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  details: {
    type: mongoose.Schema.Types.Mixed
  },
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  status: {
    type: String,
    enum: ['success', 'failed'],
    default: 'success'
  },
  errorMessage: String
}, {
  timestamps: true
});

// Indexes for audit log queries
// Compound index for user-based audit trail
auditLogSchema.index({ user: 1, createdAt: -1 }, { name: 'user_created_idx' });

// Index for action type queries
auditLogSchema.index({ action: 1, createdAt: -1 }, { name: 'action_created_idx' });

// Index for entity queries
auditLogSchema.index({ entity: 1, entityId: 1, createdAt: -1 }, { name: 'entity_created_idx' });

// Index for date range queries
auditLogSchema.index({ createdAt: -1 }, { name: 'created_idx' });

// Index for status queries
auditLogSchema.index({ status: 1, createdAt: -1 }, { name: 'status_created_idx' });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
