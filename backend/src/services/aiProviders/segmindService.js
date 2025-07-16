/**
 * Segmind AI Service
 * Integration with Segmind API for Fast-Flux-Schnell model
 */

const axios = require('axios');
const config = require('../../config/config');
const logger = require('../../utils/logger');

class SegmindService {
  constructor() {
    this.baseURL = 'https://api.segmind.com/v1';
    this.apiKey = config.segmind.apiKey;
    this.timeout = 120000; // 2 minutes timeout
    
    // Static parameters for Fast-Flux-Schnell (1:1 aspect ratio)
    this.defaultParams = {
      width: 1024,
      height: 1024,           // 1:1 aspect ratio as requested
      num_inference_steps: 4,  // Standard value for fast generation
      guidance_scale: 3.5,     // Standard guidance scale
      seed: null              // Will be randomly generated if not provided
    };

    // Initialize axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      }
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
        logger.info('Segmind API request', {
          url: config.url,
          method: config.method,
          timestamp: new Date().toISOString()
        });
        return config;
      },
      (error) => {
        logger.error('Segmind API request error', {
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Segmind API response', {
          status: response.status,
          url: response.config.url,
          timestamp: new Date().toISOString()
        });
        return response;
      },
      (error) => {
        logger.error('Segmind API response error', {
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
   * Generate image using Fast-Flux-Schnell model
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

      // Prepare request payload
      const payload = {
        prompt: prompt.trim(),
        ...this.defaultParams,
        // Override seed if provided in options
        seed: options.seed || this.generateRandomSeed()
      };

      logger.info('Generating image with Segmind Fast-Flux-Schnell', {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        params: {
          width: payload.width,
          height: payload.height,
          num_inference_steps: payload.num_inference_steps,
          guidance_scale: payload.guidance_scale,
          seed: payload.seed
        }
      });

      // Make API request
      const response = await this.client.post('/fast-flux-schnell', payload);

      // Validate response
      if (!response.data) {
        throw new Error('Empty response from Segmind API');
      }

      // Handle different response formats
      let imageData;
      if (response.data.image) {
        // Base64 encoded image
        imageData = {
          format: 'base64',
          data: response.data.image,
          mimeType: 'image/png'
        };
      } else if (response.data.url) {
        // Image URL
        imageData = {
          format: 'url',
          data: response.data.url,
          mimeType: 'image/png'
        };
      } else if (typeof response.data === 'string') {
        // Direct base64 string
        imageData = {
          format: 'base64',
          data: response.data,
          mimeType: 'image/png'
        };
      } else {
        throw new Error('Unexpected response format from Segmind API');
      }

      const result = {
        success: true,
        model: 'fast-flux-schnell',
        provider: 'segmind',
        prompt,
        image: imageData,
        metadata: {
          width: payload.width,
          height: payload.height,
          num_inference_steps: payload.num_inference_steps,
          guidance_scale: payload.guidance_scale,
          seed: payload.seed,
          generatedAt: new Date().toISOString(),
          processingTime: response.headers['x-processing-time'] || null
        }
      };

      logger.info('Image generated successfully with Segmind', {
        model: result.model,
        imageFormat: result.image.format,
        seed: result.metadata.seed,
        processingTime: result.metadata.processingTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to generate image with Segmind', {
        prompt: prompt?.substring(0, 100),
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      // Re-throw with more context
      const enhancedError = new Error(`Segmind API error: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.provider = 'segmind';
      enhancedError.model = 'fast-flux-schnell';
      
      if (error.response) {
        enhancedError.status = error.response.status;
        enhancedError.statusText = error.response.statusText;
        enhancedError.responseData = error.response.data;
      }

      throw enhancedError;
    }
  }

  /**
   * Generate a random seed for image generation
   * @returns {number} Random seed
   */
  generateRandomSeed() {
    return Math.floor(Math.random() * 1000000);
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
      
      logger.info('Segmind API connection validated successfully');
      return true;

    } catch (error) {
      logger.error('Segmind API connection validation failed', {
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
      model: 'fast-flux-schnell',
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
      if (imageData.format === 'base64') {
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

module.exports = SegmindService;
