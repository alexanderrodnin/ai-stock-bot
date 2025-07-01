/**
 * User Routes
 * Routes for user management
 */

const express = require('express');
const { body, param } = require('express-validator');
const userController = require('../controllers/userController');
const { createAccountLimiter } = require('../middleware/rateLimiter');
const { asyncHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Validation middleware for user creation
const validateUserCreation = [
  body('telegramId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('Telegram ID is required'),
  
  body('username')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters'),
  
  body('firstName')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  
  body('lastName')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

// Validation middleware for user update
const validateUserUpdate = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
  body('username')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters'),
  
  body('firstName')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  
  body('lastName')
    .optional()
    .isString()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Must be a valid email address'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object')
];

// POST /api/users - Create new user
router.post('/',
  createAccountLimiter,
  validateUserCreation,
  asyncHandler(userController.createUser)
);

// GET /api/users/:id - Get user by ID
router.get('/:id',
  param('id').isMongoId().withMessage('Invalid user ID'),
  asyncHandler(userController.getUserById)
);

// GET /api/users/telegram/:telegramId - Get user by Telegram ID
router.get('/telegram/:telegramId',
  param('telegramId').isString().withMessage('Invalid Telegram ID'),
  asyncHandler(userController.getUserByTelegramId)
);

// PUT /api/users/:id - Update user
router.put('/:id',
  validateUserUpdate,
  asyncHandler(userController.updateUser)
);

// DELETE /api/users/:id - Delete user
router.delete('/:id',
  param('id').isMongoId().withMessage('Invalid user ID'),
  asyncHandler(userController.deleteUser)
);

// GET /api/users/:id/stats - Get user statistics
router.get('/:id/stats',
  param('id').isMongoId().withMessage('Invalid user ID'),
  asyncHandler(userController.getUserStats)
);

module.exports = router;
