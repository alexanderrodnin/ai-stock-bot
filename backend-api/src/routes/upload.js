/**
 * Upload Routes
 * Routes for uploading images to 123RF and other services
 */

const express = require('express');
const { body } = require('express-validator');
const uploadController = require('../controllers/uploadController');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Validation middleware for 123RF upload
const validate123RFUpload = [
  body('imageId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Image ID is required'),
  
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),
  
  body('title')
    .optional()
    .isString()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title must be between 1 and 200 characters'),
  
  body('description')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Description must be less than 1000 characters'),
  
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
    .withMessage('Category must be a string'),

  body('ftpCredentials')
    .optional()
    .isObject()
    .withMessage('FTP credentials must be an object'),

  body('ftpCredentials.host')
    .optional()
    .isString()
    .withMessage('FTP host is required'),

  body('ftpCredentials.user')
    .optional()
    .isString()
    .withMessage('FTP user is required'),

  body('ftpCredentials.password')
    .optional()
    .isString()
    .withMessage('FTP password is required')
];

// POST /api/upload/123rf - Upload image to 123RF via FTP
router.post('/123rf',
  uploadLimiter,
  validate123RFUpload,
  asyncHandler(uploadController.uploadTo123RF)
);

// POST /api/upload/validate - Validate image before upload
router.post('/validate',
  body('imageId').isString().withMessage('Image ID is required'),
  asyncHandler(uploadController.validateImage)
);

// GET /api/upload/status/:uploadId - Get upload status
router.get('/status/:uploadId',
  asyncHandler(uploadController.getUploadStatus)
);

// GET /api/upload/history/:userId - Get upload history for user
router.get('/history/:userId',
  asyncHandler(uploadController.getUploadHistory)
);

module.exports = router;
