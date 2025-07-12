/**
 * Image Model
 * MongoDB/Mongoose model for generated and uploaded images
 */

const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
  // Reference to user who generated/owns this image
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // External user ID for quick lookup
  userExternalId: {
    type: String,
    required: true,
    index: true
  },

  // External system (telegram, web, etc.)
  userExternalSystem: {
    type: String,
    required: true,
    enum: ['telegram', 'web', 'mobile', 'api', 'other'],
    default: 'api'
  },

  // Image generation details
  generation: {
    // Original prompt used to generate the image
    prompt: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000
    },

    // Revised prompt (from OpenAI)
    revisedPrompt: {
      type: String,
      trim: true,
      maxlength: 4000
    },

    // Model used for generation
    model: {
      type: String,
      required: true,
      enum: ['dall-e-2', 'dall-e-3', 'fallback'],
      default: 'dall-e-3'
    },

    // Source of the image (OpenAI or fallback)
    usedSource: {
      type: String,
      default: 'OpenAI'
    },

    // Reason for fallback (if applicable)
    fallbackReason: {
      type: String,
      enum: [
        'Authentication Failed',
        'API Key Invalid or Forbidden', 
        'Quota Exceeded', 
        'OpenAI Server Error',
        'Content Policy Restriction', 
        'Request Timeout',
        'Network Error',
        'API Error', 
        'Demo Mode Activated'
      ],
      sparse: true
    },

    // Image parameters
    size: {
      type: String,
      required: true,
      enum: ['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'],
      default: '1024x1024'
    },

    quality: {
      type: String,
      enum: ['standard', 'hd'],
      default: 'standard'
    },

    style: {
      type: String,
      enum: ['vivid', 'natural'],
      default: 'vivid'
    },

    // Generation metadata
    generatedAt: {
      type: Date,
      default: Date.now,
      required: true
    },

    // OpenAI response metadata
    openaiResponse: {
      created: Number,
      data: [{
        url: String,
        revised_prompt: String
      }]
    }
  },

  // Image file information
  file: {
    // Original filename from OpenAI
    originalFilename: {
      type: String,
      trim: true
    },

    // Our internal filename
    filename: {
      type: String,
      required: true,
      trim: true
    },

    // File path (relative to storage root)
    path: {
      type: String,
      required: true,
      trim: true
    },

    // File size in bytes
    size: {
      type: Number,
      required: true,
      min: 0
    },

    // MIME type
    mimeType: {
      type: String,
      required: true,
      enum: ['image/jpeg', 'image/png', 'image/webp']
    },

    // Image dimensions
    width: {
      type: Number,
      min: 1
    },

    height: {
      type: Number,
      min: 1
    },

    // File hash for deduplication
    hash: {
      type: String,
      index: true
    },

    // Original URL from OpenAI (temporary)
    originalUrl: {
      type: String,
      trim: true
    }
  },

  // Upload status and information
  uploads: [{
    // Stock service name
    service: {
      type: String,
      required: true,
      enum: ['123rf', 'adobeStock', 'freepik', 'pixta', 'other']
    },

    // Upload status
    status: {
      type: String,
      required: true,
      enum: ['pending', 'uploading', 'completed', 'failed', 'rejected'],
      default: 'pending'
    },

    // Upload metadata
    uploadedAt: {
      type: Date
    },

    // External ID from stock service
    externalId: {
      type: String,
      trim: true
    },

    // Upload URL or reference
    uploadUrl: {
      type: String,
      trim: true
    },

    // Upload settings used
    settings: {
      title: {
        type: String,
        trim: true,
        maxlength: 200
      },
      description: {
        type: String,
        trim: true,
        maxlength: 2000
      },
      keywords: {
        type: [String],
        default: []
      },
      category: {
        type: String,
        trim: true
      },
      pricing: {
        type: String,
        enum: ['standard', 'premium', 'exclusive'],
        default: 'standard'
      }
    },

    // Error information if upload failed
    error: {
      message: String,
      code: String,
      details: mongoose.Schema.Types.Mixed
    },

    // Retry information
    retries: {
      type: Number,
      default: 0,
      min: 0
    },

    lastRetryAt: {
      type: Date
    }
  }],

  // Image metadata and tags
  metadata: {
    // User-defined title
    title: {
      type: String,
      trim: true,
      maxlength: 200
    },

    // User-defined description
    description: {
      type: String,
      trim: true,
      maxlength: 2000
    },

    // User-defined keywords/tags
    keywords: {
      type: [String],
      default: []
    },

    // Auto-generated tags (from AI analysis)
    autoTags: {
      type: [String],
      default: []
    },

    // Category classification
    category: {
      type: String,
      trim: true
    },

    // Content rating
    rating: {
      type: String,
      enum: ['safe', 'moderate', 'adult'],
      default: 'safe'
    },

    // Color palette (dominant colors)
    colors: {
      type: [String],
      default: []
    }
  },

  // Image status
  status: {
    type: String,
    enum: ['active', 'archived', 'deleted'],
    default: 'active',
    index: true
  },

  // Usage statistics
  stats: {
    views: {
      type: Number,
      default: 0,
      min: 0
    },
    downloads: {
      type: Number,
      default: 0,
      min: 0
    },
    shares: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  // Flags and moderation
  flags: {
    isPublic: {
      type: Boolean,
      default: false
    },
    isFeatured: {
      type: Boolean,
      default: false
    },
    isModerated: {
      type: Boolean,
      default: false
    },
    moderationResult: {
      type: String,
      enum: ['approved', 'rejected', 'pending'],
      default: 'pending'
    },
    moderationNotes: {
      type: String,
      trim: true
    }
  }

}, {
  timestamps: true, // Adds createdAt and updatedAt automatically
  versionKey: false
});

