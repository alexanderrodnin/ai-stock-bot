/**
 * Image Routes
 * Routes for image generation and management
 */

const express = require('express');
const { body } = require('express-validator');
const imageController = require('../controllers/imageController');
const { imageGenerationLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Validation middleware for image generation
const validateImageGeneration = [
  body('prompt')
    .isString()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Prompt must be between 1 and 1000 characters'),
  
  body('userId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('User ID is required'),
  
  body('model')
    .optional()
    .isIn(['dall-e-3', 'dall-e-2'])
    .withMessage('Model must be either dall-e-3 or dall-e-2'),
  
  body('size')
    .optional()
    .isIn(['1024x1024', '1792x1024', '1024x1792'])
    .withMessage('Size must be 1024x1024, 1792x1024, or 1024x1792'),
  
  body('quality')
    .optional()
    .isIn(['standard', 'hd'])
    .withMessage('Quality must be standard or hd'),

  body('style')
    .optional()
    .isIn(['vivid', 'natural'])
    .withMessage('Style must be vivid or natural')
];

// POST /api/images/generate - Generate new image
router.post('/generate', 
  imageGenerationLimiter,
  validateImageGeneration,
  asyncHandler(imageController.generateImage)
);

// GET /api/images/:userId - Get user's image history
router.get('/:userId', 
  asyncHandler(imageController.getUserImages)
);

// GET /api/images/:userId/:imageId - Get specific image details
router.get('/:userId/:imageId',
  asyncHandler(imageController.getImageById)
);

// DELETE /api/images/:userId/:imageId - Delete image
router.delete('/:userId/:imageId',
  asyncHandler(imageController.deleteImage)
);

module.exports = router;
