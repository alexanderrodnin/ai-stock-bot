/**
 * App Configuration Model
 * MongoDB/Mongoose model for application configurations
 */

const mongoose = require('mongoose');

const appConfigSchema = new mongoose.Schema({
  // Unique configuration key
  configKey: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },

  // Configuration type for categorization
  configType: {
    type: String,
    required: true,
    enum: ['system', 'user', 'feature', 'integration'],
    default: 'system'
  },

  // Whether this configuration is active
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  // Configuration value (flexible schema)
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },

  // Metadata about the configuration
  metadata: {
    description: {
      type: String,
      trim: true
    },
    lastModified: {
      type: Date,
      default: Date.now
    },
    modifiedBy: {
      type: String,
      default: 'system'
    },
    version: {
      type: Number,
      default: 1,
      min: 1
    }
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  versionKey: false
});

// Indexes for performance
appConfigSchema.index({ configKey: 1, isActive: 1 });
appConfigSchema.index({ configType: 1, isActive: 1 });
appConfigSchema.index({ updatedAt: -1 });

// Virtual for API response format
appConfigSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
appConfigSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    return ret;
  }
});

// Pre-save middleware
appConfigSchema.pre('save', function(next) {
  // Update metadata on save
  this.metadata.lastModified = new Date();
  
  // Increment version if this is an update
  if (!this.isNew) {
    this.metadata.version += 1;
  }
  
  next();
});

// Static methods
appConfigSchema.statics.findByKey = function(configKey) {
  return this.findOne({ configKey, isActive: true });
};

appConfigSchema.statics.findByType = function(configType) {
  return this.find({ configType, isActive: true }).sort({ configKey: 1 });
};

appConfigSchema.statics.getActiveConfigs = function() {
  return this.find({ isActive: true }).sort({ configKey: 1 });
};

// Instance methods
appConfigSchema.methods.updateValue = function(newValue, modifiedBy = 'system') {
  this.value = newValue;
  this.metadata.modifiedBy = modifiedBy;
  this.metadata.lastModified = new Date();
  return this.save();
};

appConfigSchema.methods.deactivate = function(modifiedBy = 'system') {
  this.isActive = false;
  this.metadata.modifiedBy = modifiedBy;
  this.metadata.lastModified = new Date();
  return this.save();
};

appConfigSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  return obj;
};

const AppConfig = mongoose.model('AppConfig', appConfigSchema);

module.exports = AppConfig;
