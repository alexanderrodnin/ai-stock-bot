# 🤖 AI Stock Bot - Полное руководство по проекту

## 📋 Обзор проекта

**AI Stock Bot** - это микросервисная система для генерации изображений с помощью множественных AI моделей и автоматической загрузки на стоковые площадки. Проект состоит из трех основных компонентов:

- **Backend API** - RESTful сервис на Node.js для генерации изображений и управления пользователями
- **Telegram Bot** - Интерфейс пользователя через Telegram
- **Payment System** - Система оплаты через YooMoney (в разработке)

## 🏗️ Архитектура

### Структура проекта
```
ai-stock-bot/
├── backend/                 # Backend API сервис
│   ├── src/
│   │   ├── controllers/     # REST API контроллеры
│   │   ├── models/         # MongoDB модели
│   │   ├── services/       # Бизнес-логика и AI провайдеры
│   │   ├── routes/         # API маршруты
│   │   └── middleware/     # Express middleware
│   ├── docker/             # Docker конфигурации
│   └── scripts/            # Утилиты и миграции
├── tg-bot/                 # Telegram Bot
│   ├── services/           # Сервисы бота
│   └── index.js           # Основной файл бота
├── doc/                    # Документация
├── docker-compose.yml      # Разработка
├── docker-compose-prod.yml # Продакшен
└── .env.example           # Пример переменных окружения
```

## 🚀 Быстрый старт

### 1. Клонирование и подготовка
```bash
git clone https://github.com/alexanderrodnin/ai-stock-bot.git
cd ai-stock-bot
cp .env.example .env
```

### 2. Настройка переменных окружения

**Обязательные переменные:**
```bash
# Backend
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret_32_chars_minimum
ENCRYPTION_KEY=your_32_character_encryption_key

# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token

# MongoDB
MONGODB_URI=mongodb://admin:password123@localhost:27017/ai-stock-bot
```

**Опциональные переменные:**
```bash
# Segmind API (дополнительные AI модели)
SEGMIND_API_KEY=your_segmind_api_key

# 123RF FTP (для загрузки на стоки)
FTP_HOST=ftp.123rf.com
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
```

### 3. Запуск через Docker (рекомендуемый)

#### Полный стек
```bash
docker-compose --profile backend --profile bot up -d
```

#### Только Backend + Database
```bash
docker-compose --profile backend up -d
```

#### Только Telegram Bot
```bash
docker-compose --profile bot up -d
```

### 4. Проверка работы
- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **MongoDB Express**: http://localhost:8081 (admin/admin)

## 🎨 Поддерживаемые AI модели

### Текущие модели
| Модель | Провайдер | Описание | Требования |
|--------|-----------|----------|------------|
| **DALL-E 3** | OpenAI | Высококачественная генерация | `OPENAI_API_KEY` |
| **Juggernaut Pro Flux** | Segmind | Профессиональные реалистичные изображения | `SEGMIND_API_KEY` |
| **Seedream V3** | Segmind | Художественная и креативная генерация | `SEGMIND_API_KEY` |
| **HiDream-I1 Fast** | Segmind | Быстрая высококачественная генерация | `SEGMIND_API_KEY` |

### Переключение моделей
```bash
# Через Admin API
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "juggernaut-pro-flux", "reason": "Testing new model"}'
```

## 📊 API Endpoints

### Основные эндпоинты

#### Генерация изображений
```bash
# Генерация изображения
POST /api/images/generate
{
  "prompt": "A beautiful landscape with mountains",
  "userId": "user123",
  "options": {
    "model": "dall-e-3",
    "size": "1024x1024"
  }
}

# Получение изображения
GET /api/images/:imageId/stream?userId=user123
```

#### Управление пользователями
```bash
# Создание/получение пользователя
POST /api/users
{
  "externalId": "telegram_123",
  "externalSystem": "telegram",
  "profile": {
    "username": "john_doe",
    "firstName": "John"
  }
}

# Получение пользователя
GET /api/users/:id
```

#### Загрузка на стоки
```bash
# Загрузка на 123RF
POST /api/upload/123rf
{
  "imageId": "img_123",
  "userId": "user123",
  "title": "Mountain Landscape",
  "keywords": ["landscape", "mountains"]
}
```

