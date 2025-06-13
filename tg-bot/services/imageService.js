const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');
const mockImageUrls = require('../mock-image-urls');
const { downloadImage } = require('../download-image');

/**
 * Image generation service that handles both OpenAI API calls and fallback options
 */
class ImageService {
  /**
   * Create a new image service
   * @param {Object} options Configuration options
   * @param {string} options.apiKey OpenAI API key
   * @param {boolean} options.demoMode Whether to use demo mode (skip OpenAI calls)
   */
  constructor(options = {}) {
    this.apiKey = options.apiKey;
    this.demoMode = options.demoMode || false;
    this.models = {
      primary: 'dall-e-3',
      fallback: 'dall-e-2'
    };
    this.imageSize = '1024x1024';
    
    // Initialize OpenAI client if API key is provided
    if (this.apiKey) {
      this.openai = new OpenAI({
        apiKey: this.apiKey
      });
    } else if (!this.demoMode) {
      console.warn('Warning: No OpenAI API key provided. Falling back to demo mode.');
      this.demoMode = true;
    }
  }

  /**
   * Generate an image from a prompt
   * @param {string} prompt The text prompt for image generation
   * @returns {Promise<Object>} Result object with imageUrl, usedSource, and usedModel
   */
  async generateImage(prompt) {
    let imageUrl;
    let usedSource = '';
    let usedModel = '';
    
    try {
      // If in demo mode, skip OpenAI and use mock images
      if (this.demoMode) {
        console.log('DEMO MODE: Using mock image');
        const mockUrl = mockImageUrls.getMockImageUrl(prompt);
        console.log(`Downloading mock image from ${mockUrl}...`);
        
        // Download the image to a local file
        const localImagePath = await downloadImage(mockUrl);
        console.log(`Mock image downloaded to ${localImagePath}`);
        
        // Return the local file path and source info
        return {
          imageUrl: localImagePath,
          usedSource: 'Demo Mode',
          usedModel: null,
          isLocalFile: true
        };
      }
      
      // Try OpenAI API
      try {
        console.log('Sending prompt to OpenAI:', prompt);
        
        // Try primary model (DALL-E 3) first
        try {
          console.log(`Attempting with ${this.models.primary}...`);
          const response = await this.openai.images.generate({
            model: this.models.primary,
            prompt: prompt,
            n: 1,
            size: this.imageSize,
            quality: "standard",
          });
          
          usedModel = this.models.primary;
          console.log(`${this.models.primary} image generated successfully`);
          
          if (!response.data || !response.data[0] || !response.data[0].url) {
            throw new Error('Unexpected API response structure');
          }
          
          return {
            imageUrl: response.data[0].url,
            usedSource: 'OpenAI',
            usedModel: usedModel,
            isLocalFile: false
          };
        } catch (primaryModelError) {
          // If primary model fails, try fallback model (DALL-E 2)
          console.log(`${this.models.primary} failed, trying ${this.models.fallback}...`, primaryModelError);
          
          const response = await this.openai.images.generate({
            model: this.models.fallback,
            prompt: prompt,
            n: 1,
            size: this.imageSize,
          });
          
          usedModel = this.models.fallback;
          console.log(`${this.models.fallback} image generated successfully`);
          
          if (!response.data || !response.data[0] || !response.data[0].url) {
            throw new Error('Unexpected API response structure');
          }
          
          return {
            imageUrl: response.data[0].url,
            usedSource: 'OpenAI',
            usedModel: usedModel,
            isLocalFile: false
          };
        }
      } catch (apiError) {
        // Both models failed, use mock image as fallback
        console.error('OpenAI API Error:', apiError);
        
        const mockUrl = mockImageUrls.getMockImageUrl(prompt);
        console.log(`Downloading mock image from ${mockUrl}...`);
        
        // Download the image to a local file
        const localImagePath = await downloadImage(mockUrl);
        console.log(`Mock image downloaded to ${localImagePath}`);
        
        // Return the local file path and source info
        return {
          imageUrl: localImagePath,
          usedSource: 'Demo Mode (API Fallback)',
          usedModel: null,
          isLocalFile: true
        };
      }
    } catch (error) {
      console.error('Error in image generation service:', error);
      throw error;
    }
  }
  
  /**
   * Clean up a local image file
   * @param {string} filePath Path to the local image file
   */
  cleanupLocalImage(filePath) {
    // Clean up the local file after sending
    setTimeout(() => {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Deleted temporary file: ${filePath}`);
        }
      } catch (err) {
        console.error(`Error deleting temporary file ${filePath}:`, err);
      }
    }, 5000); // Delete after 5 seconds to ensure it's sent
  }
}

module.exports = ImageService;
