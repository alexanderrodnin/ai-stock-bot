/**
 * Juggernaut Pro Flux AI Service
 * Integration with Segmind API for Juggernaut Pro Flux model
 */

const axios = require('axios');
const config = require('../../config/config');
const logger = require('../../utils/logger');

class JuggernautProFluxService {
  constructor() {
    this.baseURL = 'https://api.segmind.com/v1';
    this.apiKey = config.segmind.apiKey;
    this.timeout = 120000; // 2 minutes timeout
    
    // Static parameters for Juggernaut Pro Flux (1:1 aspect ratio for stock images)
    this.defaultParams = {
      width: 1024,
      height: 1024,
      steps: 25,
      CFGScale: 7,
      outputFormat: 'JPG',
      scheduler: 'Euler'
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
        logger.info('Juggernaut Pro Flux API request', {
          url: config.url,
          method: config.method,
          timestamp: new Date().toISOString()
        });
        return config;
      },
      (error) => {
        logger.error('Juggernaut Pro Flux API request error', {
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Juggernaut Pro Flux API response', {
          status: response.status,
          url: response.config.url,
          timestamp: new Date().toISOString()
        });
        return response;
      },
      (error) => {
        logger.error('Juggernaut Pro Flux API response error', {
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
   * Generate image using Juggernaut Pro Flux model
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
        positivePrompt: prompt.trim(),
        ...this.defaultParams,
        // Use timestamp as seed for reproducibility
        seed: options.seed || Date.now()
      };

      logger.info('Generating image with Juggernaut Pro Flux', {
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        params: {
          width: payload.width,
          height: payload.height,
          steps: payload.steps,
          CFGScale: payload.CFGScale,
          seed: payload.seed,
          scheduler: payload.scheduler
        }
      });

      // Make API request
      const response = await this.client.post('/juggernaut-pro-flux', payload);

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

      const result = {
        success: true,
        model: 'juggernaut-pro-flux',
        provider: 'segmind',
        prompt,
        image: imageData,
        metadata: {
          width: payload.width,
          height: payload.height,
          steps: payload.steps,
          CFGScale: payload.CFGScale,
          seed: payload.seed,
          scheduler: payload.scheduler,
          generatedAt: new Date().toISOString(),
          processingTime: response.headers['x-processing-time'] || null,
          fileSize: imageBuffer.length
        }
      };

      logger.info('Image generated successfully with Juggernaut Pro Flux', {
        model: result.model,
        imageFormat: result.image.format,
        seed: result.metadata.seed,
        processingTime: result.metadata.processingTime
      });

      return result;

    } catch (error) {
      logger.error('Failed to generate image with Juggernaut Pro Flux', {
        prompt: prompt?.substring(0, 100),
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      // Re-throw with more context
      const enhancedError = new Error(`Juggernaut Pro Flux API error: ${error.message}`);
      enhancedError.originalError = error;
      enhancedError.provider = 'segmind';
      enhancedError.model = 'juggernaut-pro-flux';
      
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
      
      logger.info('Juggernaut Pro Flux API connection validated successfully');
      return true;

    } catch (error) {
      logger.error('Juggernaut Pro Flux API connection validation failed', {
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
      model: 'juggernaut-pro-flux',
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

module.exports = JuggernautProFluxService;
