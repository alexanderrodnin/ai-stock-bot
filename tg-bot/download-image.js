const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

/**
 * Downloads an image from a URL and saves it to a temporary file
 * @param {string} url - The URL of the image to download
 * @returns {Promise<string>} - The path to the downloaded image
 */
async function downloadImage(url) {
  return new Promise((resolve, reject) => {
    // Generate a unique temp filename for the downloaded image
    const tempFilename = path.join(tempDir, `${uuidv4()}_temp.jpg`);
    // Generate a unique filename for the processed image
    const finalFilename = path.join(tempDir, `${uuidv4()}.jpg`);

    // Determine if we need http or https
    const protocol = url.startsWith('https') ? https : http;

    // Create a writable stream
    const file = fs.createWriteStream(tempFilename);

    const request = protocol.get(url, (response) => {
      // Check if the request was successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      // Pipe the response to the file
      response.pipe(file);

      // Handle file completion
      file.on('finish', () => {
        file.close();
        
        // Process the image with sharp to ensure valid dimensions
        // For 123RF, we need at least 4000x4000 pixels
        sharp(tempFilename)
          .resize({
            width: 4000,
            height: 4000,
            fit: 'inside',
            withoutEnlargement: false // Allow enlargement for smaller images
          })
          .jpeg({
            quality: 72,
            progressive: false, // Baseline JPEG for better compatibility
            mozjpeg: true // Better compression
          }) // Higher quality for stock photos
          .withMetadata() // Save metadata
          .toColorspace('srgb') // Force install sRGB
          .toFile(finalFilename)
          .then(() => {
            // Remove the temporary file
            fs.unlink(tempFilename, () => {});
            resolve(finalFilename);
          })
          .catch(err => {
            // If processing fails, try to use the original file
            console.error('Error processing image with sharp:', err);
            fs.rename(tempFilename, finalFilename, (renameErr) => {
              if (renameErr) {
                reject(renameErr);
                return;
              }
              resolve(finalFilename);
            });
          });
      });
    });

    // Handle request errors
    request.on('error', (err) => {
      fs.unlink(tempFilename, () => {}); // Delete the file if there's an error
      reject(err);
    });

    // Handle file errors
    file.on('error', (err) => {
      fs.unlink(tempFilename, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
}

/**
 * Cleans up temporary files older than the specified age
 * @param {number} maxAgeMs - Maximum age in milliseconds
 */
function cleanupTempFiles(maxAgeMs = 86400000) { // Default: 24 hours (increased from 1 hour)
  fs.readdir(tempDir, (err, files) => {
    if (err) {
      console.error('Error reading temp directory:', err);
      return;
    }
    
    const now = Date.now();
    
    files.forEach(file => {
      const filePath = path.join(tempDir, file);
      
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error(`Error getting stats for file ${filePath}:`, err);
          return;
        }
        
        // Check if the file is older than maxAgeMs
        if (now - stats.mtime.getTime() > maxAgeMs) {
          fs.unlink(filePath, err => {
            if (err) {
              console.error(`Error deleting file ${filePath}:`, err);
            }
          });
        }
      });
    });
  });
}

// Export the functions
module.exports = {
  downloadImage,
  cleanupTempFiles
};
