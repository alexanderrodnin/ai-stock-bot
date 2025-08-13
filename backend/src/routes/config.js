/**
 * Configuration Routes
 * Routes for getting application configuration and feature flags
 */

const express = require('express');
const config = require('../config/config');
const configService = require('../services/configService');

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

/**
 * @route GET /api/config/ai-model/current
 * @desc Get current active AI model information
 * @access Public
 */
router.get('/ai-model/current', (req, res) => {
  try {
    const aiConfig = configService.getAIModelConfig();
    const activeModel = aiConfig.activeModel;
    const modelInfo = aiConfig.models[activeModel];

    if (!modelInfo) {
      return res.status(404).json({
        success: false,
        error: 'Active model not found',
        message: `Active model '${activeModel}' is not configured`
      });
    }

    res.json({
      success: true,
      data: {
        activeModel: activeModel,
        modelInfo: {
          provider: modelInfo.provider,
          description: modelInfo.description,
          enabled: modelInfo.enabled
        }
      }
    });
  } catch (error) {
    console.error('Error getting current AI model:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get current AI model',
      message: error.message
    });
  }
});

module.exports = router;