// Indexes for performance
imageSchema.index({ userId: 1, createdAt: -1 });
imageSchema.index({ userExternalId: 1, userExternalSystem: 1, createdAt: -1 });
imageSchema.index({ 'generation.prompt': 'text', 'metadata.title': 'text', 'metadata.description': 'text' });
imageSchema.index({ 'file.hash': 1 }, { sparse: true });
imageSchema.index({ status: 1, createdAt: -1 });
imageSchema.index({ 'uploads.service': 1, 'uploads.status': 1 });
imageSchema.index({ 'metadata.keywords': 1 });
imageSchema.index({ 'metadata.category': 1 });
imageSchema.index({ 'flags.isPublic': 1, 'flags.moderationResult': 1 });

// Virtual for API response format
imageSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Virtual for file URL (if served by backend)
imageSchema.virtual('file.url').get(function() {
  if (this.file.path) {
    return `/api/images/${this._id}/file`;
  }
  return null;
});


// Ensure virtual fields are serialized
imageSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret._id;
    return ret;
  }
});

// Pre-save middleware
imageSchema.pre('save', function(next) {
  // Auto-generate title if not provided
  if (!this.metadata.title && this.generation.prompt) {
    this.metadata.title = this.generation.prompt.substring(0, 100);
    if (this.generation.prompt.length > 100) {
      this.metadata.title += '...';
    }
  }

  // Extract keywords from prompt if not provided
  if (this.metadata.keywords.length === 0 && this.generation.prompt) {
    const words = this.generation.prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
    this.metadata.keywords = [...new Set(words)];
  }

  next();
});

// Static methods
imageSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId, status: { $ne: 'deleted' } };
  
  let find = this.find(query);
  
  if (options.limit) {
    find = find.limit(options.limit);
  }
  
  if (options.skip) {
    find = find.skip(options.skip);
  }
  
  return find.sort({ createdAt: -1 });
};

imageSchema.statics.findByExternalUser = function(externalId, externalSystem = 'api', options = {}) {
  const query = { 
    userExternalId: externalId, 
    userExternalSystem: externalSystem,
    status: { $ne: 'deleted' } 
  };
  
  let find = this.find(query);
  
  if (options.limit) {
    find = find.limit(options.limit);
  }
  
  if (options.skip) {
    find = find.skip(options.skip);
  }
  
  return find.sort({ createdAt: -1 });
};

imageSchema.statics.findPublic = function(options = {}) {
  const query = { 
    'flags.isPublic': true,
    'flags.moderationResult': 'approved',
    status: 'active'
  };
  
  let find = this.find(query);
  
  if (options.limit) {
    find = find.limit(options.limit);
  }
  
  if (options.skip) {
    find = find.skip(options.skip);
  }
  
  if (options.category) {
    query['metadata.category'] = options.category;
  }
  
  if (options.keywords && options.keywords.length > 0) {
    query['metadata.keywords'] = { $in: options.keywords };
  }
  
  return find.sort({ createdAt: -1 });
};

imageSchema.statics.getStats = function() {
  return this.aggregate([
    { $match: { status: { $ne: 'deleted' } } },
    {
      $group: {
        _id: null,
        totalImages: { $sum: 1 },
        totalViews: { $sum: '$stats.views' },
        totalDownloads: { $sum: '$stats.downloads' },
        totalShares: { $sum: '$stats.shares' },
        publicImages: {
          $sum: { $cond: [{ $eq: ['$flags.isPublic', true] }, 1, 0] }
        },
        pendingModeration: {
          $sum: { $cond: [{ $eq: ['$flags.moderationResult', 'pending'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Instance methods
imageSchema.methods.addUpload = function(service, settings = {}) {
  const upload = {
    service,
    status: 'pending',
    settings,
    retries: 0
  };
  
  this.uploads.push(upload);
  return this.save();
};

imageSchema.methods.updateUploadStatus = function(service, status, data = {}) {
  const upload = this.uploads.find(u => u.service === service);
  
  if (!upload) {
    throw new Error(`Upload for service ${service} not found`);
  }
  
  upload.status = status;
  
  if (status === 'completed') {
    upload.uploadedAt = new Date();
    if (data.externalId) upload.externalId = data.externalId;
    if (data.uploadUrl) upload.uploadUrl = data.uploadUrl;
  } else if (status === 'failed') {
    upload.error = data.error || {};
    upload.lastRetryAt = new Date();
  }
  
  return this.save();
};

imageSchema.methods.incrementStat = function(stat, increment = 1) {
  if (!this.stats[stat]) {
    this.stats[stat] = 0;
  }
  this.stats[stat] += increment;
  return this.save();
};

imageSchema.methods.toSafeObject = function() {
  const obj = this.toObject({ virtuals: true });
  
  // Remove sensitive information
  delete obj.file.originalUrl;
  
  return obj;
};

const Image = mongoose.model('Image', imageSchema);

module.exports = Image;
