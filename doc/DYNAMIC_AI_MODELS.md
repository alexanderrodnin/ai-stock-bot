# Dynamic AI Models Configuration

Документация по функциональности динамического переключения AI моделей в AI Stock Bot backend.

## 📋 Обзор

Система поддерживает множественные AI провайдеры генерации изображений с возможностью динамического переключения:

- **Juggernaut Pro Flux** - Профессиональные реалистичные изображения (по умолчанию)
- **OpenAI DALL-E 3** - Высококачественная генерация изображений
- **Seedream V3** - Художественная и креативная генерация
- **HiDream-I1 Fast** - Быстрая генерация изображений

## 🏗️ Архитектура

### Компоненты системы

1. **AppConfig Model** (`backend/src/models/AppConfig.js`)
   - Хранение конфигурационных данных в MongoDB
   - Поддержка версионирования и метаданных
   - Статические методы для управления конфигурацией

2. **ConfigAuditLog Model** (`backend/src/models/ConfigAuditLog.js`)
   - Отслеживание всех изменений конфигурации
   - Хранение audit trail с информацией о пользователе
   - Поддержка запросов по диапазону дат, типу действия и т.д.

3. **ConfigService** (`backend/src/services/configService.js`)
   - Singleton сервис для управления конфигурацией
   - Реализация polling механизма (интервал 30 секунд)
   - Кэширование для производительности
   - Логика переключения моделей

4. **AI Provider Services** (`backend/src/services/aiProviders/`)
   - **juggernautProFluxService.js** - Интеграция с Segmind API для Juggernaut Pro Flux
   - **hiDreamI1Service.js** - Интеграция с Segmind API для HiDream-I1 Fast
   - **seedreamV3Service.js** - Интеграция с Segmind API для Seedream V3
   - Поддержка base64 и URL форматов ответов

5. **Admin Controller** (`backend/src/controllers/adminController.js`)
   - REST API для управления конфигурацией
   - Endpoints переключения моделей
   - Доступ к audit логам

6. **Payment System** (`backend/src/services/paymentService.js`)
   - Интеграция с YooMoney для платежей
   - Управление подписками и балансом пользователей
   - Webhook обработка платежей

## 📊 Структура конфигурации

```json
{
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

## 🔧 Переменные окружения

Добавьте в ваш `.env` файл:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=60000

# Segmind API Configuration
SEGMIND_API_KEY=your_segmind_api_key_here
SEGMIND_BASE_URL=https://api.segmind.com/v1
SEGMIND_TIMEOUT=120000

# YooMoney Payment Configuration
YOOMONEY_SHOP_ID=your_shop_id_here
YOOMONEY_SECRET_KEY=your_secret_key_here
YOOMONEY_RETURN_URL=http://localhost:3000/api/payments/success
```

## 📋 Спецификации моделей

### OpenAI DALL-E 3
- **Provider**: OpenAI
- **Размеры**: 1024x1024, 1792x1024, 1024x1792
- **Качество**: standard, hd
- **Стиль**: vivid, natural
- **Формат ответа**: URL

### Juggernaut Pro Flux
- **Provider**: Segmind
- **Размер**: 1024x1024 (фиксированное соотношение 1:1)
- **Шаги**: Оптимизированы для качества
- **Guidance Scale**: Настроен для реалистичности
- **Формат ответа**: Base64 или Binary Buffer

### Seedream V3
- **Provider**: Segmind
- **Размер**: 1024x1024 (фиксированное соотношение 1:1)
- **Шаги**: Оптимизированы для креативности
- **Guidance Scale**: Настроен для художественности
- **Формат ответа**: Base64 или Binary Buffer

### HiDream-I1 Fast
- **Provider**: Segmind
- **Размер**: 1024x1024 (фиксированное соотношение 1:1)
- **Шаги**: 4 (быстрая генерация)
- **Guidance Scale**: 3.5
- **Формат ответа**: Base64 или Binary Buffer

## 💡 Примеры использования

### Переключение моделей через API

```bash
# Переключение на Juggernaut Pro Flux
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "juggernaut-pro-flux", "reason": "Testing realistic generation"}'

# Переключение на DALL-E 3
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "dall-e-3", "reason": "High quality generation needed"}'

# Переключение на Seedream V3
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "seedream-v3", "reason": "Artistic generation needed"}'

# Переключение на HiDream-I1 Fast
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "hidream-i1-fast", "reason": "Fast generation required"}'
```

### Проверка текущей конфигурации

```bash
curl http://localhost:3000/api/admin/config
```

### Просмотр audit логов

```bash
curl "http://localhost:3000/api/admin/config/logs?limit=20"
```

### Получение статуса системы

```bash
curl http://localhost:3000/api/admin/status
```

## 🔄 Поток генерации изображений

