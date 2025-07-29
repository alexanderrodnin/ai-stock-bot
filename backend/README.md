# AI Stock Bot Backend API

RESTful API backend для AI Stock Bot - системы генерации изображений с множественными AI моделями, интегрированной системой платежей YooMoney и автоматической загрузки на стоковые площадки.

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- MongoDB 7.0+
- API ключи (OpenAI, Segmind, YooMoney)

### Установка и запуск

#### Через Docker (рекомендуется)
```bash
# Из корневой директории проекта
docker-compose --profile backend up -d
```

#### Локальная разработка
```bash
cd backend
npm install
cp .env.example .env
# Настройте переменные окружения в .env
npm run dev
```

API будет доступен по адресу: `http://localhost:3000`

## 🏗️ Архитектура Backend

### Структура проекта
```
backend/
├── src/
│   ├── app.js              # Express приложение
│   ├── server.js           # HTTP сервер
│   ├── config/
│   │   ├── config.js       # Конфигурация приложения
│   │   └── database.js     # MongoDB подключение
│   ├── controllers/        # Контроллеры API
│   │   ├── adminController.js      # Административные функции
│   │   ├── imageController.js      # Генерация изображений
│   │   ├── paymentController.js    # Платежная система
│   │   ├── uploadController.js     # Загрузка на стоки
│   │   └── userController.js       # Управление пользователями
│   ├── middleware/         # Middleware
│   │   ├── errorHandler.js         # Обработка ошибок
│   │   ├── rateLimiter.js          # Rate limiting
│   │   └── subscriptionCheck.js    # Проверка подписки
│   ├── models/            # MongoDB модели
│   │   ├── User.js                 # Пользователи
│   │   ├── Image.js                # Изображения
│   │   ├── Payment.js              # Платежи
│   │   ├── WebhookLog.js           # Webhook логи
│   │   ├── AppConfig.js            # Конфигурация
│   │   └── ConfigAuditLog.js       # Аудит конфигурации
│   ├── routes/            # API маршруты
│   │   ├── admin.js               # /api/admin/*
│   │   ├── images.js              # /api/images/*
│   │   ├── payments.js            # /api/payments/*
│   │   ├── upload.js              # /api/upload/*
│   │   └── users.js               # /api/users/*
│   ├── services/          # Бизнес-логика
│   │   ├── configService.js       # Динамическая конфигурация
│   │   ├── imageService.js        # Генерация изображений
│   │   ├── paymentService.js      # Платежная система
│   │   ├── ftpService.js          # FTP загрузка
│   │   ├── stockUploadService.js  # Стоковые сервисы
│   │   └── aiProviders/           # AI провайдеры
│   │       ├── juggernautProFluxService.js
│   │       ├── hiDreamI1Service.js
│   │       └── seedreamV3Service.js
│   └── utils/             # Утилиты
│       ├── encryption.js          # Шифрование данных
│       ├── logger.js              # Логирование
│       └── mock-image-urls.js     # Fallback изображения
├── temp/                  # Временные файлы
├── package.json
└── .env.example
```

### Express.js Pipeline
```
Request → API Routes → Middleware Stack → Controllers → Services → Database/External APIs
```

### Middleware Stack
1. **Security Headers** (Helmet)
2. **CORS** - Cross-origin requests
3. **Compression** - Response compression
4. **Body Parsing** - JSON/URL-encoded
5. **HTTP Logging** (Morgan)
6. **Rate Limiting** - Anti-abuse protection
7. **Subscription Check** - Balance validation
8. **Validation** (express-validator)
9. **Error Handling** - Centralized error processing

## 📋 API Reference

### Health & Status
```
GET    /health                     - Basic health check
GET    /api/health                 - API health check with rate limiting
GET    /api/admin/health           - Admin health check
GET    /api/admin/status           - System status with AI providers
```

### Images API (`/api/images/*`)
```
POST   /api/images/generate                    - Generate image
GET    /api/images/user/:userId               - User's images
GET    /api/images/external/:externalId/:externalSystem - By external ID
GET    /api/images/:imageId                   - Get image details
GET    /api/images/:imageId/file              - Download image file
GET    /api/images/:imageId/thumbnail         - Get thumbnail
PUT    /api/images/:imageId/metadata          - Update metadata
DELETE /api/images/:imageId                   - Delete image
POST   /api/images/:imageId/upload/:service   - Upload to stock service
GET    /api/images/:imageId/uploads           - Upload status
POST   /api/images/:imageId/retry/:service    - Retry upload
```

### Upload API (`/api/upload/*`)
```
POST   /api/upload/123rf                      - Upload to 123RF
POST   /api/upload/:service                   - Universal upload
POST   /api/upload/batch/:service             - Batch upload
GET    /api/upload/status/:imageId            - Upload status
POST   /api/upload/retry/:imageId/:service    - Retry upload
POST   /api/upload/test/:service              - Test connection
GET    /api/upload/stats/:userId              - Upload statistics
DELETE /api/upload/:imageId/:service          - Cancel upload
```

