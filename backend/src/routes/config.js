/**
 * Configuration Routes
 * Routes for getting application configuration and feature flags
 */

const express = require('express');
const config = require('../config/config');

const router = express.Router();

/**
 * @route GET /api/config/features
 * @desc Get feature flags configuration
 * @access Public
 */
router.get('/features', (req, res) => {
  try {
    const features = {
      stocksEnabled: config.features.stocksEnabled
    };

    res.json({
      success: true,
      data: features
    });
  } catch (error) {
    console.error('Error getting feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get feature flags',
      message: error.message
    });
  }
});

module.exports = router;
