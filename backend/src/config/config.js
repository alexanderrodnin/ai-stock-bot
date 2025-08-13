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
      // Connection timeout settings
      serverSelectionTimeoutMS: 60000, // 60 seconds (increased from default 30s)
      connectTimeoutMS: 60000, // 60 seconds (increased from default 10s)
      socketTimeoutMS: 60000, // 60 seconds (increased from default 0)
      
      // Buffer settings (updated for newer Mongoose versions)
      bufferCommands: false, // Disable mongoose buffering
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Pool settings for better connection management
      maxPoolSize: 10, // Maximum number of connections
      minPoolSize: 1,  // Minimum number of connections
      maxIdleTimeMS: 30000, // Close connections after 30 seconds of inactivity
      
      // Heartbeat settings
      heartbeatFrequencyMS: 10000, // Check server every 10 seconds
      
      // Modern MongoDB driver doesn't need useNewUrlParser and useUnifiedTopology
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

  // Replicate configuration for AI upscaling
  replicate: {
    apiKey: process.env.REPLICATE_API_TOKEN,
    timeout: parseInt(process.env.REPLICATE_TIMEOUT) || 300000, // 5 minutes for upscaling
    model: process.env.REPLICATE_MODEL || 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
    scale: parseInt(process.env.REPLICATE_SCALE) || 4,
    faceEnhance: process.env.REPLICATE_FACE_ENHANCE !== 'false' // Default true
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
    max: parseInt(process.env.RATE_LIMIT_MAX) || 400, // 400 requests per window (increased for production)
    standardHeaders: true,
    legacyHeaders: false
  },

  // Image generation rate limiting (production settings)
  imageGeneration: {
    windowMs: parseInt(process.env.IMAGE_GENERATION_WINDOW) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.IMAGE_GENERATION_MAX) || 100 // 100 requests per hour
  },

  // Upload rate limiting (production settings)
  upload: {
    windowMs: parseInt(process.env.UPLOAD_WINDOW) || 60 * 60 * 1000, // 1 hour
    max: parseInt(process.env.UPLOAD_MAX) || 100 // 100 uploads per hour
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

  // YooMoney payment configuration
  yoomoney: {
    clientId: process.env.YOOMONEY_CLIENT_ID,
    wallet: process.env.YOOMONEY_WALLET,
    apiUrl: process.env.YOOMONEY_API_URL || 'https://yoomoney.ru/api',
    quickpayUrl: process.env.YOOMONEY_QUICKPAY_URL || 'https://yoomoney.ru/quickpay/confirm.xml',
    webhookSecret: process.env.YOOMONEY_WEBHOOK_SECRET,
    notificationUri: process.env.YOOMONEY_NOTIFICATION_URI
  },

  // Application base URL
  app: {
    baseUrl: process.env.BACKEND_URL || 'http://localhost:3000'
  },

  // Payment plans configuration (loaded from environment variables)
  paymentPlans: {
    plan_10: { 
      amount: parseInt(process.env.PAYMENT_PLAN_1_AMOUNT) || 2, 
      images: parseInt(process.env.PAYMENT_PLAN_1_IMAGES) || 10, 
      name: process.env.PAYMENT_PLAN_1_NAME || "10 изображений" 
    },
    plan_100: { 
      amount: parseInt(process.env.PAYMENT_PLAN_2_AMOUNT) || 3, 
      images: parseInt(process.env.PAYMENT_PLAN_2_IMAGES) || 100, 
      name: process.env.PAYMENT_PLAN_2_NAME || "100 изображений" 
    },
    plan_1000: { 
      amount: parseInt(process.env.PAYMENT_PLAN_3_AMOUNT) || 4, 
      images: parseInt(process.env.PAYMENT_PLAN_3_IMAGES) || 1000, 
      name: process.env.PAYMENT_PLAN_3_NAME || "1000 изображений" 
    },
    plan_10000: { 
      amount: parseInt(process.env.PAYMENT_PLAN_4_AMOUNT) || 5, 
      images: parseInt(process.env.PAYMENT_PLAN_4_IMAGES) || 10000, 
      name: process.env.PAYMENT_PLAN_4_NAME || "10000 изображений" 
    }
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
  },

  // Trial subscription configuration
  trial: {
    imagesCount: parseInt(process.env.TRIAL_IMAGES_COUNT) || 10
  },

  // Feature flags configuration
  features: {
    stocksEnabled: process.env.STOCKS_ENABLED === 'true'
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

};

// Validate configuration on load
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = config;
