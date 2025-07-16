/**
 * Configuration Audit Log Model
 * MongoDB/Mongoose model for tracking configuration changes
 */

const mongoose = require('mongoose');

const configAuditLogSchema = new mongoose.Schema({
  // Configuration key that was changed
  configKey: {
    type: String,
    required: true,
    trim: true,
    index: true
  },

  // Type of action performed
  action: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'ACTIVATE', 'DEACTIVATE'],
    index: true
  },

  // Previous value (for UPDATE actions)
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // New value (for CREATE/UPDATE actions)
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  // Who made the change
  changedBy: {
    type: String,
    required: true,
    default: 'system'
  },

  // When the change was made
  changedAt: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },

  // Request metadata
  requestMetadata: {
    ipAddress: {
      type: String,
      trim: true
    },
    userAgent: {
      type: String,
      trim: true
    },
    endpoint: {
      type: String,
      trim: true
    },
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      default: 'PUT'
    }
  },

  // Optional reason for the change
  reason: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Additional context or notes
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  versionKey: false
});

// Indexes for performance and querying
configAuditLogSchema.index({ configKey: 1, changedAt: -1 });
configAuditLogSchema.index({ action: 1, changedAt: -1 });
configAuditLogSchema.index({ changedBy: 1, changedAt: -1 });
configAuditLogSchema.index({ changedAt: -1 }); // For general chronological queries

// Virtual for API response format
configAuditLogSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
configAuditLogSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    return ret;
  }
});

// Static methods
configAuditLogSchema.statics.findByConfigKey = function(configKey, options = {}) {
  const query = { configKey };
  
  let find = this.find(query);
  
  if (options.limit) {
    find = find.limit(options.limit);
  }
  
  if (options.skip) {
    find = find.skip(options.skip);
  }
  
  return find.sort({ changedAt: -1 });
};

configAuditLogSchema.statics.findByAction = function(action, options = {}) {
  const query = { action };
  
  let find = this.find(query);
  
  if (options.limit) {
    find = find.limit(options.limit);
  }
  
  if (options.skip) {
    find = find.skip(options.skip);
  }
  
  return find.sort({ changedAt: -1 });
};

configAuditLogSchema.statics.findByDateRange = function(startDate, endDate, options = {}) {
  const query = {
    changedAt: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  let find = this.find(query);
  
  if (options.limit) {
    find = find.limit(options.limit);
  }
  
  if (options.skip) {
    find = find.skip(options.skip);
  }
  
  return find.sort({ changedAt: -1 });
};

configAuditLogSchema.statics.getRecentChanges = function(limit = 50) {
  return this.find({})
    .sort({ changedAt: -1 })
    .limit(limit);
};

// Static method to create audit log entry
configAuditLogSchema.statics.logChange = function(logData) {
  const {
    configKey,
    action,
    oldValue = null,
    newValue = null,
    changedBy = 'system',
    requestMetadata = {},
    reason = null,
    context = {}
  } = logData;

  const auditLog = new this({
    configKey,
    action,
    oldValue,
    newValue,
    changedBy,
    changedAt: new Date(),
    requestMetadata,
    reason,
    context
  });

  return auditLog.save();
};

// Instance methods
configAuditLogSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  
  // Remove sensitive information if needed
  // (currently no sensitive data to remove)
  
  return obj;
};

const ConfigAuditLog = mongoose.model('ConfigAuditLog', configAuditLogSchema);

module.exports = ConfigAuditLog;
