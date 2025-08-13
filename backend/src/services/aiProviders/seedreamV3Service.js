/**
 * Seedream V3 AI Service
 * Integration with Segmind API for Seedream V3 Text to Image model
 */

const axios = require('axios');
const config = require('../../config/config');
const logger = require('../../utils/logger');

class SeedreamV3Service {
  constructor() {
    this.baseURL = 'https://api.segmind.com/v1';
    this.apiKey = config.segmind.apiKey;
    this.timeout = 120000; // 2 minutes timeout
    
    // Static parameters for Seedream V3 (1:1 aspect ratio for stock images)
    this.defaultParams = {
      aspect_ratio: '1:1',  // Fixed 1:1 for AI upscaling
      guidance_scale: 2.5
    };

    // Initialize axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      responseType: 'arraybuffer' // Receive binary data
    });

    // Add request/response interceptors for logging
    this.setupInterceptors();
  }

  /**
   * Setup axios interceptors for logging and error handling
   */
  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Seedream V3 API request', {
          url: config.url,
          method: config.method,
          timestamp: new Date().toISOString()
        });
        return config;
      },
      (error) => {
        logger.error('Seedream V3 API request error', {
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Seedream V3 API response', {
          status: response.status,
          url: response.config.url,
          timestamp: new Date().toISOString()
        });
        return response;
      },
      (error) => {
        logger.error('Seedream V3 API response error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          error: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate image using Seedream V3 model
   * @param {string} prompt - Text prompt for image generation
   * @param {Object} options - Additional options (optional)
   * @returns {Promise<Object>} Generated image data
   */
  async generateImage(prompt, options = {}) {
    try {
      if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
        throw new Error('Prompt is required and must be a non-empty string');
      }

      if (!this.apiKey) {
        throw new Error('Segmind API key is not configured');
      }

      // Prepare request payload with fixed parameters
      const payload = {
        prompt: prompt.trim(),
        ...this.defaultParams,
        // Use timestamp as seed for reproducibility
        seed: options.seed || Date.now()
      };

      logger.info('Generating image with Seedream V3', {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        params: {
          aspect_ratio: payload.aspect_ratio,
          guidance_scale: payload.guidance_scale,
          seed: payload.seed
        }
      });

      // Make API request
      const response = await this.client.post('/seedream-v3-text-to-image', payload);

      // Validate response
      if (!response.data) {
        throw new Error('Empty response from Segmind API');
      }

      // Handle binary response data (image file)
      const imageBuffer = Buffer.from(response.data);
      
      // Determine MIME type from response headers or default to JPEG
      const contentType = response.headers['content-type'] || 'image/jpeg';
      
      const imageData = {
        format: 'buffer',
        data: imageBuffer,
        mimeType: contentType
      };

      // Calculate dimensions based on aspect ratio (1:1 = 1024x1024 for 2K)
      const dimensions = this.getImageDimensions(payload.aspect_ratio);

      const result = {
        success: true,
        model: 'seedream-v3',
        provider: 'segmind',
        prompt,
        image: imageData,
        metadata: {
          width: dimensions.width,
          height: dimensions.height,
          aspect_ratio: payload.aspect_ratio,
          guidance_scale: payload.guidance_scale,
          seed: payload.seed,
          generatedAt: new Date().toISOString(),
          processingTime: response.headers['x-processing-time'] || null,
          fileSize: imageBuffer.length
        }
      };

      logger.info('Image generated successfully with Seedream V3', {
        model: result.model,
        imageFormat: result.image.format,
        seed: result.metadata.seed,
        processingTime: result.metadata.processingTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to generate image with Seedream V3', {
        prompt: prompt?.substring(0, 100),
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      // Re-throw with more context
      const enhancedError = new Error(`Seedream V3 API error: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.provider = 'segmind';
      enhancedError.model = 'seedream-v3';
      
      if (error.response) {
        enhancedError.status = error.response.status;
        enhancedError.statusText = error.response.statusText;
        enhancedError.responseData = error.response.data;
      }

      throw enhancedError;
    }
  }

  /**
   * Get image dimensions based on aspect ratio
   * @param {string} aspectRatio - Aspect ratio string
   * @returns {Object} Width and height
   */
  getImageDimensions(aspectRatio) {
    const aspectRatioMap = {
      '1:1': { width: 1024, height: 1024 },
      '16:9': { width: 1536, height: 864 },
      '4:3': { width: 1365, height: 1024 },
      '3:4': { width: 1024, height: 1365 },
      '9:16': { width: 864, height: 1536 }
    };

    return aspectRatioMap[aspectRatio] || aspectRatioMap['1:1'];
  }

  /**
   * Generate a random seed for image generation
   * @returns {number} Random seed
   */
  generateRandomSeed() {
    return Math.floor(Math.random() * 999999) + 1;
  }

  /**
   * Validate API key and connection
   * @returns {Promise<boolean>} True if connection is valid
   */
  async validateConnection() {
    try {
      if (!this.apiKey) {
        throw new Error('Segmind API key is not configured');
      }

      // Test with a simple prompt
      const testPrompt = 'test image';
      await this.generateImage(testPrompt);
      
      logger.info('Seedream V3 API connection validated successfully');
      return true;

    } catch (error) {
      logger.error('Seedream V3 API connection validation failed', {
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get service status and configuration
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      provider: 'segmind',
      model: 'seedream-v3',
      baseURL: this.baseURL,
      hasApiKey: !!this.apiKey,
      timeout: this.timeout,
      defaultParams: this.defaultParams,
      isConfigured: !!this.apiKey
    };
  }

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

  /**
   * Download image from URL
   * @param {string} imageUrl - Image URL
   * @returns {Promise<Buffer>} Image buffer
   */
  async downloadImage(imageUrl) {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000 // 30 seconds timeout for download
      });

      return Buffer.from(response.data);

    } catch (error) {
      logger.error('Failed to download image from URL', {
        url: imageUrl,
        error: error.message
      });
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Process generated image and return buffer
   * @param {Object} imageData - Image data from generation
   * @returns {Promise<Buffer>} Processed image buffer
   */
  async processImageToBuffer(imageData) {
    try {
      if (imageData.format === 'buffer') {
        // Data is already a buffer
        return imageData.data;
      } else if (imageData.format === 'base64') {
        return this.base64ToBuffer(imageData.data);
      } else if (imageData.format === 'url') {
        return await this.downloadImage(imageData.data);
      } else {
        throw new Error(`Unsupported image format: ${imageData.format}`);
      }
    } catch (error) {
      logger.error('Failed to process image to buffer', {
        format: imageData.format,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = SeedreamV3Service;