1. **Получение запроса**: Пользователь запрашивает генерацию изображения
2. **Проверка подписки**: Система проверяет баланс изображений пользователя
3. **Проверка конфигурации**: ConfigService предоставляет текущую активную модель
4. **Выбор провайдера**: ImageService выбирает соответствующий провайдер
5. **Генерация**: Изображение генерируется с использованием активной модели
6. **Фоллбек**: При сбое генерации, автоматический переход к следующей модели
7. **Обработка**: Изображение обрабатывается и оптимизируется
8. **Хранение**: Изображение сохраняется с метаданными
9. **База данных**: Запись изображения сохраняется с информацией о провайдере и модели
10. **Списание**: Списание одного изображения с баланса пользователя

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

## 🚨 Обработка ошибок

Система включает comprehensive обработку ошибок:

- **API ошибки**: Правильные HTTP status codes и сообщения об ошибках
- **Сбои провайдеров**: Автоматический фоллбек на mock изображения
- **Ошибки конфигурации**: Валидация и возможности отката
- **Сетевые проблемы**: Обработка таймаутов и retry логика

## ⚡ Соображения производительности

- **Кэширование**: Конфигурация кэшируется в памяти для быстрого доступа
- **Polling**: Минимальные запросы к базе данных с обновлениями на основе timestamp
- **Индексирование**: Правильные индексы базы данных для запросов конфигурации
- **Lazy Loading**: Сервисы инициализируются только при необходимости

## 🔒 Безопасность

- **Валидация входных данных**: Все входные данные конфигурации валидируются
- **Audit логирование**: Полный audit trail для соответствия требованиям
- **Санитизация ошибок**: Чувствительная информация не раскрывается в ошибках
- **Rate Limiting**: Admin endpoints могут быть ограничены по частоте

## 📊 Мониторинг

Мониторьте следующие метрики:

- Частота изменений конфигурации
- Успешность/неуспешность переключений моделей
- Производительность генерации изображений по провайдерам
- Статистика использования фоллбеков
- Время ответа API

## 🔧 Устранение неполадок

### Частые проблемы

1. **Переключение модели не применяется**
   - Проверьте, что polling включен
   - Убедитесь в подключении к базе данных
   - Проверьте кэш конфигурации

2. **Ошибки Segmind API**
   - Убедитесь, что API ключ правильный
   - Проверьте сетевое подключение
   - Проверьте лимиты API

3. **Конфигурация не сохраняется**
   - Проверьте подключение к MongoDB
   - Убедитесь в правах записи
   - Проверьте ошибки валидации

### Debug команды

```bash
# Проверка статуса системы
curl http://localhost:3000/api/admin/status

# Принудительная перезагрузка конфигурации
curl -X POST http://localhost:3000/api/admin/config/reload \
  -H "Content-Type: application/json" \
  -d '{"reason": "Debug reload"}'

# Проверка health
curl http://localhost:3000/api/admin/health
```

## 🔮 Планы развития

Потенциальные улучшения:

1. **Real-time обновления**: WebSocket-based обновления конфигурации
2. **A/B тестирование**: Автоматическое переключение моделей на основе производительности
3. **Балансировка нагрузки**: Распределение запросов между множественными провайдерами
4. **Оптимизация стоимости**: Автоматическое переключение на основе стоимости использования
5. **Метрики качества**: Автоматическая оценка качества и выбор модели
6. **Пользовательские предпочтения**: Предпочтения модели для каждого пользователя
7. **Запланированное переключение**: Переключение моделей по времени
8. **Географическая маршрутизация**: Выбор провайдера на основе региона

## 📋 Руководство по миграции

При обновлении существующих установок:

1. **Миграция базы данных**: Новые коллекции будут созданы автоматически
2. **Переменные окружения**: Добавьте конфигурацию Segmind и YooMoney
3. **Конфигурация по умолчанию**: Система создаст конфигурацию по умолчанию
4. **Существующие изображения**: Legacy изображения продолжат работать
5. **Совместимость API**: Существующий API генерации изображений не изменился

## 🧪 Тестирование

Протестируйте функциональность:

1. **Unit тесты**: Тестирование отдельных компонентов
2. **Интеграционные тесты**: Тестирование end-to-end потоков
3. **Нагрузочные тесты**: Тестирование под высокой нагрузкой
4. **Failover тесты**: Тестирование механизмов фоллбека
5. **Конфигурационные тесты**: Тестирование всех сценариев конфигурации

## 📞 Поддержка

При возникновении проблем или вопросов:

1. Проверьте логи на предмет сообщений об ошибках
2. Просмотрите audit trail для изменений конфигурации
3. Протестируйте с помощью health check endpoint
4. Убедитесь, что переменные окружения установлены правильно
5. Проверьте сетевое подключение к AI провайдерам

Подробная документация по Admin API: [ADMIN_API_GUIDE.md](ADMIN_API_GUIDE.md)
