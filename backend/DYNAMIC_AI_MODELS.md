# Dynamic AI Models Configuration

This document describes the dynamic AI model switching functionality implemented in the AI Stock Bot backend.

## Overview

The system now supports multiple AI image generation providers with dynamic switching capabilities:

- **OpenAI DALL-E 3** - High-quality image generation
- **Segmind Fast-Flux-Schnell** - Fast image generation with 1:1 aspect ratio

## Architecture

### Components

1. **AppConfig Model** (`backend/src/models/AppConfig.js`)
   - Stores configuration data in MongoDB
   - Supports versioning and metadata
   - Provides static methods for configuration management

2. **ConfigAuditLog Model** (`backend/src/models/ConfigAuditLog.js`)
   - Tracks all configuration changes
   - Stores audit trail with user information
   - Supports querying by date range, action type, etc.

3. **ConfigService** (`backend/src/services/configService.js`)
   - Singleton service for configuration management
   - Implements polling mechanism (30-second intervals)
   - Provides caching for performance
   - Handles model switching logic

4. **SegmindService** (`backend/src/services/aiProviders/segmindService.js`)
   - Integration with Segmind API
   - Handles Fast-Flux-Schnell model
   - Supports base64 and URL response formats

5. **Admin Controller** (`backend/src/controllers/adminController.js`)
   - REST API for configuration management
   - Model switching endpoints
   - Audit log access

## Configuration Structure

```json
{
  "activeModel": "dall-e-3",
  "models": {
    "dall-e-3": {
      "enabled": true,
      "provider": "openai"
    },
    "fast-flux-schnell": {
      "enabled": true,
      "provider": "segmind"
    }
  }
}
```

## API Endpoints

### Admin Configuration Management

#### Get Current Configuration
```
GET /api/admin/config
```

Response:
```json
{
  "success": true,
  "data": {
    "config": {
      "activeModel": "dall-e-3",
      "models": { ... }
    },
    "metadata": {
      "version": 1,
      "updatedAt": "2025-01-16T10:00:00.000Z"
    }
  }
}
```

#### Switch AI Model
```
PUT /api/admin/config/model/:modelName
```

Body:
```json
{
  "reason": "Switching to faster model for testing"
}
```

#### Update Full Configuration
```
PUT /api/admin/config
```

Body:
```json
{
  "config": {
    "activeModel": "fast-flux-schnell",
    "models": { ... }
  },
  "reason": "Configuration update"
}
```

#### Get Configuration Audit Logs
```
GET /api/admin/config/logs?limit=50&skip=0
```

#### Force Reload Configuration
```
POST /api/admin/config/reload
```

#### System Status
```
GET /api/admin/status
```

#### Health Check
```
GET /api/admin/health
```

## Environment Variables

Add to your `.env` file:

```bash
# Segmind API Configuration
SEGMIND_API_KEY=your_segmind_api_key_here
SEGMIND_BASE_URL=https://api.segmind.com/v1
SEGMIND_TIMEOUT=120000
```

## Model Specifications

### OpenAI DALL-E 3
- **Provider**: OpenAI
- **Sizes**: 1024x1024, 1792x1024, 1024x1792
- **Quality**: standard, hd
- **Style**: vivid, natural
- **Response Format**: URL

### Segmind Fast-Flux-Schnell
- **Provider**: Segmind
- **Size**: 1024x1024 (fixed 1:1 aspect ratio)
- **Steps**: 4 (fast generation)
- **Guidance Scale**: 3.5
- **Response Format**: Base64 or URL

## Usage Examples

### Switching Models via API

```bash
# Switch to Segmind Fast-Flux-Schnell
curl -X PUT http://localhost:3000/api/admin/config/model/fast-flux-schnell \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing faster generation"}'

# Switch back to DALL-E 3
curl -X PUT http://localhost:3000/api/admin/config/model/dall-e-3 \
  -H "Content-Type: application/json" \
  -d '{"reason": "Back to high quality"}'
```

