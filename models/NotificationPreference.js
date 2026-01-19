import mongoose from 'mongoose';

/**
 * NotificationPreference Model
 *
 * Stores user preferences for different notification channels
 * Features:
 * - Per-channel preferences (email, SMS, push, in-app, WhatsApp)
 * - Per-event type preferences
 * - Quiet hours settings
 * - Email digest options
 */

const eventPreferenceSchema = new mongoose.Schema({
  order_placed: {
    type: Boolean,
    default: true
  },
  payment_received: {
    type: Boolean,
    default: true
  },
  order_confirmed: {
    type: Boolean,
    default: true
  },
  order_processing: {
    type: Boolean,
    default: false
  },
  order_shipped: {
    type: Boolean,
    default: true
  },
  out_for_delivery: {
    type: Boolean,
    default: true
  },
  order_delivered: {
    type: Boolean,
    default: true
  },
  order_cancelled: {
    type: Boolean,
    default: true
  },
  return_initiated: {
    type: Boolean,
    default: true
  },
  return_approved: {
    type: Boolean,
    default: true
  },
  refund_processed: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const quietHoursSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false
  },
  startTime: {
    type: String, // Format: "22:00"
    default: '22:00'
  },
  endTime: {
    type: String, // Format: "08:00"
    default: '08:00'
  },
  timezone: {
    type: String,
    default: 'Asia/Kolkata'
  }
}, { _id: false });

const notificationPreferenceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Channel-specific preferences
  channels: {
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      events: {
        type: eventPreferenceSchema,
        default: () => ({})
      },
      digest: {
        enabled: {
          type: Boolean,
          default: false
        },
        frequency: {
          type: String,
          enum: ['daily', 'weekly'],
          default: 'daily'
        },
        time: {
          type: String, // Format: "09:00"
          default: '09:00'
        }
      }
    },

    sms: {
      enabled: {
        type: Boolean,
        default: true
      },
      events: {
        type: eventPreferenceSchema,
        default: () => ({
          order_placed: false,
          payment_received: false,
          order_confirmed: false,
          order_processing: false,
          order_shipped: true,
          out_for_delivery: true,
          order_delivered: true,
          order_cancelled: true,
          return_initiated: false,
          return_approved: false,
          refund_processed: true
        })
      },
      phoneNumber: {
        type: String,
        default: null
      }
    },

    push: {
      enabled: {
        type: Boolean,
        default: true
      },
      events: {
        type: eventPreferenceSchema,
        default: () => ({})
      },
      devices: [{
        token: String,
        platform: {
          type: String,
          enum: ['web', 'android', 'ios']
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }]
    },

    inApp: {
      enabled: {
        type: Boolean,
        default: true
      },
      events: {
        type: eventPreferenceSchema,
        default: () => ({})
      }
    },

    whatsapp: {
      enabled: {
        type: Boolean,
        default: false
      },
      events: {
        type: eventPreferenceSchema,
        default: () => ({
          order_placed: false,
          payment_received: false,
          order_confirmed: false,
          order_processing: false,
          order_shipped: true,
          out_for_delivery: true,
          order_delivered: true,
          order_cancelled: true,
          return_initiated: false,
          return_approved: false,
          refund_processed: true
        })
      },
      phoneNumber: {
        type: String,
        default: null
      }
    }
  },

  // Global settings
  quietHours: {
    type: quietHoursSchema,
    default: () => ({})
  },

  // Marketing preferences
  marketing: {
    promotional: {
      type: Boolean,
      default: false
    },
    newArrivals: {
      type: Boolean,
      default: false
    },
    specialOffers: {
      type: Boolean,
      default: false
    }
  },

  // Notification importance filter
  minimumPriority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'low'
  }
}, {
  timestamps: true
});

// Index for user lookups
notificationPreferenceSchema.index({ user: 1 }, { unique: true, name: 'user_idx' });

// Method to check if notification should be sent
notificationPreferenceSchema.methods.shouldSendNotification = function(channel, eventType, priority = 'medium') {
  // Check if channel is enabled
  if (!this.channels[channel]?.enabled) {
    return false;
  }

  // Check priority filter
  const priorityLevels = ['low', 'medium', 'high', 'urgent'];
  const minPriorityIndex = priorityLevels.indexOf(this.minimumPriority);
  const eventPriorityIndex = priorityLevels.indexOf(priority);

  if (eventPriorityIndex < minPriorityIndex) {
    return false;
  }

  // Check event-specific preference
  const eventPreference = this.channels[channel]?.events?.[eventType];
  if (eventPreference === false) {
    return false;
  }

  // Check quiet hours (for non-urgent notifications)
  if (priority !== 'urgent' && this.quietHours?.enabled) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const { startTime, endTime } = this.quietHours;

    // Handle quiet hours that span midnight
    if (startTime > endTime) {
      if (currentTime >= startTime || currentTime < endTime) {
        return false;
      }
    } else {
      if (currentTime >= startTime && currentTime < endTime) {
        return false;
      }
    }
  }

  return true;
};

// Method to add push device token
notificationPreferenceSchema.methods.addPushDevice = function(token, platform) {
  // Remove existing token if it exists
  this.channels.push.devices = this.channels.push.devices.filter(
    device => device.token !== token
  );

  // Add new device
  this.channels.push.devices.push({
    token,
    platform,
    addedAt: new Date()
  });

  return this.save();
};

// Method to remove push device token
notificationPreferenceSchema.methods.removePushDevice = function(token) {
  this.channels.push.devices = this.channels.push.devices.filter(
    device => device.token !== token
  );

  return this.save();
};

// Static method to get or create preferences for user
notificationPreferenceSchema.statics.getOrCreateForUser = async function(userId) {
  let preferences = await this.findOne({ user: userId });

  if (!preferences) {
    preferences = await this.create({ user: userId });
  }

  return preferences;
};

const NotificationPreference = mongoose.model('NotificationPreference', notificationPreferenceSchema);

export default NotificationPreference;