### Users API (`/api/users/*`)
```
POST   /api/users                             - Create/get user
GET    /api/users/:userId                     - Get user
GET    /api/users/external/:externalId/:externalSystem - By external ID
PUT    /api/users/:userId/profile             - Update profile
PUT    /api/users/:userId/preferences         - Update preferences
GET    /api/users/:userId/stock-services      - Stock services
PUT    /api/users/:userId/stock-services/:service - Update service
DELETE /api/users/:userId/stock-services/:service - Delete service
POST   /api/users/:userId/stock-services/:service/test - Test service
GET    /api/users/:userId/stats               - User statistics
PUT    /api/users/:userId/subscription        - Update subscription
DELETE /api/users/:userId                     - Delete user
GET    /api/users/stats/system                - System statistics
```

### Payments API (`/api/payments/*`)
```
POST   /api/payments/create                   - Create payment
POST   /api/payments/webhook                  - YooMoney webhook
GET    /api/payments/status/:paymentId        - Payment status
GET    /api/payments/subscription/:userId     - Subscription info
GET    /api/payments/success                  - Success page
GET    /api/payments/plans                    - Available plans
GET    /api/payments/history/:userId          - Payment history
GET    /api/payments/recent-completed         - Recent payments (for bot)
```

### Admin API (`/api/admin/*`)
```
GET    /api/admin/health                      - Health check
GET    /api/admin/status                      - System status
GET    /api/admin/config                      - Get configuration
PUT    /api/admin/config                      - Update configuration
POST   /api/admin/config/reload               - Reload configuration
PUT    /api/admin/config/model/:modelName     - Switch model
POST   /api/admin/config/ai-model/switch      - Switch AI model
GET    /api/admin/config/ai-models            - List AI models
GET    /api/admin/config/ai-models/available  - Available models
GET    /api/admin/config/ai-models/history    - Switch history
GET    /api/admin/config/logs                 - Configuration logs
GET    /api/admin/configs                     - All configurations
```

Подробная документация Admin API: [../doc/ADMIN_API_GUIDE.md](../doc/ADMIN_API_GUIDE.md)

## 🔧 Конфигурация

### Переменные окружения

#### Обязательные
```bash
# Database
MONGODB_URI=mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin

# AI Providers
OPENAI_API_KEY=your_openai_api_key
SEGMIND_API_KEY=your_segmind_api_key

# Payment System
YOOMONEY_CLIENT_ID=your_yoomoney_client_id
YOOMONEY_WALLET=your_yoomoney_wallet
YOOMONEY_WEBHOOK_SECRET=your_webhook_secret

# Security
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_exactly_32_characters
```

#### Опциональные
```bash
# Server
PORT=3000
NODE_ENV=development

# AI Provider URLs
OPENAI_BASE_URL=https://api.openai.com/v1
SEGMIND_BASE_URL=https://api.segmind.com/v1

# Timeouts (milliseconds)
OPENAI_TIMEOUT=60000
SEGMIND_TIMEOUT=120000

# FTP (123RF)
FTP_HOST=ftp.123rf.com
FTP_PORT=21
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_REMOTE_PATH=/ai_image
FTP_SECURE=false
FTP_TIMEOUT=30000

# File handling
TEMP_DIR=./temp
MAX_FILE_SIZE=10485760
CLEANUP_INTERVAL=86400000

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# CORS
ALLOWED_ORIGINS=localhost:3000,localhost:3001

# Logging
LOG_LEVEL=info
```

### Полный список переменных в `.env.example`

## 🤖 AI Models Integration

### Поддерживаемые модели
1. **Juggernaut Pro Flux** (по умолчанию) - Segmind API
2. **DALL-E 3** - OpenAI API
3. **Seedream V3** - Segmind API
4. **HiDream-I1 Fast** - Segmind API

### Система фоллбеков
- Автоматическое переключение при сбоях
- Настраиваемый порядок приоритета
- Fallback на mock изображения

Подробнее: [../doc/AI_MODELS_GUIDE.md](../doc/AI_MODELS_GUIDE.md)

## 💳 Payment System

### YooMoney Integration
- Создание платежей через API
- Webhook обработка для автоматического подтверждения
- Управление подписками и балансом изображений
- Уведомления в Telegram

### Subscription Management
- Автоматическое списание изображений
- Проверка баланса через middleware
- Блокировка генерации при нулевом балансе
- История платежей и аудит

## 🔒 Безопасность

### Шифрование данных
- AES-256-GCM для чувствительных данных
- Шифрование FTP паролей в MongoDB
- Безопасное хранение API ключей

### Rate Limiting
```javascript
// Общий API
100 requests / 15 minutes

// Генерация изображений
10 requests / 5 minutes

// Загрузки
20 requests / 10 minutes

// Создание аккаунтов
5 requests / hour

// Платежи
30 requests / 15 minutes
```