### Checking Current Configuration

```bash
curl http://localhost:3000/api/admin/config
```

### Viewing Audit Logs

```bash
curl http://localhost:3000/api/admin/config/logs
```

## Image Generation Flow

1. **Request Received**: User requests image generation
2. **Configuration Check**: ConfigService provides current active model
3. **Provider Selection**: ImageService selects appropriate provider
4. **Generation**: Image generated using active model
5. **Fallback**: If generation fails, fallback to mock image
6. **Storage**: Image processed and stored with metadata
7. **Database**: Image record saved with provider and model info

## Polling Mechanism

The ConfigService implements a polling mechanism that:

- Checks for configuration updates every 30 seconds
- Updates in-memory cache when changes detected
- Logs configuration changes
- Emits events for model switches

## Audit Trail

All configuration changes are logged with:

- **Action Type**: CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE
- **Old/New Values**: Complete change tracking
- **User Information**: Who made the change
- **Request Metadata**: IP, User-Agent, endpoint
- **Timestamp**: When the change occurred
- **Reason**: Optional reason for the change

## Error Handling

The system includes comprehensive error handling:

- **API Errors**: Proper HTTP status codes and error messages
- **Provider Failures**: Automatic fallback to mock images
- **Configuration Errors**: Validation and rollback capabilities
- **Network Issues**: Timeout handling and retry logic

## Performance Considerations

- **Caching**: Configuration cached in memory for fast access
- **Polling**: Minimal database queries with timestamp-based updates
- **Indexing**: Proper database indexes for configuration queries
- **Lazy Loading**: Services initialized only when needed

## Security

- **Input Validation**: All configuration inputs validated
- **Audit Logging**: Complete audit trail for compliance
- **Error Sanitization**: Sensitive information not exposed in errors
- **Rate Limiting**: Admin endpoints can be rate-limited

## Monitoring

Monitor the following metrics:

- Configuration change frequency
- Model switch success/failure rates
- Image generation performance by provider
- Fallback usage statistics
- API response times

## Troubleshooting

### Common Issues

1. **Model Switch Not Taking Effect**
   - Check polling is enabled
   - Verify database connectivity
   - Check configuration cache

2. **Segmind API Errors**
   - Verify API key is correct
   - Check network connectivity
   - Review API rate limits

3. **Configuration Not Persisting**
   - Check MongoDB connection
   - Verify write permissions
   - Review validation errors

### Debug Commands

```bash
# Check system status
curl http://localhost:3000/api/admin/status

# Force configuration reload
curl -X POST http://localhost:3000/api/admin/config/reload

# Check health
curl http://localhost:3000/api/admin/health
```

## Future Enhancements

Potential improvements:

1. **Real-time Updates**: WebSocket-based configuration updates
2. **A/B Testing**: Automatic model switching based on performance
3. **Load Balancing**: Distribute requests across multiple providers
4. **Cost Optimization**: Automatic switching based on usage costs
5. **Quality Metrics**: Automatic quality assessment and model selection
6. **User Preferences**: Per-user model preferences
7. **Scheduled Switching**: Time-based model switching
8. **Geographic Routing**: Region-based provider selection

## Migration Guide

When upgrading existing installations:

1. **Database Migration**: New collections will be created automatically
2. **Environment Variables**: Add Segmind configuration
3. **Default Configuration**: System will create default configuration
4. **Existing Images**: Legacy images will continue to work
5. **API Compatibility**: Existing image generation API unchanged

## Testing

Test the functionality:

1. **Unit Tests**: Test individual components
2. **Integration Tests**: Test end-to-end flows
3. **Load Tests**: Test under high load
4. **Failover Tests**: Test fallback mechanisms
5. **Configuration Tests**: Test all configuration scenarios

## Support

For issues or questions:

1. Check the logs for error messages
2. Review the audit trail for configuration changes
3. Test with the health check endpoint
4. Verify environment variables are set correctly
5. Check network connectivity to AI providers
