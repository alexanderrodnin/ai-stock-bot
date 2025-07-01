/**
 * User Controller
 * Handles user management requests
 */

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');
const User = require('../models/User');

class UserController {
  
  /**
   * Create new user
   * POST /api/users
   */
  async createUser(req, res, next) {
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
      username, 
      firstName, 
      lastName, 
      email, 
      preferences,
      metadata 
    } = req.body;

    logger.info('Create user request', { externalId, externalSystem, username });

    try {
      // Check if user already exists
      const existingUser = await User.findByExternalId(externalId, externalSystem);
      if (existingUser) {
        logger.warn('User already exists', { externalId, externalSystem });
        return res.status(409).json({
          success: false,
          error: {
            message: 'User already exists',
            code: 'USER_ALREADY_EXISTS'
          }
        });
      }

      // Create new user
      const userData = {
        externalId,
        externalSystem,
        profile: {
          username,
          firstName,
          lastName,
          email
        }
      };

      // Add preferences if provided
      if (preferences) {
        userData.preferences = preferences;
      }

      // Add metadata if provided
      if (metadata) {
        userData.metadata = metadata;
      }

      const user = new User(userData);
      await user.save();

      logger.info('User created successfully', { 
        userId: user.id, 
        externalId, 
        externalSystem 
      });

      res.status(201).json({
        success: true,
        data: user.toSafeObject()
      });

    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key error
        logger.error('Duplicate user creation attempt', { externalId, externalSystem });
        throw new AppError('User already exists', 409, 'USER_ALREADY_EXISTS');
      }
      
