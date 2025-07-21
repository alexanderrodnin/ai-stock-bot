/**
 * Configuration Service
 * Manages application configurations with polling mechanism
 */

const AppConfig = require('../models/AppConfig');
const ConfigAuditLog = require('../models/ConfigAuditLog');
const logger = require('../utils/logger');

class ConfigService {
  constructor() {
    this.cache = new Map();
    this.lastUpdate = new Date(0);
    this.pollingInterval = 30000; // 30 seconds
    this.isPolling = false;
    this.pollingTimer = null;
    
    // Initialize the service
    this.initialize();
  }

  /**
   * Initialize the configuration service
   */
  async initialize() {
    try {
      logger.info('Initializing ConfigService...');
      
      // Load initial configurations
      await this.loadAllConfigs();
      
      // Start polling for changes
      this.startPolling();
      
      logger.info('ConfigService initialized successfully', {
        cachedConfigs: this.cache.size,
        pollingInterval: this.pollingInterval
      });
    } catch (error) {
      logger.error('Failed to initialize ConfigService', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Load all active configurations into cache
   */
  async loadAllConfigs() {
    try {
      const configs = await AppConfig.getActiveConfigs();
      
      // Clear existing cache
      this.cache.clear();
      
      // Load configs into cache
      configs.forEach(config => {
        this.cache.set(config.configKey, {
          value: config.value,
          updatedAt: config.updatedAt,
          version: config.metadata.version
        });
      });
      
      // Update last update timestamp
      if (configs.length > 0) {
        const latestUpdate = Math.max(...configs.map(c => c.updatedAt.getTime()));
        this.lastUpdate = new Date(latestUpdate);
      }
      
      logger.info('Configurations loaded into cache', {
        configCount: configs.length,
        lastUpdate: this.lastUpdate
      });
      
    } catch (error) {
      logger.error('Failed to load configurations', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Start polling for configuration changes
   */
  startPolling() {
    if (this.isPolling) {
      logger.warn('Polling is already running');
      return;
    }

    this.isPolling = true;
    
    this.pollingTimer = setInterval(async () => {
      try {
        await this.checkForUpdates();
      } catch (error) {
        logger.error('Error during polling check', {
          error: error.message
        });
      }
    }, this.pollingInterval);

    logger.info('Configuration polling started', {
      interval: this.pollingInterval
    });
  }

  /**
   * Stop polling for configuration changes
   */
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    
    this.isPolling = false;
    logger.info('Configuration polling stopped');
  }

  /**
   * Check for configuration updates
   */
  async checkForUpdates() {
    try {
      // Find configurations updated since last check
      const updatedConfigs = await AppConfig.find({
        isActive: true,
        updatedAt: { $gt: this.lastUpdate }
      }).sort({ updatedAt: 1 });

      if (updatedConfigs.length > 0) {
        logger.info('Found configuration updates', {
          updateCount: updatedConfigs.length,
          lastUpdate: this.lastUpdate
        });

        // Update cache with new configurations
        updatedConfigs.forEach(config => {
          const oldValue = this.cache.get(config.configKey);
          
          this.cache.set(config.configKey, {
            value: config.value,
            updatedAt: config.updatedAt,
            version: config.metadata.version
          });

          logger.info('Configuration updated in cache', {
            configKey: config.configKey,
            oldVersion: oldValue?.version,
            newVersion: config.metadata.version,
            modifiedBy: config.metadata.modifiedBy
          });
        });

        // Update last update timestamp
        const latestUpdate = Math.max(...updatedConfigs.map(c => c.updatedAt.getTime()));
        this.lastUpdate = new Date(latestUpdate);

        // Emit configuration change events if needed
        this.emitConfigurationChanges(updatedConfigs);
      }
    } catch (error) {
      logger.error('Failed to check for configuration updates', {
        error: error.message
      });
    }
  }

  /**
   * Emit configuration change events
   */
  emitConfigurationChanges(updatedConfigs) {
    updatedConfigs.forEach(config => {
      // Special handling for AI image generation config
      if (config.configKey === 'ai_image_generation') {
        logger.info('AI Image Generation model switched', {
          activeModel: config.value.activeModel,
          timestamp: new Date(),
          triggeredBy: 'config_polling',
          version: config.metadata.version
        });
      }
    });
  }

  /**
   * Get configuration value by key
   */
  getConfig(configKey) {
    const config = this.cache.get(configKey);
    return config ? config.value : null;
  }

  /**
   * Get configuration with metadata
   */
  getConfigWithMetadata(configKey) {
    return this.cache.get(configKey) || null;
  }

  /**
   * Get all cached configurations
   */
  getAllConfigs() {
    const configs = {};
    this.cache.forEach((value, key) => {
      configs[key] = value.value;
    });
    return configs;
  }

  /**
   * Update configuration value
   */
  async updateConfig(configKey, newValue, modifiedBy = 'admin', reason = null, requestMetadata = {}) {
    try {
      // Find existing configuration
      let config = await AppConfig.findByKey(configKey);
      const oldValue = config ? config.value : null;

      if (config) {
        // Update existing configuration
        await config.updateValue(newValue, modifiedBy);
        
        // Log the change
        await ConfigAuditLog.logChange({
          configKey,
          action: 'UPDATE',
          oldValue,
          newValue,
          changedBy: modifiedBy,
          requestMetadata,
          reason
        });

        logger.info('Configuration updated', {
          configKey,
          modifiedBy,
          version: config.metadata.version
        });
      } else {
        // Create new configuration
        config = new AppConfig({
          configKey,
          configType: 'system',
          isActive: true,
          value: newValue,
          metadata: {
            description: `Configuration for ${configKey}`,
            modifiedBy
          }
        });

        await config.save();

        // Log the creation
        await ConfigAuditLog.logChange({
          configKey,
          action: 'CREATE',
          oldValue: null,
          newValue,
          changedBy: modifiedBy,
          requestMetadata,
          reason
        });

        logger.info('Configuration created', {
          configKey,
          modifiedBy
        });
      }

      // Force immediate cache update
      this.cache.set(configKey, {
        value: config.value,
        updatedAt: config.updatedAt,
        version: config.metadata.version
      });

      this.lastUpdate = config.updatedAt;

      return config;
    } catch (error) {
      logger.error('Failed to update configuration', {
        configKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Force reload all configurations
   */
  async forceReload() {
    try {
      logger.info('Force reloading all configurations');
      await this.loadAllConfigs();
      return true;
    } catch (error) {
      logger.error('Failed to force reload configurations', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get configuration audit logs
   */
  async getConfigLogs(configKey = null, options = {}) {
    try {
      if (configKey) {
        return await ConfigAuditLog.findByConfigKey(configKey, options);
      } else {
        return await ConfigAuditLog.getRecentChanges(options.limit || 50);
      }
    } catch (error) {
      logger.error('Failed to get configuration logs', {
        configKey,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Initialize default AI image generation configuration
   */
  async initializeDefaultAIConfig() {
    try {
      const existingConfig = await AppConfig.findByKey('ai_image_generation');
      
      if (!existingConfig) {
        const defaultConfig = {
          activeModel: 'juggernaut-pro-flux',
          models: {
            'dall-e-3': {
              enabled: true,
              provider: 'openai',
              description: 'OpenAI DALL-E 3 - High quality image generation'
            },
            'juggernaut-pro-flux': {
              enabled: true,
              provider: 'segmind',
              description: 'Juggernaut Pro Flux - Professional quality realistic images'
            },
            'seedream-v3': {
              enabled: true,
              provider: 'segmind',
              description: 'Seedream V3 - Artistic and creative image generation'
            },
            'hidream-i1-fast': {
              enabled: true,
              provider: 'segmind',
              description: 'HiDream-I1 Fast - Quick high-quality image generation'
            }
          }
        };

        await this.updateConfig(
          'ai_image_generation',
          defaultConfig,
          'system',
          'Initial AI image generation configuration with new models'
        );

        logger.info('Default AI image generation configuration created with new models');
      } else {
        // Update existing config to include new models if they don't exist
        const currentConfig = existingConfig.value;
        let needsUpdate = false;
        
        const newModels = {
          'juggernaut-pro-flux': {
            enabled: true,
            provider: 'segmind',
            description: 'Juggernaut Pro Flux - Professional quality realistic images'
          },
          'seedream-v3': {
            enabled: true,
            provider: 'segmind',
            description: 'Seedream V3 - Artistic and creative image generation'
          },
          'hidream-i1-fast': {
            enabled: true,
            provider: 'segmind',
            description: 'HiDream-I1 Fast - Quick high-quality image generation'
          }
        };

        // Add new models if they don't exist
        for (const [modelName, modelConfig] of Object.entries(newModels)) {
          if (!currentConfig.models[modelName]) {
            currentConfig.models[modelName] = modelConfig;
            needsUpdate = true;
            logger.info(`Added new AI model to config: ${modelName}`);
          }
        }

        // Remove deprecated fast-flux-schnell model
        if (currentConfig.models['fast-flux-schnell']) {
          delete currentConfig.models['fast-flux-schnell'];
          needsUpdate = true;
          logger.info('Removed deprecated model: fast-flux-schnell');
          
          // If active model was the deprecated one, switch to default
          if (currentConfig.activeModel === 'fast-flux-schnell') {
            currentConfig.activeModel = 'dall-e-3';
            logger.info('Switched active model from deprecated fast-flux-schnell to dall-e-3');
          }
        }

        if (needsUpdate) {
          await this.updateConfig(
            'ai_image_generation',
            currentConfig,
            'system',
            'Updated AI models configuration - added new models and removed deprecated ones'
          );
          logger.info('AI image generation configuration updated with new models');
        } else {
          logger.info('AI image generation configuration is up to date');
        }
      }
    } catch (error) {
      logger.error('Failed to initialize default AI config', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get current AI model configuration
   */
  getAIModelConfig() {
    const config = this.getConfig('ai_image_generation');
    return config || {
      activeModel: 'juggernaut-pro-flux',
      models: {
        'dall-e-3': {
          enabled: true,
          provider: 'openai',
          description: 'OpenAI DALL-E 3 - High quality image generation'
        },
        'juggernaut-pro-flux': {
          enabled: true,
          provider: 'segmind',
          description: 'Juggernaut Pro Flux - Professional quality realistic images'
        },
        'seedream-v3': {
          enabled: true,
          provider: 'segmind',
          description: 'Seedream V3 - Artistic and creative image generation'
        },
        'hidream-i1-fast': {
          enabled: true,
          provider: 'segmind',
          description: 'HiDream-I1 Fast - Quick high-quality image generation'
        }
      }
    };
  }

  /**
   * Switch AI model
   */
  async switchAIModel(modelName, modifiedBy = 'admin', reason = null, requestMetadata = {}) {
    try {
      const currentConfig = this.getAIModelConfig();
      
      // Validate model exists
      if (!currentConfig.models[modelName]) {
        throw new Error(`Model '${modelName}' is not configured`);
      }

      // Validate model is enabled
      if (!currentConfig.models[modelName].enabled) {
        throw new Error(`Model '${modelName}' is not enabled`);
      }

      // Update active model
      const newConfig = {
        ...currentConfig,
        activeModel: modelName
      };

      await this.updateConfig(
        'ai_image_generation',
        newConfig,
        modifiedBy,
        reason || `Switched to ${modelName}`,
        requestMetadata
      );

      logger.info('AI model switched successfully', {
        from: currentConfig.activeModel,
        to: modelName,
        modifiedBy
      });

      return newConfig;
    } catch (error) {
      logger.error('Failed to switch AI model', {
        modelName,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Cleanup method for graceful shutdown
   */
  cleanup() {
    this.stopPolling();
    this.cache.clear();
    logger.info('ConfigService cleaned up');
  }
}

// Create singleton instance
const configService = new ConfigService();

// Graceful shutdown handling
process.on('SIGINT', () => {
  configService.cleanup();
});

process.on('SIGTERM', () => {
  configService.cleanup();
});

module.exports = configService;