### Валидация
- express-validator для всех входных данных
- Sanitization пользовательского ввода
- Проверка типов и форматов

### Security Headers
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- HSTS (в продакшене)

## 📊 Мониторинг и логирование

### Логирование
```javascript
// Development: человекочитаемый формат
// Production: JSON формат для структурированного анализа

// Уровни: error, warn, info, debug
LOG_LEVEL=info
```

### Health Checks
```bash
# Basic health
curl http://localhost:3000/health

# API health with details
curl http://localhost:3000/api/health

# Admin status with AI providers
curl http://localhost:3000/api/admin/status
```

### Метрики
- Время ответа API
- Статус AI провайдеров
- Успешность генерации изображений
- Статистика платежей
- Использование ресурсов

## 🧪 Тестирование

### Примеры API запросов

#### Генерация изображения
```bash
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful landscape with mountains",
    "userId": "user123",
    "userExternalId": "telegram_user_456",
    "options": {
      "model": "juggernaut-pro-flux",
      "size": "1024x1024"
    }
  }'
```

#### Создание платежа
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user123",
    "telegramId": "telegram_user_456",
    "planId": "plan_100_images",
    "returnUrl": "https://t.me/your_bot"
  }'
```

#### Переключение AI модели
```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "reason": "Testing OpenAI model"
  }'
```

#### Загрузка на 123RF
```bash
curl -X POST http://localhost:3000/api/upload/123rf \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "img_123",
    "userId": "user123",
    "title": "Beautiful Mountain Landscape",
    "description": "AI-generated landscape with mountains",
    "keywords": ["landscape", "mountains", "nature", "ai"],
    "category": "Digital Art"
  }'
```

## 🐳 Docker Development

### Docker команды
```bash
# Запуск backend + MongoDB
npm run docker:up

# Запуск с пересборкой
npm run docker:up:build

# Остановка
npm run docker:down

# Просмотр логов
npm run docker:logs

# Только MongoDB
npm run docker:mongo

# С инструментами (Mongo Express)
npm run docker:tools
```

### Docker Compose структура
- **backend**: Node.js API (build из Dockerfile)
- **mongodb**: MongoDB 7.0.5 с персистентным storage
- **mongo-express**: Web UI для MongoDB (опционально)

### Volumes и Networks
- **mongodb_data**: Персистентное хранение данных
- **ai-stock-bot-network**: Изолированная сеть
- **Hot reload**: Код монтируется для live обновлений

## 🔧 Разработка

### Локальная разработка
```bash
# Установка зависимостей
npm install

# Запуск в режиме разработки (с hot reload)
npm run dev

# Запуск в продакшене
npm start

# Линтинг
npm run lint

# Форматирование кода
npm run format
```

### Структура сервисов

#### ImageService
- Оркестрация генерации изображений
- Управление AI провайдерами
- Система фоллбеков
- Обработка изображений (Sharp)
- Потоковая передача

#### PaymentService
- Интеграция с YooMoney API
- Создание и обработка платежей
- Webhook processing
- Управление подписками
- Уведомления в Telegram

#### ConfigService
- Динамическое управление конфигурацией
- Polling механизм (30 секунд)
- Кэширование конфигурации
- Аудит изменений
- Переключение AI моделей

#### FtpService
- Подключение к FTP серверам
- Загрузка файлов с метаданными
- Тестирование соединений
- Retry механизмы

## 📈 Производительность

### Оптимизации
- Кэширование конфигурации в памяти
- Потоковая передача изображений
- Сжатие HTTP ответов
- Индексы MongoDB для быстрых запросов
- Connection pooling для MongoDB

### Масштабирование
- Stateless архитектура для горизонтального масштабирования
- Load balancer ready
- Поддержка кластеризации
- Файловое хранилище может быть заменено на S3/MinIO

## 🚧 Roadmap

### Реализовано ✅
- Множественные AI провайдеры
- Система платежей YooMoney
- Динамическая конфигурация
- Административная панель
- Шифрование данных
- Rate limiting
- Потоковая передача изображений

### В разработке 🔄
- Unit и интеграционные тесты
- Swagger/OpenAPI документация
- Метрики и мониторинг (Prometheus)
- Кэширование (Redis)

### Планируется 📋
- S3/MinIO для файлового хранилища
- Дополнительные стоковые сервисы
- GraphQL API
- WebSocket для real-time обновлений
- Batch processing API

## 📝 Лицензия

MIT License

## 🤝 Contributing

1. Fork репозитория
2. Создайте feature branch
3. Следуйте code style (ESLint + Prettier)
4. Добавьте тесты для новой функциональности
5. Убедитесь, что все тесты проходят
6. Создайте Pull Request

## 📞 Поддержка

Для технических вопросов по backend:
1. Проверьте логи: `docker-compose logs backend`
2. Проверьте health check: `curl http://localhost:3000/api/health`
3. Изучите [документацию](../doc/README.md)
4. Создайте Issue в GitHub
