# Admin API Guide - AI Models Management

This document describes the Admin API endpoints for managing AI models in the AI Stock Bot system.

## Base URL

All admin endpoints are prefixed with `/api/admin`

## Authentication

Currently, the admin endpoints do not require authentication. In production, you should implement proper authentication and authorization.

## AI Models Management Endpoints

### 1. Get Current AI Configuration

**GET** `/api/admin/config`

Returns the current AI image generation configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
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
    },
    "metadata": {
      "version": 1,
      "updatedAt": "2025-01-21T12:00:00.000Z"
    }
  }
}
```

### 2. Get AI Models Information

**GET** `/api/admin/config/ai-models`

Returns detailed information about all AI models.

**Response:**
```json
{
  "success": true,
  "data": {
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
      }
    },
    "totalModels": 4,
    "enabledModels": 4
  }
}
```

### 3. Get Available Models

**GET** `/api/admin/config/ai-models/available`

Returns only enabled models that can be used.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "dall-e-3",
        "provider": "openai",
        "description": "OpenAI DALL-E 3 - High quality image generation",
        "active": true
      },
      {
        "name": "juggernaut-pro-flux",
        "provider": "segmind",
        "description": "Juggernaut Pro Flux - Professional quality realistic images",
        "active": false
      }
    ],
    "activeModel": "dall-e-3",
    "count": 4
  }
}
```

### 4. Switch AI Model (Method 1)

**PUT** `/api/admin/config/model/:modelName`

Switch to a specific AI model using URL parameter.

**Parameters:**
- `modelName` (URL parameter): Name of the model to switch to

**Request Body:**
```json
{
  "reason": "Testing new model for better quality"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI model switched to juggernaut-pro-flux",
  "data": {
    "activeModel": "juggernaut-pro-flux",
    "previousModel": "dall-e-3",
    "switchedAt": "2025-01-21T12:00:00.000Z",
    "reason": "Testing new model for better quality"
  }
}
```

### 5. Switch AI Model (Method 2)

**POST** `/api/admin/config/ai-model/switch`

Switch to a specific AI model using request body.

**Request Body:**
```json
{
  "model": "seedream-v3",
  "reason": "Switching to artistic model for creative content"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AI model switched from dall-e-3 to seedream-v3",
  "data": {
    "previousModel": "dall-e-3",
    "activeModel": "seedream-v3",
    "switchedAt": "2025-01-21T12:00:00.000Z",
    "reason": "Switching to artistic model for creative content",
    "modelInfo": {
      "provider": "segmind",
      "description": "Seedream V3 - Artistic and creative image generation"
    }
  }
}
```

### 6. Get AI Models History

**GET** `/api/admin/config/ai-models/history`

Get history of AI model switches.

**Query Parameters:**
- `limit` (optional): Number of records to return (default: 20)
- `skip` (optional): Number of records to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "timestamp": "2025-01-21T12:00:00.000Z",
        "previousModel": "dall-e-3",
        "newModel": "juggernaut-pro-flux",
        "changedBy": "admin",
        "reason": "Testing new model",
        "requestMetadata": {
          "ipAddress": "127.0.0.1",
          "userAgent": "curl/7.68.0",
          "endpoint": "/api/admin/config/ai-model/switch",
          "method": "POST"
        }
      }
    ],
    "pagination": {
      "limit": 20,
      "skip": 0,
      "total": 1
    }
  }
}
```

### 7. Get System Status

**GET** `/api/admin/status`

Get overall system status including all AI providers.

**Response:**
```json
{
  "success": true,
  "data": {
    "system": {
      "status": "running",
      "uptime": 3600,
      "nodeVersion": "v18.17.0",
      "environment": "development"
    },
    "configuration": {
      "activeModel": "dall-e-3",
      "totalModels": 4,
      "enabledModels": 4,
      "pollingEnabled": true,
      "pollingInterval": 30000
    },
    "providers": [
      {
        "model": "dall-e-3",
        "provider": "openai",
        "description": "OpenAI DALL-E 3 - High quality image generation",
        "enabled": true,
        "active": true,
        "configured": true
      },
      {
        "model": "juggernaut-pro-flux",
        "provider": "segmind",
        "description": "Juggernaut Pro Flux - Professional quality realistic images",
        "enabled": true,
        "active": false,
        "configured": true
      }
    ],
    "timestamp": "2025-01-21T12:00:00.000Z"
  }
}
```

### 8. Update Full Configuration

**PUT** `/api/admin/config`

Update the entire AI configuration.

**Request Body:**
```json
{
  "config": {
    "activeModel": "juggernaut-pro-flux",
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
      }
    }
  },
  "reason": "Updated configuration to enable new models"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": {
    "config": {
      "activeModel": "juggernaut-pro-flux",
      "models": { ... }
    },
    "version": 2,
    "updatedAt": "2025-01-21T12:00:00.000Z"
  }
}
```

### 9. Reload Configuration

**POST** `/api/admin/config/reload`

Force reload configuration from database.

**Request Body:**
```json
{
  "reason": "Manual reload after database changes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration reloaded successfully",
  "data": {
    "config": {
      "activeModel": "dall-e-3",
      "models": { ... }
    },
    "reloadedAt": "2025-01-21T12:00:00.000Z",
    "reason": "Manual reload after database changes"
  }
}
```

### 10. Health Check

**GET** `/api/admin/health`

Simple health check endpoint.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "configService": "running",
    "activeModel": "dall-e-3",
    "timestamp": "2025-01-21T12:00:00.000Z"
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common HTTP status codes:
- `400` - Bad Request (invalid parameters)
- `404` - Not Found (invalid endpoint)
- `500` - Internal Server Error

## Usage Examples

### Switch to Juggernaut Pro Flux

```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "juggernaut-pro-flux",
    "reason": "Testing realistic image generation"
  }'
```

### Switch to Seedream V3

```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedream-v3",
    "reason": "Need artistic style images"
  }'
```

### Switch to HiDream-I1 Fast

```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "hidream-i1-fast",
    "reason": "Need fast generation for high volume"
  }'
```

### Get Current Status

```bash
curl http://localhost:3000/api/admin/status
```

### Get Available Models

```bash
curl http://localhost:3000/api/admin/config/ai-models/available
```

### Get Model Switch History

```bash
curl http://localhost:3000/api/admin/config/ai-models/history?limit=10
```

## Best Practices

1. **Always provide a reason** when switching models for audit purposes
2. **Check model availability** before switching using the available models endpoint
3. **Monitor the history** to track model usage patterns
4. **Use health check** to verify system status before making changes
5. **Test model switches** in development before applying in production

## Security Considerations

1. **Implement authentication** for production use
2. **Rate limit** admin endpoints to prevent abuse
3. **Log all admin actions** for security auditing
4. **Validate input** to prevent injection attacks
5. **Use HTTPS** in production environments

## Monitoring

The system provides comprehensive logging for all admin operations:

- Model switch events
- Configuration changes
- API access logs
- Error tracking
- Performance metrics

Monitor these logs to ensure proper system operation and detect any issues.
