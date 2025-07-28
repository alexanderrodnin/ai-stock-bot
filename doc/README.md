# AI Stock Bot - Техническая документация

Централизованная техническая документация для AI Stock Bot - системы генерации изображений с множественными AI моделями, интегрированной системой платежей YooMoney и автоматической загрузки на стоковые площадки.

## 📚 Навигация по документации

### 🏗️ Архитектура и диаграммы
- **[C4 Component Diagram](#c4-component-diagram)** - Архитектурная диаграмма системы
- **[Архитектурный обзор](#архитектурный-обзор)** - Детальное описание компонентов

### 🔧 Административные руководства
- **[ADMIN_API_GUIDE.md](ADMIN_API_GUIDE.md)** - Полное руководство по Admin API
- **[PRODUCTION.md](PRODUCTION.md)** - Развертывание в продакшене с Docker

### 🤖 AI модели и конфигурация
- **[AI_MODELS_GUIDE.md](AI_MODELS_GUIDE.md)** - Руководство по AI моделям и провайдерам
- **[DYNAMIC_AI_MODELS.md](DYNAMIC_AI_MODELS.md)** - Динамическое управление AI моделями

### 💳 Платежная система
- **[PAYMENT_SYSTEM_GUIDE.md](PAYMENT_SYSTEM_GUIDE.md)** - Интеграция YooMoney и управление подписками

### 📖 Компонентная документация
- **[../backend/README.md](../backend/README.md)** - Backend API техническая документация
- **[../tg-bot/README.md](../tg-bot/README.md)** - Telegram Bot техническая документация
- **[../README.md](../README.md)** - Общий обзор проекта

---

## 📊 Диаграммы архитектуры

### C4 Component Diagram
Файл `c4-components.puml` содержит C4 диаграмму компонентов для AI Stock Bot.

### C4 Database Structure Diagram
Файл `c4-database-structure.puml` содержит подробную диаграмму структуры базы данных MongoDB с коллекциями, связями и индексами.

### Просмотр диаграммы в VSCode

1. **Установите расширение PlantUML**:
   - Extensions → Поиск "PlantUML" (автор jebbs) → Install

2. **Настройте PlantUML**:
   ```json
   {
     "plantuml.render": "PlantUMLServer",
     "plantuml.server": "https://www.plantuml.com/plantuml"
   }
   ```

3. **Просмотр диаграммы**:
   - Откройте файл `c4-components.puml`
   - Нажмите `Alt+D` (Windows/Linux) или `Cmd+D` (Mac)

4. **Онлайн просмотр**: [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)

---

## Архитектурный обзор

### 🏗️ Основные компоненты системы

#### 1. Frontend Interfaces
- **Telegram Bot** - основной пользовательский интерфейс
- **Web Interface** - планируемый веб-интерфейс (в разработке)

#### 2. Backend API (Express.js)
- **API Gateway** - централизованная точка входа
- **Controllers** - обработка бизнес-логики
- **Middleware Stack** - безопасность, валидация, rate limiting
- **Services** - основная бизнес-логика

#### 3. AI Providers Layer
- **OpenAI Service** - DALL-E 3 интеграция
- **Segmind Services** - множественные AI модели
- **Fallback System** - автоматическое переключение между провайдерами

#### 4. Data Layer
- **MongoDB** - основная база данных
- **File Storage** - временное хранение изображений
- **Configuration Management** - динамическая конфигурация

#### 5. External Integrations
- **YooMoney** - платежная система
- **123RF** - стоковая платформа
- **Telegram Platform** - bot API

### 🔄 Основные потоки данных

#### Генерация изображения:
```
Пользователь → Telegram Bot → Backend API → AI Provider → Image Processing → Storage → Response
```

#### Платежный поток:
```
Пользователь → Payment Request → YooMoney → Webhook → Backend → Telegram Notification
```

#### Загрузка на стоки:
```
Image → Metadata Processing → FTP Upload → 123RF → Status Update → User Notification
```

---

## 📋 API Reference Overview

### Основные группы endpoints

#### Images API (`/api/images/*`)
- Генерация изображений с множественными AI моделями
- Управление метаданными и файлами
- Интеграция с стоковыми сервисами
- Потоковая передача изображений

#### Payments API (`/api/payments/*`)
- Создание платежей через YooMoney
- Webhook обработка
- Управление подписками и балансом
- История платежей

#### Users API (`/api/users/*`)
- Управление пользователями и профилями
- Настройки стоковых сервисов
- Статистика использования
- Интеграция с внешними системами

#### Upload API (`/api/upload/*`)
- Загрузка на стоковые платформы
- Batch обработка
- Мониторинг статуса загрузок
- Retry механизмы

#### Admin API (`/api/admin/*`)
- Динамическое управление конфигурацией
- Переключение AI моделей
- Системный мониторинг
- Аудит изменений

Подробная документация: [ADMIN_API_GUIDE.md](ADMIN_API_GUIDE.md)

---

## 🤖 AI Models System

### Поддерживаемые модели

1. **Juggernaut Pro Flux** (по умолчанию)
   - Провайдер: Segmind API
   - Качество: Профессиональные реалистичные изображения
   - Оптимизация: Для стоковых изображений

2. **DALL-E 3** (OpenAI)
   - Провайдер: OpenAI API
   - Качество: Премиум с отличным пониманием промптов
   - Особенности: Content filtering, revised prompts

3. **Seedream V3** (Segmind)
   - Провайдер: Segmind API
   - Качество: Художественная и креативная генерация
   - Скорость: Быстрая обработка

4. **HiDream-I1 Fast** (Segmind)
   - Провайдер: Segmind API
   - Качество: Хорошее качество
   - Скорость: Очень быстрая генерация

### Система фоллбеков
- Автоматическое переключение при сбоях
- Интеллектуальный выбор модели
- Fallback на демо-изображения
- Полное логирование всех попыток

Подробнее: [AI_MODELS_GUIDE.md](AI_MODELS_GUIDE.md)

---

## 💳 Payment System

### YooMoney Integration
- **Создание платежей** - автоматическая генерация ссылок
- **Webhook обработка** - мгновенное подтверждение
- **Уведомления** - автоматические уведомления в Telegram
- **Аудит** - полная история всех транзакций

### Тарифные планы
```javascript
{
  "plan_10_images": { amount: 100, images: 10 },
  "plan_100_images": { amount: 500, images: 100 },
  "plan_1000_images": { amount: 2000, images: 1000 },
  "plan_10000_images": { amount: 15000, images: 10000 }
}
```

### Subscription Management
- Автоматическое списание при генерации
- Real-time проверка баланса
- Блокировка при нулевом балансе
- История платежей с детализацией

---

## 🔧 Configuration Management

### Динамическая конфигурация
- **AppConfig модель** - гибкая схема настроек
- **Версионирование** - отслеживание изменений
- **Аудит** - полная история с указанием автора
- **Hot reload** - применение без перезапуска

### Типы конфигураций
- **system** - системные настройки
- **ai-models** - конфигурация AI моделей
- **payment** - настройки платежной системы
- **integration** - внешние интеграции

Подробнее: [DYNAMIC_AI_MODELS.md](DYNAMIC_AI_MODELS.md)

---

## 📊 Data Models

### Основные модели

#### User Model
```javascript
{
  externalId: String,           // Telegram ID
  externalSystem: "telegram",   // Источник
  profile: { username, firstName, lastName, language },
  subscription: {
    isActive: Boolean,
    imagesRemaining: Number,
    expiresAt: Date
  },
  stockServices: {
    "123rf": { enabled, credentials, settings }
  },
  transactions: [{ type, amount, description, createdAt }]
}
```

#### Payment Model
```javascript
{
  paymentId: String,           // Уникальный ID
  userId: ObjectId,            // Владелец
  telegramId: String,          // Для уведомлений
  amount: Number,              // Сумма в рублях
  imagesCount: Number,         // Количество изображений
  planType: String,            // Тип тарифа
  status: String,              // pending, completed, failed
  paymentUrl: String,          // Ссылка YooMoney
  webhookData: Object,         // Данные webhook
  createdAt: Date,
  completedAt: Date
}
```

#### Image Model
```javascript
{
  userId: ObjectId,            // Владелец
  prompt: String,              // Промпт
  model: String,               // AI модель
  provider: String,            // AI провайдер
  filePath: String,            // Путь к файлу
  metadata: {
    width, height, format, fileSize, generatedAt
  },
  uploads: [{
    service: String,           // 123rf, shutterstock
    status: String,            // pending, completed, failed
    uploadedAt: Date,
    metadata: Object
  }]
}
```

#### AppConfig Model
```javascript
{
  key: String,                 // Уникальный ключ
  value: Object,               // Значение конфигурации
  type: String,                // system, ai-models, payment
  version: Number,             // Версия
  metadata: {
    description: String,
    updatedBy: String,
    updatedAt: Date
  }
}
```

---

## 🐳 Docker Infrastructure

### Production Services
- **backend** - Node.js API сервер
- **tg-bot** - Telegram Bot сервис
- **mongodb** - MongoDB 7.0.5 с инициализацией
- **watchtower** - автоматические обновления

### Development Services
- **mongo-express** - Web UI для MongoDB
- **tools** - дополнительные инструменты разработки

### Docker Compose профили
- **backend** - только backend + MongoDB
- **bot** - Telegram bot + backend + MongoDB
- **full** - все сервисы
- **tools** - инструменты разработки

Подробнее: [PRODUCTION.md](PRODUCTION.md)

---

## 🔒 Security & Performance

### Безопасность
- **Шифрование** - AES-256-GCM для чувствительных данных
- **Rate Limiting** - защита от злоупотреблений
- **Валидация** - express-validator для всех входных данных
- **Аудит** - полное логирование критических операций
- **CORS** - настройка политик кросс-доменных запросов

### Производительность
- **Кэширование** - конфигурация в памяти
- **Потоковая передача** - изображения без буферизации
- **Connection pooling** - оптимизация MongoDB
- **Индексы** - быстрые запросы к базе данных
- **Сжатие** - HTTP response compression

---

## 🚧 Development & Deployment

### Локальная разработка
```bash
# Backend
cd backend && npm run dev

# Telegram Bot
cd tg-bot && npm start

# Docker development
docker-compose --profile full up -d
```

### Production deployment
```bash
# Production с автообновлениями
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d
```

### Мониторинг
- **Health checks** - `/health`, `/api/health`, `/api/admin/health`
- **Логирование** - структурированные логи в JSON
- **Метрики** - время ответа, успешность операций
- **Watchtower** - автоматические обновления Docker образов

---

## 🔮 Roadmap

### Реализовано ✅
- Множественные AI провайдеры с фоллбеками
- Система платежей YooMoney с webhook
- Динамическая конфигурация с hot reload
- Административная панель через API
- Шифрование данных и безопасность
- Потоковая передача изображений
- Docker контейнеризация с автообновлениями

### В разработке 🔄
- Web интерфейс для браузерных пользователей
- Unit и интеграционные тесты
- Swagger/OpenAPI документация
- Метрики и мониторинг (Prometheus)

### Планируется 📋
- Дополнительные стоковые сервисы (Shutterstock, Adobe Stock)
- S3/MinIO для файлового хранилища
- GraphQL API
- WebSocket для real-time обновлений
- Batch processing API
- Многоязычная поддержка

---

## 📞 Поддержка и ресурсы

### Техническая поддержка
1. Проверьте health checks: `curl http://localhost:3000/api/health`
2. Изучите логи: `docker-compose logs -f`
3. Проверьте конфигурацию: `curl http://localhost:3000/api/admin/config`
4. Создайте Issue в [GitHub](https://github.com/alexanderrodnin/ai-stock-bot)

### Полезные ссылки
- [C4 Model Documentation](https://c4model.com/)
- [PlantUML Documentation](https://plantuml.com/)
- [Express.js Guide](https://expressjs.com/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [YooMoney API](https://yoomoney.ru/docs/)

### Требования для разработки
- **Node.js** 18+ для backend и bot
- **MongoDB** 7.0+ для базы данных
- **Docker** для контейнеризации
- **Java** 8+ для PlantUML диаграмм
- **VSCode** с PlantUML расширением

---

## 📝 Лицензия

MIT License - см. файл LICENSE в корне проекта.
