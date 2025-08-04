# 🤖 AI Stock Bot

Комплексная система генерации изображений с помощью множественных AI моделей, интегрированной платежной системой YooMoney и автоматической загрузкой на стоковые площадки через Telegram интерфейс.

## 📋 Содержание

- [Обзор проекта](#-обзор-проекта)
- [Архитектура системы](#️-архитектура-системы)
- [Быстрый старт](#-быстрый-старт)
- [Docker развертывание](#-docker-развертывание)
- [Мониторинг и логирование](#-мониторинг-и-логирование)
- [Документация](#-документация)

## 🎯 Обзор проекта

**AI Stock Bot** - это полнофункциональная система для генерации изображений с использованием передовых AI технологий, предназначенная для создания контента для стоковых площадок. Система объединяет в себе:

- **Множественные AI провайдеры** с автоматическим переключением при сбоях
- **Монетизацию через YooMoney** с гибкими тарифными планами
- **Автоматическую загрузку** на стоковые сервисы (123RF)
- **Telegram интерфейс** для удобного взаимодействия с пользователями
- **Административную панель** для управления системой в реальном времени

### ✨ Ключевые возможности

#### 🎨 Генерация изображений
- **4 AI модели**: Juggernaut Pro Flux, DALL-E 3, Seedream V3, HiDream-I1 Fast
- **Автоматические фоллбеки** при сбоях провайдеров
- **Высокое качество**: 4096x4096 пикселей
- **Быстрая обработка**: от 5 до 30 секунд в зависимости от модели
- **Автоматическая отправка**: сжатое изображение + файл без сжатия

#### 💳 Монетизация
- **Подписочная модель** с балансом изображений
- **Система подарочных изображений** для новых пользователей
- **Интеграция YooMoney** для приема платежей
- **Webhook обработка** для автоматического пополнения
- **Гибкие тарифы**: настраиваемое количество изображений

#### 📤 Стоковые интеграции
- **123RF FTP загрузка**
- **Автоматическая обработка** title, description, keywords
- **Retry механизм** при сбоях загрузки

#### ⚙️ Административное управление
- **Динамическое переключение** AI моделей без перезапуска
- **Мониторинг статуса** всех провайдеров
- **Полный аудит** всех изменений конфигурации
- **Health checks** и системная диагностика


## 🏗️ Архитектура системы

Система построена на **микросервисной архитектуре** с четким разделением ответственности:

```
┌─────────────────────────────────────────────────────────────┐
│                    Telegram Bot Interface                   │
│              (Пользовательский интерфейс)                   │
├─────────────────────────────────────────────────────────────┤
│                    Backend API Server                       │
│        (Бизнес-логика, AI интеграция, платежи)              │
├─────────────────────────────────────────────────────────────┤
│                    External Services                        │
│  AI Providers │ YooMoney │ 123RF FTP │ MongoDB              │
└─────────────────────────────────────────────────────────────┘
```

### Основные компоненты

#### 1. **Backend API** ([подробная документация](backend/README.md))
- **RESTful API** на Express.js с полным набором endpoints
- **AI провайдеры** с каскадными фоллбеками
- **Загрузка на стоки** через FTP интеграцию
- **Административные функции** для управления системой

#### **Система платежей** ([подробная документация](doc/PAYMENT_SYSTEM_GUIDE.md))
- **Подписочная модель** с покупкой пакетов изображений
- **Интеграция YooMoney** для приема платежей в рублях
- **Webhook обработка** для автоматического пополнения баланса
- **Тарифные планы** с различными пакетами изображений
- **Полный аудит** всех платежных транзакций

#### 2. **Telegram Bot** ([подробная документация](tg-bot/README.md))
- **Интуитивный интерфейс** с командами и inline кнопками
- **Многошаговые диалоги** для сложных операций
- **Потоковая передача** изображений
- **Уведомления** о платежах и статусе операций

#### 3. **База данных** ([подробная документация](doc/DATABASE_GUIDE.md))
- **MongoDB 7.0.5** с оптимизированными индексами
- **Коллекции**: Users, Images, Payments, AppConfig, ConfigAuditLog, WebhookLog
- **Связи и агрегации** для сложных запросов
- **Автоматические миграции** при обновлениях

### Прочие компоненты

#### **AI модели и провайдеры** ([подробная документация](doc/AI_MODELS_GUIDE.md))
- **4 AI модели**: Juggernaut Pro Flux, DALL-E 3, Seedream V3, HiDream-I1 Fast
- **Автоматические фоллбеки** при сбоях провайдеров
- **Динамическое переключение** моделей без перезапуска системы

#### **Административное управление** ([подробная документация](doc/ADMIN_API_GUIDE.md))
- **Переключение активной модели** без перезапуска системы
- **Мониторинг статуса** всех AI провайдеров
- **Полный аудит** всех изменений конфигурации
- **Health checks** и системная диагностика


## 🚀 Быстрый старт

### Предварительные требования
- **Docker** и Docker Compose
- **Telegram Bot Token** от [@BotFather](https://t.me/BotFather)
- **API ключи**: OpenAI, Segmind
- **YooMoney аккаунт** для платежей

### 1. Клонирование и настройка

```bash
# Клонирование репозитория
git clone https://github.com/alexanderrodnin/ai-stock-bot.git
cd ai-stock-bot

# Настройка переменных окружения
cp .env.example .env
nano .env  # Отредактируйте файл с вашими API ключами
```

### 2. Обязательные переменные окружения

```bash
# Telegram Bot
BOT_TOKEN=your_telegram_bot_token_from_botfather

# AI Providers
OPENAI_API_KEY=your_openai_api_key_here
SEGMIND_API_KEY=your_segmind_api_key_here

# YooMoney Payment System
YOOMONEY_CLIENT_ID=your_yoomoney_client_id
YOOMONEY_WALLET=your_yoomoney_wallet_number
YOOMONEY_WEBHOOK_SECRET=your_webhook_secret_key

# Security
JWT_SECRET=your_jwt_secret_key_minimum_32_characters_long
ENCRYPTION_KEY=your_encryption_key_exactly_32_characters

# Database
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_mongodb_password
```

### 3. Запуск системы

```bash
# Полный стек (рекомендуется)
docker-compose --profile backend --profile bot up -d

# С инструментами разработки
docker-compose --profile backend --profile bot --profile tools up -d

# Проверка статуса
curl http://localhost:3000/api/health
```

### 4. Проверка работы

- **Backend API**: http://localhost:3000/api/health
- **Admin Status**: http://localhost:3000/api/admin/status
- **MongoDB Express**: http://localhost:8081 (admin/admin123) - только с `--profile tools`
- **Telegram Bot**: найдите вашего бота и отправьте `/start`


## 🐳 Docker развертывание

### Профили развертывания

Система поддерживает гибкие профили для разных сценариев:

```bash
# Только Backend API + MongoDB
docker-compose --profile backend up -d

# Backend + Telegram Bot
docker-compose --profile backend --profile bot up -d

# Полная система с инструментами разработки
docker-compose --profile backend --profile bot --profile tools up -d
```

### Структура сервисов

#### Основные сервисы
- **backend** - Backend API сервер
- **mongodb** - База данных MongoDB 7.0.5
- **tg-bot** - Telegram Bot интерфейс

#### Инструменты разработки (profile: tools)
- **mongo-express** - Web интерфейс для MongoDB

### Docker Compose особенности

- **Hot reload** в development режиме
- **Персистентные данные** через Docker volumes
- **Изолированная сеть** для всех сервисов
- **Health checks** для автоматической проверки
- **Graceful shutdown** для корректного завершения

### Управление данными

```bash
# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f tg-bot

# Backup базы данных
docker exec ai-stock-bot-mongodb-1 mongodump --db ai-stock-bot --out /backup

# Очистка volumes (ВНИМАНИЕ: удалит все данные)
docker-compose down -v
```

## 🔒 Безопасность

### Многоуровневая защита

#### Шифрование данных
- **AES-256-GCM** для чувствительных данных (FTP пароли)
- **JWT токены** для аутентификации API
- **Webhook валидация** с криптографическими подписями
- **Environment variables** для API ключей

#### Rate Limiting (Обновлено для продакшена)
```javascript
// Ограничения по endpoints (Production Settings)
Общий API: 400 requests / 15 minutes
Генерация изображений: 100 requests / 1 hour
Загрузки на стоки: 100 requests / 1 hour
Создание аккаунтов: 5 requests / hour
```

**Переменные окружения для настройки:**
```bash
# Общие лимиты API
RATE_LIMIT_WINDOW=900000        # 15 минут
RATE_LIMIT_MAX=400              # 400 запросов

# Генерация изображений
IMAGE_GENERATION_WINDOW=3600000 # 1 час
IMAGE_GENERATION_MAX=100        # 100 генераций

# Загрузка на стоки
UPLOAD_WINDOW=3600000           # 1 час
UPLOAD_MAX=100                  # 100 загрузок
```

**Подробная документация по Rate Limiting:** [Backend API Guide - Безопасность](backend/README.md#-безопасность)

#### Валидация и санитизация
- **express-validator** для входных данных
- **HTML escape** для пользовательского ввода
- **MongoDB injection protection**
- **XSS protection** через Content Security Policy

#### Security Headers
- **Helmet.js** для безопасных HTTP заголовков
- **CORS** конфигурация для контроля доступа
- **HSTS** для принудительного HTTPS

## 📊 Мониторинг и логирование

### Структурированное логирование

#### Winston Logger
- **Development**: человекочитаемый формат
- **Production**: JSON формат для анализа
- **Ротация логов** по размеру и времени
- **Уровни логирования**: debug, info, warn, error

#### Логируемые события
- HTTP запросы и ответы
- AI модель переключения
- Платежные транзакции
- Ошибки генерации изображений
- Webhook обработка
- Database операции

### Health Checks

```bash
# Базовая проверка сервера
curl http://localhost:3000/health

# API health с деталями
curl http://localhost:3000/api/health

# Полный статус системы
curl http://localhost:3000/api/admin/status
```

### Метрики производительности

- **Время ответа API** по endpoints
- **Статус AI провайдеров** и успешность генерации
- **Статистика платежей** и конверсия
- **Использование ресурсов** (CPU, память, диск)
- **Database performance** (query time, connections)
- **Error rates** по типам ошибок

## 📚 Документация

### Основная документация
- 📖 **[Архитектура и диаграммы](doc/README.md)** - Общая архитектура системы
- 🔧 **[Backend API](backend/README.md)** - RESTful API документация
- 🤖 **[Telegram Bot](tg-bot/README.md)** - Telegram интерфейс
- 🚀 **[Production Deployment](doc/PRODUCTION.md)** - Развертывание в продакшене

### Специализированные руководства
- 🎨 **[AI Models Guide](doc/AI_MODELS_GUIDE.md)** - AI модели и провайдеры
- ⚙️ **[Admin API Guide](doc/ADMIN_API_GUIDE.md)** - Административное управление
- 💳 **[Payment System Guide](doc/PAYMENT_SYSTEM_GUIDE.md)** - Платежная система YooMoney
- 🗄️ **[Database Guide](doc/DATABASE_GUIDE.md)** - Структура базы данных MongoDB

### API Reference
- **Images API** - Генерация и управление изображениями
- **Upload API** - Загрузка на стоковые сервисы
- **Users API** - Управление пользователями и подписками
- **Payments API** - Платежная система
- **Admin API** - Административные функции
