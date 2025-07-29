# Admin API Guide - Административное управление системой

Полное руководство по Admin API для управления AI Stock Bot системой, включая AI модели, конфигурацию, мониторинг и аудит.

## 🔗 Base URL

Все административные endpoints имеют префикс `/api/admin`

## 🔐 Аутентификация

В текущей версии административные endpoints не требуют аутентификации. В продакшене рекомендуется реализовать proper authentication и authorization.

## 📊 System Status & Health

### Health Check
**GET** `/api/admin/health`

Простая проверка работоспособности административной системы.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "data": {
    "configService": "running",
    "activeModel": "juggernaut-pro-flux",
    "timestamp": "2025-01-28T17:00:00.000Z"
  }
}
```

### System Status
**GET** `/api/admin/status`

Получение полного статуса системы включая все AI провайдеры.

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
      "activeModel": "juggernaut-pro-flux",
      "totalModels": 4,
      "enabledModels": 4,
      "pollingEnabled": true,
      "pollingInterval": 30000
    },
    "providers": [
      {
        "model": "juggernaut-pro-flux",
        "provider": "segmind",
        "description": "Juggernaut Pro Flux - Professional quality realistic images",
        "enabled": true,
        "active": true,
        "configured": true
      },
      {
        "model": "dall-e-3",
        "provider": "openai",
        "description": "OpenAI DALL-E 3 - High quality image generation",
        "enabled": true,
        "active": false,
        "configured": true
      },
      {
        "model": "seedream-v3",
        "provider": "segmind",
        "description": "Seedream V3 - Artistic and creative image generation",
        "enabled": true,
        "active": false,
        "configured": true
      },
      {
        "model": "hidream-i1-fast",
        "provider": "segmind",
        "description": "HiDream-I1 Fast - Quick high-quality image generation",
        "enabled": true,
        "active": false,
        "configured": true
      }
    ],
    "timestamp": "2025-01-28T17:00:00.000Z"
  }
}
```

## 🤖 AI Models Management

### 1. Get Current AI Configuration

**GET** `/api/admin/config`

Возвращает текущую конфигурацию AI генерации изображений.

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "activeModel": "juggernaut-pro-flux",
      "models": {
        "juggernaut-pro-flux": {
          "enabled": true,
          "provider": "segmind",
          "description": "Juggernaut Pro Flux - Professional quality realistic images"
        },
        "dall-e-3": {
          "enabled": true,
          "provider": "openai",
          "description": "OpenAI DALL-E 3 - High quality image generation"
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
      "updatedAt": "2025-01-28T17:00:00.000Z"
    }
  }
}
```

### 2. Get AI Models Information

**GET** `/api/admin/config/ai-models`

Возвращает детальную информацию о всех AI моделях.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeModel": "juggernaut-pro-flux",
    "models": {
      "juggernaut-pro-flux": {
        "enabled": true,
        "provider": "segmind",
        "description": "Juggernaut Pro Flux - Professional quality realistic images"
      },
      "dall-e-3": {
        "enabled": true,
        "provider": "openai",
        "description": "OpenAI DALL-E 3 - High quality image generation"
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
    },
    "totalModels": 4,
    "enabledModels": 4
  }
}
```

### 3. Get Available Models

**GET** `/api/admin/config/ai-models/available`

Возвращает только включенные модели, которые можно использовать.

**Response:**
```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "juggernaut-pro-flux",
        "provider": "segmind",
        "description": "Juggernaut Pro Flux - Professional quality realistic images",
        "active": true
      },
      {
        "name": "dall-e-3",
        "provider": "openai",
        "description": "OpenAI DALL-E 3 - High quality image generation",
        "active": false
      },
      {
        "name": "seedream-v3",
        "provider": "segmind",
        "description": "Seedream V3 - Artistic and creative image generation",
        "active": false
      },
      {
        "name": "hidream-i1-fast",
        "provider": "segmind",
        "description": "HiDream-I1 Fast - Quick high-quality image generation",
        "active": false
      }
    ],
    "activeModel": "juggernaut-pro-flux",
    "count": 4
  }
}
```

### 4. Switch AI Model (Method 1)

**PUT** `/api/admin/config/model/:modelName`

Переключение на конкретную AI модель через URL параметр.

