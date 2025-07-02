/**
 * Upload Routes
 * Routes for stock service uploads and management
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const uploadController = require('../controllers/uploadController');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Validation middleware for upload requests
const validateUploadRequest = [
  body('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('title')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .isString()
    .isLength({ max: 2000 })
    .withMessage('Description must be less than 2000 characters'),
  
  body('keywords')
    .optional()
    .isArray()
    .withMessage('Keywords must be an array'),
  
  body('keywords.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each keyword must be between 1 and 50 characters'),
  
  body('category')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Category must be less than 100 characters')
];

const validate123RFUpload = [
  ...validateUploadRequest,
  body('pricing')
    .optional()
    .isIn(['standard', 'premium', 'exclusive'])
    .withMessage('Pricing must be standard, premium, or exclusive')
];

const validateGenericUpload = [
  body('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

const validateBatchUpload = [
  body('imageIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('Image IDs must be an array with 1-50 items'),
  
  body('imageIds.*')
    .isMongoId()
    .withMessage('Each image ID must be valid'),
  
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

const validateRetryRequest = [
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

const validateTestConnection = [
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

const validateCancelUpload = [
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
];

/**
 * @route   POST /api/upload/123rf
 * @desc    Upload image to 123RF
 * @access  Public
 */
router.post('/123rf', 
  uploadLimiter,
  validate123RFUpload,
  asyncHandler(uploadController.uploadTo123RF)
);

/**
 * @route   POST /api/upload/shutterstock
 * @desc    Upload image to Shutterstock
 * @access  Public
 */
router.post('/shutterstock', 
  uploadLimiter,
  validateUploadRequest,
  asyncHandler(uploadController.uploadToShutterstock)
);

/**
 * @route   POST /api/upload/adobe-stock
 * @desc    Upload image to Adobe Stock
 * @access  Public
 */
router.post('/adobe-stock', 
  uploadLimiter,
  validateUploadRequest,
  asyncHandler(uploadController.uploadToAdobeStock)
);

/**
 * @route   POST /api/upload/:service
 * @desc    Generic upload to any stock service
 * @access  Public
 */
router.post('/:service', [
  param('service')
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  uploadLimiter,
  ...validateGenericUpload
], asyncHandler(uploadController.uploadToService));

/**
 * @route   POST /api/upload/batch/:service
 * @desc    Batch upload multiple images to a stock service
 * @access  Public
 */
router.post('/batch/:service', [
  param('service')
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  uploadLimiter,
  ...validateBatchUpload
], asyncHandler(uploadController.batchUploadToService));

/**
 * @route   GET /api/upload/status/:imageId
 * @desc    Get upload status for an image
 * @access  Public
 */
router.get('/status/:imageId', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  query('userId')
    .isMongoId()
    .withMessage('User ID is required')
], asyncHandler(uploadController.getUploadStatus));

/**
 * @route   POST /api/upload/retry/:imageId/:service
 * @desc    Retry failed upload
 * @access  Public
 */
router.post('/retry/:imageId/:service', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  param('service')
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  ...validateRetryRequest
], asyncHandler(uploadController.retryUpload));

/**
 * @route   POST /api/upload/test/:service
 * @desc    Test stock service connection
 * @access  Public
 */
router.post('/test/:service', [
  param('service')
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  ...validateTestConnection
], asyncHandler(uploadController.testServiceConnection));

/**
 * @route   GET /api/upload/stats/:userId
 * @desc    Get upload statistics for user
 * @access  Public
 */
router.get('/stats/:userId', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  query('service')
    .optional()
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  query('timeframe')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Timeframe must be 7d, 30d, or 90d')
], asyncHandler(uploadController.getUploadStats));

/**
 * @route   DELETE /api/upload/:imageId/:service
 * @desc    Cancel pending upload
 * @access  Public
 */
router.delete('/:imageId/:service', [
  param('imageId')
    .isMongoId()
    .withMessage('Invalid image ID format'),
  param('service')
    .isIn(['123rf', 'shutterstock', 'adobeStock'])
    .withMessage('Invalid stock service'),
  ...validateCancelUpload
], asyncHandler(uploadController.cancelUpload));

module.exports = router;
