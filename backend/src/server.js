/**
 * AI Stock Bot Backend API Server
 * Main server entry point
 */

require('dotenv').config();
const app = require('./app');
const config = require('./config/config');
const connectDB = require('./config/database');
const logger = require('./utils/logger');
const imageService = require('./services/imageService');
const configService = require('./services/configService');

// Connect to MongoDB
connectDB();

// Initialize default configurations after database connection
setTimeout(async () => {
  try {
    await configService.initializeDefaultAIConfig();
    logger.info('Default AI configuration initialized');
  } catch (error) {
    logger.error('Failed to initialize default AI configuration', {
      error: error.message
    });
  }
}, 2000); // Wait 2 seconds for database connection to stabilize

// Clean up temporary files every 24 hours
setInterval(() => {
  logger.info('Cleaning up temporary image files...');
  imageService.cleanupTempFiles();
}, 86400000); // 24 hours

const PORT = config.port || 3000;

const server = app.listen(PORT, () => {
  logger.info(`🚀 AI Stock Bot API Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

module.exports = server;
