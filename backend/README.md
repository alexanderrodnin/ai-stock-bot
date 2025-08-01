# AI Stock Bot Backend API

RESTful API backend для AI Stock Bot - системы генерации изображений с множественными AI моделями, интегрированной системой платежей YooMoney и автоматической загрузки на стоковые площадки.

## 📋 Содержание

- [Быстрый старт](#-быстрый-старт)
- [Архитектура Backend](#️-архитектура-backend)
- [API Reference](#-api-reference)
- [Конфигурация](#-конфигурация)
- [Интеграции](#-интеграции)
- [База данных](#-база-данных)
- [Безопасность](#-безопасность)
- [Мониторинг и логирование](#-мониторинг-и-логирование)
- [Тестирование](#-тестирование)
- [Docker Development](#-docker-development)
- [Поддержка](#-поддержка)

## 🚀 Быстрый старт

### Предварительные требования
- **Node.js** 18+ (рекомендуется 20+)
- **MongoDB** 7.0+ 
- **Docker** и Docker Compose (для контейнеризации)
- API ключи: OpenAI, Segmind, YooMoney

### Установка и запуск

#### Через Docker (рекомендуется)
```bash
# Из корневой директории проекта
docker-compose --profile backend up -d

# Проверка статуса
curl http://localhost:3000/health
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

### Быстрая проверка
```bash
# Health check
curl http://localhost:3000/health

# API health с деталями
curl http://localhost:3000/api/health

# Admin статус с AI провайдерами
curl http://localhost:3000/api/admin/status
```

## 🏗️ Архитектура Backend

### Общая архитектура системы

AI Stock Bot backend построен на **слоистой архитектуре** с четким разделением ответственности:

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Layer (Express.js)                  │
├─────────────────────────────────────────────────────────────┤
│                    Middleware Stack                         │
│  Security │ CORS │ Compression │ Parsing │ Rate Limiting    │
├─────────────────────────────────────────────────────────────┤
│                    API Routes Layer                         │
│  /api/admin │ /api/images │ /api/payments │ /api/upload     │
├─────────────────────────────────────────────────────────────┤
│                   Controllers Layer                         │
│  Request validation │ Response formatting │ Error handling  │
├─────────────────────────────────────────────────────────────┤
│                   Services Layer                            │
│  Business Logic │ External APIs │ Data Processing           │
├─────────────────────────────────────────────────────────────┤
│                   Models Layer                              │
│  MongoDB Schemas │ Data Validation │ Relationships          │
├─────────────────────────────────────────────────────────────┤
│                   Data Layer                                │
│  MongoDB │ File System │ External APIs                      │
└─────────────────────────────────────────────────────────────┘
```

### Структура проекта

```
backend/
├── src/
│   ├── app.js                      # Express приложение и middleware
│   ├── server.js                   # HTTP сервер и graceful shutdown
│   │
│   ├── config/                     # Конфигурация системы
│   │   ├── config.js               # Центральная конфигурация
│   │   └── database.js             # MongoDB подключение и настройки
│   │
│   ├── controllers/                # HTTP контроллеры (API endpoints)
│   │   ├── adminController.js      # Административные функции
│   │   ├── imageController.js      # Генерация и управление изображениями
│   │   ├── paymentController.js    # Платежная система YooMoney
│   │   ├── uploadController.js     # Загрузка на стоковые сервисы
│   │   └── userController.js       # Управление пользователями
│   │
│   ├── middleware/                 # Express middleware
│   │   ├── errorHandler.js         # Централизованная обработка ошибок
│   │   ├── rateLimiter.js          # Rate limiting и anti-abuse
│   │   └── subscriptionCheck.js    # Проверка баланса изображений
│   │
│   ├── models/                     # MongoDB модели (Mongoose)
│   │   ├── User.js                 # Пользователи и подписки
│   │   ├── Image.js                # Сгенерированные изображения
│   │   ├── Payment.js              # Платежи и транзакции
│   │   ├── WebhookLog.js           # Логи webhook уведомлений
│   │   ├── AppConfig.js            # Динамическая конфигурация
│   │   └── ConfigAuditLog.js       # Аудит изменений конфигурации
│   │
│   ├── routes/                     # API маршруты
│   │   ├── index.js                # Главный роутер
│   │   ├── admin.js                # /api/admin/* - административные функции
│   │   ├── images.js               # /api/images/* - работа с изображениями
│   │   ├── payments.js             # /api/payments/* - платежная система
│   │   ├── upload.js               # /api/upload/* - загрузка на стоки
│   │   └── users.js                # /api/users/* - управление пользователями
│   │
│   ├── services/                   # Бизнес-логика и внешние интеграции
│   │   ├── configService.js        # Динамическая конфигурация (Singleton)
│   │   ├── imageService.js         # Оркестрация генерации изображений
│   │   ├── paymentService.js       # Интеграция с YooMoney API
│   │   ├── ftpService.js           # FTP загрузка файлов
│   │   ├── stockUploadService.js   # Загрузка на стоковые сервисы
│   │   └── aiProviders/            # AI провайдеры (Factory pattern)
│   │       ├── juggernautProFluxService.js  # Segmind Juggernaut Pro Flux
│   │       ├── hiDreamI1Service.js          # Segmind HiDream-I1 Fast
│   │       └── seedreamV3Service.js         # Segmind Seedream V3
│   │
│   └── utils/                      # Утилиты и вспомогательные функции
│       ├── encryption.js           # AES-256-GCM шифрование
│       ├── logger.js               # Структурированное логирование
│       └── mock-image-urls.js      # Fallback изображения
│
├── temp/                           # Временные файлы изображений
├── test/                           # Тесты (в разработке)
├── docker/                         # Docker конфигурация
├── package.json                    # NPM зависимости и скрипты
├── Dockerfile                      # Docker образ для production
└── .env.example                    # Пример переменных окружения
```

### Архитектурные паттерны

#### 1. **Layered Architecture (Слоистая архитектура)**
- **Presentation Layer**: Routes + Controllers
- **Business Layer**: Services
- **Data Access Layer**: Models + Database

#### 2. **Dependency Injection**
```javascript
// Сервисы инжектируются в контроллеры
const imageService = require('../services/imageService');
const configService = require('../services/configService');
```

#### 3. **Singleton Pattern**
```javascript
// ConfigService - единственный экземпляр для кэширования
class ConfigService {
  static instance = null;
  static getInstance() {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }
}
```

#### 4. **Factory Pattern**
```javascript
// AI Provider Factory для создания провайдеров
const createAIProvider = (modelName) => {
  switch(modelName) {
    case 'juggernaut-pro-flux': return new JuggernautProFluxService();
    case 'dall-e-3': return new OpenAIService();
    // ...
  }
};
```

#### 5. **Event-Driven Architecture**
```javascript
// Webhook обработка через события
eventEmitter.on('payment.completed', async (paymentData) => {
  await updateUserBalance(paymentData);
  await sendNotification(paymentData);
});
```

### Express.js Pipeline

```
HTTP Request
    ↓
Security Headers (Helmet)
    ↓
CORS Configuration
    ↓
Response Compression (gzip)
    ↓
Body Parsing (JSON/URL-encoded)
    ↓
HTTP Request Logging (Morgan)
    ↓
Rate Limiting (по endpoint)
    ↓
Subscription Check (для платных API)
    ↓
Request Validation (express-validator)
    ↓
Route Handler (Controller)
    ↓
Business Logic (Service)
    ↓
Database/External API
    ↓
Response Formatting
    ↓
Error Handling (если ошибка)
    ↓
HTTP Response
```

### Ключевые компоненты

#### **ConfigService** (Singleton)
- **Назначение**: Динамическое управление конфигурацией AI моделей
- **Polling механизм**: Проверка обновлений каждые 30 секунд
- **Кэширование**: In-memory кэш для быстрого доступа
- **Audit trail**: Полное логирование всех изменений

```javascript
// Пример использования
const config = await configService.getAIModelsConfig();
const activeModel = config.activeModel; // "juggernaut-pro-flux"
```

#### **ImageService** (Orchestrator)
- **Pipeline обработки**: Генерация → Обработка → Сохранение
- **Система фоллбеков**: Автоматическое переключение между AI моделями
- **Потоковая передача**: Streaming для больших файлов
- **Обработка изображений**: Sharp для resize и оптимизации

#### **PaymentService** (Integration)
- **YooMoney API**: Создание платежей и webhook обработка
- **Subscription management**: Управление балансом изображений
- **Transaction logging**: Полный аудит всех операций

#### **AI Provider Services** (Factory)
- **Абстракция**: Единый интерфейс для разных провайдеров
- **Retry logic**: Автоматические повторы при сбоях
- **Response normalization**: Унификация ответов от разных API

## 📋 API Reference

### Health & Status Endpoints
```http
GET    /health                     # Базовая проверка работоспособности
GET    /api/health                 # API health check с rate limiting
GET    /api/admin/health           # Административная проверка
GET    /api/admin/status           # Полный статус системы с AI провайдерами
```

### Images API (`/api/images/*`)
**Генерация и управление изображениями**

```http
POST   /api/images/generate                    # Генерация изображения
GET    /api/images/user/:userId               # Изображения пользователя
GET    /api/images/external/:externalId/:externalSystem # По внешнему ID
GET    /api/images/:imageId                   # Детали изображения
GET    /api/images/:imageId/file              # Скачивание файла
GET    /api/images/:imageId/thumbnail         # Получение thumbnail
PUT    /api/images/:imageId/metadata          # Обновление метаданных
DELETE /api/images/:imageId                   # Удаление изображения
POST   /api/images/:imageId/upload/:service   # Загрузка на стоковый сервис
GET    /api/images/:imageId/uploads           # Статус загрузок
POST   /api/images/:imageId/retry/:service    # Повтор загрузки
```

### Upload API (`/api/upload/*`)
**Загрузка на стоковые сервисы**

```http
POST   /api/upload/123rf                      # Загрузка на 123RF
POST   /api/upload/:service                   # Универсальная загрузка
POST   /api/upload/batch/:service             # Пакетная загрузка
GET    /api/upload/status/:imageId            # Статус загрузки
POST   /api/upload/retry/:imageId/:service    # Повтор загрузки
POST   /api/upload/test/:service              # Тест соединения
GET    /api/upload/stats/:userId              # Статистика загрузок
DELETE /api/upload/:imageId/:service          # Отмена загрузки
```

### Users API (`/api/users/*`)
**Управление пользователями**

```http
POST   /api/users                             # Создание/получение пользователя
GET    /api/users/:userId                     # Получение пользователя
GET    /api/users/external/:externalId/:externalSystem # По внешнему ID
PUT    /api/users/:userId/profile             # Обновление профиля
PUT    /api/users/:userId/preferences         # Обновление настроек
GET    /api/users/:userId/stock-services      # Стоковые сервисы
PUT    /api/users/:userId/stock-services/:service # Обновление сервиса
DELETE /api/users/:userId/stock-services/:service # Удаление сервиса
POST   /api/users/:userId/stock-services/:service/test # Тест сервиса
GET    /api/users/:userId/stats               # Статистика пользователя
PUT    /api/users/:userId/subscription        # Обновление подписки
DELETE /api/users/:userId                     # Удаление пользователя
GET    /api/users/stats/system                # Системная статистика
```

### Payments API (`/api/payments/*`)
**Платежная система YooMoney**

```http
POST   /api/payments/create                   # Создание платежа
POST   /api/payments/webhook                  # YooMoney webhook
GET    /api/payments/status/:paymentId        # Статус платежа
GET    /api/payments/subscription/:userId     # Информация о подписке
GET    /api/payments/success                  # Страница успеха
GET    /api/payments/plans                    # Доступные тарифы
GET    /api/payments/history/:userId          # История платежей
GET    /api/payments/recent-completed         # Недавние платежи (для бота)
```

### Admin API (`/api/admin/*`)
**Административное управление**

```http
GET    /api/admin/health                      # Health check
GET    /api/admin/status                      # Статус системы
GET    /api/admin/config                      # Получение конфигурации
PUT    /api/admin/config                      # Обновление конфигурации
POST   /api/admin/config/reload               # Перезагрузка конфигурации
PUT    /api/admin/config/model/:modelName     # Переключение модели
POST   /api/admin/config/ai-model/switch      # Переключение AI модели
GET    /api/admin/config/ai-models            # Список AI моделей
GET    /api/admin/config/ai-models/available  # Доступные модели
GET    /api/admin/config/ai-models/history    # История переключений
GET    /api/admin/config/logs                 # Логи конфигурации
GET    /api/admin/configs                     # Все конфигурации
```

**Подробная документация Admin API:** [../doc/ADMIN_API_GUIDE.md](../doc/ADMIN_API_GUIDE.md)

## 🔧 Конфигурация

### Переменные окружения

#### Обязательные переменные
```bash
# База данных
MONGODB_URI=mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin

# AI провайдеры
OPENAI_API_KEY=your_openai_api_key_here
SEGMIND_API_KEY=your_segmind_api_key_here

# Платежная система YooMoney
YOOMONEY_CLIENT_ID=your_yoomoney_client_id
YOOMONEY_WALLET=your_yoomoney_wallet_number
YOOMONEY_WEBHOOK_SECRET=your_webhook_secret_key

# Безопасность
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long
ENCRYPTION_KEY=your_encryption_key_exactly_32_characters
```

#### Опциональные переменные
```bash
# Сервер
PORT=3000
NODE_ENV=development
HOST=0.0.0.0

# AI провайдеры - URLs
OPENAI_BASE_URL=https://api.openai.com/v1
SEGMIND_BASE_URL=https://api.segmind.com/v1

# Таймауты (миллисекунды)
OPENAI_TIMEOUT=60000
SEGMIND_TIMEOUT=120000
HTTP_TIMEOUT=30000

# FTP для 123RF
FTP_HOST=ftp.123rf.com
FTP_PORT=21
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_REMOTE_PATH=/ai_image
FTP_SECURE=false
FTP_TIMEOUT=30000

# Файловая система
TEMP_DIR=./temp
MAX_FILE_SIZE=10485760
CLEANUP_INTERVAL=86400000

# Rate limiting
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# CORS
ALLOWED_ORIGINS=localhost:3000,localhost:3001
CORS_CREDENTIALS=true

# Логирование
LOG_LEVEL=info
LOG_FORMAT=combined
```

### Конфигурационные файлы

#### `src/config/config.js`
Центральная конфигурация приложения с валидацией переменных окружения:

```javascript
module.exports = {
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development'
  },
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    }
  },
  aiModels: {
    fallbackOrder: [
      'juggernaut-pro-flux',
      'hidream-i1-fast',
      'seedream-v3',
      'dall-e-3'
    ],
    defaultModel: 'juggernaut-pro-flux'
  }
};
```

### Полный список переменных в `.env.example`

## 🔗 Интеграции

### AI Models Integration

Система поддерживает множественные AI провайдеры с динамическим переключением:

#### Поддерживаемые модели:
1. **Juggernaut Pro Flux** (по умолчанию) - Segmind API
2. **DALL-E 3** - OpenAI API  
3. **Seedream V3** - Segmind API
4. **HiDream-I1 Fast** - Segmind API

#### Ключевые возможности:
- **Динамическое переключение** без перезапуска системы
- **Каскадная система фоллбеков** при сбоях
- **Polling механизм** для обновления конфигурации
- **Audit trail** всех изменений

**Подробная документация:** [../doc/AI_MODELS_GUIDE.md](../doc/AI_MODELS_GUIDE.md)

### Payment System Integration

#### YooMoney Integration:
- **Создание платежей** через YooMoney API
- **Webhook обработка** для автоматического подтверждения
- **Управление подписками** и балансом изображений
- **Уведомления** в Telegram при успешной оплате

#### Subscription Management:
- **Автоматическое списание** изображений при генерации
- **Проверка баланса** через middleware
- **Блокировка генерации** при нулевом балансе
- **История платежей** и полный аудит

**Подробная документация:** [../doc/PAYMENT_SYSTEM_GUIDE.md](../doc/PAYMENT_SYSTEM_GUIDE.md)

### Stock Services Integration

#### 123RF FTP Integration:
- **Автоматическая загрузка** изображений на 123RF
- **Метаданные** (title, description, keywords)
- **Retry механизм** при сбоях загрузки
- **Тестирование соединения** перед загрузкой

#### Планируемые интеграции:
- Shutterstock API
- Adobe Stock API
- Getty Images API

## 🗄️ База данных

### MongoDB Architecture

Система использует **MongoDB 7.0.5** с **Mongoose ODM** для работы с данными.

#### Основные коллекции:
- **Users** - пользователи, подписки, настройки стоковых сервисов
- **Images** - сгенерированные изображения и метаданные
- **Payments** - платежи и транзакции YooMoney
- **AppConfig** - динамическая конфигурация системы
- **ConfigAuditLog** - аудит изменений конфигурации
- **WebhookLog** - логи webhook уведомлений

#### Ключевые особенности:
- **Document-oriented** подход с гибкими схемами
- **Embedded documents** для связанных данных
- **Оптимизированные индексы** для частых запросов
- **Автоматические миграции** при обновлениях

**Подробная документация:** [../doc/DATABASE_GUIDE.md](../doc/DATABASE_GUIDE.md)

## 🔒 Безопасность

### Шифрование данных

#### AES-256-GCM Encryption:
```javascript
// Шифрование чувствительных данных
const encryptedPassword = encrypt(ftpPassword, ENCRYPTION_KEY);
const decryptedPassword = decrypt(encryptedData, ENCRYPTION_KEY);
```

#### Защищенные данные:
- FTP пароли в MongoDB
- API ключи в переменных окружения
- Webhook секреты для валидации

### Rate Limiting

Многоуровневая система ограничений:

```javascript
// Общий API
100 requests / 15 minutes

// Генерация изображений  
10 requests / 5 minutes

// Загрузки на стоки
20 requests / 10 minutes

// Создание аккаунтов
5 requests / hour

// Платежи
30 requests / 15 minutes

// Admin API
50 requests / 15 minutes
```

### Валидация и санитизация

#### express-validator:
```javascript
// Валидация входных данных
body('prompt')
  .isLength({ min: 1, max: 4000 })
  .trim()
  .escape(),
body('userId')
  .isMongoId()
  .withMessage('Invalid user ID')
```

#### Sanitization:
- HTML escape для пользовательского ввода
- MongoDB injection protection
- XSS protection через Content Security Policy

### Security Headers

#### Helmet.js configuration:
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Webhook Security

#### YooMoney webhook validation:
```javascript
const crypto = require('crypto');

function validateWebhook(body, signature, secret) {
  const hash = crypto
    .createHash('sha1')
    .update(body + secret)
    .digest('hex');
  return hash === signature;
}
```

## 📊 Мониторинг и логирование

### Структурированное логирование

#### Winston Logger:
```javascript
// Development: человекочитаемый формат
// Production: JSON формат для анализа

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

#### Логируемые события:
- HTTP запросы и ответы
- AI модель переключения
- Платежные транзакции
- Ошибки генерации изображений
- Webhook обработка
- Database операции

### Health Checks

#### Многоуровневые проверки:
```bash
# Базовая проверка сервера
GET /health
# Response: { "status": "ok", "timestamp": "..." }

# API health с деталями
GET /api/health  
# Response: { "status": "healthy", "database": "connected", "uptime": 3600 }

# Административная проверка
GET /api/admin/health
# Response: { "configService": "running", "activeModel": "juggernaut-pro-flux" }

# Полный статус системы
GET /api/admin/status
# Response: Детальная информация о всех компонентах
```

### Метрики производительности

#### Отслеживаемые метрики:
- **Время ответа API** по endpoints
- **Статус AI провайдеров** и успешность генерации
- **Статистика платежей** и конверсия
- **Использование ресурсов** (CPU, память, диск)
- **Database performance** (query time, connections)
- **Error rates** по типам ошибок

#### Пример метрик:
```javascript
// Время генерации изображений
{
  "metric": "image_generation_duration",
  "value": 12.5,
  "unit": "seconds",
  "model": "juggernaut-pro-flux",
  "timestamp": "2025-01-28T17:00:00.000Z"
}

// Успешность платежей
{
  "metric": "payment_success_rate",
  "value": 0.95,
  "period": "24h",
  "timestamp": "2025-01-28T17:00:00.000Z"
}
```

### Error Tracking

#### Централизованная обработка ошибок:
```javascript
// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    requestId: req.id
  });
});
```

## 🧪 Тестирование

### Примеры API запросов

#### Генерация изображения
```bash
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful mountain landscape at sunset",
    "userId": "507f1f77bcf86cd799439011",
    "userExternalId": "telegram_123456789",
    "userExternalSystem": "telegram",
    "options": {
      "model": "juggernaut-pro-flux",
      "size": "1024x1024",
      "quality": "hd"
    }
  }'
```

#### Создание платежа
```bash
curl -X POST http://localhost:3000/api/payments/create \
  -H "Content-Type: application/json" \
  -d '{
    "telegramId": 123456789,
    "planId": "plan_100",
    "returnUrl": "https://t.me/your_bot"
  }'
```

#### Переключение AI модели
```bash
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{
    "model": "dall-e-3",
    "reason": "Testing OpenAI model for better quality"
  }'
```

#### Загрузка на 123RF
```bash
curl -X POST http://localhost:3000/api/upload/123rf \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "507f1f77bcf86cd799439012",
    "userId": "507f1f77bcf86cd799439011",
    "title": "Beautiful Mountain Landscape at Sunset",
    "description": "AI-generated landscape featuring mountains during golden hour",
    "keywords": ["landscape", "mountains", "sunset", "nature", "ai-generated"],
    "category": "Nature"
  }'
```

#### Получение статуса системы
```bash
curl http://localhost:3000/api/admin/status
```


## 🐳 Docker Development

### Docker команды

#### Основные команды
```bash
# Запуск backend + MongoDB
npm run docker:up

# Запуск с пересборкой образов
npm run docker:up:build

# Остановка всех сервисов
npm run docker:down

# Просмотр логов
npm run docker:logs

# Логи конкретного сервиса
docker-compose logs backend
docker-compose logs mongodb

# Только MongoDB
npm run docker:mongo

# С инструментами разработки (Mongo Express)
npm run docker:tools
```

#### Управление данными
```bash
# Очистка volumes (ВНИМАНИЕ: удалит все данные)
docker-compose down -v

# Backup базы данных
docker exec ai-stock-bot-mongodb-1 mongodump --db ai-stock-bot --out /backup

# Restore базы данных
docker exec ai-stock-bot-mongodb-1 mongorestore --db ai-stock-bot /backup/ai-stock-bot
```

### Docker Compose структура

#### Основные сервисы
```yaml
# docker-compose.yml
services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
      target: development
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - MONGODB_URI=mongodb://admin:password@mongodb:27017/ai-stock-bot?authSource=admin
      - PORT=3000
    volumes:
      - ./backend:/app
      - /app/node_modules
    depends_on:
      - mongodb
    networks:
      - ai-stock-bot-network

  mongodb:
    image: mongo:7.0.5
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: ai-stock-bot
    volumes:
      - mongodb_data:/data/db
      - ./backend/docker/mongo-init:/docker-entrypoint-initdb.d
    networks:
      - ai-stock-bot-network

  tg-bot:
    build:
      context: ./tg-bot
      dockerfile: Dockerfile
      target: development
    environment:
      - NODE_ENV=development
      - BACKEND_API_URL=http://backend:3000
      - BOT_TOKEN=${BOT_TOKEN}
      - WEBHOOK_URL=${WEBHOOK_URL}
    volumes:
      - ./tg-bot:/app
      - /app/node_modules
    depends_on:
      - backend
    networks:
      - ai-stock-bot-network
    profiles:
      - bot

  mongo-express:
    image: mongo-express:1.0.2
    restart: unless-stopped
    ports:
      - "8081:8081"
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: admin
      ME_CONFIG_MONGODB_ADMINPASSWORD: password
      ME_CONFIG_MONGODB_SERVER: mongodb
      ME_CONFIG_MONGODB_PORT: 27017
      ME_CONFIG_BASICAUTH_USERNAME: admin
      ME_CONFIG_BASICAUTH_PASSWORD: admin123
    depends_on:
      - mongodb
    networks:
      - ai-stock-bot-network
    profiles:
      - tools
```

#### Volumes и Networks
```yaml
volumes:
  mongodb_data:
    driver: local

networks:
  ai-stock-bot-network:
    driver: bridge
```

#### Profiles для разных окружений
- **default**: backend + mongodb
- **tools**: + mongo-express для разработки
- **production**: оптимизированная конфигурация

#### Особенности конфигурации
- **Hot reload**: Код монтируется для live обновлений в development
- **Персистентные данные**: MongoDB данные сохраняются в volume
- **Изолированная сеть**: Все сервисы в отдельной Docker сети
- **Health checks**: Автоматическая проверка состояния сервисов
- **Graceful shutdown**: Корректное завершение работы контейнеров

### Dockerfile оптимизации

#### Multi-stage build для production:
```dockerfile
# Development stage
FROM node:18-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
CMD ["npm", "run", "dev"]

# Production stage
FROM node:18-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
USER node
CMD ["npm", "start"]
```


## � Поддержка

### Техническая поддержка

Для технических вопросов по backend:

1. **Проверьте логи**: `docker-compose logs backend`
2. **Health check**: `curl http://localhost:3000/api/health`
3. **Изучите документацию**: [../doc/README.md](../doc/README.md)
4. **Создайте Issue** в GitHub с детальным описанием

### Полезные ссылки

- **Основная документация**: [../doc/README.md](../doc/README.md)
- **Admin API**: [../doc/ADMIN_API_GUIDE.md](../doc/ADMIN_API_GUIDE.md)
- **AI Models**: [../doc/AI_MODELS_GUIDE.md](../doc/AI_MODELS_GUIDE.md)
- **Payment System**: [../doc/PAYMENT_SYSTEM_GUIDE.md](../doc/PAYMENT_SYSTEM_GUIDE.md)
- **Database**: [../doc/DATABASE_GUIDE.md](../doc/DATABASE_GUIDE.md)
- **Production**: [../doc/PRODUCTION.md](../doc/PRODUCTION.md)

### Контакты

- **GitHub Issues**: [https://github.com/alexanderrodnin/ai-stock-bot/issues](https://github.com/alexanderrodnin/ai-stock-bot/issues)
- **Документация**: [https://github.com/alexanderrodnin/ai-stock-bot/tree/main/doc](https://github.com/alexanderrodnin/ai-stock-bot/tree/main/doc)

---

**AI Stock Bot Backend** - мощная и масштабируемая система для генерации изображений с интегрированной монетизацией и автоматической загрузкой на стоковые площадки.
