/**
 * Image Controller
 * Handles image generation and management requests
 */

const { validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');

const imageService = require('../services/imageService');
const stockUploadService = require('../services/stockUploadService');
const User = require('../models/User');
const Image = require('../models/Image');
const logger = require('../utils/logger');
const { AppError } = require('../middleware/errorHandler');

class ImageController {
  
  /**
   * Generate new image using OpenAI DALL-E
   * POST /api/images/generate
   */
  async generateImage(req, res) {
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
      prompt, 
      userId, 
      userExternalId, 
      userExternalSystem = 'api',
      model, 
      size, 
      quality, 
      style 
    } = req.body;

    logger.info('Image generation request', {
      userId,
      userExternalId,
      userExternalSystem,
      prompt: prompt.substring(0, 100),
      model,
      size,
      quality,
      style
    });

    try {
      // Generate image using ImageService
      const result = await imageService.generateImage({
        prompt,
        userId,
        userExternalId,
        userExternalSystem,
        options: {
          model,
          size,
          quality,
          style
        }
      });

      logger.info('Image generated successfully', {
        imageId: result.id,
        userId,
        userExternalId
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Image generated successfully'
      });

    } catch (error) {
      logger.error('Image generation failed', { 
        error: error.message, 
        userId, 
        userExternalId,
        prompt: prompt.substring(0, 100)
      });

      if (error.message.includes('limit exceeded')) {
        return res.status(429).json({
          success: false,
          error: {
            message: error.message,
            code: 'RATE_LIMIT_EXCEEDED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to generate image',
          code: 'IMAGE_GENERATION_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get user's image history
   * GET /api/images/user/:userId
   */
  async getUserImages(req, res) {
    const { userId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status = 'active',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    logger.info('Get user images request', { 
      userId, 
      page, 
      limit, 
      status,
      sortBy,
      sortOrder
    });

    try {
      const result = await imageService.getUserImages(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sortBy,
        sortOrder
      });

      res.status(200).json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('Failed to get user images', { 
        error: error.message, 
        userId 
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve images',
          code: 'GET_IMAGES_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get images by external user ID
   * GET /api/images/external/:externalId/:externalSystem
   */
  async getImagesByExternalUser(req, res) {
    const { externalId, externalSystem } = req.params;
    const { 
      page = 1, 
      limit = 20
    } = req.query;

    logger.info('Get images by external user request', { 
      externalId, 
      externalSystem,
      page, 
      limit
    });

    try {
      const images = await Image.findByExternalUser(externalId, externalSystem, {
        page: parseInt(page),
        limit: parseInt(limit)
      });

      res.status(200).json({
        success: true,
        data: {
          images: images.map(img => ({
            id: img._id.toString(),
            url: `/api/images/${img._id}/file`,
            thumbnailUrl: `/api/images/${img._id}/thumbnail`,
            prompt: img.generation.prompt,
            model: img.generation.model,
            size: img.generation.size,
            metadata: img.metadata,
            createdAt: img.createdAt,
            uploads: img.uploads || []
          }))
        }
      });

    } catch (error) {
      logger.error('Failed to get images by external user', { 
        error: error.message, 
        externalId,
        externalSystem
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to retrieve images',
          code: 'GET_IMAGES_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get specific image by ID
   * GET /api/images/:imageId
   */
  async getImageById(req, res) {
    const { imageId } = req.params;
    const { userId } = req.query; // Optional for authorization

    logger.info('Get image by ID request', { imageId, userId });

    try {
      const image = await imageService.getImageById(imageId, userId);

      res.status(200).json({
        success: true,
        data: image
      });

    } catch (error) {
      logger.error('Failed to get image', { 
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
          message: 'Failed to retrieve image',
          code: 'GET_IMAGE_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Serve image file
   * GET /api/images/:imageId/file
   */
  async serveImageFile(req, res) {
    const { imageId } = req.params;
    const { userId } = req.query;

    try {
      const image = await Image.findOne({ 
        _id: imageId, 
        status: { $ne: 'deleted' }
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found',
            code: 'IMAGE_NOT_FOUND'
          }
        });
      }

      // Check access permissions
      const hasAccess = !userId || 
                       image.userId.toString() === userId || 
                       (image.flags.isPublic && image.flags.moderationResult === 'approved');

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Access denied',
            code: 'ACCESS_DENIED'
          }
        });
      }

      // Check if file exists
      if (!fs.existsSync(image.file.path)) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image file not found',
            code: 'FILE_NOT_FOUND'
          }
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', image.file.mimeType);
      res.setHeader('Content-Length', image.file.size);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

      // Stream the file
      const fileStream = fs.createReadStream(image.file.path);
      fileStream.pipe(res);

      // Increment view count (don't wait for it)
      Image.findByIdAndUpdate(imageId, { $inc: { 'stats.views': 1 } }).catch(err => {
        logger.warn('Failed to increment view count', { imageId, error: err.message });
      });

    } catch (error) {
      logger.error('Failed to serve image file', { 
        error: error.message, 
        imageId 
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to serve image',
          code: 'SERVE_IMAGE_FAILED'
        }
      });
    }
  }

  /**
   * Serve image thumbnail
   * GET /api/images/:imageId/thumbnail
   */
  async serveImageThumbnail(req, res) {
    const { imageId } = req.params;

    try {
      const image = await Image.findOne({ 
        _id: imageId, 
        status: { $ne: 'deleted' }
      });

      if (!image) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Image not found',
            code: 'IMAGE_NOT_FOUND'
          }
        });
      }

      const thumbnailPath = image.file.thumbnailPath || image.file.path;

      // Check if thumbnail file exists
      if (!fs.existsSync(thumbnailPath)) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Thumbnail not found',
            code: 'THUMBNAIL_NOT_FOUND'
          }
        });
      }

      // Set appropriate headers
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

      // Stream the thumbnail
      const fileStream = fs.createReadStream(thumbnailPath);
      fileStream.pipe(res);

    } catch (error) {
      logger.error('Failed to serve thumbnail', { 
        error: error.message, 
        imageId 
      });

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to serve thumbnail',
          code: 'SERVE_THUMBNAIL_FAILED'
        }
      });
    }
  }

  /**
   * Update image metadata
   * PUT /api/images/:imageId/metadata
   */
  async updateImageMetadata(req, res) {
    const { imageId } = req.params;
    const { userId } = req.body;
    const { title, description, keywords, category } = req.body;

    logger.info('Update image metadata request', { 
      imageId, 
      userId,
      updates: { title, description, keywords, category }
    });

    try {
      const result = await imageService.updateImageMetadata(imageId, userId, {
        title,
        description,
        keywords,
        category
      });

      res.status(200).json({
        success: true,
        data: result,
        message: 'Image metadata updated successfully'
      });

    } catch (error) {
      logger.error('Failed to update image metadata', { 
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
          message: 'Failed to update image metadata',
          code: 'UPDATE_METADATA_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Delete image
   * DELETE /api/images/:imageId
   */
  async deleteImage(req, res) {
    const { imageId } = req.params;
    const { userId } = req.body;

    logger.info('Delete image request', { imageId, userId });

    try {
      await imageService.deleteImage(imageId, userId);

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });

    } catch (error) {
      logger.error('Failed to delete image', { 
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
          message: 'Failed to delete image',
          code: 'DELETE_IMAGE_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Upload image to stock service
   * POST /api/images/:imageId/upload/:service
   */
  async uploadToStockService(req, res) {
    const { imageId, service } = req.params;
    const { userId, settings = {} } = req.body;

    logger.info('Upload to stock service request', { 
      imageId, 
      service,
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
      logger.error('Failed to upload to stock service', { 
        error: error.message, 
        imageId,
        service,
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
            message: error.message,
            code: 'SERVICE_NOT_CONFIGURED'
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to upload to stock service',
          code: 'STOCK_UPLOAD_FAILED',
          details: error.message
        }
      });
    }
  }

  /**
   * Get upload status for image
   * GET /api/images/:imageId/uploads
   */
  async getUploadStatus(req, res) {
    const { imageId } = req.params;
    const { userId } = req.query;

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
   * POST /api/images/:imageId/retry/:service
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
}

module.exports = new ImageController();