      logger.error('User creation failed - detailed error', { 
        error: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code,
        externalId, 
        externalSystem 
      });
      throw new AppError(`Failed to create user: ${error.message}`, 500, 'USER_CREATION_FAILED');
    }
  }

  /**
   * Get user by ID
   * GET /api/users/:id
   */
  async getUserById(req, res) {
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

    const { id } = req.params;
    logger.info('Get user by ID request', { userId: id });

    try {
      const user = await User.findById(id);
      
      if (!user || user.status === 'deleted') {
        logger.warn('User not found', { userId: id });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      logger.info('User retrieved successfully', { userId: id });

      res.status(200).json({
        success: true,
        data: user.toSafeObject()
      });

    } catch (error) {
      if (error.name === 'CastError') {
        logger.error('Invalid user ID format', { userId: id });
        throw new AppError('Invalid user ID format', 400, 'INVALID_USER_ID');
      }
      
      logger.error('Failed to get user', { error: error.message, userId: id });
      
      if (error.code) {
        throw error; // Re-throw AppError
      }
      
      throw new AppError('Failed to retrieve user', 500, 'USER_RETRIEVAL_FAILED');
    }
  }

  /**
   * Get user by External ID (generic endpoint for any external system)
   * GET /api/users/external/:externalSystem/:externalId
   */
  async getUserByExternalId(req, res) {
    const { externalSystem, externalId } = req.params;
    logger.info('Get user by External ID request', { externalSystem, externalId });

    try {
      const user = await User.findByExternalId(externalId, externalSystem);
      
      if (!user) {
        logger.warn('User not found', { externalSystem, externalId });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      logger.info('User retrieved successfully', { 
        userId: user.id, 
        externalSystem, 
        externalId 
      });

      res.status(200).json({
        success: true,
        data: user.toSafeObject()
      });

    } catch (error) {
      logger.error('Failed to get user by external ID', { 
        error: error.message, 
        externalSystem, 
        externalId 
      });
      
      if (error.code) {
        throw error; // Re-throw AppError
      }
      
      throw new AppError('Failed to retrieve user', 500, 'USER_RETRIEVAL_FAILED');
    }
  }

  /**
   * Update user
   * PUT /api/users/:id
   */
  async updateUser(req, res) {
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

    const { id } = req.params;
    const updateData = req.body;

    logger.info('Update user request', { userId: id, updateFields: Object.keys(updateData) });

    try {
      // Find user first
      const user = await User.findById(id);
      
      if (!user || user.status === 'deleted') {
        logger.warn('User not found for update', { userId: id });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Build update object with nested structure
      const updateObject = {};
      
      // Handle profile updates
      if (updateData.username || updateData.firstName || updateData.lastName || updateData.email) {
        updateObject.profile = {};
        if (updateData.username !== undefined) updateObject.profile.username = updateData.username;
        if (updateData.firstName !== undefined) updateObject.profile.firstName = updateData.firstName;
        if (updateData.lastName !== undefined) updateObject.profile.lastName = updateData.lastName;
        if (updateData.email !== undefined) updateObject.profile.email = updateData.email;
        if (updateData.language !== undefined) updateObject.profile.language = updateData.language;
      }

      // Handle preferences updates
      if (updateData.preferences) {
        updateObject.preferences = { ...user.preferences, ...updateData.preferences };
      }

      // Handle subscription updates
      if (updateData.subscription) {
        updateObject.subscription = { ...user.subscription, ...updateData.subscription };
      }

      // Handle status updates
      if (updateData.status) {
        updateObject.status = updateData.status;
      }

      // Update user
      const updatedUser = await User.findByIdAndUpdate(
        id,
        { $set: updateObject },
        { new: true, runValidators: true }
      );

      logger.info('User updated successfully', { 
        userId: id, 
        updatedFields: Object.keys(updateObject) 
      });

      res.status(200).json({
        success: true,
        data: updatedUser.toSafeObject()
      });

    } catch (error) {
      if (error.name === 'CastError') {
        logger.error('Invalid user ID format for update', { userId: id });
        throw new AppError('Invalid user ID format', 400, 'INVALID_USER_ID');
      }
      
      if (error.name === 'ValidationError') {
        logger.error('User update validation failed', { userId: id, error: error.message });
        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR');
      }
      
      logger.error('Failed to update user', { error: error.message, userId: id });
      
      if (error.code) {
        throw error; // Re-throw AppError
      }
      
      throw new AppError('Failed to update user', 500, 'USER_UPDATE_FAILED');
    }
  }

  /**
   * Delete user (soft delete)
   * DELETE /api/users/:id
   */
  async deleteUser(req, res) {
    const { id } = req.params;
    logger.info('Delete user request', { userId: id });

    try {
      const user = await User.findById(id);
      
      if (!user || user.status === 'deleted') {
        logger.warn('User not found for deletion', { userId: id });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Soft delete - mark as deleted instead of removing from database
      await User.findByIdAndUpdate(id, { 
        status: 'deleted',
        updatedAt: new Date()
      });

      logger.info('User deleted successfully (soft delete)', { userId: id });

      res.status(200).json({
        success: true,
        message: 'User deleted successfully',
        data: { userId: id, deletedAt: new Date().toISOString() }
      });

    } catch (error) {
      if (error.name === 'CastError') {
        logger.error('Invalid user ID format for deletion', { userId: id });
        throw new AppError('Invalid user ID format', 400, 'INVALID_USER_ID');
      }
      
      logger.error('Failed to delete user', { error: error.message, userId: id });
      
      if (error.code) {
        throw error; // Re-throw AppError
      }
      
      throw new AppError('Failed to delete user', 500, 'USER_DELETE_FAILED');
    }
  }

  /**
   * Get user statistics
   * GET /api/users/:id/stats
   */
  async getUserStats(req, res) {
    const { id } = req.params;
    logger.info('Get user stats request', { userId: id });

    try {
      const user = await User.findById(id);
      
      if (!user || user.status === 'deleted') {
        logger.warn('User not found for stats', { userId: id });
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // Calculate additional statistics
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      
      // Get user's most recent activity
      const daysSinceLastActivity = Math.floor(
        (new Date() - new Date(user.stats.lastActivity)) / (1000 * 60 * 60 * 24)
      );

      const stats = {
        userId: id,
        profile: {
          fullName: user.profile.fullName,
          username: user.profile.username,
          externalSystem: user.externalSystem,
          memberSince: user.createdAt
        },
        usage: {
          imagesGenerated: user.stats.imagesGenerated,
          imagesUploaded: user.stats.imagesUploaded,
          totalRequests: user.stats.totalRequests,
          lastActivity: user.stats.lastActivity,
          daysSinceLastActivity
        },
        subscription: {
          plan: user.subscription.plan,
          imagesToday: user.subscription.usage.imagesToday,
          imagesThisMonth: user.subscription.usage.imagesThisMonth,
          dailyLimit: user.subscription.limits.imagesPerDay,
          monthlyLimit: user.subscription.limits.imagesPerMonth,
          canGenerateImages: user.canGenerateImages()
        },
        preferences: {
          defaultModel: user.preferences.image.defaultModel,
          defaultSize: user.preferences.image.defaultSize,
          language: user.profile.language
        },
        account: {
          status: user.status,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      };

      logger.info('User stats retrieved successfully', { userId: id });

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      if (error.name === 'CastError') {
        logger.error('Invalid user ID format for stats', { userId: id });
        throw new AppError('Invalid user ID format', 400, 'INVALID_USER_ID');
      }
      
      logger.error('Failed to get user stats', { error: error.message, userId: id });
      
      if (error.code) {
        throw error; // Re-throw AppError
      }
      
      throw new AppError('Failed to retrieve user statistics', 500, 'USER_STATS_FAILED');
    }
  }
}

module.exports = new UserController();
