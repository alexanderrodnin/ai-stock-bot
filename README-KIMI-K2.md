# 🤖 AI Stock Bot - KIMI K2 Edition

**Полная документация проекта AI Stock Bot** - система генерации изображений с помощью множественных AI моделей и автоматической загрузки на стоковые площадки.

## 📋 Оглавление

- [🎯 Обзор проекта](#-обзер-проекта)
- [🏗️ Архитектура](#️-архитектура)
- [🚀 Быстрый старт](#-быстрый-старт)
- [🎨 AI Модели](#-ai-модели)
- [🔧 Конфигурация](#-конфигурация)
- [📊 API Документация](#-api-документация)
- [🐳 Docker и деплой](#-docker-и-деплой)
- [🔒 Безопасность](#-безопасность)
- [📈 Мониторинг](#-мониторинг)
- [🛠️ Разработка](#️-разработка)
- [🤝 Вклад в проект](#-вклад-в-проект)

## 🎯 Обзер проекта

AI Stock Bot - это микросервисная система для автоматизации процесса создания и публикации стоковых изображений. Система использует передовые AI модели для генерации изображений и автоматически загружает их на стоковые площадки.

### Основные возможности:
- **4 AI модели** для генерации изображений
- **Автоматическая загрузка** на 123RF через FTP
- **Telegram интерфейс** для пользователей
- **REST API** для интеграций
- **Масштабируемая архитектура** на Docker
- **Автоматические обновления** в продакшене

## 🏗️ Архитектура

### Микросервисная структура

```
AI Stock Bot
├── 🎯 Frontend Layer
│   └── Telegram Bot (tg-bot/)
│       ├── User Interface
│       ├── Image Generation
│       └── Stock Upload Management
│
├── 🔧 Backend Layer (backend/)
│   ├── REST API
│   ├── AI Model Management
│   ├── User Management
│   └── Stock Services
│
├── 🗄️ Data Layer
│   ├── MongoDB (Users, Images, Config)
│   ├── File Storage (temp images)
│   └── Configuration Management
│
└── 🤖 AI Layer
    ├── OpenAI DALL-E 3
    ├── Juggernaut Pro Flux
    ├── Seedream V3
    └── HiDream-I1 Fast
```

### Технологический стек

| Компонент | Технология |
|-----------|------------|
| **Backend** | Node.js 18+, Express.js |
| **Database** | MongoDB 7.0.5 |
| **AI Models** | OpenAI, Segmind |
| **Containerization** | Docker, Docker Compose |
| **Monitoring** | Health checks, Logging |
| **Security** | JWT, Encryption, Rate limiting |

## 🚀 Быстрый старт

### 1. Клонирование и настройка

```bash
# Клонирование репозитория
git clone https://github.com/alexanderrodnin/ai-stock-bot.git
cd ai-stock-bot

# Копирование переменных окружения
cp .env.example .env
cp .env.prod.example .env.prod

# Редактирование конфигурации
nano .env
```

### 2. Обязательные переменные окружения

```bash
# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token_from_botfather

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Безопасность
JWT_SECRET=your_jwt_secret_key_minimum_32_characters
ENCRYPTION_KEY=your_32_character_encryption_key

# MongoDB
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_password
```

### 3. Запуск в разработке

```bash
# Запуск всего стека
docker-compose --profile full up -d

# Или по отдельности
docker-compose --profile backend up -d    # Backend + MongoDB
docker-compose --profile bot up -d         # Telegram Bot
docker-compose --profile tools up -d       # MongoDB Express
```

### 4. Проверка работы

- **Backend API**: http://localhost:3000
- **MongoDB Express**: http://localhost:8081 (admin/admin)
- **Telegram Bot**: найдите вашего бота и отправьте `/start`

## 🎨 AI Модели

### Доступные модели

| Модель | Провайдер | Особенности | Требования |
|--------|-----------|-------------|------------|
| **Juggernaut Pro Flux** | Segmind | Профессиональные реалистичные изображения | `SEGMIND_API_KEY` |
| **OpenAI DALL-E 3** | OpenAI | Высокое качество, отличное понимание промптов | `OPENAI_API_KEY` |
| **Seedream V3** | Segmind | Художественная и креативная генерация | `SEGMIND_API_KEY` |
| **HiDream-I1 Fast** | Segmind | Быстрая высококачественная генерация | `SEGMIND_API_KEY` |

### Каскадная система fallback

Система автоматически переключается между моделями при сбоях:

1. **Juggernaut Pro Flux** (по умолчанию)
2. **HiDream-I1 Fast** (первый fallback)
3. **Seedream V3** (второй fallback)
4. **DALL-E 3** (третий fallback)
5. **Mock изображения** (финальный fallback)

### Управление моделями через Admin API

```bash
# Получить текущую конфигурацию
GET /api/admin/config/ai-models

# Переключить модель
POST /api/admin/config/ai-model/switch
{
  "model": "juggernaut-pro-flux",
  "reason": "Testing new model"
}

# Получить историю переключений
GET /api/admin/config/ai-models/history
```

## 🔧 Конфигурация

### Полная конфигурация переменных окружения

```bash
# Основные настройки
NODE_ENV=development
PORT=3000

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-stock-bot
MONGO_INITDB_DATABASE=ai-stock-bot

# AI провайдеры
OPENAI_API_KEY=your_openai_api_key
SEGMIND_API_KEY=your_segmind_api_key

# FTP для 123RF
FTP_HOST=ftp.123rf.com
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_REMOTE_PATH=/ai_image

# Безопасность
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_32_character_key
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Логирование
LOG_LEVEL=info
```

## 📊 API Документация

### Базовые эндпоинты

#### Health Check
```bash
GET /api/health
```

#### Пользователи
```bash
POST   /api/users                    # Создание пользователя
GET    /api/users/:id                # Получение пользователя
PUT    /api/users/:id                # Обновление пользователя
DELETE /api/users/:id                # Удаление пользователя
GET    /api/users/:id/stats          # Статистика пользователя
```

#### Изображения
```bash
POST   /api/images/generate          # Генерация изображения
GET    /api/images/:id/stream        # Потоковая передача
GET    /api/users/:userId/images     # История изображений
DELETE /api/images/:id               # Удаление изображения
```

#### Загрузка на стоки
```bash
POST   /api/upload/123rf            # Загрузка на 123RF
GET    /api/upload/status/:imageId    # Статус загрузки
POST   /api/upload/retry            # Повторная попытка
```

#### Stock сервисы
```bash
GET    /api/users/:userId/stock-services          # Получение настроек
PUT    /api/users/:userId/stock-services/:service # Обновление настроек
DELETE /api/users/:userId/stock-services/:service # Удаление настроек
POST   /api/users/:userId/stock-services/:service/test # Тест соединения
```

### Admin API
```bash
GET    /api/admin/status            # Статус системы
GET    /api/admin/config            # Текущая конфигурация
PUT    /api/admin/config/model/:modelName # Переключение модели
```

### Примеры использования

#### Генерация изображения
```bash
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Beautiful mountain landscape at sunset",
    "userId": "user123",
    "userExternalId": "telegram_user_456",
    "options": {
      "model": "dall-e-3",
      "size": "1024x1024",
      "quality": "standard"
    }
  }'
```

#### Создание пользователя
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "telegram_123456",
    "externalSystem": "telegram",
    "profile": {
      "username": "user123",
      "firstName": "John",
      "language": "en"
    }
  }'
```

## 🐳 Docker и деплой

### Разработка
```bash
# Запуск с горячей перезагрузкой
docker-compose --profile full up -d

# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f tg-bot
```

### Продакшен
```bash
# Запуск продакшен версии
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d

# Автоматические обновления через Watchtower
# Проверка каждые 30 секунд
```

### Docker команды
```bash
# Сборка и запуск
docker-compose --profile backend up --build -d

# Остановка
docker-compose --profile full down

# Очистка
docker system prune -f
docker volume prune -f
```

## 🔒 Безопасность

### Механизмы защиты

| Механизм | Описание |
|----------|----------|
| **JWT токены** | Аутентификация и авторизация |
| **Rate limiting** | Защита от злоупотреблений |
| **Шифрование** | AES-256-GCM для чувствительных данных |
| **Валидация** | express-validator для всех входных данных |
| **CORS** | Настройка cross-origin запросов |
| **Helmet** | Security headers |

### Шифрование данных

```javascript
// Пример шифрования FTP паролей
const encrypted = encryption.encrypt('ftp_password');
const decrypted = encryption.decrypt(encrypted);
```

### Rate limiting
- **Общий API**: 100 запросов / 15 минут
- **Генерация изображений**: 10 запросов / 5 минут
- **Загрузки**: 20 запросов / 10 минут

## 📈 Мониторинг

### Health checks
```bash
# Проверка статуса
curl http://localhost:3000/api/health

# Проверка всех сервисов
docker-compose ps
```

### Логирование
```bash
# Просмотр логов
docker-compose logs -f backend
docker-compose logs -f tg-bot
docker-compose logs -f mongodb

# Уровни логирования
LOG_LEVEL=debug|info|warn|error
```

### Метрики
- Количество сгенерированных изображений
- Успешность загрузок на стоки
- Использование AI моделей
- Активность пользователей

## 🛠️ Разработка

### Локальный запуск без Docker

```bash
# Backend
cd backend
npm install
npm run dev

# Telegram Bot
cd tg-bot
npm install
npm start
```

### Структура проекта

```
ai-stock-bot/
├── backend/                    # Backend API
│   ├── src/
│   │   ├── controllers/      # API контроллеры
│   │   ├── models/          # MongoDB модели
│   │   ├── routes/         # API маршруты
│   │   ├── services/       # Бизнес-логика
│   │   ├── middleware/     # Middleware
│   │   └── utils/          # Утилиты
│   ├── docker/            # Docker конфигурации
│   └── scripts/           # Скрипты
├── tg-bot/                # Telegram Bot
│   ├── services/         # Сервисы бота
│   └── index.js        # Основной файл
├── doc/                  # Документация
└── docker-compose*.yml # Docker конфигурации
```

### Скрипты разработки

```bash
# Backend
npm run dev          # Запуск в development режиме
npm start           # Запуск в production режиме
npm run test        # Запуск тестов
npm run docker:up   # Запуск Docker контейнеров

# Telegram Bot
npm start           # Запуск бота
npm run demo        # Запуск в demo режиме
```

## 🤝 Вклад в проект

### Разработка новых функций

1. **Fork** репозитория
2. **Создайте** feature branch (`git checkout -b feature/amazing-feature`)
3. **Коммит** изменений (`git commit -m 'Add amazing feature'`)
4. **Push** в branch (`git push origin feature/amazing-feature`)
5. **Создайте** Pull Request

### Руководство по стилю кода

- **ESLint** для JavaScript
- **Prettier** для форматирования
- **Conventional commits** для сообщений
- **JSDoc** для документации

### Тестирование

```bash
# Backend тесты
cd backend
npm test

# Интеграционные тесты
./test-user-api.sh
```

## 📞 Поддержка

### Проблемы и вопросы

1. **GitHub Issues**: https://github.com/alexanderrodnin/ai-stock-bot/issues
2. **Документация**: Проверьте файлы README в каждом сервисе
3. **Логи**: Проверьте логи через `docker-compose logs`

### Быстрое решение проблем

```bash
# Проблема: MongoDB не запускается
docker-compose --profile backend down
docker volume rm ai-stock-bot_mongodb_data
docker-compose --profile backend up -d

# Проблема: Telegram Bot не отвечает
docker-compose logs tg-bot
# Проверьте TELEGRAM_TOKEN в .env

# Проблема: AI модель не работает
docker-compose logs backend
# Проверьте OPENAI_API_KEY и SEGMIND_API_KEY
```

## 📄 Лицензия

MIT License - см. [LICENSE](LICENSE) файл для деталей.

---

**AI Stock Bot - KIMI K2 Edition**  
*Автоматизация генерации и публикации стоковых изображений с помощью AI*