### Admin API
- `GET /api/admin/status` - Статус системы
- `GET /api/admin/config` - Текущая конфигурация
- `PUT /api/admin/config/model/:modelName` - Переключение модели
- `GET /api/admin/config/ai-models/history` - История переключений

## 🔧 Разработка

### Локальный запуск Backend
```bash
cd backend
npm install
npm run dev
```

### Локальный запуск Telegram Bot
```bash
cd tg-bot
npm install
npm start
```

### Docker команды
```bash
# Запуск с пересборкой
npm run docker:up:build

# Остановка сервисов
npm run docker:down

# Просмотр логов
npm run docker:logs
```

## 💰 Система оплаты (в разработке)

### Архитектура оплаты
- **YooMoney Integration** - Прием платежей от физлиц
- **Email Monitor** - Автоматическое отслеживание платежей
- **Balance System** - Управление балансом пользователей

### Компоненты системы
1. **Payment Monitor** - Отслеживание email уведомлений от YooMoney
2. **Backend Extensions** - API для управления платежами и балансом
3. **Telegram Integration** - Интерфейс пополнения через бота

## 🗄️ Модели данных

### User Model
```javascript
{
  externalId: String,        // Telegram ID
  externalSystem: String,    // 'telegram', 'web', etc.
  profile: {
    username: String,
    firstName: String,
    lastName: String,
    language: String
  },
  stockServices: {
    rf123: {
      enabled: Boolean,
      credentials: { username, password },
      settings: { autoUpload, keywords }
    }
  }
}
```

### Image Model
```javascript
{
  userId: ObjectId,
  prompt: String,
  model: String,            // Использованная AI модель
  url: String,              // URL изображения
  metadata: Object,         // Дополнительные данные
  status: String            // 'generated', 'uploaded', etc.
}
```

## 🔒 Безопасность

### Реализованные меры
- **Шифрование данных** - AES-256-GCM для чувствительной информации
- **Rate limiting** - Ограничение количества запросов
- **JWT токены** - Аутентификация и авторизация
- **Input validation** - Валидация всех входных данных
- **CORS** - Настройка cross-origin запросов

### Лимиты
- Общий API: 100 запросов / 15 минут
- Генерация изображений: 10 запросов / 5 минут
- Загрузки: 20 запросов / 10 минут

## 📈 Мониторинг

### Health Checks
```bash
# Проверка API
curl http://localhost:3000/health

# Проверка MongoDB
docker exec -it ai-stock-bot-mongodb mongosh -u admin -p password123
```

### Логирование
- **Development**: Человекочитаемый формат
- **Production**: JSON формат для анализа
- **Уровни**: error, warn, info, debug

## 🐳 Docker Production

### Запуск в продакшене
```bash
# Копирование продакшен конфигурации
cp .env.prod.example .env.prod

# Запуск с автоматическими обновлениями
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d
```

### Используемые образы
- **Backend**: `alexanderrodnin/ai-stock-bot-backend:latest`
- **Telegram Bot**: `alexanderrodnin/ai-stock-bot-tg-bot:latest`
- **MongoDB**: `mongo:7.0.5`
- **Watchtower**: Автоматические обновления

## 🛠️ Развертывание

### Пошаговая инструкция по настройке Payment System

#### Шаг 1: Настройка YooMoney (15 минут)
1. **Регистрация кошелька**
   - Перейдите на https://yoomoney.ru
   - Создайте аккаунт физического лица
   - Подтвердите номер телефона

2. **Создание формы оплаты**
   - Перейдите в "Прием платежей" → "Форма оплаты"
   - Нажмите "Создать форму"
   - Укажите:
     - Название: "AI Stock Bot"
     - Описание: "Пополнение счета для генерации изображений"
     - Сумма: "Произвольная"
     - Email уведомления: ваш email

#### Шаг 2: Настройка Gmail для Payment Monitor (10 минут)
1. **Создание почты**
   - Создайте новый Gmail: `aistockbot.payments@gmail.com`
   - Включите двухфакторную аутентификацию

2. **App Password**
   - Google Account → Security → 2-Step Verification
   - App passwords → Generate
   - Выберите "Mail" → Скопируйте пароль

3. **Настройка фильтров**
   - Settings → Filters and Blocked Addresses
   - Create filter:
     - From: `noreply@yoomoney.ru`
     - Subject: `Платеж получен`
     - Apply label: "YooMoney-Payments"

