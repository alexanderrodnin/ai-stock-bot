/**
 * Encryption utilities for sensitive data
 */

const crypto = require('crypto');
const config = require('../config/config');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

class EncryptionService {
  constructor() {
    this.secretKey = config.encryption.secretKey;
    if (!this.secretKey) {
      throw new Error('Encryption secret key is not configured');
    }
    // Ensure key is 32 bytes for AES-256
    this.key = crypto.createHash('sha256').update(this.secretKey).digest();
  }

  /**
   * Encrypt a string value
   * @param {string} text - Text to encrypt
   * @returns {string} - Encrypted text in base64 format
   */
  encrypt(text) {
    if (!text) return null;

    try {
      const iv = crypto.randomBytes(IV_LENGTH);
      const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Combine IV and encrypted data
      const combined = iv.toString('hex') + ':' + encrypted;
      
      return Buffer.from(combined).toString('base64');
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
      const combined = Buffer.from(encryptedData, 'base64').toString();
      const [ivHex, encrypted] = combined.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
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
