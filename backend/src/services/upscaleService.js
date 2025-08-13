/**
 * Upscale Service
 * Handles AI-powered image upscaling using Replicate Real-ESRGAN
 */

const axios = require('axios');
const sharp = require('sharp');
const Replicate = require('replicate');

const config = require('../config/config');
const logger = require('../utils/logger');

class UpscaleService {
  constructor() {
    this.replicate = new Replicate({
      auth: config.replicate.apiKey
    });
    this.model = "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b";
    this.timeout = 300000; // 5 minutes timeout for upscaling
  }

  /**
   * Upscale image from 1024x1024 to 4096x4096 using AI
   * @param {Buffer} imageBuffer - Source image buffer (1024x1024)
   * @returns {Promise<Buffer>} - Upscaled image buffer (4096x4096)
   */
  async upscaleImage(imageBuffer) {
    try {
      if (!config.replicate.apiKey) {
        throw new Error('Replicate API key is not configured');
      }

      // Validate input image size
      const metadata = await sharp(imageBuffer).metadata();
      logger.info('Starting AI upscaling validation', {
        inputWidth: metadata.width,
        inputHeight: metadata.height,
        expectedSize: '1024x1024'
      });

      // We expect 1024x1024, but allow some flexibility for different AI models
      if (metadata.width < 512 || metadata.height < 512) {
        throw new Error(`Image too small for upscaling: ${metadata.width}x${metadata.height}. Minimum 512x512 required.`);
      }

      // Convert image buffer to data URL
      const base64 = imageBuffer.toString('base64');
      const mimeType = metadata.format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = `data:${mimeType};base64,${base64}`;

      logger.info('Starting AI upscaling with Replicate Real-ESRGAN', {
        inputSize: `${metadata.width}x${metadata.height}`,
        targetSize: '4096x4096',
        model: 'real-esrgan',
        scale: 4
      });

      const startTime = Date.now();

      // Send request to Replicate
      const output = await this.replicate.run(this.model, {
        input: {
          image: dataUrl,
          scale: 4,           // Always 4x upscaling
          face_enhance: true  // Enable face enhancement
        }
      });

      const processingTime = Date.now() - startTime;

      if (!output) {
        throw new Error('No output received from Replicate Real-ESRGAN');
      }

      logger.info('Replicate processing completed, downloading result', {
        outputUrl: output,
        processingTime: `${processingTime}ms`
      });

      // Download the upscaled image
      const response = await axios({
        method: 'GET',
        url: output,
        responseType: 'arraybuffer',
        timeout: this.timeout,
        maxContentLength: 50 * 1024 * 1024 // 50MB max
      });

      const upscaledBuffer = Buffer.from(response.data);

      // Validate the result
      const resultMetadata = await sharp(upscaledBuffer).metadata();
      
      logger.info('AI upscaling completed successfully', {
        originalSize: `${metadata.width}x${metadata.height}`,
        resultSize: `${resultMetadata.width}x${resultMetadata.height}`,
        originalFileSize: imageBuffer.length,
        resultFileSize: upscaledBuffer.length,
        processingTime: `${processingTime}ms`,
        compressionRatio: (upscaledBuffer.length / imageBuffer.length).toFixed(2)
      });

      // Verify the upscaled image is actually larger
      if (resultMetadata.width <= metadata.width || resultMetadata.height <= metadata.height) {
        logger.warn('Upscaled image is not larger than original', {
          original: `${metadata.width}x${metadata.height}`,
          result: `${resultMetadata.width}x${resultMetadata.height}`
        });
      }

      return upscaledBuffer;

    } catch (error) {
      logger.error('AI upscaling failed', {
        error: error.message,
        model: this.model,
        stack: error.stack
      });

      // Enhance error message for better debugging
      if (error.message.includes('timeout')) {
        throw new Error(`AI upscaling timeout: ${error.message}`);
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        throw new Error(`AI upscaling quota exceeded: ${error.message}`);
      } else if (error.response?.status === 401) {
        throw new Error('AI upscaling authentication failed: Invalid Replicate API key');
      } else if (error.response?.status === 429) {
        throw new Error('AI upscaling rate limit exceeded: Too many requests');
      } else {
        throw new Error(`AI upscaling failed: ${error.message}`);
      }
    }
  }

  /**
   * Test connection to Replicate API
   * @returns {Promise<boolean>} - True if connection is successful
   */
  async testConnection() {
    try {
      if (!config.replicate.apiKey) {
        throw new Error('Replicate API key is not configured');
      }

      // Create a small test image
      const testImageBuffer = await sharp({
        create: {
          width: 64,
          height: 64,
          channels: 3,
          background: { r: 255, g: 0, b: 0 }
        }
      })
      .jpeg()
      .toBuffer();

      // Try to upscale the test image
      await this.upscaleImage(testImageBuffer);
      
      logger.info('Replicate Real-ESRGAN connection test successful');
      return true;

    } catch (error) {
      logger.error('Replicate Real-ESRGAN connection test failed', {
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
      provider: 'replicate',
      model: 'real-esrgan',
      modelId: this.model,
      hasApiKey: !!config.replicate.apiKey,
      timeout: this.timeout,
      scale: 4,
      faceEnhance: true,
      isConfigured: !!config.replicate.apiKey
    };
  }

  /**
   * Estimate upscaling time based on image size
   * @param {number} width - Image width
   * @param {number} height - Image height
   * @returns {number} Estimated time in milliseconds
   */
  estimateProcessingTime(width, height) {
    // Base time for 1024x1024 is approximately 30-60 seconds
    const baseTime = 45000; // 45 seconds
    const pixelCount = width * height;
    const basePixelCount = 1024 * 1024;
    
    // Scale time based on pixel count
    const scaleFactor = pixelCount / basePixelCount;
    return Math.round(baseTime * scaleFactor);
  }

  /**
   * Check if upscaling is available
   * @returns {boolean} True if upscaling service is available
   */
  isAvailable() {
    return !!(config.replicate && config.replicate.apiKey);
  }
}

module.exports = new UpscaleService();
