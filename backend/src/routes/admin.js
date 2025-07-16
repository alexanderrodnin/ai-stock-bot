/**
 * Admin Routes
 * Routes for administrative operations and configuration management
 */

const express = require('express');
const adminController = require('../controllers/adminController');
const logger = require('../utils/logger');

const router = express.Router();

// Middleware for logging admin API requests
router.use((req, res, next) => {
  logger.info('Admin API request', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
router.get('/health', adminController.healthCheck);

// System status endpoint
router.get('/status', adminController.getSystemStatus);

// Configuration management routes
router.get('/config', adminController.getConfig);
router.put('/config', adminController.updateConfig);
router.post('/config/reload', adminController.reloadConfig);

// Model switching route
router.put('/config/model/:modelName', adminController.switchModel);

// Configuration audit logs
router.get('/config/logs', adminController.getConfigLogs);

// Get all configurations
router.get('/configs', adminController.getAllConfigs);

// Error handling middleware for admin routes
router.use((error, req, res, next) => {
  logger.error('Admin API error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(error.status || 500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
