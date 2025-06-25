const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');

/**
 * Service for uploading images to 123RF via FTP
 */
class FtpService {
  /**
   * Create a new FTP service
   * @param {Object} options Configuration options
   * @param {string} options.host FTP host
   * @param {string} options.user FTP username
   * @param {string} options.password FTP password
   * @param {string} options.remoteDir Remote directory to upload to (default: /ai_image)
   */
  constructor(options = {}) {
    this.host = options.host;
    this.user = options.user;
    this.password = options.password;
    this.remoteDir = options.remoteDir || '/ai_image';
    
    // Normalize the remote directory path
    if (!this.remoteDir.startsWith('/')) {
      this.remoteDir = '/' + this.remoteDir;
    }
    
    // Validate required FTP credentials
    if (!this.host || !this.user || !this.password) {
      console.warn('Warning: FTP credentials are not fully provided. FTP uploads will not work.');
    }
  }

  /**
   * Upload an image to 123RF via FTP
   * @param {string} imagePath Path to the local image file
   * @returns {Promise<Object>} Result object with success status and message
   */
  async uploadImage(imagePath) {
    // Validate FTP credentials
    if (!this.host || !this.user || !this.password) {
      return {
        success: false,
        message: 'FTP credentials are not configured. Please check your .env file.'
      };
    }
    
    // Validate that the file exists
    if (!fs.existsSync(imagePath)) {
      return {
        success: false,
        message: `File ${imagePath} does not exist.`
      };
    }
    
    // Validate that the file is an image
    if (!this.isImageFile(imagePath)) {
      return {
        success: false,
        message: `File ${imagePath} is not a recognized image format.`
      };
    }
    
    const client = new ftp.Client();
    client.ftp.verbose = false; // Disable verbose logging
    
    try {
      // Connect to FTP server
      console.log(`Connecting to FTP server: ${this.host}`);
      await client.access({
        host: this.host,
        user: this.user,
        password: this.password,
        secure: false // Set to true if the server requires secure connection
      });
      
      console.log('Connected to FTP server');
      
      // Navigate to the remote directory
      console.log(`Navigating to directory: ${this.remoteDir}`);
      
      try {
        await client.cd(this.remoteDir);
      } catch (err) {
        console.error(`Error changing to directory ${this.remoteDir}: ${err.message}`);
        console.error('Using root directory as fallback');
      }
      
      // Get the current directory after navigation attempts
      const currentDir = await client.pwd();
      console.log(`Current remote directory: ${currentDir}`);
      
      // Upload the file
      const fileName = path.basename(imagePath);
      console.log(`Uploading ${fileName} to ${currentDir}...`);
      
      // Get file size for reporting
      const stats = fs.statSync(imagePath);
      const fileSize = this.formatFileSize(stats.size);
      
      // Upload the file
      await client.uploadFrom(imagePath, fileName);
      
      console.log(`Successfully uploaded ${fileName} (${fileSize}) to ${currentDir}`);
      
      return {
        success: true,
        message: `Successfully uploaded image to 123RF (${fileSize})`,
        directory: currentDir,
        fileName: fileName
      };
    } catch (err) {
      console.error(`FTP Error: ${err.message}`);
      return {
        success: false,
        message: `Failed to upload image to 123RF: ${err.message}`
      };
    } finally {
      client.close();
      console.log('FTP connection closed');
    }
  }
  
  /**
   * Check if a file is an image based on extension
   * @param {string} filePath Path to the file
   * @returns {boolean} True if the file is an image
   */
  isImageFile(filePath) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.bmp'];
    const ext = path.extname(filePath).toLowerCase();
    return imageExtensions.includes(ext);
  }
  
  /**
   * Format file size for display
   * @param {number} size File size in bytes
   * @returns {string} Formatted file size
   */
  formatFileSize(size) {
    let unit = 'B';
    if (size > 1024) {
      size = (size / 1024).toFixed(2);
      unit = 'KB';
    }
    if (size > 1024) {
      size = (size / 1024).toFixed(2);
      unit = 'MB';
    }
    return `${size} ${unit}`;
  }
  
  /**
   * Test the FTP connection
   * @returns {Promise<Object>} Result object with success status and message
   */
  async testConnection() {
    // Validate FTP credentials
    if (!this.host || !this.user || !this.password) {
      return {
        success: false,
        message: 'FTP credentials are not configured. Please check your .env file.'
      };
    }
    
    const client = new ftp.Client();
    client.ftp.verbose = false; // Disable verbose logging
    
    try {
      // Connect to FTP server
      console.log(`Testing connection to FTP server: ${this.host}`);
      await client.access({
        host: this.host,
        user: this.user,
        password: this.password,
        secure: false // Set to true if the server requires secure connection
      });
      
      console.log('Connected to FTP server');
      
      // Try to navigate to the remote directory
      console.log(`Testing navigation to directory: ${this.remoteDir}`);
      
      try {
        await client.cd(this.remoteDir);
        const currentDir = await client.pwd();
        console.log(`Successfully navigated to ${currentDir}`);
      } catch (err) {
        console.error(`Error changing to directory ${this.remoteDir}: ${err.message}`);
        return {
          success: false,
          message: `Failed to navigate to directory ${this.remoteDir}: ${err.message}`
        };
      }
      
      return {
        success: true,
        message: 'FTP connection test successful'
      };
    } catch (err) {
      console.error(`FTP Connection Error: ${err.message}`);
      return {
        success: false,
        message: `Failed to connect to FTP server: ${err.message}`
      };
    } finally {
      client.close();
      console.log('FTP connection closed');
    }
  }
}

module.exports = FtpService;
