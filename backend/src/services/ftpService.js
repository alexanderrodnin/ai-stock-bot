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
   */
  async connect() {
    try {
      if (this.isConnected && this.client) {
        return this.client;
      }

      if (!config.ftp.host || !config.ftp.user || !config.ftp.password) {
        throw new Error('FTP credentials not configured');
      }

      this.client = new ftp.Client(config.ftp.timeout);
      
      // Enable debug logging in development
      if (config.nodeEnv === 'development') {
        this.client.ftp.verbose = true;
      }

      await this.client.access({
        host: config.ftp.host,
        port: config.ftp.port,
        user: config.ftp.user,
        password: config.ftp.password,
        secure: config.ftp.secure
      });

      this.isConnected = true;
      logger.info('Connected to FTP server', { 
        host: config.ftp.host, 
        user: config.ftp.user 
      });

      return this.client;
    } catch (error) {
      logger.error('FTP connection failed', { 
        error: error.message,
        host: config.ftp.host 
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
      const remotePath = config.ftp.remotePath;
      
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
        remotePath: config.ftp.remotePath,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Upload file to 123RF with enhanced reliability
   * @param {string} localFilePath - Path to local file
   * @param {string} remoteFileName - Name for the file on the remote server
   * @returns {Promise<Object>} Upload result
   */
  async uploadFile(localFilePath, remoteFileName) {
    try {
      // Enhanced file verification
      await this.verifyLocalFile(localFilePath);

      // Connect to FTP server
      await this.connect();

      // Ensure we're in the correct directory
      await this.ensureRemoteDirectory();

      // Get file stats
      const stats = fs.statSync(localFilePath);
      const fileSize = stats.size;

      logger.info('Starting enhanced FTP upload', {
        localFile: localFilePath,
        remoteFile: remoteFileName,
        fileSize,
        remotePath: config.ftp.remotePath
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
        remotePath: config.ftp.remotePath,
        fileSize,
        uploadTime,
        attempts: uploadSuccess ? 1 : 3,
        timestamp: new Date().toISOString()
      };

      logger.info('Enhanced FTP upload completed successfully', result);
      return result;

    } catch (error) {
      const errorResult = {
        success: false,
        localFile: localFilePath,
        remoteFile: remoteFileName,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      logger.error('Enhanced FTP upload failed', errorResult);
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
   * Upload image with metadata
   * @param {string} imagePath - Path to image file
   * @param {Object} metadata - Image metadata
   * @returns {Promise<Object>} Upload result with metadata
   */
  async uploadImage(imagePath, metadata = {}) {
    try {
      const { title, keywords, description } = metadata;
      
      // Generate filename based on metadata or use timestamp
      const fileExtension = path.extname(imagePath);
      const baseFileName = title 
        ? title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : `ai_image_${Date.now()}`;
      
      const remoteFileName = `${baseFileName}${fileExtension}`;

      // Upload the image
      const uploadResult = await this.uploadFile(imagePath, remoteFileName);

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

      logger.info('Image uploaded with metadata', {
        remoteFile: remoteFileName,
        title,
        keywordsCount: keywords ? keywords.length : 0
      });

      return result;

    } catch (error) {
      logger.error('Image upload with metadata failed', { 
        imagePath,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Test FTP connection
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection() {
    try {
      await this.connect();
      
      // Try to list current directory
      const list = await this.client.list();
      
      await this.disconnect();

      return {
        success: true,
        message: 'FTP connection successful',
        host: config.ftp.host,
        user: config.ftp.user,
        directoryCount: list.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      await this.disconnect();
      
      return {
        success: false,
        message: 'FTP connection failed',
        error: error.message,
        host: config.ftp.host,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get remote directory listing
   * @returns {Promise<Array>} List of files in remote directory
   */
  async listRemoteFiles() {
    try {
      await this.connect();
      await this.ensureRemoteDirectory();
      
      const list = await this.client.list();
      await this.disconnect();

      const files = list.map(item => ({
        name: item.name,
        size: item.size,
        type: item.type,
        modifiedAt: item.modifiedAt,
        isDirectory: item.isDirectory
      }));

      logger.info('Retrieved remote file list', { 
        fileCount: files.length,
        remotePath: config.ftp.remotePath 
      });

      return files;

    } catch (error) {
      await this.disconnect();
      logger.error('Failed to list remote files', { error: error.message });
      throw error;
    }
  }
}

module.exports = new FtpService();
