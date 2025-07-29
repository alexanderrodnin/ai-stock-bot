# 🤖 AI Stock Bot

Телеграм бот для генерации изображений с помощью множественных AI моделей и автоматической загрузки на стоковые площадки с интегрированной системой платежей.

## ✨ Основные возможности

- 🎨 **Генерация изображений** с 4 AI моделями (Juggernaut Pro Flux, DALL-E 3, Seedream V3, HiDream-I1 Fast)
- 💳 **Система платежей** с YooMoney и управлением подписками
- 📤 **Автоматическая загрузка** на стоковую площадку 123RF
- ⚙️ **Административная панель** для управления AI моделями
- 🔄 **Динамическое переключение** между AI провайдерами
- 🐳 **Docker контейнеризация** с профилями для разных сценариев

## 🏗️ Архитектура

Проект состоит из трех основных компонентов:

- **Backend API** - REST API с системой платежей, управлением пользователями и интеграцией с AI провайдерами
- **Telegram Bot** - Интерфейс для взаимодействия с пользователями через Telegram
- **Payment System** - Интеграция с YooMoney для обработки платежей и управления подписками

Подробная архитектурная диаграмма доступна в [документации](doc/README.md).

## 🚀 Быстрый старт

### 1. Клонирование репозитория

```bash
git clone https://github.com/alexanderrodnin/ai-stock-bot.git
cd ai-stock-bot
```

### 2. Настройка переменных окружения

```bash
# Скопируйте файл с примером
cp .env.example .env

# Отредактируйте .env файл, добавив ваши API ключи
nano .env
```

**Обязательные переменные:**
```bash
# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token_from_botfather

# AI Providers
OPENAI_API_KEY=your_openai_api_key
SEGMIND_API_KEY=your_segmind_api_key  # Для Juggernaut Pro Flux, Seedream V3, HiDream-I1

# Payment System (YooMoney)
YOOMONEY_CLIENT_ID=your_yoomoney_client_id
YOOMONEY_WALLET=your_yoomoney_wallet
YOOMONEY_WEBHOOK_SECRET=your_webhook_secret

# Security
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_exactly_32_characters

# Database
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_mongodb_password
```

### 3. Запуск с Docker Compose

#### Полный стек (рекомендуется)
```bash
# Запуск всех сервисов включая Telegram Bot
docker-compose --profile full up -d

# Или с инструментами разработки
docker-compose --profile full --profile tools up -d
```

#### Только Backend + Database
```bash
docker-compose --profile backend up -d
```

#### Только Telegram Bot (требует запущенный backend)
```bash
docker-compose --profile bot up -d
```

### 4. Проверка работы

- **Backend API**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health
- **MongoDB Express**: http://localhost:8081 (admin/admin) - только с `--profile tools`
- **Telegram Bot**: найдите вашего бота в Telegram и отправьте `/start`

## 🤖 AI Модели

Система поддерживает 4 AI модели с автоматическим переключением:

### 1. Juggernaut Pro Flux (по умолчанию)
- **Провайдер**: Segmind API
- **Особенности**: Профессиональные реалистичные изображения
- **Качество**: Высокое, оптимизировано для стоковых изображений

### 2. DALL-E 3 (OpenAI)
- **Провайдер**: OpenAI API
- **Особенности**: Отличное понимание промптов, премиум качество
- **Безопасность**: Встроенная фильтрация контента

### 3. Seedream V3
- **Провайдер**: Segmind API
- **Особенности**: Художественная и креативная генерация
- **Стиль**: Идеально для арт-контента

### 4. HiDream-I1 Fast
- **Провайдер**: Segmind API
- **Особенности**: Быстрая высококачественная генерация
- **Скорость**: Оптимизировано для высокой производительности

**Система фоллбеков**: При сбое одной модели автоматически переключается на следующую в порядке приоритета.

Подробнее в [AI Models Guide](doc/AI_MODELS_GUIDE.md).

## 💳 Система платежей

### Тарифные планы
- **План 1**: 10 изображений
- **План 2**: 100 изображений
- **План 3**: 1000 изображений
- **План 4**: 10000 изображений

### Возможности
- 💰 Интеграция с YooMoney для приема платежей
- 🔄 Автоматическое обновление баланса через webhooks
- 📊 Отслеживание подписок и истории платежей
- 📱 Мгновенные уведомления в Telegram при успешной оплате
- ⚡ Автоматическая блокировка генерации при нулевом балансе

## 🔧 Административная панель

Система включает мощную админ-панель для управления:

