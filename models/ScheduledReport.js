import mongoose from 'mongoose';

const scheduledReportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  reportType: {
    type: String,
    required: true,
    enum: ['sales', 'revenue', 'inventory', 'customers', 'products', 'custom']
  },
  schedule: {
    frequency: {
      type: String,
      required: true,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']
    },
    time: {
      type: String,
      default: '09:00'
    },
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6
    },
    dayOfMonth: {
      type: Number,
      min: 1,
      max: 31
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  },
  recipients: [{
    email: {
      type: String,
      required: true
    },
    name: String
  }],
  filters: {
    startDate: Date,
    endDate: Date,
    category: String,
    status: String,
    customFilters: mongoose.Schema.Types.Mixed
  },
  format: {
    type: String,
    enum: ['pdf', 'excel', 'csv', 'all'],
    default: 'pdf'
  },
  enabled: {
    type: Boolean,
    default: true
  },
  lastRun: Date,
  nextRun: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  runHistory: [{
    executedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'partial'],
      required: true
    },
    recipientsSent: Number,
    error: String,
    fileSize: Number
  }]
}, {
  timestamps: true
});

// Calculate next run date
scheduledReportSchema.methods.calculateNextRun = function() {
  const now = new Date();
  let nextRun = new Date(now);

  switch(this.schedule.frequency) {
    case 'daily':
      nextRun.setDate(nextRun.getDate() + 1);
      break;
    case 'weekly':
      nextRun.setDate(nextRun.getDate() + 7);
      break;
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      if (this.schedule.dayOfMonth) {
        nextRun.setDate(this.schedule.dayOfMonth);
      }
      break;
    case 'quarterly':
      nextRun.setMonth(nextRun.getMonth() + 3);
      break;
    case 'yearly':
      nextRun.setFullYear(nextRun.getFullYear() + 1);
      break;
  }

  // Set time
  if (this.schedule.time) {
    const [hours, minutes] = this.schedule.time.split(':');
    nextRun.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }

  this.nextRun = nextRun;
  return nextRun;
};

// Add to run history
scheduledReportSchema.methods.addToHistory = function(status, recipientsSent, error = null, fileSize = null) {
  this.runHistory.push({
    executedAt: new Date(),
    status,
    recipientsSent,
    error,
    fileSize
  });

  // Keep only last 50 entries
  if (this.runHistory.length > 50) {
    this.runHistory = this.runHistory.slice(-50);
  }

  this.lastRun = new Date();
};

// Indexes
scheduledReportSchema.index({ nextRun: 1, enabled: 1 });
scheduledReportSchema.index({ createdBy: 1 });
scheduledReportSchema.index({ reportType: 1 });

const ScheduledReport = mongoose.model('ScheduledReport', scheduledReportSchema);

export default ScheduledReport;
