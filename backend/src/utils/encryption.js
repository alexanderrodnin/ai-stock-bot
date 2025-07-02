/**
 * Encryption utilities for sensitive data
 */

const crypto = require('crypto');
const config = require('../config/config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // For GCM, this is always 16
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const TAG_POSITION = SALT_LENGTH + IV_LENGTH;
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH;

class EncryptionService {
  constructor() {
    this.secretKey = config.encryption.secretKey;
    if (!this.secretKey) {
      throw new Error('Encryption secret key is not configured');
    }
  }

  /**
   * Encrypt a string value
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text in base64 format
   */
  encrypt(text) {
    if (!text) return null;

    try {
      // Generate random salt and IV
      const salt = crypto.randomBytes(SALT_LENGTH);
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Derive key from secret and salt
      const key = crypto.pbkdf2Sync(this.secretKey, salt, 100000, 32, 'sha256');
      
      // Create cipher
      const cipher = crypto.createCipherGCM(ALGORITHM, key, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the authentication tag
      const tag = cipher.getAuthTag();
      
      // Combine salt + iv + tag + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
      ]);
      
      return combined.toString('base64');
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt a string value
   * @param {string} encryptedData - Encrypted data in base64 format
   * @returns {string} - Decrypted text
   */
  decrypt(encryptedData) {
    if (!encryptedData) return null;

    try {
      // Convert from base64
      const combined = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = combined.subarray(0, SALT_LENGTH);
      const iv = combined.subarray(SALT_LENGTH, TAG_POSITION);
      const tag = combined.subarray(TAG_POSITION, ENCRYPTED_POSITION);
      const encrypted = combined.subarray(ENCRYPTED_POSITION);
      
      // Derive key from secret and salt
      const key = crypto.pbkdf2Sync(this.secretKey, salt, 100000, 32, 'sha256');
      
      // Create decipher
      const decipher = crypto.createDecipherGCM(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Hash a password using bcrypt-like approach
   * @param {string} password - Password to hash
   * @returns {string} - Hashed password
   */
  hashPassword(password) {
    if (!password) return null;

    try {
      const salt = crypto.randomBytes(32);
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
      
      return salt.toString('hex') + ':' + hash.toString('hex');
    } catch (error) {
      throw new Error(`Password hashing failed: ${error.message}`);
    }
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Password to verify
   * @param {string} hashedPassword - Hashed password to verify against
   * @returns {boolean} - True if password matches
   */
  verifyPassword(password, hashedPassword) {
    if (!password || !hashedPassword) return false;

    try {
      const [saltHex, hashHex] = hashedPassword.split(':');
      const salt = Buffer.from(saltHex, 'hex');
      const hash = Buffer.from(hashHex, 'hex');
      
      const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256');
      
      return crypto.timingSafeEqual(hash, verifyHash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a secure random token
   * @param {number} length - Length of the token in bytes
   * @returns {string} - Random token in hex format
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
}

// Export singleton instance
module.exports = new EncryptionService();
