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
  body('externalId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('External ID is required'),
  
  body('externalSystem')
    .optional()
    .isString()
    .isIn(['telegram', 'web', 'mobile', 'api', 'other'])
    .withMessage('External system must be one of: telegram, web, mobile, api, other'),
  
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
    .withMessage('Preferences must be an object'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
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

// GET /api/users - Get all users with pagination
router.get('/',
  asyncHandler(userController.getAllUsers)
);

// POST /api/users - Create new user
router.post('/',
  createAccountLimiter,
  validateUserCreation,
  asyncHandler(userController.createUser)
);

// GET /api/users/external/:externalSystem/:externalId - Get user by External ID (must be before /:id)
router.get('/external/:externalSystem/:externalId',
  param('externalSystem').isString().isIn(['telegram', 'web', 'mobile', 'api', 'other']).withMessage('Invalid external system'),
  param('externalId').isString().withMessage('Invalid external ID'),
  asyncHandler(userController.getUserByExternalId)
);

// GET /api/users/:id/stats - Get user statistics (must be before /:id)
router.get('/:id/stats',
  param('id').isMongoId().withMessage('Invalid user ID'),
  asyncHandler(userController.getUserStats)
);

// GET /api/users/:id - Get user by ID
router.get('/:id',
  param('id').isMongoId().withMessage('Invalid user ID'),
  asyncHandler(userController.getUserById)
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

module.exports = router;
