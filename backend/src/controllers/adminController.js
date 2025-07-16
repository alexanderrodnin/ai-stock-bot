/**
 * Admin Controller
 * Handles administrative operations for configuration management
 */

const configService = require('../services/configService');
const logger = require('../utils/logger');

class AdminController {
  /**
   * Get current configuration
   * GET /api/admin/config
   */
  async getConfig(req, res) {
    try {
      const config = configService.getAIModelConfig();
      const metadata = configService.getConfigWithMetadata('ai_image_generation');

      res.json({
        success: true,
        data: {
          config,
          metadata: metadata ? {
            version: metadata.version,
            updatedAt: metadata.updatedAt,
            lastModified: metadata.lastModified
          } : null
        }
      });

    } catch (error) {
      logger.error('Failed to get admin config', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
        message: error.message
      });
    }
  }

  /**
   * Switch AI model
   * PUT /api/admin/config/model/:modelName
   */
  async switchModel(req, res) {
    try {
      const { modelName } = req.params;
      const { reason } = req.body;

      // Validate model name
      const validModels = ['dall-e-3', 'fast-flux-schnell'];
      if (!validModels.includes(modelName)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid model name',
          message: `Model must be one of: ${validModels.join(', ')}`
        });
      }

      // Prepare request metadata for audit logging
      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method
      };

      // Switch the model
      const newConfig = await configService.switchAIModel(
        modelName,
        'admin',
        reason || `Switched to ${modelName} via admin API`,
        requestMetadata
      );

      logger.info('AI model switched via admin API', {
        newModel: modelName,
        reason,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: `AI model switched to ${modelName}`,
        data: {
          activeModel: newConfig.activeModel,
          previousModel: req.body.previousModel || 'unknown',
          switchedAt: new Date().toISOString(),
          reason
        }
      });

    } catch (error) {
      logger.error('Failed to switch AI model', {
        modelName: req.params.modelName,
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(400).json({
        success: false,
        error: 'Failed to switch model',
        message: error.message
      });
    }
  }

  /**
   * Update configuration
   * PUT /api/admin/config
   */
  async updateConfig(req, res) {
    try {
      const { config, reason } = req.body;

      if (!config) {
        return res.status(400).json({
          success: false,
          error: 'Configuration data is required'
        });
      }

      // Validate configuration structure
      if (!config.activeModel || !config.models) {
        return res.status(400).json({
          success: false,
          error: 'Invalid configuration structure',
          message: 'Configuration must include activeModel and models'
        });
      }

      // Validate active model exists in models
      if (!config.models[config.activeModel]) {
        return res.status(400).json({
          success: false,
          error: 'Invalid active model',
          message: `Active model '${config.activeModel}' not found in models configuration`
        });
      }

      // Prepare request metadata for audit logging
      const requestMetadata = {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method
      };

      // Update configuration
      const updatedConfig = await configService.updateConfig(
        'ai_image_generation',
        config,
        'admin',
        reason || 'Configuration updated via admin API',
        requestMetadata
      );

      logger.info('Configuration updated via admin API', {
        activeModel: config.activeModel,
        reason,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        message: 'Configuration updated successfully',
        data: {
          config: updatedConfig.value,
          version: updatedConfig.metadata.version,
          updatedAt: updatedConfig.updatedAt
        }
      });

    } catch (error) {
      logger.error('Failed to update configuration', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(400).json({
        success: false,
        error: 'Failed to update configuration',
        message: error.message
      });
    }
  }

  /**
   * Get configuration audit logs
   * GET /api/admin/config/logs
   */
  async getConfigLogs(req, res) {
    try {
      const {
        configKey = 'ai_image_generation',
        limit = 50,
        skip = 0
      } = req.query;

      const logs = await configService.getConfigLogs(configKey, {
        limit: parseInt(limit),
        skip: parseInt(skip)
      });

      res.json({
        success: true,
        data: {
          logs,
          pagination: {
            limit: parseInt(limit),
            skip: parseInt(skip),
            total: logs.length
          }
        }
      });

    } catch (error) {
      logger.error('Failed to get configuration logs', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get configuration logs',
        message: error.message
      });
    }
  }

  /**
   * Force reload configuration
   * POST /api/admin/config/reload
   */
  async reloadConfig(req, res) {
    try {
      const { reason } = req.body;

      await configService.forceReload();

      logger.info('Configuration force reloaded via admin API', {
        reason,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      const currentConfig = configService.getAIModelConfig();

      res.json({
        success: true,
        message: 'Configuration reloaded successfully',
        data: {
          config: currentConfig,
          reloadedAt: new Date().toISOString(),
          reason: reason || 'Manual reload via admin API'
        }
      });

    } catch (error) {
      logger.error('Failed to reload configuration', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        error: 'Failed to reload configuration',
        message: error.message
      });
    }
  }

  /**
   * Get all configurations
   * GET /api/admin/configs
   */
  async getAllConfigs(req, res) {
    try {
      const allConfigs = configService.getAllConfigs();

      res.json({
        success: true,
        data: {
          configs: allConfigs,
          count: Object.keys(allConfigs).length,
          retrievedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get all configurations', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get configurations',
        message: error.message
      });
    }
  }

  /**
   * Get system status including AI providers
   * GET /api/admin/status
   */
  async getSystemStatus(req, res) {
    try {
      const aiConfig = configService.getAIModelConfig();
      
      // Get AI providers status
      const openaiStatus = {
        provider: 'openai',
        model: 'dall-e-3',
        configured: !!process.env.OPENAI_API_KEY,
        active: aiConfig.activeModel === 'dall-e-3'
      };

      const segmindStatus = {
        provider: 'segmind',
        model: 'fast-flux-schnell',
        configured: !!process.env.SEGMIND_API_KEY,
        active: aiConfig.activeModel === 'fast-flux-schnell'
      };

      res.json({
        success: true,
        data: {
          system: {
            status: 'running',
            uptime: process.uptime(),
            nodeVersion: process.version,
            environment: process.env.NODE_ENV || 'development'
          },
          configuration: {
            activeModel: aiConfig.activeModel,
            pollingEnabled: true,
            pollingInterval: 30000
          },
          providers: [openaiStatus, segmindStatus],
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Failed to get system status', {
        error: error.message,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get system status',
        message: error.message
      });
    }
  }

  /**
   * Health check endpoint
   * GET /api/admin/health
   */
  async healthCheck(req, res) {
    try {
      const aiConfig = configService.getAIModelConfig();
      
      res.json({
        success: true,
        status: 'healthy',
        data: {
          configService: 'running',
          activeModel: aiConfig.activeModel,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Health check failed', {
        error: error.message
      });

      res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}

module.exports = new AdminController();