- 🔄 **Переключение AI моделей** в реальном времени
- 📊 **Мониторинг статуса** всех AI провайдеров
- ⚙️ **Динамическая конфигурация** без перезапуска
- 📝 **Аудит всех изменений** с полной историей
- 🏥 **Health checks** и системная диагностика

Подробнее в [Admin API Guide](doc/ADMIN_API_GUIDE.md).

## 📋 Основные команды Telegram Bot

- `/start` - Начать работу, инициализация пользователя
- `/help` - Справка по использованию
- `/mystocks` - Управление настройками 123RF
- `/balance` - Проверить баланс изображений
- `/buy` - Купить изображения

**Генерация изображений**: Просто отправьте текстовое описание изображения боту.

## 🐳 Docker Compose профили

Система поддерживает гибкие профили развертывания:

- **`backend`** - Backend API + MongoDB
- **`bot`** - Telegram Bot + Backend + MongoDB
- **`full`** - Все основные сервисы
- **`tools`** - Дополнительные инструменты (Mongo Express)

```bash
# Примеры использования
docker-compose --profile backend up -d                    # Только API
docker-compose --profile bot up -d                        # API + Bot
docker-compose --profile full --profile tools up -d       # Все + инструменты
```

## 📊 API Overview

### Основные группы endpoints:
- **Images** (`/api/images/*`) - Генерация и управление изображениями
- **Upload** (`/api/upload/*`) - Загрузка на стоковые сервисы
- **Users** (`/api/users/*`) - Управление пользователями и подписками
- **Payments** (`/api/payments/*`) - Платежная система
- **Admin** (`/api/admin/*`) - Административные функции

Полная документация API в [Backend README](backend/README.md).

## 🔒 Безопасность

- 🔐 **Шифрование** всех чувствительных данных (FTP пароли, API ключи)
- 🛡️ **JWT токены** для аутентификации
- ⚡ **Rate limiting** для защиты от злоупотреблений
- ✅ **Валидация** всех входных данных
- 🔍 **Аудит** всех критических операций
- 🐳 **Non-root** пользователи в Docker контейнерах

## 📝 Логи и мониторинг

```bash
# Просмотр логов
docker-compose logs -f backend     # Backend API
docker-compose logs -f tg-bot      # Telegram Bot
docker-compose logs -f mongodb     # MongoDB

# Проверка статуса
curl http://localhost:3000/api/health
curl http://localhost:3000/api/admin/status
```

## 🛠️ Разработка

### Локальный запуск
```bash
# Backend
cd backend && npm install && npm run dev

# Telegram Bot
cd tg-bot && npm install && npm start
```

### Структура проекта
```
ai-stock-bot/
├── backend/                 # Backend API с системой платежей
├── tg-bot/                 # Telegram Bot интерфейс
├── doc/                    # Документация и диаграммы
├── data/                   # Данные MongoDB (Docker volume)
├── docker-compose.yml      # Разработка
├── docker-compose-prod.yml # Продакшен
└── README.md              # Этот файл
```

## 📚 Документация

- 📖 [Архитектура и диаграммы](doc/README.md)
- 🔧 [Backend API](backend/README.md)
- 🤖 [Telegram Bot](tg-bot/README.md)
- 🚀 [Production Deployment](doc/PRODUCTION.md)
- 🎨 [AI Models Guide](doc/AI_MODELS_GUIDE.md)
- ⚙️ [Admin API Guide](doc/ADMIN_API_GUIDE.md)
- 🔄 [Dynamic AI Models](doc/DYNAMIC_AI_MODELS.md)
- 💳 [Payment System Guide](doc/PAYMENT_SYSTEM_GUIDE.md)

## 🚧 Roadmap

### Реализовано ✅
- Множественные AI провайдеры с фоллбеками
- Система платежей с YooMoney
- Административная панель
- Docker контейнеризация
- Telegram Bot интерфейс
- Загрузка на 123RF

### В планах 🔄
- Web интерфейс для браузерных пользователей
- Дополнительные стоковые платформы (Shutterstock, Adobe Stock)
- Расширенная аналитика и метрики
- Пакетная обработка изображений
- API для сторонних интеграций

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

MIT License

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:

1. Проверьте [Issues](https://github.com/alexanderrodnin/ai-stock-bot/issues)
2. Изучите [документацию](doc/README.md)
3. Создайте новый Issue с подробным описанием
4. Приложите логи и конфигурацию (без секретных данных)

---

⭐ **Если проект оказался полезным, поставьте звездочку на GitHub!**
