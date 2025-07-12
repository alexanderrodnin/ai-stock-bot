/**
 * User Routes
 * Routes for user management and profile operations
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const userController = require('../controllers/userController');
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
    .isIn(['telegram', 'web', 'mobile', 'api', 'other'])
    .withMessage('Invalid external system'),
  
  body('profile')
    .optional()
    .isObject()
    .withMessage('Profile must be an object'),
  
  body('profile.username')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters'),
  
  body('profile.firstName')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('profile.lastName')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('profile.email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('profile.language')
    .optional()
    .isIn(['en', 'ru', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'])
    .withMessage('Invalid language code'),
  
  body('preferences')
    .optional()
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

const validateProfileUpdate = [
  body('username')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Username must be between 1 and 50 characters'),
  
  body('firstName')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('First name must be less than 100 characters'),
  
  body('lastName')
    .optional()
    .isString()
    .isLength({ max: 100 })
    .withMessage('Last name must be less than 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Invalid email format'),
  
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  
  body('language')
    .optional()
    .isIn(['en', 'ru', 'es', 'fr', 'de', 'it', 'pt', 'zh', 'ja', 'ko'])
    .withMessage('Invalid language code')
];

const validatePreferencesUpdate = [
  body('image')
    .optional()
    .isObject()
    .withMessage('Image preferences must be an object'),
  
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notification preferences must be an object'),
  
  body('upload')
    .optional()
    .isObject()
    .withMessage('Upload preferences must be an object')
];

const validateStockServiceSettings = [
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  
  body('credentials')
    .optional()
    .isObject()
    .withMessage('Credentials must be an object'),
  
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

const validateSubscriptionUpdate = [
  body('plan')
    .optional()
    .isIn(['free', 'basic', 'premium', 'enterprise'])
    .withMessage('Invalid subscription plan'),
  
  body('limits')
    .optional()
    .isObject()
    .withMessage('Limits must be an object'),
  
  body('limits.imagesPerDay')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Images per day must be a non-negative integer'),
  
  body('limits.imagesPerMonth')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Images per month must be a non-negative integer'),
  
  body('limits.uploadsPerDay')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Uploads per day must be a non-negative integer')
];

/**
 * @route   POST /api/users
 * @desc    Create or get user
 * @access  Public
 */
router.post('/', 
  validateUserCreation,
  asyncHandler(userController.createOrGetUser)
);

/**
 * @route   GET /api/users/:userId
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:userId', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
], asyncHandler(userController.getUserById));

/**
 * @route   GET /api/users/external/:externalId/:externalSystem
 * @desc    Get user by external ID
 * @access  Public
 */
router.get('/external/:externalId/:externalSystem', [
  param('externalId')
    .isString()
    .isLength({ min: 1 })
    .withMessage('External ID is required'),
  param('externalSystem')
    .isIn(['telegram', 'web', 'mobile', 'api', 'other'])
    .withMessage('Invalid external system')
], asyncHandler(userController.getUserByExternalId));

/**
 * @route   PUT /api/users/:userId/profile
 * @desc    Update user profile
 * @access  Public
 */
router.put('/:userId/profile', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  ...validateProfileUpdate
], asyncHandler(userController.updateUserProfile));

/**
 * @route   PUT /api/users/:userId/preferences
 * @desc    Update user preferences
 * @access  Public
 */
router.put('/:userId/preferences', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  ...validatePreferencesUpdate
], asyncHandler(userController.updateUserPreferences));

/**
 * @route   GET /api/users/:userId/stock-services
 * @desc    Get user stock service settings
 * @access  Public
 */
router.get('/:userId/stock-services', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
], asyncHandler(userController.getStockServiceSettings));

/**
 * @route   PUT /api/users/:userId/stock-services/:service
 * @desc    Update stock service settings
 * @access  Public
 */
router.put('/:userId/stock-services/:service', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  param('service')
    .isIn(['123rf', 'adobeStock', 'freepik', 'pixta'])
    .withMessage('Invalid stock service'),
  ...validateStockServiceSettings
], asyncHandler(userController.updateStockServiceSettings));

/**
 * @route   POST /api/users/:userId/stock-services/:service/test
 * @desc    Test stock service connection
 * @access  Public
 */
router.post('/:userId/stock-services/:service/test', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  param('service')
    .isIn(['123rf', 'adobeStock', 'freepik', 'pixta'])
    .withMessage('Invalid stock service')
], asyncHandler(userController.testStockServiceConnection));

/**
 * @route   DELETE /api/users/:userId/stock-services/:service
 * @desc    Delete stock service settings
 * @access  Public
 */
router.delete('/:userId/stock-services/:service', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  param('service')
    .isIn(['123rf', 'adobeStock', 'freepik', 'pixta'])
    .withMessage('Invalid stock service')
], asyncHandler(userController.deleteStockServiceSettings));

/**
 * @route   GET /api/users/:userId/stats
 * @desc    Get user statistics
 * @access  Public
 */
router.get('/:userId/stats', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
], asyncHandler(userController.getUserStats));

/**
 * @route   PUT /api/users/:userId/subscription
 * @desc    Update user subscription
 * @access  Public
 */
router.put('/:userId/subscription', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format'),
  ...validateSubscriptionUpdate
], asyncHandler(userController.updateUserSubscription));

/**
 * @route   DELETE /api/users/:userId
 * @desc    Delete user (soft delete)
 * @access  Public
 */
router.delete('/:userId', [
  param('userId')
    .isMongoId()
    .withMessage('Invalid user ID format')
], asyncHandler(userController.deleteUser));

/**
 * @route   GET /api/users/stats/system
 * @desc    Get system-wide user statistics (admin only)
 * @access  Admin
 */
router.get('/stats/system', 
  asyncHandler(userController.getSystemStats)
);

module.exports = router;
