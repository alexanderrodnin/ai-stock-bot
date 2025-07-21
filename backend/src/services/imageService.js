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
const configService = require('./configService');
const JuggernautProFluxService = require('./aiProviders/juggernautProFluxService');
const SeedreamV3Service = require('./aiProviders/seedreamV3Service');
const HiDreamI1Service = require('./aiProviders/hiDreamI1Service');

class ImageService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
      timeout: config.openai.timeout
    });
    
    // Initialize AI provider services
    this.juggernautProFlux = new JuggernautProFluxService();
    this.seedreamV3 = new SeedreamV3Service();
    this.hiDreamI1 = new HiDreamI1Service();
    
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
   * Generate image using dynamic AI models (OpenAI DALL-E or Segmind Fast-Flux-Schnell)
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

      // Get current AI model configuration and fallback order
      const aiConfig = configService.getAIModelConfig();
      const fallbackOrder = config.aiModels.fallbackOrder;
      const activeModel = aiConfig.activeModel;

      logger.info('Starting image generation with cascading fallback', {
        userId,
        userExternalId,
        activeModel,
        fallbackOrder,
        promptLength: prompt.length,
        demoMode
      });

      let imageData;
      let usedSource;
      let fallbackReason = null;
      let generationResult;
      let attemptedModels = [];

      // Check if demo mode is forced
      if (demoMode) {
        logger.info('Demo mode activated - using mock image', {
          userId,
          userExternalId,
          prompt: prompt.substring(0, 50)
        });

        const mockImageUrl = getMockImageUrl(prompt);
        imageData = {
          url: mockImageUrl,
          revised_prompt: `Demo mode image for: ${prompt}`
        };
        usedSource = 'Demo Mode';
        fallbackReason = 'Demo Mode Activated';
        generationResult = {
          success: true,
          model: 'demo',
          provider: 'demo',
          prompt,
          image: { format: 'url', data: mockImageUrl },
          metadata: { generatedAt: new Date().toISOString() }
        };
      } else {
        // Try models in fallback order, starting with active model
        const modelsToTry = [activeModel, ...fallbackOrder.filter(model => model !== activeModel)];
        
        for (const modelName of modelsToTry) {
          try {
            logger.info('Attempting image generation', {
              model: modelName,
              attempt: attemptedModels.length + 1,
              totalModels: modelsToTry.length
            });

            // Generate image using the current model
            if (modelName === 'juggernaut-pro-flux') {
              generationResult = await this.generateWithJuggernautProFlux(prompt, options);
            } else if (modelName === 'seedream-v3') {
              generationResult = await this.generateWithSeedreamV3(prompt, options);
            } else if (modelName === 'hidream-i1-fast') {
              generationResult = await this.generateWithHiDreamI1(prompt, options);
            } else if (modelName === 'dall-e-3') {
              generationResult = await this.generateWithOpenAI(prompt, options);
            } else {
              throw new Error(`Unknown model: ${modelName}`);
            }

            // If we get here, generation was successful
            usedSource = generationResult.provider;
            attemptedModels.push({ model: modelName, success: true });
            
            logger.info('Image generation successful', {
              model: modelName,
              provider: generationResult.provider,
              attemptNumber: attemptedModels.length
            });

            // Handle different response formats
            if (generationResult.image.format === 'buffer') {
              // For buffer images (Segmind), process directly
              const fileInfo = await this.processImageBuffer(generationResult.image.data, {
                userId,
                userExternalId,
                prompt
              });

              imageData = {
                url: `/api/images/temp/${fileInfo.filename}`, // Temporary URL
                revised_prompt: generationResult.prompt
              };

              // Store file info for later use
              generationResult.processedFileInfo = fileInfo;
            } else if (generationResult.image.format === 'base64') {
              // For base64 images, convert to buffer first
              const imageBuffer = this.base64ToBuffer(generationResult.image.data);
              const fileInfo = await this.processImageBuffer(imageBuffer, {
                userId,
                userExternalId,
                prompt
              });

              imageData = {
                url: `/api/images/temp/${fileInfo.filename}`, // Temporary URL
                revised_prompt: generationResult.prompt
              };

              // Store file info for later use
              generationResult.processedFileInfo = fileInfo;
            } else {
              // URL format
              imageData = {
                url: generationResult.image.data,
                revised_prompt: generationResult.prompt
              };
            }

            // Success - break out of the loop
            break;

          } catch (aiError) {
            // Record the failed attempt
            attemptedModels.push({ 
              model: modelName, 
              success: false, 
              error: aiError.message,
              status: aiError.status 
            });

            logger.warn('AI model failed, trying next in fallback chain', {
              failedModel: modelName,
              error: aiError.message,
              status: aiError.status,
              attemptNumber: attemptedModels.length,
              remainingModels: modelsToTry.length - attemptedModels.length
            });

            // If this was the last model to try, we'll fall back to mock images
            if (attemptedModels.length === modelsToTry.length) {
              // All AI models failed - use mock image as final fallback
              logger.error('All AI models failed, using mock image fallback', {
                userId,
                userExternalId,
                attemptedModels,
                finalError: aiError.message
              });

              // Determine fallback reason from the last error
              if (aiError.status === 401) {
                fallbackReason = 'All Models: Authentication Failed';
              } else if (aiError.status === 403) {
                fallbackReason = 'All Models: API Key Invalid or Forbidden';
              } else if (aiError.status === 429 || aiError.message?.includes('quota')) {
                fallbackReason = 'All Models: Quota Exceeded';
              } else if (aiError.status >= 500) {
                fallbackReason = 'All Models: Server Error';
              } else if (aiError.message?.includes('timeout')) {
                fallbackReason = 'All Models: Request Timeout';
              } else {
                fallbackReason = 'All Models: API Error';
              }

              // Use mock image as final fallback
              const mockImageUrl = getMockImageUrl(prompt);
              imageData = {
                url: mockImageUrl,
                revised_prompt: `Fallback image for: ${prompt}`
              };
              usedSource = `Final Fallback (${fallbackReason})`;
              
              generationResult = {
                success: false,
                model: 'fallback',
                provider: 'fallback',
                prompt,
                image: { format: 'url', data: mockImageUrl },
                metadata: { 
                  generatedAt: new Date().toISOString(), 
                  error: aiError.message,
                  attemptedModels
                }
              };
            }
            // Continue to next model in fallback chain
          }
        }
      }

      // Download and save the image (unless already processed)
      let fileInfo;
      if (generationResult.processedFileInfo) {
        fileInfo = generationResult.processedFileInfo;
      } else {
        fileInfo = await this.downloadAndSaveImage(imageData.url, {
          userId,
          userExternalId,
          prompt
        });
      }

      // Create image record in database
      const imageRecord = new Image({
        userId,
        userExternalId,
        userExternalSystem,
        generation: {
          prompt,
          revisedPrompt: imageData.revised_prompt,
          model: generationResult.model,
          provider: generationResult.provider,
          size: generationResult.metadata?.width && generationResult.metadata?.height 
            ? `${generationResult.metadata.width}x${generationResult.metadata.height}` 
            : '1024x1024',
          quality: generationResult.metadata?.quality || 'standard',
          style: generationResult.metadata?.style || 'vivid',
          generatedAt: new Date(),
          usedSource,
          fallbackReason,
          aiResponse: generationResult.success ? generationResult : null,
          configVersion: aiConfig.version || 1
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

      // Log detailed information
      logger.info('Image record saved with file details', {
        imageId: imageRecord.id,
        userId,
        model: generationResult.model,
        provider: generationResult.provider,
        filePath: fileInfo.path,
        fileName: fileInfo.filename,
        fileSize: fileInfo.size,
        dimensions: `${fileInfo.width}x${fileInfo.height}`,
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
        model: generationResult.model,
        provider: generationResult.provider,
        fileSize: fileInfo.size
      });

      return {
        id: imageRecord.id,
        url: imageRecord.file.url,
        prompt: imageRecord.generation.prompt,
        revisedPrompt: imageRecord.generation.revisedPrompt,
        model: imageRecord.generation.model,
        provider: imageRecord.generation.provider,
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
   * Generate image using OpenAI DALL-E
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateWithOpenAI(prompt, options = {}) {
    try {
      // Sanitize the prompt to improve chances of passing content filters
      const sanitizedPrompt = `Create a safe, appropriate digital illustration of: ${prompt.trim()}. Make it suitable for all audiences, non-political, non-controversial, and with no text.`;

      const generationParams = {
        model: options.model || 'dall-e-3',
        prompt: sanitizedPrompt,
        n: 1,
        size: options.size || '1024x1024',
        response_format: 'url'
      };

      // Add DALL-E 3 specific parameters
      if (generationParams.model === 'dall-e-3') {
        generationParams.quality = options.quality || 'standard';
        generationParams.style = options.style || 'vivid';
      }

      logger.info('Generating image with OpenAI DALL-E', {
        model: generationParams.model,
        size: generationParams.size,
        quality: generationParams.quality,
        style: generationParams.style
      });

      const response = await this.openai.images.generate(generationParams);

      if (!response.data || response.data.length === 0) {
        throw new Error('No image data received from OpenAI');
      }

      const imageData = response.data[0];

      return {
        success: true,
        model: generationParams.model,
        provider: 'openai',
        prompt: sanitizedPrompt,
        image: {
          format: 'url',
          data: imageData.url,
          mimeType: 'image/png'
        },
        metadata: {
          width: parseInt(generationParams.size.split('x')[0]),
          height: parseInt(generationParams.size.split('x')[1]),
          quality: generationParams.quality,
          style: generationParams.style,
          generatedAt: new Date().toISOString(),
          revisedPrompt: imageData.revised_prompt
        }
      };

    } catch (error) {
      logger.error('OpenAI generation failed', {
        error: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Generate image using Juggernaut Pro Flux
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateWithJuggernautProFlux(prompt, options = {}) {
    try {
      logger.info('Generating image with Juggernaut Pro Flux');

      const result = await this.juggernautProFlux.generateImage(prompt, options);
      
      return result;

    } catch (error) {
      logger.error('Juggernaut Pro Flux generation failed', {
        error: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Generate image using Seedream V3
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateWithSeedreamV3(prompt, options = {}) {
    try {
      logger.info('Generating image with Seedream V3');

      const result = await this.seedreamV3.generateImage(prompt, options);
      
      return result;

    } catch (error) {
      logger.error('Seedream V3 generation failed', {
        error: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Generate image using HiDream-I1 Fast
   * @param {string} prompt - Text prompt
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateWithHiDreamI1(prompt, options = {}) {
    try {
      logger.info('Generating image with HiDream-I1 Fast');

      const result = await this.hiDreamI1.generateImage(prompt, options);
      
      return result;

    } catch (error) {
      logger.error('HiDream-I1 Fast generation failed', {
        error: error.message,
        status: error.status
      });
      throw error;
    }
  }

  /**
   * Process image buffer and save to storage
   * @param {Buffer} imageBuffer - Image buffer
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} File information
   */
  async processImageBuffer(imageBuffer, metadata = {}) {
    try {
      // Validate file size
      if (imageBuffer.length > this.maxFileSize) {
        throw new Error(`Image size ${imageBuffer.length} exceeds maximum allowed size ${this.maxFileSize}`);
      }

      // Get image metadata using sharp
      const imageMetadata = await sharp(imageBuffer).metadata();
      
      // Generate final filename
      const tempHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
      const finalFilename = `${Date.now()}_${tempHash.substring(0, 16)}.jpg`;
      const finalFilePath = path.join(this.tempDir, finalFilename);

      logger.info('Processing image buffer with Sharp', {
        originalSize: `${imageMetadata.width}x${imageMetadata.height}`,
        originalFileSize: imageBuffer.length,
        targetSize: '4000x4000'
      });

      // Process image with sharp
      const processedImage = await sharp(imageBuffer)
        .resize({
          width: 4000,
          height: 4000,
          fit: 'cover',
          position: 'center',
          withoutEnlargement: false
        })
        .jpeg({
          quality: 85,
          progressive: false,
          mozjpeg: true,
          chromaSubsampling: '4:4:4'
        })
        .withMetadata()
        .withExif({
          IFD0: {
            XResolution: '300/1',
            YResolution: '300/1',
            ResolutionUnit: '2'
          }
        })
        .toColorspace('srgb')
        .toFile(finalFilePath);

      // Get final image metadata
      const finalImageMetadata = await sharp(finalFilePath).metadata();
      const finalStats = await fs.stat(finalFilePath);
      const finalSize = finalStats.size;

      // Generate hash of processed image
      const verificationBuffer = await fs.readFile(finalFilePath);
      const finalHash = crypto.createHash('sha256').update(verificationBuffer).digest('hex');

      logger.info('Image buffer processed successfully', {
        originalSize: `${imageMetadata.width}x${imageMetadata.height}`,
        processedSize: `${finalImageMetadata.width}x${finalImageMetadata.height}`,
        originalFileSize: imageBuffer.length,
        processedFileSize: finalSize
      });

      return {
        originalFilename: 'generated_image.png',
        filename: finalFilename,
        path: finalFilePath,
        size: finalSize,
        mimeType: 'image/jpeg',
        width: finalImageMetadata.width,
        height: finalImageMetadata.height,
        hash: finalHash,
        processing: {
          originalWidth: imageMetadata.width,
          originalHeight: imageMetadata.height,
          originalSize: imageBuffer.length,
          resized: finalImageMetadata.width !== imageMetadata.width || finalImageMetadata.height !== imageMetadata.height
        }
      };

    } catch (error) {
      logger.error('Failed to process image buffer', {
        error: error.message
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
      logger.info('Downloading image', { imageUrl, metadata });

      let imageBuffer;
      
      try {
        // Download image
        const response = await axios({
          method: 'GET',
          url: imageUrl,
          responseType: 'arraybuffer',
          timeout: 30000,
          maxContentLength: this.maxFileSize
        });

        imageBuffer = Buffer.from(response.data);
        logger.info('Image downloaded successfully', { 
          imageUrl, 
          size: imageBuffer.length 
        });
        
      } catch (downloadError) {
        logger.warn('Failed to download image, creating local fallback', {
          imageUrl,
          error: downloadError.message,
          status: downloadError.response?.status
        });
        
        // Create a local fallback image using sharp
        imageBuffer = await this.createLocalFallbackImage(metadata.prompt || 'Generated Image');
      }
      
      // Validate file size
      if (imageBuffer.length > this.maxFileSize) {
        throw new Error(`Image size ${imageBuffer.length} exceeds maximum allowed size ${this.maxFileSize}`);
      }

      // Get image metadata using sharp
      const imageMetadata = await sharp(imageBuffer).metadata();
      
      // Generate final filename directly (no temporary files)
      const tempHash = crypto.createHash('sha256').update(imageBuffer).digest('hex');
      const finalFilename = `${Date.now()}_${tempHash.substring(0, 16)}.jpg`;
      const finalFilePath = path.join(this.tempDir, finalFilename);

      logger.info('Processing image with Sharp', {
        originalSize: `${imageMetadata.width}x${imageMetadata.height}`,
        originalFileSize: imageBuffer.length,
        targetSize: '4000x4000'
      });

      // Process image with sharp directly to final file
      // For 123RF, we need at least 4000x4000 pixels (6 megapixels) with 300 DPI
      const processedImage = await sharp(imageBuffer)
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

      // Force file system sync to ensure file is completely written
      const fileHandle = await fs.open(finalFilePath, 'r+');
      await fileHandle.sync(); // Force sync to disk
      await fileHandle.close();

      logger.info('File sync completed', {
        finalFilePath,
        processedSize: processedImage.size
      });

      // Wait a small amount to ensure file system operations are complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get final image metadata
      const finalImageMetadata = await sharp(finalFilePath).metadata();
      
      // Calculate file size
      const finalStats = await fs.stat(finalFilePath);
      const finalSize = finalStats.size;

      // Verify file integrity by reading it back
      const verificationBuffer = await fs.readFile(finalFilePath);
      if (verificationBuffer.length !== finalSize) {
        throw new Error(`File size mismatch after write: expected ${finalSize}, got ${verificationBuffer.length}`);
      }

      // Generate hash of processed image
      const finalHash = crypto.createHash('sha256').update(verificationBuffer).digest('hex');

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

  /**
   * Convert base64 image to buffer
   * @param {string} base64Data - Base64 encoded image data
   * @returns {Buffer} Image buffer
   */
  base64ToBuffer(base64Data) {
    try {
      // Remove data URL prefix if present
      const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      return Buffer.from(base64String, 'base64');
    } catch (error) {
      logger.error('Failed to convert base64 to buffer', {
        error: error.message
      });
      throw new Error('Invalid base64 image data');
    }
  }

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

  /**
   * Clean up temporary files older than the specified age
   * @param {number} maxAgeMs - Maximum age in milliseconds (default: 24 hours)
   */
  async cleanupTempFiles(maxAgeMs = 86400000) {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      let deletedCount = 0;
      
      for (const file of files) {
        try {
          const filePath = path.join(this.tempDir, file);
          const stats = await fs.stat(filePath);
          
          // Check if the file is older than maxAgeMs
          if (now - stats.mtime.getTime() > maxAgeMs) {
            await fs.unlink(filePath);
            deletedCount++;
            logger.info('Deleted old temp file', { file, age: now - stats.mtime.getTime() });
          }
        } catch (fileError) {
          logger.warn('Error processing temp file during cleanup', {
            file,
            error: fileError.message
          });
        }
      }
      
      logger.info('Temp files cleanup completed', {
        totalFiles: files.length,
        deletedFiles: deletedCount
      });
      
    } catch (error) {
      logger.error('Error during temp files cleanup', {
        error: error.message,
        tempDir: this.tempDir
      });
    }
  }

  /**
   * Create a local fallback image when download fails
   * @param {string} text - Text to display on image
   * @returns {Promise<Buffer>} Image buffer
   */
  async createLocalFallbackImage(text = 'Generated Image') {
    try {
      // Create a simple colored background with text
      const width = 1024;
      const height = 1024;
      
      // Truncate text if too long
      const displayText = text.length > 30 ? text.substring(0, 27) + '...' : text;
      
      // Create a gradient background SVG
      const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
              <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
            </linearGradient>
          </defs>
          <rect width="100%" height="100%" fill="url(#grad1)" />
          <text x="50%" y="45%" font-family="Arial, sans-serif" font-size="48" font-weight="bold" 
                text-anchor="middle" fill="white" opacity="0.9">AI Generated</text>
          <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="32" 
                text-anchor="middle" fill="white" opacity="0.7">${displayText}</text>
          <text x="50%" y="85%" font-family="Arial, sans-serif" font-size="24" 
                text-anchor="middle" fill="white" opacity="0.5">Fallback Image</text>
        </svg>
      `;

      const imageBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      logger.info('Created local fallback image', { 
        text: displayText,
        size: imageBuffer.length 
      });

      return imageBuffer;
      
    } catch (error) {
      logger.error('Failed to create local fallback image', { error: error.message });
      
      // Ultimate fallback - create a simple solid color image
      try {
        const simpleImageBuffer = await sharp({
          create: {
            width: 1024,
            height: 1024,
            channels: 3,
            background: { r: 102, g: 126, b: 234 }
          }
        })
        .png()
        .toBuffer();

        logger.info('Created simple fallback image', { 
          size: simpleImageBuffer.length 
        });

        return simpleImageBuffer;
      } catch (ultimateError) {
        logger.error('Failed to create even simple fallback image', { error: ultimateError.message });
        throw new Error('Unable to create any fallback image');
      }
    }
  }
}

module.exports = new ImageService();