#### Шаг 3: Разработка Payment Monitor (30 минут)
1. **Создание нового сервиса**
   ```bash
   mkdir payment-monitor
   cd payment-monitor
   npm init -y
   npm install imap dotenv axios
   ```

2. **Структура сервиса**
   ```
   payment-monitor/
   ├── src/
   │   ├── emailMonitor.js    # Мониторинг email
   │   ├── paymentParser.js   # Парсинг платежей
   │   └── webhookService.js  # Отправка webhook
   ├── .env
   └── index.js
   ```

3. **Конфигурация (.env)**
   ```bash
   GMAIL_USER=aistockbot.payments@gmail.com
   GMAIL_APP_PASSWORD=your_app_password
   BACKEND_URL=http://localhost:3000/api
   CHECK_INTERVAL=30000
   ```

#### Шаг 4: Изменения в Backend (45 минут)

1. **Новые модели MongoDB**
   ```javascript
   // backend/src/models/Payment.js
   const paymentSchema = new mongoose.Schema({
     userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
     amount: Number,
     currency: { type: String, default: 'RUB' },
     status: { type: String, enum: ['pending', 'completed', 'failed'] },
     yoomoneyOperationId: String,
     yoomoneyLabel: String,
     createdAt: { type: Date, default: Date.now },
     completedAt: Date
   });
   ```

2. **Новые API endpoints**
   ```javascript
   // backend/src/routes/payments.js
   POST /api/payments/create     # Создание платежа
   POST /api/payments/webhook    # Webhook от Payment Monitor
   GET  /api/payments/:userId    # История платежей
   GET  /api/users/:id/balance   # Текущий баланс
   ```

3. **Сервисы**
   ```javascript
   // backend/src/services/paymentService.js
   - createPayment(userId, amount)
   - confirmPayment(yoomoneyLabel, operationId)
   - getUserBalance(userId)
   - getPaymentHistory(userId)
   ```

#### Шаг 5: Изменения в Telegram Bot (30 минут)

1. **Новые команды**
   ```javascript
   // tg-bot/index.js
   bot.onText(/\/topup (\d+)/, handleTopupCommand);
   bot.onText(/\/balance/, handleBalanceCommand);
   bot.on('callback_query', handlePaymentCallback);
   ```

2. **Новые функции**
   ```javascript
   // tg-bot/services/paymentService.js
   - createPaymentRequest(userId, amount)
   - checkPaymentStatus(paymentId)
   - formatPaymentMessage(paymentData)
   ```

3. **Интерфейс пополнения**
   - Inline клавиатура с суммами (50, 100, 200, 500 руб)
   - Подтверждение перед созданием платежа
   - Уведомление о зачислении средств

#### Шаг 6: Обновление деплоймента (15 минут)

1. **Docker Compose обновление**
   ```yaml
   # docker-compose.yml
   payment-monitor:
     build: ./payment-monitor
     environment:
       - GMAIL_USER=${GMAIL_USER}
       - GMAIL_APP_PASSWORD=${GMAIL_APP_PASSWORD}
       - BACKEND_URL=http://backend:3000/api
     depends_on:
       - backend
   ```

2. **Переменные окружения**
   ```bash
   # .env.prod
   YOOMONEY_WALLET=410011234567890
   GMAIL_USER=aistockbot.payments@gmail.com
   GMAIL_APP_PASSWORD=your_app_password
   ```

3. **Перезапуск сервисов**
   ```bash
   docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d
   ```

## 📚 Документация

### Дополнительные материалы
- [Backend API Guide](backend/README.md) - Полная документация API
- [Admin API Guide](backend/ADMIN_API_GUIDE.md) - Управление AI моделями
- [AI Models Guide](backend/AI_MODELS_GUIDE.md) - Информация о моделях
- [Production Guide](PRODUCTION.md) - Развертывание в продакшене
- [Payment Design](PAYMENT_DESIGN_DOC.md) - Система оплаты

### Примеры использования
- [test-user-api.sh](test-user-api.sh) - Тестирование API
- [backend/test/integration/](backend/test/integration/) - Интеграционные тесты

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📞 Поддержка

- **GitHub Issues**: https://github.com/alexanderrodnin/ai-stock-bot/issues
- **Email**: support@aistockbot.ru
- **Telegram**: @ai_stock_bot_support

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.

---
**Последнее обновление**: 22.07.2025
**Версия**: 1.0.0
