/**
 * Application Configuration
 * Centralized configuration management
 */

require('dotenv').config();

const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-stock-bot',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    timeout: parseInt(process.env.OPENAI_TIMEOUT) || 60000,
    models: {
      dalle3: 'dall-e-3',
      dalle2: 'dall-e-2'
    }
  },

  // Segmind configuration
  segmind: {
    apiKey: process.env.SEGMIND_API_KEY,
    baseURL: process.env.SEGMIND_BASE_URL || 'https://api.segmind.com/v1',
    timeout: parseInt(process.env.SEGMIND_TIMEOUT) || 120000,
    models: {
      juggernautProFlux: 'juggernaut-pro-flux',
      seedreamV3: 'seedream-v3',
      hiDreamI1Fast: 'hidream-i1-fast'
    }
  },

  // 123RF FTP configuration
  ftp: {
    host: process.env.FTP_HOST,
    port: parseInt(process.env.FTP_PORT) || 21,
    user: process.env.FTP_USER,
    password: process.env.FTP_PASSWORD,
    remotePath: process.env.FTP_REMOTE_PATH || '/ai_image',
    secure: process.env.FTP_SECURE === 'true',
    timeout: parseInt(process.env.FTP_TIMEOUT) || 30000
  },

  // File storage configuration
  storage: {
    tempDir: process.env.TEMP_DIR || './temp',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || 24 * 60 * 60 * 1000 // 24 hours
  },

  // Rate limiting configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per window
    standardHeaders: true,
    legacyHeaders: false
  },

  // CORS configuration
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001']
  },

  // External image sources (fallback)
  externalImages: {
    unsplash: {
      accessKey: process.env.UNSPLASH_ACCESS_KEY,
      baseUrl: 'https://api.unsplash.com'
    },
    pixabay: {
      apiKey: process.env.PIXABAY_API_KEY,
      baseUrl: 'https://pixabay.com/api'
    }
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined'
  },

  // Security configuration
  security: {
    apiKeyHeader: 'X-API-Key',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    jwtExpiration: process.env.JWT_EXPIRATION || '24h'
  },

  // Encryption configuration
  encryption: {
    secretKey: process.env.ENCRYPTION_SECRET_KEY || process.env.JWT_SECRET || 'your-encryption-secret-key'
  },

  // AI Models configuration
  aiModels: {
    // Default AI model (changed from dall-e-3 to juggernaut-pro-flux)
    defaultModel: process.env.DEFAULT_AI_MODEL || 'juggernaut-pro-flux',
    
    // Fallback order: Juggernaut Pro Flux -> HiDream-I1 -> Seedream V3 -> DALL-E 3 -> Mock
    fallbackOrder: [
      'juggernaut-pro-flux',
      'hidream-i1-fast',
      'seedream-v3',
      'dall-e-3'
    ],
    
    // Model availability check intervals (in milliseconds)
    healthCheckInterval: parseInt(process.env.AI_HEALTH_CHECK_INTERVAL) || 5 * 60 * 1000, // 5 minutes
    
    // Retry configuration for failed models
    retryConfig: {
      maxRetries: parseInt(process.env.AI_MAX_RETRIES) || 2,
      retryDelay: parseInt(process.env.AI_RETRY_DELAY) || 1000, // 1 second
      backoffMultiplier: parseFloat(process.env.AI_BACKOFF_MULTIPLIER) || 2
    }
  }
};

// Validation function
const validateConfig = () => {
  const required = [
    'OPENAI_API_KEY',
    'MONGODB_URI'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn about optional but recommended variables
  const recommended = [
    'FTP_HOST',
    'FTP_USER', 
    'FTP_PASSWORD'
  ];

  const missingRecommended = recommended.filter(key => !process.env[key]);
  
  if (missingRecommended.length > 0) {
    console.warn(`⚠️  Missing recommended environment variables: ${missingRecommended.join(', ')}`);
  }
};

// Validate configuration on load
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = config;
