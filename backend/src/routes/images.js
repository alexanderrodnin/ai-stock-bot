/**
 * Image Routes
 * Routes for image generation and management
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const imageController = require('../controllers/imageController');
const { imageGenerationLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');
const { checkSubscriptionSoft, decrementImageCount } = require('../middleware/subscriptionCheck');

const router = express.Router();

// Validation middleware for image generation
const validateImageGeneration = [
  body('prompt')
    .isString()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Prompt must be between 1 and 4000 characters'),
  
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),

  body('userExternalId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User external ID is required'),
  
  body('userExternalSystem')
    .optional()
    .isIn(['telegram', 'web', 'mobile', 'api', 'other'])
    .withMessage('Invalid external system'),
  
  body('model')
    .optional()
    .isIn(['dall-e-3', 'dall-e-2'])
    .withMessage('Model must be either dall-e-3 or dall-e-2'),
  
  body('size')
    .optional()
    .isIn(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792'])
    .withMessage('Invalid image size'),
  
  body('quality')
    .optional()
    .isIn(['standard', 'hd'])
    .withMessage('Quality must be standard or hd'),

  body('style')
    .optional()
    .isIn(['vivid', 'natural'])
    .withMessage('Style must be vivid or natural')
];

const validateImageMetadata = [
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),
  
  body('title')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Title must be less than 200 characters'),
  
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  
  body('category')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters')
];

const validateUploadSettings = [
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

/**
 * @route   POST /api/images/generate
 * @desc    Generate a new image using AI
 * @access  Public
 */
router.post('/generate', 
  // imageGenerationLimiter, // Temporarily disabled for testing
  validateImageGeneration,
  checkSubscriptionSoft,
  decrementImageCount,
  asyncHandler(imageController.generateImage)
);

/**
 * @route   GET /api/images/user/:userId
 * @desc    Get user's image history
 * @access  Public
 */
router.get('/user/:userId', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['active', 'archived', 'deleted'])
    .withMessage('Invalid status'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'views', 'downloads'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
], asyncHandler(imageController.getUserImages));

/**
 * @route   GET /api/images/external/:externalId/:externalSystem
 * @desc    Get images by external user ID
 * @access  Public
 */
router.get('/external/:externalId/:externalSystem', [
  param('externalId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('External ID is required'),
  param('externalSystem')
    .isIn(['telegram', 'web', 'mobile', 'api', 'other'])
    .withMessage('Invalid external system'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
], asyncHandler(imageController.getImagesByExternalUser));

/**
 * @route   GET /api/images/:imageId
 * @desc    Get specific image by ID
 * @access  Public
 */
router.get('/:imageId', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format')
], asyncHandler(imageController.getImageById));

/**
 * @route   GET /api/images/:imageId/file
 * @desc    Serve image file
 * @access  Public
 */
router.get('/:imageId/file', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format')
], asyncHandler(imageController.serveImageFile));

/**
 * @route   GET /api/images/:imageId/stream
 * @desc    Stream image file for telegram bot
 * @access  Public
 */
router.get('/:imageId/stream', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  query('userId')
    .optional()
    .isMongoId()
    .withMessage('Invalid user ID format')
], asyncHandler(imageController.streamImageFile));


/**
 * @route   PUT /api/images/:imageId/metadata
 * @desc    Update image metadata
 * @access  Public
 */
router.put('/:imageId/metadata', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  ...validateImageMetadata
], asyncHandler(imageController.updateImageMetadata));

/**
 * @route   DELETE /api/images/:imageId
 * @desc    Delete image
 * @access  Public
 */
router.delete('/:imageId', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required')
], asyncHandler(imageController.deleteImage));

/**
 * @route   POST /api/images/:imageId/upload/:service
 * @desc    Upload image to stock service
 * @access  Public
 */
router.post('/:imageId/upload/:service', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  param('service')
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  ...validateUploadSettings
], asyncHandler(imageController.uploadToStockService));

/**
 * @route   GET /api/images/:imageId/uploads
 * @desc    Get upload status for image
 * @access  Public
 */
router.get('/:imageId/uploads', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  query('userId')
    .isMongoId()
    .withMessage('User ID is required')
], asyncHandler(imageController.getUploadStatus));

/**
 * @route   POST /api/images/:imageId/retry/:service
 * @desc    Retry failed upload
 * @access  Public
 */
router.post('/:imageId/retry/:service', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  param('service')
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required')
], asyncHandler(imageController.retryUpload));

module.exports = router;
