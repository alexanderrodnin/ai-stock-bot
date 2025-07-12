/**
 * User Controller
 * Handles user management and profile operations
 */

const { validationResult } = require('express-validator');
const User = require('../models/User');
const Image = require('../models/Image');
const stockUploadService = require('../services/stockUploadService');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class UserController {

  /**
   * Create or get user
   * POST /api/users
   */
  async createOrGetUser(req, res) {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }

    const {
      externalId,
      externalSystem = 'api',
      profile = {},
      preferences = {},
      metadata = {}
    } = req.body;

    logger.info('Create or get user request', {
      externalId,
      externalSystem,
      profile: { ...profile, email: profile.email ? '[REDACTED]' : undefined }
    });

    try {
      // Try to find existing user
      let user = await User.findByExternalId(externalId, externalSystem);

      if (user) {
        // Update last activity and metadata
        user.stats.lastActivity = new Date();
        if (metadata.ipAddress) user.metadata.ipAddress = metadata.ipAddress;
        if (metadata.userAgent) user.metadata.userAgent = metadata.userAgent;
        if (metadata.referrer) user.metadata.referrer = metadata.referrer;
        
        await user.save();

        logger.info('Existing user found and updated', {
          userId: user.id,
          externalId,
          externalSystem
        });

        return res.status(200).json({
          success: true,
          data: user.toSafeObject(),
          message: 'User retrieved successfully'
        });
      }

      // Create new user
      user = new User({
        externalId,
        externalSystem,
        profile,
        preferences,
        metadata,
        stats: {
          lastActivity: new Date()
        }
      });

      await user.save();

      logger.info('New user created', {
        userId: user.id,
        externalId,
        externalSystem
      });

      res.status(201).json({
        success: true,
        data: user.toSafeObject(),
        message: 'User created successfully'
      });

    } catch (error) {
      logger.error('Failed to create or get user', {
        error: error.message,
        externalId,
        externalSystem
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to create or retrieve user',
          code: 'USER_OPERATION_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:userId
   */
  async getUserById(req, res) {
    const { userId } = req.params;

    logger.info('Get user by ID request', { userId });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: user.toSafeObject()
      });

    } catch (error) {
      logger.error('Failed to get user by ID', {
        error: error.message,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve user',
          code: 'GET_USER_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get user by external ID
   * GET /api/users/external/:externalId/:externalSystem
   */
  async getUserByExternalId(req, res) {
    const { externalId, externalSystem } = req.params;

    logger.info('Get user by external ID request', { externalId, externalSystem });

    try {
      const user = await User.findByExternalId(externalId, externalSystem);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: user.toSafeObject()
      });

    } catch (error) {
      logger.error('Failed to get user by external ID', {
        error: error.message,
        externalId,
        externalSystem
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve user',
          code: 'GET_USER_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Update user profile
   * PUT /api/users/:userId/profile
   */
  async updateUserProfile(req, res) {
    const { userId } = req.params;
    const {
      username,
      firstName,
      lastName,
      email,
      avatar,
      language
    } = req.body;

    logger.info('Update user profile request', {
      userId,
      updates: { username, firstName, lastName, email: email ? '[REDACTED]' : undefined, language }
    });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Update profile fields
      if (username !== undefined) user.profile.username = username;
      if (firstName !== undefined) user.profile.firstName = firstName;
      if (lastName !== undefined) user.profile.lastName = lastName;
      if (email !== undefined) user.profile.email = email;
      if (avatar !== undefined) user.profile.avatar = avatar;
      if (language !== undefined) user.profile.language = language;

      await user.save();

      logger.info('User profile updated', { userId });

      res.status(200).json({
        success: true,
        data: user.toSafeObject(),
        message: 'Profile updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update user profile', {
        error: error.message,
        userId
      });

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: Object.values(error.errors).map(err => err.message)
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update profile',
          code: 'UPDATE_PROFILE_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Update user preferences
   * PUT /api/users/:userId/preferences
   */
  async updateUserPreferences(req, res) {
    const { userId } = req.params;
    const { image, notifications, upload } = req.body;

    logger.info('Update user preferences request', {
      userId,
      updates: { image, notifications, upload }
    });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Update preferences
      if (image) {
        Object.assign(user.preferences.image, image);
      }
      if (notifications) {
        Object.assign(user.preferences.notifications, notifications);
      }
      if (upload) {
        Object.assign(user.preferences.upload, upload);
      }

      await user.save();

      logger.info('User preferences updated', { userId });

      res.status(200).json({
        success: true,
        data: user.toSafeObject(),
        message: 'Preferences updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update user preferences', {
        error: error.message,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update preferences',
          code: 'UPDATE_PREFERENCES_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get user stock service settings
   * GET /api/users/:userId/stock-services
   */
  async getStockServiceSettings(req, res) {
    const { userId } = req.params;

    logger.info('Get stock service settings request', { userId });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Return stock services without sensitive data
      const stockServices = {};
      if (user.stockServices) {
        Object.keys(user.stockServices).forEach(service => {
          const serviceData = user.stockServices[service];
          stockServices[service] = {
            enabled: serviceData.enabled,
            credentials: {
              username: serviceData.credentials?.username,
              ftpHost: serviceData.credentials?.ftpHost,
              ftpPort: serviceData.credentials?.ftpPort,
              remotePath: serviceData.credentials?.remotePath,
              apiKey: serviceData.credentials?.apiKey
              // Passwords and secrets are excluded
            },
            settings: serviceData.settings
          };
        });
      }

      res.status(200).json({
        success: true,
        data: { stockServices }
      });

    } catch (error) {
      logger.error('Failed to get stock service settings', {
        error: error.message,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve stock service settings',
          code: 'GET_STOCK_SETTINGS_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Update stock service settings
   * PUT /api/users/:userId/stock-services/:service
   */
  async updateStockServiceSettings(req, res) {
    const { userId, service } = req.params;
    const {
      enabled,
      credentials = {},
      settings = {}
    } = req.body;

    // Map external service names to internal names
    const serviceMapping = {
      '123rf': 'rf123',
      'adobeStock': 'adobeStock',
      'freepik': 'freepik',
      'pixta': 'pixta'
    };

    const internalServiceName = serviceMapping[service];
    if (!internalServiceName) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid stock service: ${service}`,
          code: 'INVALID_SERVICE'
        }
      });
    }

    logger.info('Update stock service settings request', {
      userId,
      service,
      internalServiceName,
      enabled,
      credentialsKeys: Object.keys(credentials),
      settingsKeys: Object.keys(settings)
    });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Initialize stock services if not exists
      if (!user.stockServices) {
        user.stockServices = {};
      }
      if (!user.stockServices[internalServiceName]) {
        user.stockServices[internalServiceName] = {
          enabled: false,
          credentials: {},
          settings: {}
        };
      }

      // Update enabled status
      if (enabled !== undefined) {
        user.stockServices[internalServiceName].enabled = enabled;
      }

      // Update credentials (handle encrypted fields)
      if (credentials) {
        Object.keys(credentials).forEach(key => {
          if (key === 'password' && credentials[key]) {
            // Encrypt password - all services use FTP authentication
            user.setStockServicePassword(internalServiceName, credentials[key]);
          } else if (credentials[key] !== undefined) {
            // Regular credential field
            user.stockServices[internalServiceName].credentials[key] = credentials[key];
          }
        });
      }

      // Update settings
      if (settings) {
        Object.assign(user.stockServices[internalServiceName].settings, settings);
      }

      await user.save();

      logger.info('Stock service settings updated', { userId, service, internalServiceName });

      res.status(200).json({
        success: true,
        data: {
          service,
          enabled: user.stockServices[internalServiceName].enabled,
          settings: user.stockServices[internalServiceName].settings
        },
        message: `${service} settings updated successfully`
      });

    } catch (error) {
      logger.error('Failed to update stock service settings', {
        error: error.message,
        userId,
        service
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update stock service settings',
          code: 'UPDATE_STOCK_SETTINGS_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Test stock service connection
   * POST /api/users/:userId/stock-services/:service/test
   */
  async testStockServiceConnection(req, res) {
    const { userId, service } = req.params;

    logger.info('Test stock service connection request', { userId, service });

    try {
      const result = await stockUploadService.testConnection(userId, service);

      res.status(200).json({
        success: true,
        data: result,
        message: result.success ? 'Connection test successful' : 'Connection test failed'
      });

    } catch (error) {
      logger.error('Failed to test stock service connection', {
        error: error.message,
        userId,
        service
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to test connection',
          code: 'TEST_CONNECTION_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Delete stock service settings
   * DELETE /api/users/:userId/stock-services/:service
   */
  async deleteStockServiceSettings(req, res) {
    const { userId, service } = req.params;

    // Map external service names to internal names
    const serviceMapping = {
      '123rf': 'rf123',
      'adobeStock': 'adobeStock',
      'freepik': 'freepik',
      'pixta': 'pixta'
    };

    const internalServiceName = serviceMapping[service];
    if (!internalServiceName) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid stock service: ${service}`,
          code: 'INVALID_SERVICE'
        }
      });
    }

    logger.info('Delete stock service settings request', {
      userId,
      service,
      internalServiceName
    });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Check if stock service exists
      if (!user.stockServices || !user.stockServices[internalServiceName]) {
        return res.status(404).json({
          success: false,
          error: {
            message: `Stock service ${service} not found`,
            code: 'STOCK_SERVICE_NOT_FOUND'
          }
        });
      }

      // Reset the stock service to default state instead of deleting
      user.stockServices[internalServiceName] = {
        enabled: false,
        credentials: {},
        settings: {
          autoUpload: false,
          defaultKeywords: []
        }
      };

      // Mark the field as modified to ensure Mongoose saves the changes
      user.markModified(`stockServices.${internalServiceName}`);

      await user.save();

      logger.info('Stock service settings deleted', { userId, service, internalServiceName });

      res.status(200).json({
        success: true,
        message: `${service} settings deleted successfully`
      });

    } catch (error) {
      logger.error('Failed to delete stock service settings', {
        error: error.message,
        userId,
        service
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete stock service settings',
          code: 'DELETE_STOCK_SETTINGS_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get user statistics
   * GET /api/users/:userId/stats
   */
  async getUserStats(req, res) {
    const { userId } = req.params;

    logger.info('Get user stats request', { userId });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Get additional stats from images
      const [imageStats] = await Image.aggregate([
        { $match: { userId: user._id, status: { $ne: 'deleted' } } },
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
            pendingUploads: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$uploads',
                    cond: { $eq: ['$$this.status', 'pending'] }
                  }
                }
              }
            },
            completedUploads: {
              $sum: {
                $size: {
                  $filter: {
                    input: '$uploads',
                    cond: { $eq: ['$$this.status', 'completed'] }
                  }
                }
              }
            }
          }
        }
      ]);

      const stats = {
        user: user.stats,
        subscription: user.subscription,
        images: imageStats || {
          totalImages: 0,
          totalViews: 0,
          totalDownloads: 0,
          totalShares: 0,
          publicImages: 0,
          pendingUploads: 0,
          completedUploads: 0
        }
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get user stats', {
        error: error.message,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve user statistics',
          code: 'GET_USER_STATS_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Update user subscription
   * PUT /api/users/:userId/subscription
   */
  async updateUserSubscription(req, res) {
    const { userId } = req.params;
    const { plan, limits } = req.body;

    logger.info('Update user subscription request', {
      userId,
      plan,
      limits
    });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Update subscription
      if (plan) {
        user.subscription.plan = plan;
      }
      if (limits) {
        Object.assign(user.subscription.limits, limits);
      }

      await user.save();

      logger.info('User subscription updated', { userId, plan });

      res.status(200).json({
        success: true,
        data: {
          subscription: user.subscription
        },
        message: 'Subscription updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update user subscription', {
        error: error.message,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update subscription',
          code: 'UPDATE_SUBSCRIPTION_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Delete user (soft delete)
   * DELETE /api/users/:userId
   */
  async deleteUser(req, res) {
    const { userId } = req.params;

    logger.info('Delete user request', { userId });

    try {
      const user = await User.findById(userId);

      if (!user || user.status === 'deleted') {
        return res.status(404).json({
          success: false,
          error: {
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          }
        });
      }

      // Soft delete user
      user.status = 'deleted';
      await user.save();

      // Also soft delete user's images
      await Image.updateMany(
        { userId: user._id },
        { status: 'deleted' }
      );

      logger.info('User deleted successfully', { userId });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error) {
      logger.error('Failed to delete user', {
        error: error.message,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to delete user',
          code: 'DELETE_USER_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get system-wide user statistics (admin only)
   * GET /api/users/stats/system
   */
  async getSystemStats(req, res) {
    logger.info('Get system stats request');

    try {
      const [userStats] = await User.getUserStats();
      const [imageStats] = await Image.getStats();

      const stats = {
        users: userStats || {
          totalUsers: 0,
          activeUsers: 0,
          totalImagesGenerated: 0,
          totalImagesUploaded: 0,
          totalRequests: 0
        },
        images: imageStats || {
          totalImages: 0,
          totalViews: 0,
          totalDownloads: 0,
          totalShares: 0,
          publicImages: 0,
          pendingModeration: 0
        }
      };

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get system stats', {
        error: error.message
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve system statistics',
          code: 'GET_SYSTEM_STATS_FAILED',
          details: error.message
        }
      });
    }
  }
}

module.exports = new UserController();
