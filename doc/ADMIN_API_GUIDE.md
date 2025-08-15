# Руководство по Admin API - Административное управление системой

Полное руководство по Admin API для управления AI Stock Bot системой, включая AI модели, конфигурацию, мониторинг и аудит.

## 🔗 Базовый URL

Все административные endpoints имеют префикс `/api/admin`

## 🔐 Аутентификация

В текущей версии административные endpoints не требуют аутентификации. В продакшене рекомендуется реализовать proper authentication и authorization.

## 📊 Статус системы и проверка работоспособности

### Проверка работоспособности
**GET** `/api/admin/health`

Простая проверка работоспособности административной системы.

**Ответ:**
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

### Статус системы
**GET** `/api/admin/status`

Получение полного статуса системы включая все AI провайдеры.

**Ответ:**
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
      "totalModels": 3,
      "enabledModels": 3,
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

## 🤖 Управление AI моделями

### 1. Получение текущей конфигурации AI

**GET** `/api/admin/config`

Возвращает текущую конфигурацию AI генерации изображений.

**Ответ:**
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

### 2. Получение информации о AI моделях

**GET** `/api/admin/config/ai-models`

Возвращает детальную информацию о всех AI моделях.

**Ответ:**
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
    "totalModels": 3,
    "enabledModels": 3
  }
}
```

### 3. Получение доступных моделей

**GET** `/api/admin/config/ai-models/available`

Возвращает только включенные модели, которые можно использовать.

**Ответ:**
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
    "count": 3
  }
}
```

### 4. Переключение AI модели (Метод 1)

**PUT** `/api/admin/config/model/:modelName`

Переключение на конкретную AI модель через URL параметр.

**Параметры:**
- `modelName` (URL параметр): Название модели для переключения

**Тело запроса:**
```json
{
  "reason": "Testing new model for better quality"
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "AI model switched to juggernaut-pro-flux",
  "data": {
    "activeModel": "juggernaut-pro-flux",
    "previousModel": "seedream-v3",
    "switchedAt": "2025-01-28T17:00:00.000Z",
    "reason": "Testing new model for better quality"
  }
}
```

### 5. Переключение AI модели (Метод 2) - Рекомендуемый

**POST** `/api/admin/config/ai-model/switch`

Переключение на конкретную AI модель через тело запроса.

**Тело запроса:**
```json
{
  "model": "seedream-v3",
  "reason": "Switching to artistic model for creative content"
}
```

**Ответ:**
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

### 6. Получение истории AI моделей

**GET** `/api/admin/config/ai-models/history`

Получение истории переключений AI моделей.

**Параметры запроса:**
- `limit` (опционально): Количество записей (по умолчанию: 20)
- `skip` (опционально): Количество записей для пропуска (по умолчанию: 0)

**Ответ:**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "timestamp": "2025-01-28T17:00:00.000Z",
        "previousModel": "juggernaut-pro-flux",
        "newModel": "seedream-v3",
        "changedBy": "admin",
        "reason": "Testing Segmind model",
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

### 7. Обновление полной конфигурации

**PUT** `/api/admin/config`

Обновление полной AI конфигурации.

**Тело запроса:**
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
      "seedream-v3": {
        "enabled": true,
        "provider": "segmind",
        "description": "Seedream V3 - Artistic and creative image generation"
      }
    }
  },
  "reason": "Updated configuration to enable new models"
}
```

**Ответ:**
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

### 8. Перезагрузка конфигурации

**POST** `/api/admin/config/reload`

Принудительная перезагрузка конфигурации из базы данных.

**Тело запроса:**
```json
{
  "reason": "Manual reload after database changes"
}
```

**Ответ:**
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

### 9. Получение логов конфигурации

**GET** `/api/admin/config/logs`

Получение логов изменений конфигурации.

**Параметры запроса:**
- `limit` (опционально): Количество записей (по умолчанию: 50)
- `skip` (опционально): Количество записей для пропуска (по умолчанию: 0)

**Ответ:**
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "timestamp": "2025-01-28T17:00:00.000Z",
        "action": "UPDATE",
        "key": "ai-models",
        "oldValue": { "activeModel": "seedream-v3" },
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

### 10. Получение всех конфигураций

**GET** `/api/admin/configs`

Получение всех конфигураций системы.

**Ответ:**
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

## 🚨 Ответы об ошибках

Все endpoints возвращают консистентные ответы об ошибках:

```json
{
  "success": false,
  "error": "Error type",
  "message": "Detailed error message"
}
```

**HTTP коды состояния:**
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

## 🔒 Соображения безопасности

1. **Реализуйте аутентификацию** для продакшн использования
2. **Настройте rate limiting** для admin endpoints
3. **Логируйте все admin действия** для security аудита
4. **Валидируйте входные данные** для предотвращения injection атак
5. **Используйте HTTPS** в продакшн окружении
6. **Ограничьте доступ** к admin endpoints по IP адресам

## 🔄 Polling механизм

ConfigService реализует polling механизм, который:

- Проверяет обновления конфигурации каждые 30 секунд
- Обновляет кэш в памяти при обнаружении изменений
- Логирует изменения конфигурации
- Генерирует события при переключении моделей

## 📋 Audit Trail

Все изменения конфигурации логируются с:

- **Тип действия**: CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE
- **Старые/Новые значения**: Полное отслеживание изменений
- **Информация о пользователе**: Кто внес изменения
- **Метаданные запроса**: IP, User-Agent, endpoint
- **Временная метка**: Когда произошло изменение
- **Причина**: Опциональная причина изменения

## 📊 Мониторинг и логирование

Система предоставляет comprehensive логирование для всех admin операций:

- **События переключения моделей** - события переключения моделей
- **Изменения конфигурации** - изменения конфигурации
- **Логи доступа к API** - логи доступа к API
- **Отслеживание ошибок** - отслеживание ошибок
- **Метрики производительности** - метрики производительности
- **Audit trail** - полный аудит всех действий

Мониторьте следующие метрики:

- Частота изменений конфигурации
- Успешность/неуспешность переключений моделей
- Производительность генерации изображений по провайдерам
- Статистика использования фоллбеков
- Время ответа API

### Структура логов:
```json
{
  "timestamp": "2025-01-28T17:00:00.000Z",
  "level": "info",
  "message": "AI model switched",
  "data": {
    "previousModel": "seedream-v3",
    "newModel": "juggernaut-pro-flux",
    "reason": "Testing new model",
    "changedBy": "admin",
    "requestId": "req_123456"
  }
}
```

Мониторьте эти логи для обеспечения правильной работы системы и обнаружения проблем.