**Parameters:**
- `modelName` (URL parameter): Название модели для переключения

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
    "switchedAt": "2025-01-28T17:00:00.000Z",
    "reason": "Testing new model for better quality"
  }
}
```

### 5. Switch AI Model (Method 2) - Рекомендуемый

**POST** `/api/admin/config/ai-model/switch`

Переключение на конкретную AI модель через request body.

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
  "message": "AI model switched from juggernaut-pro-flux to seedream-v3",
  "data": {
    "previousModel": "juggernaut-pro-flux",
    "activeModel": "seedream-v3",
    "switchedAt": "2025-01-28T17:00:00.000Z",
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

Получение истории переключений AI моделей.

**Query Parameters:**
- `limit` (optional): Количество записей (default: 20)
- `skip` (optional): Количество записей для пропуска (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "timestamp": "2025-01-28T17:00:00.000Z",
        "previousModel": "juggernaut-pro-flux",
        "newModel": "dall-e-3",
        "changedBy": "admin",
        "reason": "Testing OpenAI model",
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

### 7. Update Full Configuration

**PUT** `/api/admin/config`

Обновление полной AI конфигурации.

**Request Body:**
```json
{
  "config": {
    "activeModel": "juggernaut-pro-flux",
    "models": {
      "juggernaut-pro-flux": {
        "enabled": true,
        "provider": "segmind",
        "description": "Juggernaut Pro Flux - Professional quality realistic images"
      },
      "dall-e-3": {
        "enabled": true,
        "provider": "openai",
        "description": "OpenAI DALL-E 3 - High quality image generation"
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
    "updatedAt": "2025-01-28T17:00:00.000Z"
  }
}
```

### 8. Reload Configuration

**POST** `/api/admin/config/reload`

Принудительная перезагрузка конфигурации из базы данных.

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
      "activeModel": "juggernaut-pro-flux",
      "models": { ... }
    },
    "reloadedAt": "2025-01-28T17:00:00.000Z",
    "reason": "Manual reload after database changes"
  }
}
```

### 9. Get Configuration Logs

**GET** `/api/admin/config/logs`

Получение логов изменений конфигурации.

**Query Parameters:**
- `limit` (optional): Количество записей (default: 50)
- `skip` (optional): Количество записей для пропуска (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-28T17:00:00.000Z",
        "action": "UPDATE",
        "key": "ai-models",
        "oldValue": { "activeModel": "dall-e-3" },
        "newValue": { "activeModel": "juggernaut-pro-flux" },
        "changedBy": "admin",
        "reason": "Testing new model",
        "requestMetadata": {
          "ipAddress": "127.0.0.1",
          "userAgent": "curl/7.68.0"
        }
      }
    ],
    "pagination": {
      "limit": 50,
      "skip": 0,
      "total": 1
    }
  }
}
```

### 10. Get All Configurations

**GET** `/api/admin/configs`

Получение всех конфигураций системы.

**Response:**
```json
{
  "success": true,
  "data": {
    "configs": [
      {
        "key": "ai-models",
        "value": {
          "activeModel": "juggernaut-pro-flux",
          "models": { ... }
        },
        "type": "system",
        "version": 1,
        "metadata": {
          "description": "AI models configuration",
          "updatedBy": "admin",
          "updatedAt": "2025-01-28T17:00:00.000Z"
        }
      }
    ],
    "count": 1
  }
}
```

## 🚨 Error Responses

Все endpoints возвращают консистентные ответы об ошибках:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**HTTP status codes:**
- `400` - Bad Request (неверные параметры)
- `404` - Not Found (неверный endpoint)
- `500` - Internal Server Error (внутренняя ошибка)

## 💡 Примеры использования

### Переключение на Juggernaut Pro Flux

```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "juggernaut-pro-flux",
    "reason": "Testing realistic image generation"
  }'
```

### Переключение на DALL-E 3

```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "reason": "Need high quality generation"
  }'
```

### Переключение на Seedream V3

```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "seedream-v3",
    "reason": "Need artistic style images"
  }'
```

### Переключение на HiDream-I1 Fast

```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "hidream-i1-fast",
    "reason": "Need fast generation for high volume"
  }'
```

### Получение текущего статуса

```bash
curl http://localhost:3000/api/admin/status
```

### Получение доступных моделей

```bash
curl http://localhost:3000/api/admin/config/ai-models/available
```

### Получение истории переключений

```bash
curl "http://localhost:3000/api/admin/config/ai-models/history?limit=10"
```

### Получение логов конфигурации

```bash
curl "http://localhost:3000/api/admin/config/logs?limit=20"
```

## ✅ Best Practices

1. **Всегда указывайте причину** при переключении моделей для аудита
2. **Проверяйте доступность модели** перед переключением через available endpoint
3. **Мониторьте историю** для отслеживания паттернов использования
4. **Используйте health check** для проверки статуса перед изменениями
5. **Тестируйте переключения** в development перед применением в production
6. **Используйте POST метод** для переключения моделей (более надежный)

## 🔒 Security Considerations

1. **Реализуйте аутентификацию** для продакшн использования
2. **Настройте rate limiting** для admin endpoints
3. **Логируйте все admin действия** для security аудита
4. **Валидируйте входные данные** для предотвращения injection атак
5. **Используйте HTTPS** в продакшн окружении
6. **Ограничьте доступ** к admin endpoints по IP адресам

## 📊 Мониторинг и логирование

Система предоставляет comprehensive логирование для всех admin операций:

- **Model switch events** - события переключения моделей
- **Configuration changes** - изменения конфигурации
- **API access logs** - логи доступа к API
- **Error tracking** - отслеживание ошибок
- **Performance metrics** - метрики производительности
- **Audit trail** - полный аудит всех действий

### Структура логов:
```json
{
  "timestamp": "2025-01-28T17:00:00.000Z",
  "level": "info",
  "message": "AI model switched",
  "data": {
    "previousModel": "dall-e-3",
    "newModel": "juggernaut-pro-flux",
    "reason": "Testing new model",
    "changedBy": "admin",
    "requestId": "req_123456"
  }
}
```

Мониторьте эти логи для обеспечения правильной работы системы и обнаружения проблем.

## 🔧 Troubleshooting

### Частые проблемы:

1. **Model switch не применяется**
   - Проверьте polling включен
   - Убедитесь в подключении к MongoDB
   - Проверьте кэш конфигурации

2. **Ошибки API провайдеров**
   - Проверьте API ключи
   - Убедитесь в сетевом подключении
   - Проверьте rate limits

3. **Конфигурация не сохраняется**
   - Проверьте подключение к MongoDB
   - Убедитесь в правах записи
   - Проверьте ошибки валидации

### Debug команды:

```bash
# Проверка статуса системы
curl http://localhost:3000/api/admin/status

# Принудительная перезагрузка конфигурации
curl -X POST http://localhost:3000/api/admin/config/reload \
  -H "Content-Type: application/json" \
  -d '{"reason": "Debug reload"}'

# Проверка health
curl http://localhost:3000/api/admin/health

# Получение текущей конфигурации
curl http://localhost:3000/api/admin/config
```
