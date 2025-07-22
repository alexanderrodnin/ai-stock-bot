# 🤖 AI Stock Bot - Kimi K2 Documentation

## 📋 Project Overview

AI Stock Bot - это комплексная система для генерации изображений с использованием множественных AI-моделей (DALL-E 3, Juggernaut Pro Flux, Seedream V3, HiDream-I1) и автоматической загрузки на стоковые площадки. Система состоит из микросервисной архитектуры с REST API backend и Telegram ботом.

### 🎯 Основные возможности
- 🎨 Генерация изображений через 4 AI-модели
- 📤 Автоматическая загрузка на 123RF
- 💰 Система оплаты через YooMoney
- 🔐 Безопасное хранение данных
- 🐳 Docker контейнеризация
- 📊 Административная панель

## 🏗️ Архитектура

### Системные компоненты
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Telegram Bot  │    │   Backend API   │    │   MongoDB       │
│   (tg-bot/)     │◄──►│   (backend/)    │◄──►│   (Database)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │ Payment Monitor │
                       │ (payment-monitor)│
                       └─────────────────┘
```

### Технологический стек
- **Backend**: Node.js 18+, Express.js, MongoDB
- **AI Models**: OpenAI DALL-E 3, Segmind (Flux, Seedream, HiDream)
- **Payment**: YooMoney, Email monitoring
- **Deployment**: Docker, Docker Compose
- **Monitoring**: Health checks, logging

## 🚀 Быстрый старт

### 1. Клонирование и подготовка
```bash
git clone git@github.com:alexanderrodnin/ai-stock-bot.git
cd ai-stock-bot
```

### 2. Настройка переменных окружения
```bash
# Копируем примеры
cp .env.example .env
cp .env.prod.example .env.prod

# Редактируем основные переменные
nano .env
```

**Обязательные переменные:**
```bash
# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token_from_botfather

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# MongoDB
MONGODB_URI=mongodb://admin:password123@localhost:27017/ai-stock-bot

# Security
JWT_SECRET=your_32_character_jwt_secret
ENCRYPTION_KEY=your_32_character_encryption_key

# YooMoney (для оплаты)
YOOMONEY_WALLET=your_yoomoney_wallet
```

### 3. Запуск через Docker (рекомендуется)

#### Разработка
```bash
# Полный стек
docker-compose --profile backend --profile bot --profile tools up -d

# Только backend и MongoDB
docker-compose --profile backend up -d

# Только Telegram Bot
docker-compose --profile bot up -d
```

#### Продакшен
```bash
# С автоматическими обновлениями
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d
```

### 4. Проверка работы
- **Backend API**: http://localhost:3000/health
- **MongoDB Express**: http://localhost:8081 (admin/admin)
- **Telegram Bot**: найдите вашего бота и отправьте `/start`

## 📊 Структура проекта

```
ai-stock-bot/
├── backend/                    # REST API сервис
│   ├── src/
│   │   ├── controllers/        # API контроллеры
│   │   ├── models/            # MongoDB модели
│   │   ├── routes/            # API маршруты
│   │   ├── services/          # Бизнес-логика
│   │   ├── utils/             # Утилиты
│   │   └── config/            # Конфигурация
│   ├── docker/                # Docker конфигурации
│   └── scripts/               # Служебные скрипты
├── tg-bot/                    # Telegram Bot
│   ├── services/              # Сервисы бота
│   └── index.js              # Основной файл
├── payment-monitor/           # Мониторинг оплат
├── doc/                       # Документация
├── docker-compose.yml         # Разработка
├── docker-compose-prod.yml    # Продакшен
└── PAYMENT_DESIGN_DOC.md     # Документация по оплате
```

## 🎨 Поддерживаемые AI-модели

| Модель | Провайдер | Особенности | Требует API ключ |
|--------|-----------|-------------|------------------|
| **DALL-E 3** | OpenAI | Высокое качество, безопасность | `OPENAI_API_KEY` |
| **Juggernaut Pro Flux** | Segmind | Профессиональные реалистичные изображения | `SEGMIND_API_KEY` |
| **Seedream V3** | Segmind | Художественная генерация | `SEGMIND_API_KEY` |
| **HiDream-I1 Fast** | Segmind | Быстрая генерация | `SEGMIND_API_KEY` |

### Переключение моделей
```bash
# Через Admin API
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "juggernaut-pro-flux", "reason": "Testing"}'
```

## 💰 Система оплаты

### Возможности
- Пополнение счета через YooMoney
- Автоматическое зачисление средств
- История транзакций
- Баланс в Telegram боте

### Процесс оплаты
1. Пользователь выбирает сумму в Telegram
2. Бот генерирует ссылку на оплату
3. Пользователь оплачивает через YooMoney
4. Система мониторит email уведомления
5. Средства автоматически зачисляются

### Команды Telegram бота
- `/balance` - просмотр баланса
- `/topup` - пополнение счета
- `/history` - история транзакций

## 🔧 API Endpoints

### Основные эндпоинты
- `GET /health` - Проверка состояния
- `POST /api/users` - Создание пользователя
- `POST /api/images/generate` - Генерация изображения
- `POST /api/upload/123rf` - Загрузка на 123RF

### Административные эндпоинты
- `GET /api/admin/status` - Статус системы
- `GET /api/admin/config` - Конфигурация AI-моделей
- `PUT /api/admin/config/model/:name` - Переключение модели

### Платежные эндпоинты
- `POST /api/payments/create` - Создание платежа
- `GET /api/accounts/:userId/balance` - Баланс пользователя
- `GET /api/accounts/:userId/transactions` - История транзакций

## 🐳 Docker команды

### Разработка
```bash
# Запуск всех сервисов
docker-compose --profile backend --profile bot --profile tools up -d

# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f tg-bot
docker-compose logs -f payment-monitor

# Остановка
docker-compose down

# Очистка
docker-compose down -v
docker system prune -f
```

### Продакшен
```bash
# Запуск
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d

# Обновление
docker-compose -f docker-compose-prod.yml pull
docker-compose -f docker-compose-prod.yml up -d

# Бэкап MongoDB
docker exec ai-stock-bot-mongodb-prod mongodump --out /tmp/backup
```

## 🔒 Безопасность

### Меры безопасности
- Шифрование чувствительных данных (AES-256-GCM)
- Rate limiting для API
- JWT токены для аутентификации
- Non-root пользователи в Docker
- Валидация всех входных данных

### Переменные окружения
```bash
# Критичные переменные (обязательны)
JWT_SECRET=your_32_character_secret_key
ENCRYPTION_KEY=your_32_character_encryption_key
OPENAI_API_KEY=your_openai_api_key
TELEGRAM_TOKEN=your_telegram_bot_token

# Дополнительные переменные
YOOMONEY_WALLET=your_yoomoney_wallet
SEGMIND_API_KEY=your_segmind_api_key
```

## 📊 Мониторинг

### Health Checks
```bash
# Проверка API
curl http://localhost:3000/health

# Проверка MongoDB
docker exec ai-stock-bot-mongodb mongosh --eval "db.adminCommand('ismaster')"

# Проверка логов
docker-compose logs -f --tail=50
```

### Метрики
- Успешность генерации изображений
- Время обработки платежей
- Использование AI-моделей
- Баланс пользователей

## 🛠️ Разработка

### Локальный запуск
```bash
# Backend
cd backend
npm install
npm run dev

# Telegram Bot
cd tg-bot
npm install
npm start

# Payment Monitor
cd payment-monitor
npm install
npm start
```

### Структура моделей данных

#### User Model
```javascript
{
  externalId: String,      // Telegram ID
  externalSystem: String,  // 'telegram'
  profile: {
    username: String,
    firstName: String,
    lastName: String,
    language: String
  },
  preferences: Object,
  stockServices: Object    // Настройки стоков
}
```

#### Account Model
```javascript
{
  userId: ObjectId,
  balance: Number,
  currency: String,
  transactions: [{
    type: String,
    amount: Number,
    description: String,
    createdAt: Date
  }]
}
```

#### Payment Model
```javascript
{
  userId: ObjectId,
  amount: Number,
  currency: String,
  status: String,
  yoomoneyLabel: String,
  createdAt: Date,
  completedAt: Date
}
```

## 🚀 Развертывание

### Подготовка сервера
```bash
# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Установка Docker Compose
sudo apt-get install docker-compose-plugin
```

### Продакшен деплой
```bash
# Копирование файлов
scp -r ai-stock-bot user@your-server:/opt/

# Запуск
ssh user@your-server
cd /opt/ai-stock-bot
docker-compose -f docker-compose-prod.yml up -d
```

## 📞 Поддержка

### Решение проблем
1. **Ошибка подключения к MongoDB**
   - Проверьте `MONGODB_URI`
   - Убедитесь, что MongoDB запущена

2. **Ошибка генерации изображений**
   - Проверьте `OPENAI_API_KEY`
   - Проверьте лимиты API

3. **Платежи не обрабатываются**
   - Проверьте настройки Gmail
   - Проверьте `YOOMONEY_WALLET`

### Полезные команды
```bash
# Проверка логов
docker-compose logs -f backend | grep ERROR

# Проверка использования памяти
docker stats

# Перезапуск сервиса
docker-compose restart backend
```

## 📚 Дополнительная документация

- [Backend API Guide](backend/README.md) - Детальная документация API
- [Admin API Guide](backend/ADMIN_API_GUIDE.md) - Управление AI-моделями
- [AI Models Guide](backend/AI_MODELS_GUIDE.md) - Настройка AI-моделей
- [Payment Design](PAYMENT_DESIGN_DOC.md) - Система оплаты
- [Production Guide](PRODUCTION.md) - Продакшен деплой

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch
3. Commit изменения
4. Push в branch
5. Создайте Pull Request

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.

## 📞 Контакты

- **GitHub Issues**: [Создать Issue](https://github.com/alexanderrodnin/ai-stock-bot/issues)
- **Email**: alexander.rodnin@gmail.com
- **Telegram**: @alexanderrodnin
