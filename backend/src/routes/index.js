/**
 * Main API Routes
 * Central routing configuration
 */

const express = require('express');
const imageRoutes = require('./images');
const uploadRoutes = require('./upload');
const userRoutes = require('./users');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'AI Stock Bot API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/images', imageRoutes);
router.use('/upload', uploadRoutes);
router.use('/users', userRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.status(200).json({
    name: 'AI Stock Bot API',
    version: '1.0.0',
    description: 'Backend API for AI-powered stock image generation and 123RF upload',
    endpoints: {
      health: 'GET /api/health',
      images: {
        generate: 'POST /api/images/generate',
        getUserImages: 'GET /api/images/:userId'
      },
      upload: {
        to123RF: 'POST /api/upload/123rf'
      },
      users: {
        getUser: 'GET /api/users/:id',
        createUser: 'POST /api/users'
      }
    },
    documentation: 'https://github.com/your-repo/ai-stock-bot/blob/main/backend-api/README.md'
  });
});

module.exports = router;
