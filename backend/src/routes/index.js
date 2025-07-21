/**
 * Main API Routes
 * Central routing configuration
 */

const express = require('express');
const imageRoutes = require('./images');
const uploadRoutes = require('./upload');
const userRoutes = require('./users');
const adminRoutes = require('./admin');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AI Stock Bot API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
router.use('/images', imageRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    name: 'AI Stock Bot API',
    version: '1.0.0',
    description: 'Backend API for AI-powered stock image generation and stock service uploads',
    features: [
      'AI image generation using OpenAI DALL-E',
      'Multi-platform user management (Telegram, Web, Mobile)',
      'Stock service integrations (123RF, Shutterstock, Adobe Stock)',
      'Image metadata management',
      'Upload tracking and retry mechanisms',
      'User preferences and subscription management'
    ],
    endpoints: {
      health: 'GET /api/health',
      images: {
        generate: 'POST /api/images/generate',
        getUserImages: 'GET /api/images/user/:userId',
        getByExternalUser: 'GET /api/images/external/:externalId/:externalSystem',
        getById: 'GET /api/images/:imageId',
        serveFile: 'GET /api/images/:imageId/file',
        serveThumbnail: 'GET /api/images/:imageId/thumbnail',
        updateMetadata: 'PUT /api/images/:imageId/metadata',
        delete: 'DELETE /api/images/:imageId',
        uploadToStock: 'POST /api/images/:imageId/upload/:service',
        getUploads: 'GET /api/images/:imageId/uploads',
        retryUpload: 'POST /api/images/:imageId/retry/:service'
      },
      upload: {
        to123RF: 'POST /api/upload/123rf',
        toShutterstock: 'POST /api/upload/shutterstock',
        toAdobeStock: 'POST /api/upload/adobe-stock',
        generic: 'POST /api/upload/:service',
        batch: 'POST /api/upload/batch/:service',
        getStatus: 'GET /api/upload/status/:imageId',
        retry: 'POST /api/upload/retry/:imageId/:service',
        testConnection: 'POST /api/upload/test/:service',
        getStats: 'GET /api/upload/stats/:userId',
        cancel: 'DELETE /api/upload/:imageId/:service'
      },
      users: {
        createOrGet: 'POST /api/users',
        getById: 'GET /api/users/:userId',
        getByExternal: 'GET /api/users/external/:externalId/:externalSystem',
        updateProfile: 'PUT /api/users/:userId/profile',
        updatePreferences: 'PUT /api/users/:userId/preferences',
        getStockServices: 'GET /api/users/:userId/stock-services',
        updateStockService: 'PUT /api/users/:userId/stock-services/:service',
        deleteStockService: 'DELETE /api/users/:userId/stock-services/:service',
        testStockService: 'POST /api/users/:userId/stock-services/:service/test',
        getStats: 'GET /api/users/:userId/stats',
        updateSubscription: 'PUT /api/users/:userId/subscription',
        delete: 'DELETE /api/users/:userId',
        getSystemStats: 'GET /api/users/stats/system'
      }
    },
    supportedServices: [
      '123rf',
      'shutterstock',
      'adobeStock'
    ],
    supportedExternalSystems: [
      'telegram',
      'web',
      'mobile',
      'api',
      'other'
    ],
    documentation: 'https://github.com/your-repo/ai-stock-bot/blob/main/backend/README.md'
  });
});

module.exports = router;
