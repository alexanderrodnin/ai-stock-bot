/**
 * Upload Controller
 * Handles file uploads and stock service integrations
 */

const { validationResult } = require('express-validator');
const stockUploadService = require('../services/stockUploadService');
const User = require('../models/User');
const Image = require('../models/Image');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class UploadController {

  /**
   * Upload image to 123RF
   * POST /api/upload/123rf
   */
  async uploadTo123RF(req, res) {
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
      imageId,
      userId,
      title,
      description,
      keywords = [],
      category,
      pricing = 'standard'
    } = req.body;

    logger.info('123RF upload request', {
      imageId,
      userId,
      title,
      category,
      pricing,
      keywordsCount: keywords.length
    });

    try {
      const uploadSettings = {
        title,
        description,
        keywords,
        category,
        pricing
      };

      const result = await stockUploadService.uploadToStockService(
        imageId,
        userId,
        '123rf',
        uploadSettings
      );

      logger.info('123RF upload completed', {
        imageId,
        userId,
        externalId: result.externalId
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Image uploaded to 123RF successfully'
      });

    } catch (error) {
      logger.error('123RF upload failed', {
        error: error.message,
        imageId,
        userId
      });

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found or access denied',
            code: 'IMAGE_NOT_FOUND'
          }
        });
      }

      if (error.message.includes('not configured')) {
        return res.status(400).json({
          success: false,
          error: {
            message: '123RF service is not configured for this user',
            code: 'SERVICE_NOT_CONFIGURED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to upload to 123RF',
          code: '123RF_UPLOAD_FAILED',
          details: error.message
        }
      });
    }
  }


  /**
   * Upload image to Adobe Stock
   * POST /api/upload/adobe-stock
   */
  async uploadToAdobeStock(req, res) {
    const {
      imageId,
      userId,
      title,
      description,
      keywords = [],
      category
    } = req.body;

    logger.info('Adobe Stock upload request', {
      imageId,
      userId,
      title,
      category,
      keywordsCount: keywords.length
    });

    try {
      const uploadSettings = {
        title,
        description,
        keywords,
        category
      };

      const result = await stockUploadService.uploadToStockService(
        imageId,
        userId,
        'adobeStock',
        uploadSettings
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Image uploaded to Adobe Stock successfully'
      });

    } catch (error) {
      logger.error('Adobe Stock upload failed', {
        error: error.message,
        imageId,
        userId
      });

      if (error.message.includes('not configured')) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Adobe Stock service is not configured for this user',
            code: 'SERVICE_NOT_CONFIGURED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to upload to Adobe Stock',
          code: 'ADOBE_STOCK_UPLOAD_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Generic upload to any stock service
   * POST /api/upload/:service
   */
  async uploadToService(req, res) {
    const { service } = req.params;
    const {
      imageId,
      userId,
      settings = {}
    } = req.body;

    logger.info('Generic stock service upload request', {
      service,
      imageId,
      userId,
      settings
    });

    try {
      const result = await stockUploadService.uploadToStockService(
        imageId,
        userId,
        service,
        settings
      );

      res.status(200).json({
        success: true,
        data: result,
        message: `Image uploaded to ${service} successfully`
      });

    } catch (error) {
      logger.error('Generic stock service upload failed', {
        error: error.message,
        service,
        imageId,
        userId
      });

      if (error.message.includes('Unsupported stock service')) {
        return res.status(400).json({
          success: false,
          error: {
            message: `Unsupported stock service: ${service}`,
            code: 'UNSUPPORTED_SERVICE'
          }
        });
      }

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found or access denied',
            code: 'IMAGE_NOT_FOUND'
          }
        });
      }

      if (error.message.includes('not configured')) {
        return res.status(400).json({
          success: false,
          error: {
            message: `${service} service is not configured for this user`,
            code: 'SERVICE_NOT_CONFIGURED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: `Failed to upload to ${service}`,
          code: 'STOCK_UPLOAD_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Batch upload multiple images to a stock service
   * POST /api/upload/batch/:service
   */
  async batchUploadToService(req, res) {
    const { service } = req.params;
    const {
      imageIds = [],
      userId,
      settings = {}
    } = req.body;

    logger.info('Batch upload request', {
      service,
      imageCount: imageIds.length,
      userId
    });

    if (imageIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'No images provided for batch upload',
          code: 'NO_IMAGES_PROVIDED'
        }
      });
    }

    if (imageIds.length > 50) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Batch upload limited to 50 images at a time',
          code: 'BATCH_SIZE_EXCEEDED'
        }
      });
    }

    try {
      const results = [];
      const errors = [];

      // Process uploads sequentially to avoid overwhelming the service
      for (const imageId of imageIds) {
        try {
          const result = await stockUploadService.uploadToStockService(
            imageId,
            userId,
            service,
            settings
          );
          results.push({
            imageId,
            success: true,
            data: result
          });
        } catch (error) {
          errors.push({
            imageId,
            success: false,
            error: error.message
          });
        }
      }

      const successCount = results.length;
      const errorCount = errors.length;

      logger.info('Batch upload completed', {
        service,
        userId,
        successCount,
        errorCount,
        totalImages: imageIds.length
      });

      res.status(200).json({
        success: true,
        data: {
          results,
          errors,
          summary: {
            total: imageIds.length,
            successful: successCount,
            failed: errorCount
          }
        },
        message: `Batch upload completed: ${successCount} successful, ${errorCount} failed`
      });

    } catch (error) {
      logger.error('Batch upload failed', {
        error: error.message,
        service,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Batch upload failed',
          code: 'BATCH_UPLOAD_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get upload status for an image
   * GET /api/upload/status/:imageId
   */
  async getUploadStatus(req, res) {
    const { imageId } = req.params;
    const { userId } = req.query;

    logger.info('Get upload status request', { imageId, userId });

    try {
      const result = await stockUploadService.getUploadStatus(imageId, userId);

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to get upload status', {
        error: error.message,
        imageId,
        userId
      });

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found or access denied',
            code: 'IMAGE_NOT_FOUND'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to get upload status',
          code: 'GET_UPLOAD_STATUS_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Retry failed upload
   * POST /api/upload/retry/:imageId/:service
   */
  async retryUpload(req, res) {
    const { imageId, service } = req.params;
    const { userId } = req.body;

    logger.info('Retry upload request', { imageId, service, userId });

    try {
      const result = await stockUploadService.retryUpload(imageId, userId, service);

      res.status(200).json({
        success: true,
        data: result,
        message: `Upload retry for ${service} initiated successfully`
      });

    } catch (error) {
      logger.error('Failed to retry upload', {
        error: error.message,
        imageId,
        service,
        userId
      });

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            message: error.message,
            code: 'UPLOAD_NOT_FOUND'
          }
        });
      }

      if (error.message.includes('retry limit')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'RETRY_LIMIT_EXCEEDED'
          }
        });
      }

      if (error.message.includes('not in failed state')) {
        return res.status(400).json({
          success: false,
          error: {
            message: error.message,
            code: 'INVALID_UPLOAD_STATE'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retry upload',
          code: 'RETRY_UPLOAD_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Test stock service connection
   * POST /api/upload/test/:service
   */
  async testServiceConnection(req, res) {
    const { service } = req.params;
    const { userId } = req.body;

    logger.info('Test service connection request', { service, userId });

    try {
      const result = await stockUploadService.testConnection(userId, service);

      res.status(200).json({
        success: true,
        data: result,
        message: result.success ? 'Connection test successful' : 'Connection test failed'
      });

    } catch (error) {
      logger.error('Failed to test service connection', {
        error: error.message,
        service,
        userId
      });

      if (error.message.includes('not configured')) {
        return res.status(400).json({
          success: false,
          error: {
            message: `${service} service is not configured for this user`,
            code: 'SERVICE_NOT_CONFIGURED'
          }
        });
      }

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
   * Get upload statistics for user
   * GET /api/upload/stats/:userId
   */
  async getUploadStats(req, res) {
    const { userId } = req.params;
    const { service, timeframe = '30d' } = req.query;

    logger.info('Get upload stats request', { userId, service, timeframe });

    try {
      // Calculate date range based on timeframe
      const now = new Date();
      let startDate;
      
      switch (timeframe) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      // Build aggregation pipeline
      const matchStage = {
        userId: require('mongoose').Types.ObjectId(userId),
        createdAt: { $gte: startDate },
        status: { $ne: 'deleted' }
      };

      const pipeline = [
        { $match: matchStage },
        { $unwind: { path: '$uploads', preserveNullAndEmptyArrays: true } }
      ];

      // Filter by service if specified
      if (service) {
        pipeline.push({
          $match: { 'uploads.service': service }
        });
      }

      pipeline.push({
        $group: {
          _id: {
            service: '$uploads.service',
            status: '$uploads.status'
          },
          count: { $sum: 1 },
          images: { $addToSet: '$_id' }
        }
      });

      const uploadStats = await Image.aggregate(pipeline);

      // Process results
      const stats = {
        timeframe,
        startDate,
        endDate: now,
        services: {}
      };

      uploadStats.forEach(stat => {
        const serviceName = stat._id.service || 'no_uploads';
        const status = stat._id.status || 'no_status';
        
        if (!stats.services[serviceName]) {
          stats.services[serviceName] = {
            total: 0,
            pending: 0,
            uploading: 0,
            completed: 0,
            failed: 0,
            rejected: 0
          };
        }
        
        stats.services[serviceName][status] = stat.count;
        stats.services[serviceName].total += stat.count;
      });

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Failed to get upload stats', {
        error: error.message,
        userId,
        service,
        timeframe
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve upload statistics',
          code: 'GET_UPLOAD_STATS_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Cancel pending upload
   * DELETE /api/upload/:imageId/:service
   */
  async cancelUpload(req, res) {
    const { imageId, service } = req.params;
    const { userId } = req.body;

    logger.info('Cancel upload request', { imageId, service, userId });

    try {
      const image = await Image.findOne({ _id: imageId, userId });

      if (!image) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found or access denied',
            code: 'IMAGE_NOT_FOUND'
          }
        });
      }

      const upload = image.uploads.find(u => u.service === service);
      if (!upload) {
        return res.status(404).json({
          success: false,
          error: {
            message: `No upload record found for service ${service}`,
            code: 'UPLOAD_NOT_FOUND'
          }
        });
      }

      if (upload.status !== 'pending' && upload.status !== 'uploading') {
        return res.status(400).json({
          success: false,
          error: {
            message: `Cannot cancel upload with status: ${upload.status}`,
            code: 'INVALID_UPLOAD_STATE'
          }
        });
      }

      // Update upload status to failed with cancellation reason
      await image.updateUploadStatus(service, 'failed', {
        error: {
          message: 'Upload cancelled by user',
          code: 'USER_CANCELLED',
          timestamp: new Date()
        }
      });

      logger.info('Upload cancelled successfully', { imageId, service, userId });

      res.status(200).json({
        success: true,
        message: 'Upload cancelled successfully'
      });

    } catch (error) {
      logger.error('Failed to cancel upload', {
        error: error.message,
        imageId,
        service,
        userId
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to cancel upload',
          code: 'CANCEL_UPLOAD_FAILED',
          details: error.message
        }
      });
    }
  }
}

module.exports = new UploadController();
