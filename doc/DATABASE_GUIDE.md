# 🗄️ Database Guide - AI Stock Bot

Полное руководство по структуре базы данных MongoDB для AI Stock Bot системы.

## 📋 Содержание

- [Подключение к базе данных](#подключение-к-базе-данных)
- [Обзор архитектуры](#обзор-архитектуры)
- [Коллекции базы данных](#коллекции-базы-данных)
- [Связи между коллекциями](#связи-между-коллекциями)
- [Индексы и производительность](#индексы-и-производительность)
- [Схемы данных](#схемы-данных)
- [Миграции и версионирование](#миграции-и-версионирование)
- [Резервное копирование](#резервное-копирование)
- [Мониторинг и оптимизация](#мониторинг-и-оптимизация)

---

## 🔌 Подключение к базе данных

### Строки подключения

#### Development (локальная разработка)
```bash
# Через Docker Compose
mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin

# Прямое подключение к MongoDB
mongodb://localhost:27017/ai-stock-bot
```

#### Production (продакшн)
```bash
# С аутентификацией
mongodb://username:password@mongodb-host:27017/ai-stock-bot?authSource=admin

# С SSL/TLS
mongodb://username:password@mongodb-host:27017/ai-stock-bot?authSource=admin&ssl=true

# Replica Set
mongodb://user:pass@host1:27017,host2:27017,host3:27017/ai-stock-bot?replicaSet=rs0&authSource=admin
```

### Подключение через различные клиенты

#### 1. MongoDB Compass (GUI)
```
Connection String: mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin

Или заполните поля:
- Hostname: localhost
- Port: 27017
- Authentication: Username/Password
- Username: admin
- Password: password
- Authentication Database: admin
- Default Database: ai-stock-bot
```

#### 2. mongosh (CLI)
```bash
# Подключение к локальной БД
mongosh "mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin"

# Или пошагово
mongosh
use admin
db.auth("admin", "password")
use ai-stock-bot
```

#### 3. Через Docker
```bash
# Подключение к контейнеру MongoDB
docker exec -it ai-stock-bot-mongodb-1 mongosh

# Внутри контейнера
use admin
db.auth("admin", "password")
use ai-stock-bot
```

#### 4. Node.js приложение
```javascript
const mongoose = require('mongoose')

// Development
const mongoUri = 'mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin'

// Production с переменными окружения
const mongoUri = `mongodb://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${process.env.MONGO_DB}?authSource=admin`

mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
```

### Переменные окружения

#### .env файл для разработки
```bash
# MongoDB Configuration
MONGODB_URI=mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin
MONGO_HOST=localhost
MONGO_PORT=27017
MONGO_DB=ai-stock-bot
MONGO_USER=admin
MONGO_PASSWORD=password
MONGO_AUTH_SOURCE=admin
```

#### Docker Compose переменные
```yaml
environment:
  - MONGODB_URI=mongodb://admin:${MONGO_INITDB_ROOT_PASSWORD}@mongodb:27017/ai-stock-bot?authSource=admin
  - MONGO_INITDB_ROOT_USERNAME=admin
  - MONGO_INITDB_ROOT_PASSWORD=your_secure_password
```

### Проверка подключения

#### Тест подключения
```bash
# Простая проверка
mongosh "mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin" --eval "db.runCommand('ping')"

# Проверка статуса
mongosh "mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin" --eval "db.serverStatus().ok"
```

#### Health check в приложении
```javascript
const healthCheck = async () => {
  try {
    await mongoose.connection.db.admin().ping()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
    return false
  }
}
```

### Troubleshooting подключений

#### Частые проблемы

1. **Ошибка аутентификации**
```bash
# Проверьте учетные данные
mongosh --eval "db.runCommand({connectionStatus: 1})"

# Создание пользователя если нужно
use admin
db.createUser({
  user: "admin",
  pwd: "password",
  roles: ["root"]
})
```

2. **Сетевые проблемы**
```bash
# Проверка доступности порта
telnet localhost 27017
nc -zv localhost 27017

# Проверка Docker сети
docker network ls
docker network inspect ai-stock-bot_default
```

3. **Проблемы с SSL/TLS**
```bash
# Подключение без SSL для тестирования
mongodb://user:pass@host:27017/db?authSource=admin&ssl=false

# Проверка сертификатов
openssl s_client -connect mongodb-host:27017 -servername mongodb-host
```

4. **Проблемы с Replica Set**
```bash
# Проверка статуса replica set
rs.status()
rs.conf()

# Подключение к primary
mongodb://user:pass@host1:27017/db?replicaSet=rs0&readPreference=primary
```

### Мониторинг подключений

#### Активные подключения
```javascript
// Количество активных подключений
db.serverStatus().connections

// Детальная информация о подключениях
db.runCommand("currentOp")

// Статистика по операциям
db.runCommand("serverStatus").opcounters
```

#### Логирование подключений
```bash
# Включение логирования подключений
db.setLogLevel(2, "network")

# Просмотр логов
docker logs ai-stock-bot-mongodb-1 --tail 100 -f
```

---

## 🏗️ Обзор архитектуры

### Технологический стек
- **База данных**: MongoDB 7.0.5
- **ODM**: Mongoose 8.x
- **Драйвер**: MongoDB Node.js Driver
- **Контейнеризация**: Docker с официальным образом MongoDB

### Принципы проектирования
- **Document-oriented** - использование гибких JSON-подобных документов
- **Embedded documents** - вложенные структуры для связанных данных
- **References** - ObjectId ссылки для нормализации
- **Indexing strategy** - оптимизированные индексы для частых запросов
- **Schema validation** - Mongoose схемы с валидацией

---

## 📊 Коллекции базы данных

### 1. Users Collection 👥

**Назначение**: Центральная коллекция для управления пользователями системы

```javascript
{
  _id: ObjectId,
  externalId: String,           // Telegram ID или другой внешний ID
  externalSystem: String,       // "telegram", "web", "mobile", "api"
  
  // Профиль пользователя
  profile: {
    username: String,
    firstName: String,
    lastName: String,
    email: String,              // Валидация email
    avatar: String,
    language: String            // "en", "ru", "es", "fr", "de", "it", "pt", "zh", "ja"
  },
  
  // Предпочтения пользователя
  preferences: {
    image: {
      defaultModel: String,     // "dall-e-2", "dall-e-3"
      defaultSize: String,      // "256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"
      defaultQuality: String,   // "standard", "hd"
      defaultStyle: String      // "vivid", "natural"
    },
    notifications: {
      email: Boolean,
      push: Boolean
    },
    upload: {
      autoUpload: Boolean,
      defaultKeywords: [String]
    }
  },
  
  // Настройки стоковых сервисов (зашифрованные данные)
  stockServices: {
    rf123: {
      enabled: Boolean,
      credentials: {
        username: String,
        passwordHash: String,    // 🔒 Зашифровано AES-256
        ftpHost: String,
        ftpPort: Number,
        remotePath: String
      },
      settings: {
        autoUpload: Boolean,
        defaultCategory: String,
        defaultKeywords: [String],
        defaultDescription: String,
        pricing: String         // "standard", "premium", "exclusive"
      }
    },
    shutterstock: { /* аналогично */ },
    adobeStock: { /* аналогично */ }
  },
  
  // Статистика пользователя
  stats: {
    imagesGenerated: Number,
    imagesUploaded: Number,
    totalRequests: Number,
    lastActivity: Date
  },
  
  // Статус аккаунта
  status: String,               // "active", "inactive", "suspended", "deleted"
  
  // Подписка и платежи
  subscription: {
    plan: String,               // "free", "plan_10", "plan_100", "plan_1000", "plan_10000"
    imagesRemaining: Number,
    isActive: Boolean,
    purchasedAt: Date,
    lastPaymentId: String,
    
    // Legacy поля для обратной совместимости
    limits: {
      imagesPerDay: Number,
      imagesPerMonth: Number
    },
    usage: {
      imagesToday: Number,
      imagesThisMonth: Number,
      resetDate: Date
    }
  },
  
  // История платежей (ссылки)
  paymentHistory: [ObjectId],   // Ссылки на Payment документы
  
  // История транзакций
  transactions: [{
    type: String,               // "credit", "debit"
    amount: Number,
    description: String,
    paymentId: ObjectId,        // Ссылка на Payment
    createdAt: Date
  }],
  
  // Метаданные
  metadata: {
    ipAddress: String,
    userAgent: String,
    referrer: String,
    source: String
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Ключевые индексы**:
```javascript
// Уникальный составной индекс
{ externalId: 1, externalSystem: 1 } // unique: true

// Индексы для поиска
{ "profile.email": 1 }               // sparse: true
{ "profile.username": 1 }            // sparse: true
{ status: 1 }
{ createdAt: -1 }
{ "stats.lastActivity": -1 }

// Индексы для платежной системы
{ "subscription.isActive": 1 }
{ "subscription.plan": 1 }
{ "subscription.imagesRemaining": 1 }
```

---

### 2. Payments Collection 💳

**Назначение**: Управление платежами и подписками через YooMoney

```javascript
{
  _id: ObjectId,
  userId: ObjectId,             // Ссылка на Users
  telegramId: Number,           // Для уведомлений
  paymentId: String,            // Уникальный ID платежа
  yoomoneyOperationId: String,  // ID операции в YooMoney
  
  // Детали платежа
  amount: Number,               // Сумма в рублях
  currency: String,             // "RUB"
  status: String,               // "pending", "completed", "failed", "expired", "cancelled"
  label: String,                // Метка для YooMoney
  paymentUrl: String,           // Ссылка на оплату
  
  // Детали тарифа
  planType: String,             // "plan_10", "plan_100", "plan_1000", "plan_10000"
  imagesCount: Number,          // Количество изображений в тарифе
  
  // Временные метки
  createdAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  expiresAt: Date,              // Время истечения платежа
  
  // Данные от YooMoney
  yoomoneyData: Mixed,          // Полный ответ от YooMoney API
  attempts: Number,             // Количество попыток обработки
  
  updatedAt: Date
}
```

**Ключевые индексы**:
```javascript
{ paymentId: 1 }                      // unique: true
{ telegramId: 1, status: 1 }
{ status: 1, expiresAt: 1 }
{ userId: 1, createdAt: -1 }
{ createdAt: -1 }
```

---

### 3. Images Collection 🖼️

**Назначение**: Хранение информации о сгенерированных изображениях

```javascript
{
  _id: ObjectId,
  userId: ObjectId,             // Ссылка на Users
  userExternalId: String,       // Дублирование для быстрого поиска
  userExternalSystem: String,   // "telegram", "web", etc.
  
  // Детали генерации
  generation: {
    prompt: String,             // Оригинальный промпт (макс 4000 символов)
    revisedPrompt: String,      // Исправленный промпт от AI (макс 4000 символов)
    model: String,              // "dall-e-2", "dall-e-3", "juggernaut-pro-flux", "seedream-v3", "hidream-i1-fast"
    provider: String,           // "openai", "segmind", "fallback", "demo"
    usedSource: String,         // Источник изображения
    fallbackReason: String,     // Причина фоллбека если применимо
    
    // Параметры генерации
    size: String,               // "256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"
    quality: String,            // "standard", "hd"
    style: String,              // "vivid", "natural"
    
    generatedAt: Date,
    
    // Ответы от AI провайдеров
    openaiResponse: {           // Legacy для OpenAI
      created: Number,
      data: [{
        url: String,
        revised_prompt: String
      }]
    },
    aiResponse: Mixed,          // Унифицированный ответ от любого провайдера
    configVersion: Number       // Версия конфигурации при генерации
  },
  
  // Информация о файле
  file: {
    originalFilename: String,
    filename: String,           // Наше имя файла
    path: String,               // Путь к файлу
    size: Number,               // Размер в байтах
    mimeType: String,           // "image/jpeg", "image/png", "image/webp"
    width: Number,
    height: Number,
    hash: String,               // Хеш для дедупликации
    originalUrl: String         // Временный URL от AI провайдера
  },
  
  // Статусы загрузки на стоковые сервисы
  uploads: [{
    service: String,            // "123rf", "shutterstock", "adobeStock", "other"
    status: String,             // "pending", "uploading", "completed", "failed", "rejected"
    uploadedAt: Date,
    externalId: String,         // ID в стоковом сервисе
    uploadUrl: String,
    
    // Настройки загрузки
    settings: {
      title: String,            // Макс 200 символов
      description: String,      // Макс 2000 символов
      keywords: [String],
      category: String,
      pricing: String           // "standard", "premium", "exclusive"
    },
    
    // Информация об ошибках
    error: {
      message: String,
      code: String,
      details: Mixed
    },
    
    retries: Number,
    lastRetryAt: Date
  }],
  
  // Метаданные изображения
  metadata: {
    title: String,              // Макс 200 символов
    description: String,        // Макс 2000 символов
    keywords: [String],         // Пользовательские теги
    autoTags: [String],         // Автоматические теги от AI
    category: String,
    rating: String,             // "safe", "moderate", "adult"
    colors: [String]            // Доминирующие цвета
  },
  
  // Статус изображения
  status: String,               // "active", "archived", "deleted"
  
  // Статистика использования
  stats: {
    views: Number,
    downloads: Number,
    shares: Number
  },
  
  // Флаги и модерация
  flags: {
    isPublic: Boolean,
    isFeatured: Boolean,
    isModerated: Boolean,
    moderationResult: String,   // "approved", "rejected", "pending"
    moderationNotes: String
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Ключевые индексы**:
```javascript
{ userId: 1, createdAt: -1 }
{ userExternalId: 1, userExternalSystem: 1, createdAt: -1 }
{ "generation.prompt": "text", "metadata.title": "text", "metadata.description": "text" }
{ "file.hash": 1 }                    // sparse: true
{ status: 1, createdAt: -1 }
{ "uploads.service": 1, "uploads.status": 1 }
{ "metadata.keywords": 1 }
{ "metadata.category": 1 }
{ "flags.isPublic": 1, "flags.moderationResult": 1 }
```

---

### 4. AppConfig Collection ⚙️

**Назначение**: Динамическая конфигурация системы

```javascript
{
  _id: ObjectId,
  configKey: String,            // Уникальный ключ конфигурации
  configType: String,           // "system", "user", "feature", "integration"
  isActive: Boolean,            // Активна ли конфигурация
  
  value: Mixed,                 // Значение конфигурации (любая структура)
  
  metadata: {
    description: String,
    lastModified: Date,
    modifiedBy: String,         // Кто изменил
    version: Number             // Автоинкремент версии
  },
  
  createdAt: Date,
  updatedAt: Date
}
```

**Примеры конфигураций**:
```javascript
// AI модели конфигурация
{
  configKey: "ai-models-config",
  configType: "system",
  value: {
    defaultModel: "juggernaut-pro-flux",
    models: {
      "juggernaut-pro-flux": {
        enabled: true,
        provider: "segmind",
        priority: 1,
        endpoint: "https://api.segmind.com/v1/juggernaut-pro-flux",
        maxRetries: 3
      },
      "dall-e-3": {
        enabled: true,
        provider: "openai",
        priority: 2,
        maxRetries: 2
      }
    }
  }
}

// Платежная система
{
  configKey: "payment-plans",
  configType: "system",
  value: {
    "plan_10": { amount: 100, images: 10, name: "Стартовый" },
    "plan_100": { amount: 500, images: 100, name: "Базовый" },
    "plan_1000": { amount: 2000, images: 1000, name: "Профессиональный" },
    "plan_10000": { amount: 15000, images: 10000, name: "Корпоративный" }
  }
}
```

**Ключевые индексы**:
```javascript
{ configKey: 1 }                      // unique: true
{ configKey: 1, isActive: 1 }
{ configType: 1, isActive: 1 }
{ updatedAt: -1 }
```

---

### 5. ConfigAuditLog Collection 📝

**Назначение**: Аудит всех изменений конфигурации

```javascript
{
  _id: ObjectId,
  configKey: String,            // Какая конфигурация изменена
  action: String,               // "CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE"
  
  oldValue: Mixed,              // Предыдущее значение
  newValue: Mixed,              // Новое значение
  
  changedBy: String,            // Кто изменил
  changedAt: Date,              // Когда изменено
  
  // Метаданные запроса
  requestMetadata: {
    ipAddress: String,
    userAgent: String,
    endpoint: String,
    method: String              // "GET", "POST", "PUT", "DELETE", "PATCH"
  },
  
  reason: String,               // Причина изменения (макс 500 символов)
  context: Mixed,               // Дополнительный контекст
  
  createdAt: Date,
  updatedAt: Date
}
```

**Ключевые индексы**:
```javascript
{ configKey: 1, changedAt: -1 }
{ action: 1, changedAt: -1 }
{ changedBy: 1, changedAt: -1 }
{ changedAt: -1 }
```

---

### 6. WebhookLog Collection 🔗

**Назначение**: Логирование webhook уведомлений от YooMoney

```javascript
{
  _id: ObjectId,
  paymentId: String,            // ID платежа
  yoomoneyOperationId: String,  // ID операции YooMoney
  
  webhookData: Mixed,           // Полные данные webhook
  signatureValid: Boolean,      // Валидна ли подпись
  processed: Boolean,           // Обработан ли webhook
  
  receivedAt: Date,             // Когда получен
  processedAt: Date,            // Когда обработан
  errorMessage: String,         // Ошибка обработки
  
  createdAt: Date,
  updatedAt: Date
}
```

**Ключевые индексы**:
```javascript
{ paymentId: 1 }
{ processed: 1 }
{ receivedAt: 1 }
{ yoomoneyOperationId: 1 }
```

---

## 🔗 Связи между коллекциями

### Диаграмма связей
```
Users (1) ←→ (N) Payments
  ↓
  └── paymentHistory: [ObjectId] → Payments._id

Users (1) ←→ (N) Images
  ↓
  └── userId: ObjectId → Users._id

Payments (N) ←→ (1) Users
  ↓
  └── userId: ObjectId → Users._id

AppConfig ←→ ConfigAuditLog
  ↓
  └── configKey связывает изменения с конфигурацией

Payments ←→ WebhookLog
  ↓
  └── paymentId связывает webhook с платежом
```

### Типы связей

#### 1. One-to-Many (Users → Images)
```javascript
// Поиск всех изображений пользователя
db.images.find({ userId: ObjectId("...") })

// Агрегация с пользователем
db.images.aggregate([
  { $lookup: {
    from: "users",
    localField: "userId", 
    foreignField: "_id",
    as: "user"
  }}
])
```

#### 2. One-to-Many (Users → Payments)
```javascript
// Поиск всех платежей пользователя
db.payments.find({ userId: ObjectId("...") })

// Обновление истории платежей в Users
db.users.updateOne(
  { _id: ObjectId("...") },
  { $push: { paymentHistory: ObjectId("payment_id") } }
)
```

#### 3. Reference Tracking (ConfigAuditLog → AppConfig)
```javascript
// Поиск истории изменений конфигурации
db.configauditlogs.find({ configKey: "ai-models-config" })
  .sort({ changedAt: -1 })
```

---

## 📈 Индексы и производительность

### Стратегия индексирования

#### 1. Уникальные индексы
```javascript
// Users - предотвращение дублирования пользователей
{ externalId: 1, externalSystem: 1 } // unique: true

// Payments - уникальность платежей
{ paymentId: 1 } // unique: true

// AppConfig - уникальность ключей
{ configKey: 1 } // unique: true
```

#### 2. Составные индексы для частых запросов
```javascript
// Images - поиск по пользователю с сортировкой
{ userId: 1, createdAt: -1 }
{ userExternalId: 1, userExternalSystem: 1, createdAt: -1 }

// Payments - поиск по статусу и времени истечения
{ status: 1, expiresAt: 1 }
{ telegramId: 1, status: 1 }

// ConfigAuditLog - аудит по ключу и времени
{ configKey: 1, changedAt: -1 }
```

#### 3. Текстовые индексы
```javascript
// Images - полнотекстовый поиск
{ 
  "generation.prompt": "text", 
  "metadata.title": "text", 
  "metadata.description": "text" 
}
```

#### 4. Sparse индексы
```javascript
// Users - индексы только для документов с полем
{ "profile.email": 1 } // sparse: true
{ "profile.username": 1 } // sparse: true
{ "file.hash": 1 } // sparse: true
```

### Мониторинг производительности

#### Анализ медленных запросов
```javascript
// Включение профилирования
db.setProfilingLevel(2, { slowms: 100 })

// Просмотр медленных операций
db.system.profile.find().sort({ ts: -1 }).limit(5)
```

#### Статистика использования индексов
```javascript
// Статистика по коллекции
db.users.getIndexes()
db.users.stats()

// Анализ использования индексов
db.users.aggregate([{ $indexStats: {} }])
```

---

## 🔄 Миграции и версионирование

### Стратегия миграций

#### 1. Версионирование схемы
```javascript
// Добавление поля версии в документы
{
  schemaVersion: 1,
  // ... остальные поля
}
```

#### 2. Скрипты миграции
```javascript
// Пример миграции: добавление нового поля
db.users.updateMany(
  { schemaVersion: { $exists: false } },
  { 
    $set: { 
      schemaVersion: 1,
      "subscription.imagesRemaining": 0 
    } 
  }
)
```

#### 3. Обратная совместимость
```javascript
// Mongoose схема с поддержкой старых версий
const userSchema = new mongoose.Schema({
  // Новые поля с default значениями
  schemaVersion: { type: Number, default: 1 },
  
  // Legacy поля помечены как deprecated
  oldField: { type: String, deprecated: true }
})
```

### Процесс обновления

1. **Подготовка миграции**
   ```bash
   # Создание резервной копии
   mongodump --db ai-stock-bot --out backup/$(date +%Y%m%d_%H%M%S)
   ```

2. **Тестирование на копии**
   ```bash
   # Восстановление в тестовую БД
   mongorestore --db ai-stock-bot-test backup/20240128_120000/ai-stock-bot
   ```

3. **Применение миграции**
   ```javascript
   // Выполнение скрипта миграции
   node scripts/migrate-to-v2.js
   ```

4. **Валидация результата**
   ```javascript
   // Проверка корректности миграции
   db.users.find({ schemaVersion: { $ne: 2 } }).count() // Должно быть 0
   ```

---

## 💾 Резервное копирование

### Ручное создание бэкапов

#### 1. Полный бэкап базы данных
```bash
# Создание полного бэкапа
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/manual/$DATE"

# Локальная MongoDB
mongodump \
  --host localhost:27017 \
  --db ai-stock-bot \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --out $BACKUP_DIR \
  --gzip

# Через Docker
docker exec ai-stock-bot-mongodb-1 mongodump \
  --db ai-stock-bot \
  --out /tmp/backup \
  --gzip

# Копирование из контейнера
docker cp ai-stock-bot-mongodb-1:/tmp/backup ./backups/manual/$DATE
```

#### 2. Бэкап отдельных коллекций
```bash
# Бэкап только пользователей
mongodump \
  --host localhost:27017 \
  --db ai-stock-bot \
  --collection users \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --out ./backups/users_$(date +%Y%m%d) \
  --gzip

# Бэкап критических коллекций
for collection in users payments images appconfigs; do
  mongodump \
    --host localhost:27017 \
    --db ai-stock-bot \
    --collection $collection \
    --username admin \
    --password password \
    --authenticationDatabase admin \
    --out ./backups/critical_$(date +%Y%m%d) \
    --gzip
done
```

#### 3. Экспорт в JSON/CSV
```bash
# Экспорт коллекции в JSON
mongoexport \
  --host localhost:27017 \
  --db ai-stock-bot \
  --collection users \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --out users_export_$(date +%Y%m%d).json \
  --pretty

# Экспорт в CSV
mongoexport \
  --host localhost:27017 \
  --db ai-stock-bot \
  --collection payments \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --type csv \
  --fields _id,userId,amount,status,createdAt \
  --out payments_export_$(date +%Y%m%d).csv
```

### Ручное восстановление

#### 1. Полное восстановление базы данных
```bash
# Восстановление из полного бэкапа
mongorestore \
  --host localhost:27017 \
  --db ai-stock-bot \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --drop \
  --gzip \
  ./backups/manual/20240128_120000/ai-stock-bot

# Восстановление через Docker
docker cp ./backups/manual/20240128_120000 ai-stock-bot-mongodb-1:/tmp/restore
docker exec ai-stock-bot-mongodb-1 mongorestore \
  --db ai-stock-bot \
  --drop \
  --gzip \
  /tmp/restore/ai-stock-bot
```

#### 2. Восстановление отдельных коллекций
```bash
# Восстановление только коллекции users
mongorestore \
  --host localhost:27017 \
  --db ai-stock-bot \
  --collection users \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --drop \
  --gzip \
  ./backups/users_20240128/ai-stock-bot/users.bson.gz

# Восстановление с переименованием коллекции
mongorestore \
  --host localhost:27017 \
  --db ai-stock-bot \
  --collection users_backup \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --gzip \
  ./backups/users_20240128/ai-stock-bot/users.bson.gz
```

#### 3. Импорт из JSON/CSV
```bash
# Импорт из JSON
mongoimport \
  --host localhost:27017 \
  --db ai-stock-bot \
  --collection users \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --file users_export_20240128.json \
  --drop

# Импорт из CSV
mongoimport \
  --host localhost:27017 \
  --db ai-stock-bot \
  --collection payments \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --type csv \
  --headerline \
  --file payments_export_20240128.csv \
  --drop
```

### Проверка целостности бэкапов

#### 1. Валидация бэкапа
```bash
# Проверка структуры бэкапа
ls -la ./backups/manual/20240128_120000/ai-stock-bot/
file ./backups/manual/20240128_120000/ai-stock-bot/*.bson.gz

# Проверка размера файлов
du -sh ./backups/manual/20240128_120000/

# Проверка сжатых файлов
gunzip -t ./backups/manual/20240128_120000/ai-stock-bot/*.bson.gz
```

#### 2. Тестовое восстановление
```bash
# Создание тестовой базы данных
mongorestore \
  --host localhost:27017 \
  --db ai-stock-bot-test \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --gzip \
  ./backups/manual/20240128_120000/ai-stock-bot

# Проверка количества документов
mongosh "mongodb://admin:password@localhost:27017/ai-stock-bot-test?authSource=admin" \
  --eval "
    print('Users:', db.users.countDocuments());
    print('Images:', db.images.countDocuments());
    print('Payments:', db.payments.countDocuments());
  "

# Удаление тестовой базы
mongosh "mongodb://admin:password@localhost:27017/ai-stock-bot-test?authSource=admin" \
  --eval "db.dropDatabase()"
```

### Сценарии восстановления

#### 1. Восстановление после сбоя
```bash
#!/bin/bash
# disaster-recovery.sh

echo "🚨 Начало аварийного восстановления..."

# Остановка приложений
docker-compose down backend tg-bot

# Поиск последнего валидного бэкапа
LATEST_BACKUP=$(ls -t ./backups/daily/ | head -1)
echo "📁 Используется бэкап: $LATEST_BACKUP"

# Восстановление базы данных
mongorestore \
  --host localhost:27017 \
  --db ai-stock-bot \
  --username admin \
  --password password \
  --authenticationDatabase admin \
  --drop \
  --gzip \
  ./backups/daily/$LATEST_BACKUP/ai-stock-bot

# Проверка восстановления
USERS_COUNT=$(mongosh "mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin" \
  --quiet --eval "db.users.countDocuments()")

if [ "$USERS_COUNT" -gt 0 ]; then
  echo "✅ Восстановление успешно. Пользователей: $USERS_COUNT"
  
  # Запуск приложений
  docker-compose up -d backend tg-bot
  echo "🚀 Приложения запущены"
else
  echo "❌ Ошибка восстановления"
  exit 1
fi
```

#### 2. Миграция между окружениями
```bash
#!/bin/bash
# migrate-env.sh

SOURCE_HOST="prod-mongodb:27017"
TARGET_HOST="staging-mongodb:27017"
DATE=$(date +%Y%m%d_%H%M%S)

echo "📦 Создание бэкапа с продакшена..."
mongodump \
  --host $SOURCE_HOST \
  --db ai-stock-bot \
  --username admin \
  --password $PROD_PASSWORD \
  --authenticationDatabase admin \
  --out ./migration/$DATE \
  --gzip

echo "🔄 Восстановление на staging..."
mongorestore \
  --host $TARGET_HOST \
  --db ai-stock-bot \
  --username admin \
  --password $STAGING_PASSWORD \
  --authenticationDatabase admin \
  --drop \
  --gzip \
  ./migration/$DATE/ai-stock-bot

echo "🧹 Очистка чувствительных данных на staging..."
mongosh "mongodb://admin:$STAGING_PASSWORD@$TARGET_HOST/ai-stock-bot?authSource=admin" \
  --eval "
    // Очистка реальных платежных данных
    db.payments.updateMany({}, {\$set: {yoomoneyData: null}});
    
    // Маскировка email адресов
    db.users.updateMany(
      {'profile.email': {\$exists: true}},
      {\$set: {'profile.email': 'test@example.com'}}
    );
    
    // Очистка токенов и паролей
    db.users.updateMany({}, {\$unset: {
      'stockServices.rf123.credentials.passwordHash': '',
      'metadata.ipAddress': ''
    }});
  "

echo "✅ Миграция завершена"
```

### Автоматизированные бэкапы

#### 1. Ежедневные полные бэкапы
```bash
#!/bin/bash
# backup-daily.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/daily/$DATE"

mongodump \
  --host mongodb:27017 \
  --db ai-stock-bot \
  --out $BACKUP_DIR \
  --gzip

# Сжатие и загрузка в облако
tar -czf "$BACKUP_DIR.tar.gz" -C /backups/daily $DATE
aws s3 cp "$BACKUP_DIR.tar.gz" s3://ai-stock-bot-backups/daily/

# Очистка старых бэкапов (старше 30 дней)
find /backups/daily -name "*.tar.gz" -mtime +30 -delete
```

#### 2. Инкрементальные бэкапы
```bash
# Использование MongoDB Change Streams для инкрементальных бэкапов
node scripts/incremental-backup.js
```

#### 3. Point-in-time восстановление
```bash
# Восстановление на определенную дату
mongorestore \
  --host mongodb:27017 \
  --db ai-stock-bot \
  --drop \
  /backups/daily/20240128_120000/ai-stock-bot
```

### Автоматизация бэкапов

#### Docker Compose с cron
```yaml
# docker-compose.yml
services:
  backup:
    image: mongo:7.0.5
    volumes:
      - ./backups:/backups
      - ./scripts:/scripts
    environment:
      - MONGO_HOST=mongodb
    command: |
      sh -c "
        echo '0 2 * * * /scripts/backup-daily.sh' | crontab -
        crond -f
      "
```

#### Мониторинг бэкапов
```javascript
// Проверка успешности последнего бэкапа
const lastBackup = await BackupLog.findOne().sort({ createdAt: -1 })
if (Date.now() - lastBackup.createdAt > 24 * 60 * 60 * 1000) {
  // Отправка уведомления об ошибке
  await sendAlert('Backup failed or missing')
}
```

---

## 📊 Мониторинг и оптимизация

### Ключевые метрики

#### 1. Производительность запросов
```javascript
// Мониторинг медленных запросов
db.setProfilingLevel(1, { slowms: 100 })

// Анализ производительности
db.system.profile.aggregate([
  { $group: {
    _id: "$command.find",
    count: { $sum: 1 },
    avgDuration: { $avg: "$millis" }
  }},
  { $sort: { avgDuration: -1 } }
])
```

#### 2. Использование индексов
```javascript
// Статистика индексов
db.runCommand({ collStats: "users", indexDetails: true })

// Неиспользуемые индексы
db.users.aggregate([{ $indexStats: {} }])
  .filter(stat => stat.accesses.ops === 0)
```

#### 3. Размер коллекций
```javascript
// Размеры коллекций
db.stats()
db.users.stats()
db.images.stats()

// Рост данных по времени
db.users.aggregate([
  { $group: {
    _id: { 
      year: { $year: "$createdAt" },
      month: { $month: "$createdAt" }
    },
    count: { $sum: 1 }
  }}
])
```

### Оптимизация производительности

#### 1. Оптимизация запросов
```javascript
// Использование explain для анализа
db.users.find({ "subscription.isActive": true }).explain("executionStats")

// Оптимизация агрегации
db.images.aggregate([
  { $match: { userId: ObjectId("...") } }, // Фильтрация в начале
  { $sort: { createdAt: -1 } },           // Использование индекса
  { $limit: 20 }                          // Ограничение результата
])
```

#### 2. Управление памятью
```javascript
// Настройка WiredTiger cache
db.adminCommand({
  setParameter: 1,
  wiredTigerCacheSizeGB: 2
})

// Мониторинг использования памяти
db.serverStatus().wiredTiger.cache
```

#### 3. Оптимизация индексов
```javascript
// Удаление неиспользуемых индексов
db.users.dropIndex("unused_index_name")

// Создание составных индексов для частых запросов
db.images.createIndex(
  { userId: 1, "generation.model": 1, createdAt: -1 },
  { background: true }
)
```

### Алерты и мониторинг

#### 1. Настройка алертов
```javascript
// Проверка доступности БД
const healthCheck = async () => {
  try {
    await mongoose.connection.db.admin().ping()
    return { status: 'healthy' }
  } catch (error) {
    await sendAlert('Database connection failed', error)
    return { status: 'unhealthy', error }
  }
}
```

#### 2. Метрики для Prometheus
```javascript
// Экспорт метрик
const promClient = require('prom-client')

const dbConnections = new promClient.Gauge({
  name: 'mongodb_connections_current',
  help: 'Current number of connections'
})

const queryDuration = new promClient.Histogram({
  name: 'mongodb_query_duration_seconds',
  help: 'Query execution time',
  labelNames: ['collection', 'operation']
})
```

---

## 🔧 Инструменты разработки

### MongoDB Compass
```bash
# Подключение к локальной БД
mongodb://admin:password@localhost:27017/ai-stock-bot?authSource=admin
```

### Mongo Express (Web UI)
```yaml
# docker-compose.yml
mongo-express:
  image: mongo-express:1.0.2
  ports:
    - "8081:8081"
  environment:
    ME_CONFIG_MONGODB_ADMINUSERNAME: admin
    ME_CONFIG_MONGODB_ADMINPASSWORD: password
    ME_CONFIG_MONGODB_SERVER: mongodb
```

### CLI инструменты
```bash
# Подключение к контейнеру MongoDB
docker exec -it ai-stock-bot-mongodb-1 mongosh

# Экспорт коллекции в JSON
mongoexport --db ai-stock-bot --collection users --out users.json

# Импорт данных
mongoimport --db ai-stock-bot --collection users --file users.json
```

---

##
