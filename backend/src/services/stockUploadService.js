/**
 * Stock Services Upload Service
 * Handles uploads to various stock photo services (123RF, Shutterstock, Adobe Stock)
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const config = require('../config/config');
const User = require('../models/User');
const Image = require('../models/Image');
const logger = require('../utils/logger');
const ftpService = require('./ftpService');

class StockUploadService {
  constructor() {
    this.supportedServices = ['123rf', 'shutterstock', 'adobeStock'];
    // Map service names to user model field names
    this.serviceMapping = {
      '123rf': 'rf123',
      'shutterstock': 'shutterstock',
      'adobeStock': 'adobeStock'
    };
  }

  /**
   * Upload image to stock service
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID
   * @param {string} service - Stock service name
   * @param {Object} uploadSettings - Upload settings
   * @returns {Promise<Object>} Upload result
   */
  async uploadToStockService(imageId, userId, service, uploadSettings = {}) {
    try {
      // Validate service
      if (!this.supportedServices.includes(service)) {
        throw new Error(`Unsupported stock service: ${service}`);
      }

      // Get user and image
      const [user, image] = await Promise.all([
        User.findById(userId),
        Image.findOne({ _id: imageId, userId })
      ]);

      if (!user) {
        throw new Error('User not found');
      }

      if (!image) {
        throw new Error('Image not found or access denied');
      }

      // Get user's stock service configuration using mapped service name
      const mappedServiceName = this.serviceMapping[service];
      const serviceConfig = user.getStockServiceConfig(mappedServiceName);
      if (!serviceConfig) {
        throw new Error(`${service} is not configured for this user`);
      }

      // Merge upload settings with user defaults
      const finalSettings = {
        ...serviceConfig.settings,
        ...uploadSettings
      };

      // Add upload record to image
      await image.addUpload(service, finalSettings);

      // Perform upload based on service type
      let uploadResult;
      switch (service) {
        case '123rf':
          uploadResult = await this.uploadTo123RF(image, serviceConfig, finalSettings);
          break;
        case 'shutterstock':
          uploadResult = await this.uploadToShutterstock(image, serviceConfig, finalSettings);
          break;
        case 'adobeStock':
          uploadResult = await this.uploadToAdobeStock(image, serviceConfig, finalSettings);
          break;
        default:
          throw new Error(`Upload handler not implemented for ${service}`);
      }

      // Update upload status
      await image.updateUploadStatus(service, 'completed', uploadResult);

      // Update user statistics
      await user.updateStats('imagesUploaded');

      logger.info('Stock service upload completed', {
        imageId,
        userId,
        service,
        externalId: uploadResult.externalId
      });

      return {
        success: true,
        service,
        externalId: uploadResult.externalId,
        uploadUrl: uploadResult.uploadUrl,
        uploadedAt: new Date()
      };

    } catch (error) {
      logger.error('Stock service upload failed', {
        imageId,
        userId,
        service,
        error: error.message
      });

      // Update upload status to failed
      try {
        const image = await Image.findById(imageId);
        if (image) {
          await image.updateUploadStatus(service, 'failed', {
            error: {
              message: error.message,
              code: error.code || 'UPLOAD_ERROR',
              timestamp: new Date()
            }
          });
        }
      } catch (updateError) {
        logger.error('Failed to update upload status', { updateError: updateError.message });
      }

      throw error;
    }
  }

  /**
   * Upload to 123RF via enhanced FTP service
   * @param {Object} image - Image document
   * @param {Object} serviceConfig - Service configuration
   * @param {Object} settings - Upload settings
   * @returns {Promise<Object>} Upload result
   */
  async uploadTo123RF(image, serviceConfig, settings) {
    try {
      logger.info('Starting enhanced 123RF upload', {
        imageId: image.id,
        filename: image.file.filename,
        filePath: image.file.path,
        fileSize: image.file.size,
        dimensions: `${image.file.width}x${image.file.height}`
      });

      // Enhanced file verification with multiple checks
      await this.verifyFileReadiness(image);

      // Generate remote filename
      const timestamp = Date.now();
      const extension = path.extname(image.file.filename);
      // Clean title for filename - remove spaces and special characters
      const cleanTitle = this.sanitizeFilename(settings.title || 'ai_image');
      const remoteFileName = `${cleanTitle}_${timestamp}${extension}`;

      logger.info('Uploading file via enhanced FTP service', {
        localPath: image.file.path,
        remoteFileName
      });

      // Prepare FTP credentials from user's service config
      const ftpCredentials = {
        host: serviceConfig.credentials.ftpHost,
        port: serviceConfig.credentials.ftpPort || 21,
        user: serviceConfig.credentials.username,
        password: serviceConfig.credentials.password,
        secure: false,
        remotePath: serviceConfig.credentials.remotePath || '/ai_image'
      };

      // Use our enhanced FTP service for upload with user credentials
      const uploadResult = await ftpService.uploadImageWithCredentials(image.file.path, {
        title: settings.title,
        description: settings.description,
        keywords: settings.keywords
      }, ftpCredentials);

      logger.info('Enhanced 123RF upload completed successfully', {
        imageId: image.id,
        remoteFileName: uploadResult.remoteFile,
        uploadTime: uploadResult.uploadTime,
        fileSize: uploadResult.fileSize
      });

      const remotePath = serviceConfig.credentials.remotePath || '/ai_image';
      
      return {
        externalId: uploadResult.remoteFile,
        uploadUrl: `ftp://${serviceConfig.credentials.ftpHost}${remotePath}/${uploadResult.remoteFile}`,
        remoteFilePath: `${remotePath}/${uploadResult.remoteFile}`,
        remoteFileName: uploadResult.remoteFile,
        uploadTime: uploadResult.uploadTime,
        fileSize: uploadResult.fileSize
      };

    } catch (error) {
      logger.error('Enhanced 123RF upload failed', {
        imageId: image.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Verify file readiness before upload
   * @param {Object} image - Image document
   */
  async verifyFileReadiness(image) {
    try {
      // Check if file exists
      await fs.access(image.file.path);
      
      // Get file stats
      const fileStats = await fs.stat(image.file.path);
      
      logger.info('File verification successful', {
        imageId: image.id,
        filePath: image.file.path,
        actualFileSize: fileStats.size,
        expectedFileSize: image.file.size,
        lastModified: fileStats.mtime
      });
      
      // Verify file size matches what's in database
      if (Math.abs(fileStats.size - image.file.size) > 1000) { // Allow 1KB difference
        logger.warn('File size mismatch detected', {
          imageId: image.id,
          expectedSize: image.file.size,
          actualSize: fileStats.size,
          difference: Math.abs(fileStats.size - image.file.size)
        });
      }

      // Additional verification: try to read a small portion of the file
      const fileHandle = await fs.open(image.file.path, 'r');
      const buffer = Buffer.alloc(1024);
      await fileHandle.read(buffer, 0, 1024, 0);
      await fileHandle.close();

      // Verify the file is a valid JPEG by checking magic bytes
      if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
        throw new Error('File does not appear to be a valid JPEG');
      }

      logger.info('File integrity verification passed', {
        imageId: image.id,
        jpegMagicBytes: `${buffer[0].toString(16)},${buffer[1].toString(16)}`
      });

      return fileStats;
    } catch (fileError) {
      logger.error('File verification failed', {
        imageId: image.id,
        filePath: image.file.path,
        error: fileError.message
      });
      throw new Error(`Image file verification failed: ${fileError.message}`);
    }
  }

  /**
   * Upload to Shutterstock (placeholder for future implementation)
   * @param {Object} image - Image document
   * @param {Object} serviceConfig - Service configuration
   * @param {Object} settings - Upload settings
   * @returns {Promise<Object>} Upload result
   */
  async uploadToShutterstock(image, serviceConfig, settings) {
    // This is a placeholder for future Shutterstock API integration
    logger.info('Shutterstock upload requested', {
      imageId: image.id,
      note: 'Shutterstock API integration not yet implemented'
    });

    // Simulate upload for now
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      externalId: `shutterstock_${Date.now()}`,
      uploadUrl: 'https://submit.shutterstock.com/...',
      status: 'pending_review'
    };
  }

  /**
   * Upload to Adobe Stock (placeholder for future implementation)
   * @param {Object} image - Image document
   * @param {Object} serviceConfig - Service configuration
   * @param {Object} settings - Upload settings
   * @returns {Promise<Object>} Upload result
   */
  async uploadToAdobeStock(image, serviceConfig, settings) {
    // This is a placeholder for future Adobe Stock API integration
    logger.info('Adobe Stock upload requested', {
      imageId: image.id,
      note: 'Adobe Stock API integration not yet implemented'
    });

    // Simulate upload for now
    await new Promise(resolve => setTimeout(resolve, 1000));

    return {
      externalId: `adobe_${Date.now()}`,
      uploadUrl: 'https://contributor.stock.adobe.com/...',
      status: 'pending_review'
    };
  }

  /**
   * Sanitize filename by removing spaces and special characters
   * @param {string} filename - Original filename
   * @returns {string} Sanitized filename
   */
  sanitizeFilename(filename) {
    return filename
      .replace(/\s+/g, '_')           // Replace spaces with underscores
      .replace(/[^\w\-_]/g, '')       // Remove special characters except word chars, hyphens, underscores (removed dots)
      .replace(/_{2,}/g, '_')         // Replace multiple underscores with single underscore
      .replace(/^_+|_+$/g, '')        // Remove leading/trailing underscores
      .toLowerCase()                  // Convert to lowercase
      .substring(0, 50);              // Limit length to 50 characters
  }

  /**
   * Generate metadata content for 123RF
   * @param {Object} settings - Upload settings
   * @returns {string} Metadata content
   */
  generate123RFMetadata(settings) {
    const lines = [];
    
    if (settings.title) {
      lines.push(`Title: ${settings.title}`);
    }
    
    if (settings.description) {
      lines.push(`Description: ${settings.description}`);
    }
    
    if (settings.keywords && settings.keywords.length > 0) {
      lines.push(`Keywords: ${settings.keywords.join(', ')}`);
    }
    
    if (settings.category) {
      lines.push(`Category: ${settings.category}`);
    }
    
    if (settings.pricing) {
      lines.push(`Pricing: ${settings.pricing}`);
    }
    
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('Source: AI Generated Image');
    
    return lines.join('\n');
  }

  /**
   * Test stock service connection
   * @param {string} userId - User ID
   * @param {string} service - Stock service name
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(userId, service) {
    try {
      if (!this.supportedServices.includes(service)) {
        throw new Error(`Unsupported stock service: ${service}`);
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get user's stock service configuration using mapped service name
      const mappedServiceName = this.serviceMapping[service];
      const serviceConfig = user.getStockServiceConfig(mappedServiceName);
      if (!serviceConfig) {
        throw new Error(`${service} is not configured for this user`);
      }

      let testResult;
      switch (service) {
        case '123rf':
          testResult = await this.test123RFConnection(serviceConfig);
          break;
        case 'shutterstock':
          testResult = await this.testShutterstockConnection(serviceConfig);
          break;
        case 'adobeStock':
          testResult = await this.testAdobeStockConnection(serviceConfig);
          break;
        default:
          throw new Error(`Connection test not implemented for ${service}`);
      }

      return {
        success: true,
        service,
        ...testResult
      };

    } catch (error) {
      logger.error('Stock service connection test failed', {
        userId,
        service,
        error: error.message
      });

      return {
        success: false,
        service,
        error: error.message
      };
    }
  }

  /**
   * Test 123RF FTP connection using enhanced FTP service
   * @param {Object} serviceConfig - Service configuration
   * @returns {Promise<Object>} Test result
   */
  async test123RFConnection(serviceConfig) {
    try {
      // Prepare FTP credentials from user's service config
      const ftpCredentials = {
        host: serviceConfig.credentials.ftpHost,
        port: serviceConfig.credentials.ftpPort || 21,
        user: serviceConfig.credentials.username,
        password: serviceConfig.credentials.password,
        secure: false,
        remotePath: serviceConfig.credentials.remotePath || '/ai_image'
      };

      logger.info('Testing 123RF FTP connection with user credentials', {
        host: ftpCredentials.host,
        user: ftpCredentials.user,
        remotePath: ftpCredentials.remotePath
      });

      // Use our enhanced FTP service for connection testing with user credentials
      const testResult = await ftpService.testConnection(ftpCredentials);
      
      if (testResult.success) {
        return {
          connected: true,
          host: serviceConfig.credentials.ftpHost,
          remotePath: serviceConfig.credentials.remotePath || '/ai_image',
          directoryCount: testResult.directoryCount,
          message: 'Enhanced FTP connection test successful'
        };
      } else {
        throw new Error(testResult.error || 'FTP connection test failed');
      }
    } catch (error) {
      logger.error('Enhanced 123RF FTP connection test failed', {
        host: serviceConfig.credentials.ftpHost,
        error: error.message
      });
      throw new Error(`123RF FTP connection failed: ${error.message}`);
    }
  }

  /**
   * Test Shutterstock connection (placeholder)
   * @param {Object} serviceConfig - Service configuration
   * @returns {Promise<Object>} Test result
   */
  async testShutterstockConnection(serviceConfig) {
    // Placeholder for Shutterstock API connection test
    return {
      connected: true,
      note: 'Shutterstock API integration not yet implemented'
    };
  }

  /**
   * Test Adobe Stock connection (placeholder)
   * @param {Object} serviceConfig - Service configuration
   * @returns {Promise<Object>} Test result
   */
  async testAdobeStockConnection(serviceConfig) {
    // Placeholder for Adobe Stock API connection test
    return {
      connected: true,
      note: 'Adobe Stock API integration not yet implemented'
    };
  }

  /**
   * Get upload status for an image
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Upload status
   */
  async getUploadStatus(imageId, userId) {
    try {
      const image = await Image.findOne({ _id: imageId, userId });
      
      if (!image) {
        throw new Error('Image not found or access denied');
      }

      return {
        imageId,
        uploads: image.uploads.map(upload => ({
          service: upload.service,
          status: upload.status,
          uploadedAt: upload.uploadedAt,
          externalId: upload.externalId,
          uploadUrl: upload.uploadUrl,
          error: upload.error,
          retries: upload.retries,
          lastRetryAt: upload.lastRetryAt
        }))
      };

    } catch (error) {
      logger.error('Failed to get upload status', {
        imageId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Retry failed upload
   * @param {string} imageId - Image ID
   * @param {string} userId - User ID
   * @param {string} service - Stock service name
   * @returns {Promise<Object>} Retry result
   */
  async retryUpload(imageId, userId, service) {
    try {
      const image = await Image.findOne({ _id: imageId, userId });
      
      if (!image) {
        throw new Error('Image not found or access denied');
      }

      const upload = image.uploads.find(u => u.service === service);
      if (!upload) {
        throw new Error(`No upload record found for service ${service}`);
      }

      if (upload.status !== 'failed') {
        throw new Error(`Upload is not in failed state (current: ${upload.status})`);
      }

      // Check retry limit
      const maxRetries = 3;
      if (upload.retries >= maxRetries) {
        throw new Error(`Maximum retry limit (${maxRetries}) exceeded`);
      }

      // Update retry count
      upload.retries += 1;
      upload.lastRetryAt = new Date();
      upload.status = 'pending';
      await image.save();

      // Retry the upload
      return await this.uploadToStockService(imageId, userId, service, upload.settings);

    } catch (error) {
      logger.error('Upload retry failed', {
        imageId,
        userId,
        service,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new StockUploadService();
