/**
 * User Model
 * MongoDB/Mongoose model for users
 */

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // External ID (could be telegram, web app, etc.)
  externalId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },

  // External system identifier (telegram, web, mobile, api, etc.)
  externalSystem: {
    type: String,
    required: true,
    enum: ['telegram', 'web', 'mobile', 'api', 'other'],
    default: 'api'
  },

  // User profile information
  profile: {
    username: {
      type: String,
      trim: true,
      maxlength: 50
    },
    firstName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 100
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(email) {
          return !email || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email);
        },
        message: 'Invalid email format'
      }
    },
    avatar: {
      type: String,
      trim: true
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'ru', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja']
    }
  },

  // User preferences
  preferences: {
    // Image generation preferences
    image: {
      defaultModel: {
        type: String,
        enum: ['dall-e-2', 'dall-e-3'],
        default: 'dall-e-3'
      },
      defaultSize: {
        type: String,
        enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
        default: '1024x1024'
      },
      defaultQuality: {
        type: String,
        enum: ['standard', 'hd'],
        default: 'standard'
      },
      defaultStyle: {
        type: String,
        enum: ['vivid', 'natural'],
        default: 'vivid'
      }
    },
    // Notification preferences
    notifications: {
      email: {
        type: Boolean,
        default: false
      },
      push: {
        type: Boolean,
        default: true
      }
    },
    // Upload preferences
    upload: {
      autoUpload: {
        type: Boolean,
        default: false
      },
      defaultKeywords: {
        type: [String],
        default: []
      }
    }
  },

  // User statistics
  stats: {
    imagesGenerated: {
      type: Number,
      default: 0,
      min: 0
    },
    imagesUploaded: {
      type: Number,
      default: 0,
      min: 0
    },
    totalRequests: {
      type: Number,
      default: 0,
      min: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    }
  },

  // Account status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'deleted'],
    default: 'active'
  },

  // Subscription/Plan information
  subscription: {
    plan: {
      type: String,
      enum: ['free', 'basic', 'pro', 'enterprise'],
      default: 'free'
    },
    limits: {
      imagesPerDay: {
        type: Number,
        default: 10
      },
      imagesPerMonth: {
        type: Number,
        default: 100
      }
    },
    usage: {
      imagesToday: {
        type: Number,
        default: 0
      },
      imagesThisMonth: {
        type: Number,
        default: 0
      },
      resetDate: {
        type: Date,
        default: Date.now
      }
    }
  },

  // Metadata
  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    source: String
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  versionKey: false
});

// Indexes for performance
userSchema.index({ externalId: 1, externalSystem: 1 }, { unique: true });
userSchema.index({ 'profile.email': 1 }, { sparse: true });
userSchema.index({ 'profile.username': 1 }, { sparse: true });
userSchema.index({ status: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ 'stats.lastActivity': -1 });

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.profile.username || 'Anonymous';
});

// Virtual for API response format
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    return ret;
  }
});

// Pre-save middleware
userSchema.pre('save', function(next) {
  // Update last activity on save
  this.stats.lastActivity = new Date();
  
  // Increment total requests if this is an update
  if (!this.isNew) {
    this.stats.totalRequests += 1;
  }
  
  next();
});

// Static methods
userSchema.statics.findByExternalId = function(externalId, externalSystem = 'api') {
  return this.findOne({ externalId, externalSystem, status: { $ne: 'deleted' } });
};

userSchema.statics.findActiveUsers = function() {
  return this.find({ status: 'active' }).sort({ 'stats.lastActivity': -1 });
};

userSchema.statics.getUserStats = function() {
  return this.aggregate([
    { $match: { status: { $ne: 'deleted' } } },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
        },
        totalImagesGenerated: { $sum: '$stats.imagesGenerated' },
        totalImagesUploaded: { $sum: '$stats.imagesUploaded' },
        totalRequests: { $sum: '$stats.totalRequests' }
      }
    }
  ]);
};

// Instance methods
userSchema.methods.updateStats = function(field, increment = 1) {
  this.stats[field] = (this.stats[field] || 0) + increment;
  this.stats.lastActivity = new Date();
  return this.save();
};

userSchema.methods.canGenerateImages = function() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const resetDate = new Date(this.subscription.usage.resetDate);
  
  // Reset daily usage if it's a new day
  if (resetDate < today) {
    this.subscription.usage.imagesToday = 0;
    this.subscription.usage.resetDate = today;
  }
  
  return this.subscription.usage.imagesToday < this.subscription.limits.imagesPerDay;
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  
  // Remove sensitive information
  delete obj.metadata;
  
  return obj;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
