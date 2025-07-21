# AI Models Integration Guide

This document describes the AI models available in the AI Stock Bot system and how to configure them.

## Available AI Models

### 1. OpenAI DALL-E 3 (Default)
- **Model ID**: `dall-e-3`
- **Provider**: OpenAI
- **Description**: High-quality image generation with excellent prompt understanding
- **Output Format**: URL (downloaded and processed)
- **Resolution**: 1024x1024 (processed to 4000x4000)
- **Configuration**: Requires `OPENAI_API_KEY`

### 2. Juggernaut Pro Flux
- **Model ID**: `juggernaut-pro-flux`
- **Provider**: Segmind
- **Description**: Professional quality realistic images with excellent detail
- **Output Format**: Binary buffer (direct processing)
- **Resolution**: 1024x1024 (processed to 4000x4000)
- **Configuration**: Requires `SEGMIND_API_KEY`

### 3. Seedream V3
- **Model ID**: `seedream-v3`
- **Provider**: Segmind
- **Description**: Artistic and creative image generation with unique style
- **Output Format**: Binary buffer (direct processing)
- **Resolution**: 1024x1024 (processed to 4000x4000)
- **Configuration**: Requires `SEGMIND_API_KEY`

### 4. HiDream-I1 Fast
- **Model ID**: `hidream-i1-fast`
- **Provider**: Segmind
- **Description**: Quick high-quality image generation optimized for speed
- **Output Format**: Binary buffer (direct processing)
- **Resolution**: 1024x1024 (processed to 4000x4000)
- **Configuration**: Requires `SEGMIND_API_KEY`

## Configuration

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=60000

# Segmind Configuration
SEGMIND_API_KEY=your_segmind_api_key_here
SEGMIND_BASE_URL=https://api.segmind.com/v1
SEGMIND_TIMEOUT=120000
```

### Database Configuration

The system uses dynamic configuration stored in MongoDB. The AI model configuration is automatically initialized with all available models when the system starts.

Default configuration:
```json
{
  "activeModel": "dall-e-3",
  "models": {
    "dall-e-3": {
      "enabled": true,
      "provider": "openai",
      "description": "OpenAI DALL-E 3 - High quality image generation"
    },
    "juggernaut-pro-flux": {
      "enabled": true,
      "provider": "segmind",
      "description": "Juggernaut Pro Flux - Professional quality realistic images"
    },
    "seedream-v3": {
      "enabled": true,
      "provider": "segmind",
      "description": "Seedream V3 - Artistic and creative image generation"
    },
    "hidream-i1-fast": {
      "enabled": true,
      "provider": "segmind",
      "description": "HiDream-I1 Fast - Quick high-quality image generation"
    }
  }
}
```

## Switching AI Models

### Via Admin API

```bash
# Switch to Juggernaut Pro Flux
POST /api/admin/config/ai-model/switch
{
  "model": "juggernaut-pro-flux",
  "reason": "Testing new model"
}

# Switch to Seedream V3
POST /api/admin/config/ai-model/switch
{
  "model": "seedream-v3",
  "reason": "Artistic generation needed"
}

# Switch to HiDream-I1 Fast
POST /api/admin/config/ai-model/switch
{
  "model": "hidream-i1-fast",
  "reason": "Fast generation required"
}

# Switch back to DALL-E 3
POST /api/admin/config/ai-model/switch
{
  "model": "dall-e-3",
  "reason": "High quality generation"
}
```

### Via Configuration Service

```javascript
const configService = require('./src/services/configService');

// Switch model programmatically
await configService.switchAIModel('juggernaut-pro-flux', 'admin', 'Testing new model');
```

## Image Processing Pipeline

All AI models follow the same processing pipeline:

1. **Generation**: AI model generates image in its native format
2. **Format Handling**: 
   - URL format: Download image
   - Base64 format: Convert to buffer
   - Buffer format: Use directly
3. **Processing**: Resize to 4000x4000, optimize quality, add EXIF data
4. **Storage**: Save to `backend/temp/` directory
5. **Database**: Store metadata and file information

## Model-Specific Features

### OpenAI DALL-E 3
- Content filtering and safety
- Revised prompt generation
- High prompt understanding
- Multiple quality/style options

### Segmind Models
- Direct binary output (faster processing)
- Consistent 1:1 aspect ratio
- Professional quality suitable for stock photography
- Lower latency compared to OpenAI

## Fallback Mechanism

If the active AI model fails, the system automatically:

1. Logs the error with detailed information
2. Generates a fallback image with error context
3. Continues processing without interrupting user experience
4. Provides detailed error information for debugging

## Monitoring and Logging

The system provides comprehensive logging for:

- Model switching events
- Generation requests and responses
- Error handling and fallbacks
- Performance metrics
- Configuration changes

## API Endpoints

### Get Current Configuration
```bash
GET /api/admin/config/ai-models
```

### Get Available Models
```bash
GET /api/admin/config/ai-models/available
```

### Switch Active Model
```bash
POST /api/admin/config/ai-model/switch
{
  "model": "model-id",
  "reason": "Optional reason"
}
```

### Get Configuration History
```bash
GET /api/admin/config/ai-models/history
```

## Best Practices

1. **API Key Management**: Store API keys securely in environment variables
2. **Model Selection**: Choose models based on use case:
   - DALL-E 3: Best overall quality and safety
   - Juggernaut Pro Flux: Professional realistic images
   - Seedream V3: Artistic and creative content
   - HiDream-I1 Fast: Quick generation needs
3. **Monitoring**: Monitor generation success rates and switch models if needed
4. **Fallback**: Always have fallback mechanisms in place
5. **Testing**: Test new models in development before switching in production

## Troubleshooting

### Common Issues

1. **API Key Invalid**: Check environment variables and API key validity
2. **Quota Exceeded**: Monitor API usage and implement rate limiting
3. **Network Timeouts**: Adjust timeout settings for slower models
4. **Image Processing Errors**: Check Sharp library installation and temp directory permissions

### Debug Information

Enable detailed logging by setting:
```bash
LOG_LEVEL=debug
```

This will provide detailed information about:
- API requests and responses
- Image processing steps
- Error details and stack traces
- Performance metrics
