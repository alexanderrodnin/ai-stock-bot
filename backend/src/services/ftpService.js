/**
 * FTP Service
 * Handles FTP uploads to 123RF
 */

const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const logger = require('../utils/logger');

class FtpService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  /**
   * Connect to FTP server
   * @param {Object} credentials - FTP credentials (required)
   */
  async connect(credentials) {
    try {
      if (this.isConnected && this.client) {
        return this.client;
      }

      if (!credentials || !credentials.host || !credentials.user || !credentials.password) {
        throw new Error('FTP credentials are required and must include host, user, and password');
      }

      this.client = new ftp.Client(30000); // 30 second timeout
      
      // Enable debug logging in development
      if (config.nodeEnv === 'development') {
        this.client.ftp.verbose = true;
      }

      await this.client.access({
        host: credentials.host,
        port: credentials.port || 21,
        user: credentials.user,
        password: credentials.password,
        secure: credentials.secure || false
      });

      this.isConnected = true;
      this.currentConfig = credentials; // Store current config for later use
      
      logger.info('Connected to FTP server', { 
        host: credentials.host, 
        user: credentials.user 
      });

      return this.client;
    } catch (error) {
      logger.error('FTP connection failed', { 
        error: error.message,
        host: credentials?.host 
      });
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Disconnect from FTP server
   */
  async disconnect() {
    try {
      if (this.client) {
        this.client.close();
        this.client = null;
        this.isConnected = false;
        logger.info('Disconnected from FTP server');
      }
    } catch (error) {
      logger.error('FTP disconnect error', { error: error.message });
    }
  }

  /**
   * Ensure we're in the correct remote directory
   */
  async ensureRemoteDirectory() {
    try {
      const remotePath = this.currentConfig?.remotePath || '/ai_image';
      
      // Try to change to the directory
      try {
        await this.client.cd(remotePath);
        logger.info('Changed to remote directory', { remotePath });
      } catch (error) {
        // Directory might not exist, try to create it
        logger.info('Remote directory not found, attempting to create', { remotePath });
        
        // Go to root first
        await this.client.cd('/');
        
        // Create directory if it doesn't exist
        const dirName = remotePath.replace('/', '');
        try {
          await this.client.ensureDir(dirName);
          await this.client.cd(dirName);
          logger.info('Created and changed to remote directory', { remotePath });
        } catch (createError) {
          logger.error('Failed to create remote directory', { 
            remotePath, 
            error: createError.message 
          });
          throw createError;
        }
      }
    } catch (error) {
      logger.error('Failed to ensure remote directory', { 
        remotePath: this.currentConfig?.remotePath || '/ai_image',
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Upload file to 123RF with enhanced reliability using specific credentials
   * @param {string} localFilePath - Path to local file
   * @param {string} remoteFileName - Name for the file on the remote server
   * @param {Object} credentials - FTP credentials
   * @returns {Promise<Object>} Upload result
   */
  async uploadFileWithCredentials(localFilePath, remoteFileName, credentials) {
    try {
      // Enhanced file verification
      await this.verifyLocalFile(localFilePath);

      // Connect to FTP server with specific credentials
      await this.connect(credentials);

      // Ensure we're in the correct directory
      await this.ensureRemoteDirectory();

      // Get file stats
      const stats = fs.statSync(localFilePath);
      const fileSize = stats.size;

      logger.info('Starting enhanced FTP upload with credentials', {
        localFile: localFilePath,
        remoteFile: remoteFileName,
        fileSize,
        remotePath: credentials.remotePath,
        host: credentials.host
      });

      // Set binary mode explicitly for image files
      await this.client.ensureDir('.');
      await this.client.clearWorkingDir();
      
      // Force binary transfer mode
      this.client.ftp.binary = true;
      
      logger.info('Set binary transfer mode for image upload');

      // Upload the file with retry mechanism
      const startTime = Date.now();
      let uploadSuccess = false;
      let lastError = null;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          logger.info(`Upload attempt ${attempt}/3`, { remoteFileName });
          
          await this.client.uploadFrom(localFilePath, remoteFileName);
          
          // Verify upload by checking file size on remote server
          const remoteList = await this.client.list();
          const uploadedFile = remoteList.find(file => file.name === remoteFileName);
          
          if (uploadedFile && Math.abs(uploadedFile.size - fileSize) < 100) {
            logger.info('Upload verification successful', {
              localSize: fileSize,
              remoteSize: uploadedFile.size,
              sizeDifference: Math.abs(uploadedFile.size - fileSize)
            });
            uploadSuccess = true;
            break;
          } else {
            throw new Error(`Upload verification failed: size mismatch (local: ${fileSize}, remote: ${uploadedFile?.size || 'not found'})`);
          }
        } catch (attemptError) {
          lastError = attemptError;
          logger.warn(`Upload attempt ${attempt} failed`, {
            error: attemptError.message,
            willRetry: attempt < 3
          });
          
          if (attempt < 3) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      if (!uploadSuccess) {
        throw lastError || new Error('Upload failed after all attempts');
      }
      
      const uploadTime = Date.now() - startTime;

      const result = {
        success: true,
        localFile: localFilePath,
        remoteFile: remoteFileName,
        remotePath: credentials.remotePath,
        fileSize,
        uploadTime,
        attempts: uploadSuccess ? 1 : 3,
        timestamp: new Date().toISOString()
      };

      logger.info('Enhanced FTP upload with credentials completed successfully', result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        localFile: localFilePath,
        remoteFile: remoteFileName,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      logger.error('Enhanced FTP upload with credentials failed', errorResult);
      throw error;
    } finally {
      // Always disconnect after upload
      await this.disconnect();
    }
  }


  /**
   * Verify local file integrity before upload
   * @param {string} localFilePath - Path to local file
   */
  async verifyLocalFile(localFilePath) {
    try {
      // Check if file exists
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`Local file not found: ${localFilePath}`);
      }

      // Get file stats
      const stats = fs.statSync(localFilePath);
      
      // Check if file is not empty
      if (stats.size === 0) {
        throw new Error(`Local file is empty: ${localFilePath}`);
      }

      // Try to read first few bytes to ensure file is accessible
      const fileHandle = fs.openSync(localFilePath, 'r');
      const buffer = Buffer.alloc(Math.min(1024, stats.size));
      const bytesRead = fs.readSync(fileHandle, buffer, 0, buffer.length, 0);
      fs.closeSync(fileHandle);

      if (bytesRead === 0) {
        throw new Error(`Cannot read from local file: ${localFilePath}`);
      }

      // For JPEG files, verify magic bytes
      if (localFilePath.toLowerCase().endsWith('.jpg') || localFilePath.toLowerCase().endsWith('.jpeg')) {
        if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
          throw new Error(`File does not appear to be a valid JPEG: ${localFilePath}`);
        }
      }

      logger.info('Local file verification passed', {
        filePath: localFilePath,
        fileSize: stats.size,
        isJpeg: buffer[0] === 0xFF && buffer[1] === 0xD8
      });

    } catch (error) {
      logger.error('Local file verification failed', {
        filePath: localFilePath,
        error: error.message
      });
      throw error;
    }
  }


  /**
   * Upload image with metadata using specific credentials
   * @param {string} imagePath - Path to image file
   * @param {Object} metadata - Image metadata
   * @param {Object} credentials - FTP credentials
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadImageWithCredentials(imagePath, metadata = {}, credentials) {
    try {
      const { title, keywords, description } = metadata;
      
      // Generate filename based on metadata or use timestamp
      const fileExtension = path.extname(imagePath);
      const baseFileName = title 
        ? title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : `ai_image_${Date.now()}`;
      
      const remoteFileName = `${baseFileName}${fileExtension}`;

      // Upload the image with specific credentials
      const uploadResult = await this.uploadFileWithCredentials(imagePath, remoteFileName, credentials);

      // Add metadata to result
      const result = {
        ...uploadResult,
        metadata: {
          title: title || 'AI Generated Image',
          description: description || 'Generated using AI',
          keywords: keywords || ['ai', 'generated', 'image'],
          uploadedAt: new Date().toISOString()
        }
      };

      logger.info('Image uploaded with metadata using credentials', {
        remoteFile: remoteFileName,
        title,
        keywordsCount: keywords ? keywords.length : 0,
        host: credentials.host
      });

      return result;

    } catch (error) {
      logger.error('Image upload with metadata and credentials failed', { 
        imagePath,
        host: credentials?.host,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Test FTP connection
   * @param {Object} credentials - FTP credentials (required)
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(credentials) {
    try {
      if (!credentials) {
        throw new Error('FTP credentials are required for connection test');
      }

      await this.connect(credentials);
      
      // Try to list current directory
      const list = await this.client.list();
      
      await this.disconnect();

      return {
        success: true,
        message: 'FTP connection successful',
        host: credentials.host,
        user: credentials.user,
        directoryCount: list.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await this.disconnect();
      
      return {
        success: false,
        message: 'FTP connection failed',
        error: error.message,
        host: credentials?.host,
        timestamp: new Date().toISOString()
      };
    }
  }

}

module.exports = new FtpService();
