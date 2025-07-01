/**
 * Rate Limiting Middleware
 * Protection against API abuse and DoS attacks
 */

const rateLimit = require('express-rate-limit');
const config = require('../config/config');
const logger = require('../utils/logger');

// Default rate limiter
const defaultLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: config.rateLimit.standardHeaders,
  legacyHeaders: config.rateLimit.legacyHeaders,
  
  message: {
    error: 'Too many requests',
    message: `Too many requests from this IP, please try again after ${config.rateLimit.windowMs / 1000 / 60} minutes.`,
    code: 'RATE_LIMIT_EXCEEDED',
    retryAfter: config.rateLimit.windowMs / 1000
  },

  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: {
        message: `Too many requests from this IP, please try again after ${config.rateLimit.windowMs / 1000 / 60} minutes.`,
        code: 'RATE_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
        retryAfter: config.rateLimit.windowMs / 1000
      }
    });
  },

  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Strict rate limiter for image generation (more resource intensive)
const imageGenerationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests per 5 minutes
  standardHeaders: true,
  legacyHeaders: false,
  
  message: {
    error: 'Image generation rate limit exceeded',
    message: 'Too many image generation requests. Please try again in 5 minutes.',
    code: 'IMAGE_GENERATION_LIMIT_EXCEEDED',
    retryAfter: 300
  },

  handler: (req, res) => {
    logger.warn('Image generation rate limit exceeded', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      prompt: req.body?.prompt?.substring(0, 100)
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many image generation requests. Please try again in 5 minutes.',
        code: 'IMAGE_GENERATION_LIMIT_EXCEEDED',
        timestamp: new Date().toISOString(),
        retryAfter: 300
      }
    });
  }
});

// Upload rate limiter
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20, // 20 uploads per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  
  message: {
    error: 'Upload rate limit exceeded',
    message: 'Too many upload requests. Please try again in 10 minutes.',
    code: 'UPLOAD_LIMIT_EXCEEDED',
    retryAfter: 600
  }
});

// Create account rate limiter (prevent spam account creation)
const createAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 account creations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  
  message: {
    error: 'Account creation rate limit exceeded',
    message: 'Too many accounts created from this IP. Please try again in 1 hour.',
    code: 'ACCOUNT_CREATION_LIMIT_EXCEEDED',
    retryAfter: 3600
  }
});

module.exports = {
  defaultLimiter,
  imageGenerationLimiter,
  uploadLimiter,
  createAccountLimiter
};
