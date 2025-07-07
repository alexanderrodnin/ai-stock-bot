/**
 * Backend API Service
 * HTTP client for interacting with the backend API
 */

const axios = require('axios');

class BackendApiService {
  /**
   * Create a new backend API service
   * @param {Object} options Configuration options
   * @param {string} options.baseURL Backend API base URL
   * @param {number} options.timeout Request timeout in milliseconds
   */
  constructor(options = {}) {
    this.baseURL = options.baseURL || process.env.BACKEND_API_URL || 'http://localhost:3000/api';
    this.timeout = options.timeout || parseInt(process.env.BACKEND_API_TIMEOUT) || 120000; // 2 minutes default
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TelegramBot/1.0'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[API] Request error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error(`[API] ${error.response?.status || 'ERROR'} ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Create or get user by external ID
   * @param {Object} userData User data
   * @param {string} userData.externalId External user ID (e.g., Telegram user ID)
   * @param {string} userData.externalSystem External system ('telegram', 'web', etc.)
   * @param {Object} userData.profile User profile data
   * @returns {Promise<Object>} User object
   */
  async createOrGetUser(userData) {
    try {
      const response = await this.client.post('/users', userData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating/getting user:', error.message);
      throw new Error(`Failed to create/get user: ${error.message}`);
    }
  }

  /**
   * Get user by ID
   * @param {string} userId User ID
   * @returns {Promise<Object>} User object
   */
  async getUserById(userId) {
    try {
      const response = await this.client.get(`/users/${userId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user by ID:', error.message);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Get user by external ID
   * @param {string} externalId External user ID
   * @param {string} externalSystem External system
   * @returns {Promise<Object>} User object
   */
  async getUserByExternalId(externalId, externalSystem = 'telegram') {
    try {
      const response = await this.client.get(`/users/external/${externalId}/${externalSystem}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user by external ID:', error.message);
      throw new Error(`Failed to get user: ${error.message}`);
    }
  }

  /**
   * Check if user has active stock services
   * @param {string} userId User ID
   * @returns {Promise<boolean>} True if user has at least one active stock service
   */
  async hasActiveStockServices(userId) {
    try {
      const response = await this.client.get(`/users/${userId}/stock-services`);
      const stockServices = response.data.data.stockServices;
      
      // Check if any stock service is enabled
      return Object.values(stockServices).some(service => service.enabled === true);
    } catch (error) {
      console.error('Error checking stock services:', error.message);
      return false;
    }
  }

  /**
   * Get user's stock services
   * @param {string} userId User ID
   * @returns {Promise<Object>} Stock services configuration
   */
  async getStockServices(userId) {
    try {
      const response = await this.client.get(`/users/${userId}/stock-services`);
      return response.data.data.stockServices;
    } catch (error) {
      console.error('Error getting stock services:', error.message);
      throw new Error(`Failed to get stock services: ${error.message}`);
    }
  }

  /**
   * Update stock service settings
   * @param {string} userId User ID
   * @param {string} service Service name ('123rf', 'shutterstock', 'adobeStock')
   * @param {Object} settings Service settings
   * @returns {Promise<Object>} Updated settings
   */
  async updateStockService(userId, service, settings) {
    try {
      const response = await this.client.put(`/users/${userId}/stock-services/${service}`, settings);
      return response.data.data;
    } catch (error) {
      console.error('Error updating stock service:', error.message);
      throw new Error(`Failed to update stock service: ${error.message}`);
    }
  }

  /**
   * Test stock service connection
   * @param {string} userId User ID
   * @param {string} service Service name
   * @returns {Promise<Object>} Test result
   */
  async testStockServiceConnection(userId, service) {
    try {
      const response = await this.client.post(`/users/${userId}/stock-services/${service}/test`);
      return response.data.data;
    } catch (error) {
      console.error('Error testing stock service connection:', error.message);
      throw new Error(`Failed to test connection: ${error.message}`);
    }
  }

  /**
   * Delete stock service
   * @param {string} userId User ID
   * @param {string} service Service name ('123rf', 'shutterstock', 'adobeStock')
   * @returns {Promise<Object>} Delete result
   */
  async deleteStockService(userId, service) {
    try {
      const response = await this.client.delete(`/users/${userId}/stock-services/${service}`);
      return response.data.data;
    } catch (error) {
      console.error('Error deleting stock service:', error.message);
      throw new Error(`Failed to delete stock service: ${error.message}`);
    }
  }

  /**
   * Generate image
   * @param {Object} imageData Image generation data
   * @param {string} imageData.userId User ID
   * @param {string} imageData.userExternalId User external ID
   * @param {string} imageData.prompt Image prompt
   * @param {Object} imageData.options Generation options
   * @param {boolean} imageData.demoMode Force demo mode (use mock images)
   * @returns {Promise<Object>} Generated image data
   */
  async generateImage(imageData) {
    try {
      const response = await this.client.post('/images/generate', imageData);
      return response.data.data;
    } catch (error) {
      console.error('Error generating image:', error.message);
      
      // Check for specific error codes
      if (error.response?.data?.error?.code === 'NO_ACTIVE_STOCK_SERVICES') {
        throw new Error('NO_ACTIVE_STOCK_SERVICES');
      }
      
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }

  /**
   * Get image by ID
   * @param {string} imageId Image ID
   * @param {string} userId User ID
   * @returns {Promise<Object>} Image data
   */
  async getImageById(imageId, userId) {
    try {
      const response = await this.client.get(`/images/${imageId}?userId=${userId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting image:', error.message);
      throw new Error(`Failed to get image: ${error.message}`);
    }
  }

  /**
   * Get user's images
   * @param {string} userId User ID
   * @param {Object} options Query options
   * @returns {Promise<Object>} Images data with pagination
   */
  async getUserImages(userId, options = {}) {
    try {
      const params = new URLSearchParams();
      if (options.page) params.append('page', options.page);
      if (options.limit) params.append('limit', options.limit);
      if (options.status) params.append('status', options.status);
      
      const response = await this.client.get(`/images/user/${userId}?${params.toString()}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting user images:', error.message);
      throw new Error(`Failed to get user images: ${error.message}`);
    }
  }

  /**
   * Upload image to stock service
   * @param {Object} uploadData Upload data
   * @param {string} uploadData.userId User ID
   * @param {string} uploadData.imageId Image ID
   * @param {string} uploadData.service Service name
   * @param {string} uploadData.title Image title
   * @param {string} uploadData.description Image description
   * @param {Array} uploadData.keywords Keywords array
   * @param {string} uploadData.category Category
   * @param {string} uploadData.pricing Pricing tier
   * @returns {Promise<Object>} Upload result
   */
  async uploadToStock(uploadData) {
    try {
      const { service, ...data } = uploadData;
      const response = await this.client.post(`/upload/${service}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error uploading to stock:', error.message);
      throw new Error(`Failed to upload to stock: ${error.message}`);
    }
  }

  /**
   * Get upload status
   * @param {string} imageId Image ID
   * @param {string} userId User ID
   * @returns {Promise<Object>} Upload status
   */
  async getUploadStatus(imageId, userId) {
    try {
      const response = await this.client.get(`/upload/status/${imageId}?userId=${userId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting upload status:', error.message);
      throw new Error(`Failed to get upload status: ${error.message}`);
    }
  }

  /**
   * Get user statistics
   * @param {string} userId User ID
   * @returns {Promise<Object>} User statistics
   */
  async getUserStats(userId) {
    try {
      const response = await this.client.get(`/users/${userId}/stats`);
      const data = response.data.data;
      
      // Flatten the structure for easier access
      return {
        imagesGenerated: data.user?.imagesGenerated || 0,
        imagesUploaded: data.user?.imagesUploaded || 0,
        totalRequests: data.user?.totalRequests || 0,
        lastActivity: data.user?.lastActivity,
        subscription: data.subscription,
        images: data.images
      };
    } catch (error) {
      console.error('Error getting user stats:', error.message);
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }


  /**
   * Get image stream from backend for direct telegram sending
   * @param {string} imageId Image ID
   * @param {string} userId User ID
   * @returns {Promise<Stream>} Image stream
   */
  async getImageStream(imageId, userId) {
    try {
      const response = await this.client.get(`/images/${imageId}/stream?userId=${userId}`, {
        responseType: 'stream'
      });
      return response.data;
    } catch (error) {
      console.error('Error getting image stream:', error.message);
      throw new Error(`Failed to get image stream: ${error.message}`);
    }
  }

  /**
   * Health check
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Error checking health:', error.message);
      throw new Error(`Backend health check failed: ${error.message}`);
    }
  }

  /**
   * Check if backend is available
   * @returns {Promise<boolean>} True if backend is available
   */
  async isAvailable() {
    try {
      await this.healthCheck();
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = BackendApiService;
