/**
 * Image Service
 * Handles image generation, processing, and management
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const sharp = require('sharp');
const { OpenAI } = require('openai');

const config = require('../config/config');
const User = require('../models/User');
const Image = require('../models/Image');
const logger = require('../utils/logger');
const { getMockImageUrl } = require('../utils/mock-image-urls');

class ImageService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
      timeout: config.openai.timeout
    });
    
    this.tempDir = config.storage.tempDir;
    this.maxFileSize = config.storage.maxFileSize;
    this.allowedTypes = config.storage.allowedTypes;
    
    // Ensure temp directory exists
    this.ensureTempDir();
  }

  async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
    }
  }

  /**
   * Generate image using OpenAI DALL-E
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Text prompt for image generation
   * @param {string} params.userId - User ID (MongoDB ObjectId)
   * @param {string} params.userExternalId - External user ID
   * @param {string} params.userExternalSystem - External system (telegram, web, etc.)
   * @param {Object} params.options - Generation options
   * @returns {Promise<Object>} Generated image data
   */
  async generateImage(params) {
    const {
      prompt,
      userId,
      userExternalId,
      userExternalSystem = 'api',
      demoMode = false,
      options = {}
    } = params;

    try {
      // Validate user and check limits
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.canGenerateImages()) {
        throw new Error('Daily image generation limit exceeded');
      }

      // Sanitize the prompt to improve chances of passing content filters
      const sanitizedPrompt = `Create a safe, appropriate digital illustration of: ${prompt.trim()}. Make it suitable for all audiences, non-political, non-controversial, and with no text.`;

      // Prepare generation parameters
      const generationParams = {
        model: options.model || user.preferences?.image?.defaultModel || 'dall-e-3',
        prompt: sanitizedPrompt,
        n: 1,
        size: options.size || user.preferences?.image?.defaultSize || '1024x1024',
        response_format: 'url'
      };

      // Add DALL-E 3 specific parameters
      if (generationParams.model === 'dall-e-3') {
        generationParams.quality = options.quality || user.preferences?.image?.defaultQuality || 'standard';
        generationParams.style = options.style || user.preferences?.image?.defaultStyle || 'vivid';
      }

      logger.info('Generating image with OpenAI', {
        userId,
        userExternalId,
        model: generationParams.model,
        size: generationParams.size,
        promptLength: prompt.length,
        sanitizedPromptLength: sanitizedPrompt.length
      });

      let imageData;
      let usedSource = 'OpenAI';
      let fallbackReason = null;

      // Check if demo mode is forced
      if (demoMode) {
        logger.info('Demo mode activated - using mock image', {
          userId,
          userExternalId,
          prompt: prompt.substring(0, 50)
        });

        // Use mock image directly in demo mode
        const mockImageUrl = getMockImageUrl(prompt);
        imageData = {
          url: mockImageUrl,
          revised_prompt: `Demo mode image for: ${prompt}`
        };
        usedSource = 'Demo Mode';
        fallbackReason = 'Demo Mode Activated';
      } else {
        try {
          // Try OpenAI first
          const response = await this.openai.images.generate(generationParams);

          if (!response.data || response.data.length === 0) {
            throw new Error('No image data received from OpenAI');
          }

          imageData = response.data[0];
          
        } catch (openaiError) {
          // Handle OpenAI API errors with fallback
          logger.warn('OpenAI API failed, using fallback', {
            userId,
            userExternalId,
            error: openaiError.message,
            errorType: openaiError.error?.type
          });

          // Determine fallback reason
          if (openaiError.status === 429 || openaiError.message?.includes('quota')) {
            fallbackReason = 'Quota Exceeded';
          } else if (openaiError.error?.type === 'image_generation_user_error') {
            fallbackReason = 'Content Policy Restriction';
          } else {
            fallbackReason = 'API Error';
          }

          // Use mock image as fallback
          const mockImageUrl = getMockImageUrl(prompt);
          imageData = {
            url: mockImageUrl,
            revised_prompt: `Fallback image for: ${prompt}`
          };
          usedSource = `Fallback (${fallbackReason})`;
        }
      }
      
      // Download and save the image
      const fileInfo = await this.downloadAndSaveImage(imageData.url, {
        userId,
        userExternalId,
        prompt
      });

      // Create image record in database
      const imageRecord = new Image({
        userId,
        userExternalId,
        userExternalSystem,
        generation: {
          prompt,
          revisedPrompt: imageData.revised_prompt,
          model: usedSource === 'OpenAI' ? generationParams.model : 'fallback',
          size: generationParams.size,
          quality: generationParams.quality,
          style: generationParams.style,
          generatedAt: new Date(),
          usedSource,
          fallbackReason,
          openaiResponse: usedSource === 'OpenAI' ? {
            created: Date.now(),
            data: [imageData]
          } : null
        },
        file: {
          ...fileInfo,
          originalUrl: imageData.url
        },
        metadata: {
          title: this.generateTitle(prompt),
          keywords: this.extractKeywords(prompt)
        }
      });

      await imageRecord.save();

      // Log detailed file information for debugging
      logger.info('Image record saved with file details', {
        imageId: imageRecord.id,
        userId,
        filePath: fileInfo.path,
        fileName: fileInfo.filename,
        fileSize: fileInfo.size,
        dimensions: `${fileInfo.width}x${fileInfo.height}`,
        processing: fileInfo.processing,
        usedSource,
        fallbackReason
      });

      // Update user statistics
      await user.updateStats('imagesGenerated');
      
      // Update daily usage
      user.subscription.usage.imagesToday += 1;
      await user.save();

      logger.info('Image generated successfully', {
        imageId: imageRecord.id,
        userId,
        userExternalId,
        fileSize: fileInfo.size
      });

      return {
        id: imageRecord.id,
        url: imageRecord.file.url,
        thumbnailUrl: imageRecord.file.thumbnailUrl,
        prompt: imageRecord.generation.prompt,
        revisedPrompt: imageRecord.generation.revisedPrompt,
        model: imageRecord.generation.model,
        size: imageRecord.generation.size,
        metadata: imageRecord.metadata,
        createdAt: imageRecord.createdAt
      };

    } catch (error) {
      logger.error('Image generation failed', {
        userId,
        userExternalId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Download image from URL and save to local storage
   * @param {string} imageUrl - URL of the image to download
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} File information
   */
  async downloadAndSaveImage(imageUrl, metadata = {}) {
    try {
      // Download image
      const response = await axios({
        method: 'GET',
        url: imageUrl,
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: this.maxFileSize
      });

      const imageBuffer = Buffer.from(response.data);
      
      // Validate file size
      if (imageBuffer.length > this.maxFileSize) {
        throw new Error(`Image size ${imageBuffer.length} exceeds maximum allowed size ${this.maxFileSize}`);
      }

      // Get image metadata using sharp
      const imageMetadata = await sharp(imageBuffer).metadata();
      
      // Generate temporary filename for processing
      const tempHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
      const tempFilename = `${Date.now()}_${tempHash.substring(0, 16)}_temp.jpg`;
      const tempFilePath = path.join(this.tempDir, tempFilename);

      // Save original image temporarily
      await fs.writeFile(tempFilePath, imageBuffer);

      // Generate final filename
      const finalFilename = `${Date.now()}_${tempHash.substring(0, 16)}.jpg`;
      const finalFilePath = path.join(this.tempDir, finalFilename);

      // Process image with sharp to ensure valid dimensions for 123RF
      // For 123RF, we need at least 4000x4000 pixels (6 megapixels) with 300 DPI
      const processedImage = await sharp(tempFilePath)
        .resize({
          width: 4000,
          height: 4000,
          fit: 'cover', // Use cover to maintain aspect ratio and fill the frame
          position: 'center',
          withoutEnlargement: false // Allow enlargement for smaller images
        })
        .jpeg({
          quality: 85, // Higher quality for stock photography
          progressive: false, // Baseline JPEG for better compatibility
          mozjpeg: true, // Better compression
          chromaSubsampling: '4:4:4' // Better color sampling for stock photos
        })
        .withMetadata()
        .withExif({
          IFD0: {
            XResolution: '300/1',
            YResolution: '300/1',
            ResolutionUnit: '2' // inches
          }
        })
        .toColorspace('srgb') // Force sRGB colorspace
        .toFile(finalFilePath);

      // Remove temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch (unlinkError) {
        logger.warn('Failed to delete temporary file', {
          tempFilePath,
          error: unlinkError.message
        });
      }

      // Get final image metadata
      const finalImageMetadata = await sharp(finalFilePath).metadata();
      
      // Calculate file size
      const finalStats = await fs.stat(finalFilePath);
      const finalSize = finalStats.size;

      // Generate hash of processed image
      const processedImageBuffer = await fs.readFile(finalFilePath);
      const finalHash = crypto.createHash('sha256').update(processedImageBuffer).digest('hex');

      // Generate thumbnail
      const thumbnailPath = await this.generateThumbnail(finalFilePath, finalFilename);

      logger.info('Image processed successfully', {
        originalSize: `${imageMetadata.width}x${imageMetadata.height}`,
        processedSize: `${finalImageMetadata.width}x${finalImageMetadata.height}`,
        originalFileSize: imageBuffer.length,
        processedFileSize: finalSize
      });

      return {
        originalFilename: this.extractFilenameFromUrl(imageUrl),
        filename: finalFilename,
        path: finalFilePath,
        size: finalSize,
        mimeType: 'image/jpeg',
        width: finalImageMetadata.width,
        height: finalImageMetadata.height,
        hash: finalHash,
        thumbnailPath,
        processing: {
          originalWidth: imageMetadata.width,
          originalHeight: imageMetadata.height,
          originalSize: imageBuffer.length,
          resized: finalImageMetadata.width !== imageMetadata.width || finalImageMetadata.height !== imageMetadata.height
        }
      };

    } catch (error) {
      logger.error('Failed to download and save image', {
        imageUrl,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate thumbnail for image
   * @param {string} imagePath - Path to original image
   * @param {string} originalFilename - Original filename
   * @returns {Promise<string>} Thumbnail path
   */
  async generateThumbnail(imagePath, originalFilename) {
    try {
      const thumbnailSize = parseInt(process.env.THUMBNAIL_SIZE) || 300;
      const thumbnailFilename = `thumb_${originalFilename}`;
      const thumbnailPath = path.join(this.tempDir, thumbnailFilename);

      await sharp(imagePath)
        .resize(thumbnailSize, thumbnailSize, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      logger.error('Failed to generate thumbnail', {
        imagePath,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Get user images with pagination
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Images and pagination info
   */
  async getUserImages(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = 'active',
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const query = { userId, status };

      const [images, total] = await Promise.all([
        Image.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        Image.countDocuments(query)
      ]);

      return {
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
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Failed to get user images', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get image by ID
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID (for authorization)
   * @returns {Promise<Object>} Image data
   */
  async getImageById(imageId, userId = null) {
    try {
      const query = { _id: imageId, status: { $ne: 'deleted' } };
      
      // If userId provided, ensure user owns the image or image is public
      if (userId) {
        query.$or = [
          { userId },
          { 'flags.isPublic': true, 'flags.moderationResult': 'approved' }
        ];
      } else {
        // Public access only
        query['flags.isPublic'] = true;
        query['flags.moderationResult'] = 'approved';
      }

      const image = await Image.findOne(query).lean();
      
      if (!image) {
        throw new Error('Image not found or access denied');
      }

      // Increment view count
      await Image.findByIdAndUpdate(imageId, { $inc: { 'stats.views': 1 } });

      return {
        id: image._id.toString(),
        url: `/api/images/${image._id}/file`,
        thumbnailUrl: `/api/images/${image._id}/thumbnail`,
        prompt: image.generation.prompt,
        revisedPrompt: image.generation.revisedPrompt,
        model: image.generation.model,
        size: image.generation.size,
        metadata: image.metadata,
        stats: image.stats,
        createdAt: image.createdAt,
        uploads: image.uploads || []
      };

    } catch (error) {
      logger.error('Failed to get image by ID', {
        imageId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update image metadata
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID
   * @param {Object} metadata - New metadata
   * @returns {Promise<Object>} Updated image
   */
  async updateImageMetadata(imageId, userId, metadata) {
    try {
      const image = await Image.findOne({ _id: imageId, userId });
      
      if (!image) {
        throw new Error('Image not found or access denied');
      }

      // Update allowed metadata fields
      const allowedFields = ['title', 'description', 'keywords', 'category'];
      allowedFields.forEach(field => {
        if (metadata[field] !== undefined) {
          image.metadata[field] = metadata[field];
        }
      });

      await image.save();

      return {
        id: image.id,
        metadata: image.metadata
      };

    } catch (error) {
      logger.error('Failed to update image metadata', {
        imageId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete image
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteImage(imageId, userId) {
    try {
      const image = await Image.findOne({ _id: imageId, userId });
      
      if (!image) {
        throw new Error('Image not found or access denied');
      }

      // Soft delete
      image.status = 'deleted';
      await image.save();

      // Clean up files (optional - could be done by background job)
      try {
        if (image.file.path) {
          await fs.unlink(image.file.path);
        }
        if (image.file.thumbnailPath) {
          await fs.unlink(image.file.thumbnailPath);
        }
      } catch (fileError) {
        logger.warn('Failed to delete image files', {
          imageId,
          error: fileError.message
        });
      }

      logger.info('Image deleted successfully', { imageId, userId });
      return true;

    } catch (error) {
      logger.error('Failed to delete image', {
        imageId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // Helper methods

  generateTitle(prompt) {
    const title = prompt.substring(0, 100);
    return prompt.length > 100 ? title + '...' : title;
  }

  extractKeywords(prompt) {
    const words = prompt
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
    return [...new Set(words)];
  }

  getExtensionFromMimeType(format) {
    const extensions = {
      'jpeg': 'jpg',
      'png': 'png',
      'webp': 'webp',
      'gif': 'gif'
    };
    return extensions[format] || 'jpg';
  }

  extractFilenameFromUrl(url) {
    try {
      const urlPath = new URL(url).pathname;
      return path.basename(urlPath) || 'image.jpg';
    } catch {
      return 'image.jpg';
    }
  }
}

module.exports = new ImageService();
