/**
 * Subscription Check Middleware
 * Middleware to verify user subscription status before image generation
 */

const User = require('../models/User');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has active subscription and remaining images
 */
const checkSubscription = async (req, res, next) => {
  try {
    // Extract userId from request body or params
    const userId = req.body.userId || req.params.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_USER_ID',
        message: 'User ID is required'
      });
    }

    // Find user
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'USER_NOT_FOUND',
        message: 'User not found'
      });
    }

    // Check if user has active subscription
    if (!user.subscription.isActive) {
      logger.info('User subscription not active', {
        userId,
        plan: user.subscription.plan,
        isActive: user.subscription.isActive
      });

      return res.status(403).json({
        success: false,
        error: 'SUBSCRIPTION_REQUIRED',
        message: 'Необходимо оплатить тариф для генерации изображений',
        data: {
          currentPlan: user.subscription.plan,
          isActive: user.subscription.isActive,
          imagesRemaining: user.subscription.imagesRemaining
        }
      });
    }

    // Check if user has remaining images
    if (user.subscription.imagesRemaining <= 0) {
      logger.info('User has no remaining images', {
        userId,
        plan: user.subscription.plan,
        imagesRemaining: user.subscription.imagesRemaining
      });

      return res.status(403).json({
        success: false,
        error: 'NO_IMAGES_REMAINING',
        message: 'У вас закончились изображения. Необходимо пополнить баланс.',
        data: {
          currentPlan: user.subscription.plan,
          isActive: user.subscription.isActive,
          imagesRemaining: user.subscription.imagesRemaining
        }
      });
    }

    // Add user to request object for use in controllers
    req.user = user;
    
    logger.debug('Subscription check passed', {
      userId,
      plan: user.subscription.plan,
      imagesRemaining: user.subscription.imagesRemaining
    });

    next();

  } catch (error) {
    logger.error('Error in subscription check middleware', {
      error: error.message,
      userId: req.body.userId || req.params.userId
    });

    res.status(500).json({
      success: false,
      error: 'SUBSCRIPTION_CHECK_FAILED',
      message: 'Failed to verify subscription status'
    });
  }
};

/**
 * Middleware to check subscription but allow free users (for backward compatibility)
 */
const checkSubscriptionSoft = async (req, res, next) => {
  try {
    const userId = req.body.userId || req.params.userId;
    
    if (!userId) {
      return next(); // Continue without user if no userId provided
    }

    const user = await User.findById(userId);
    
    if (!user) {
      return next(); // Continue without user if user not found
    }

    // Add user to request object
    req.user = user;

    // If user has active subscription, check remaining images
    if (user.subscription.isActive && user.subscription.imagesRemaining <= 0) {
      logger.info('User has active subscription but no remaining images', {
        userId,
        plan: user.subscription.plan,
        imagesRemaining: user.subscription.imagesRemaining
      });

      return res.status(403).json({
        success: false,
        error: 'NO_IMAGES_REMAINING',
        message: 'У вас закончились изображения. Необходимо пополнить баланс.',
        data: {
          currentPlan: user.subscription.plan,
          isActive: user.subscription.isActive,
          imagesRemaining: user.subscription.imagesRemaining
        }
      });
    }

    next();

  } catch (error) {
    logger.error('Error in soft subscription check middleware', {
      error: error.message,
      userId: req.body.userId || req.params.userId
    });

    // Continue on error for soft check
    next();
  }
};

/**
 * Middleware to decrement user's image count after successful generation
 */
const decrementImageCount = async (req, res, next) => {
  // Store original res.json to intercept response
  const originalJson = res.json;
  
  res.json = function(data) {
    // Check if response indicates successful image generation
    if (data && data.success && req.user && req.user.subscription.isActive) {
      // Decrement image count asynchronously
      User.findByIdAndUpdate(req.user._id, {
        $inc: { 'subscription.imagesRemaining': -1 },
        $set: { 'stats.lastActivity': new Date() }
      }).catch(error => {
        logger.error('Failed to decrement image count', {
          error: error.message,
          userId: req.user._id
        });
      });

      // Add transaction record
      const transaction = {
        type: 'debit',
        amount: 1,
        description: 'Генерация изображения',
        createdAt: new Date()
      };

      User.findByIdAndUpdate(req.user._id, {
        $push: { transactions: transaction }
      }).catch(error => {
        logger.error('Failed to add transaction record', {
          error: error.message,
          userId: req.user._id
        });
      });

      logger.info('Image count decremented', {
        userId: req.user._id,
        remainingImages: req.user.subscription.imagesRemaining - 1
      });
    }

    // Call original res.json
    originalJson.call(this, data);
  };

  next();
};

module.exports = {
  checkSubscription,
  checkSubscriptionSoft,
  decrementImageCount
};
