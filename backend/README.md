# AI Stock Bot Backend API

RESTful API backend для AI Stock Bot - системы генерации изображений с помощью DALL-E 3 и автоматической загрузки на стоковые площадки (123RF).

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- MongoDB
- OpenAI API ключ
- 123RF FTP учетные данные (опционально)

### Установка

1. Установите зависимости:
```bash
npm install
```

2. Создайте файл окружения:
```bash
cp .env.example .env
```

3. Заполните переменные окружения в `.env`:
```bash
# Обязательные
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=mongodb://localhost:27017/ai-stock-bot

# 123RF FTP (опционально)
FTP_HOST=ftp.123rf.com
FTP_USER=your_ftp_username  
FTP_PASSWORD=your_ftp_password
FTP_REMOTE_PATH=/ai_image
```

4. Запустите сервер:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

API будет доступен по адресу: `http://localhost:3000`

### Запуск через Docker (рекомендуемый)

1. Скопируйте файл переменных окружения для Docker:
```bash
cp .env.docker .env
```

2. Заполните обязательные переменные в `.env`:
```bash
OPENAI_API_KEY=your_openai_api_key_here
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
```

3. Запустите сервисы:
```bash
# Запуск с автоматической сборкой
npm run docker:up:build

# Или используйте docker-compose напрямую
docker-compose up -d --build
```

4. Проверьте статус сервисов:
```bash
docker-compose ps
```

5. Просмотр логов:
```bash
npm run docker:logs
```

Сервисы будут доступны:
- **Backend API**: http://localhost:3000
- **MongoDB**: localhost:27017
- **Mongo Express** (опционально): http://localhost:8081

## 📋 API Endpoints

### Health Check
- `GET /health` - Проверка статуса API
- `GET /api/health` - Проверка статуса API (с rate limiting)

### Images
- `POST /api/images/generate` - Генерация изображения
- `GET /api/images/:imageId/stream` - Потоковая передача изображения
- `GET /api/users/:userId/images` - История изображений пользователя
- `GET /api/images/:imageId` - Детали конкретного изображения
- `DELETE /api/images/:imageId` - Удаление изображения

### Upload (Stock Services)
- `POST /api/upload/123rf` - Загрузка на 123RF
- `GET /api/upload/status/:imageId` - Статус загрузки
- `POST /api/upload/retry` - Повторная попытка загрузки

### Users
- `POST /api/users` - Создание/получение пользователя
- `GET /api/users/:id` - Получение пользователя по ID
- `PUT /api/users/:id` - Обновление пользователя
- `DELETE /api/users/:id` - Удаление пользователя
- `GET /api/users/:id/stats` - Статистика пользователя

### Stock Services
- `GET /api/users/:userId/stock-services` - Получение настроек стоковых сервисов
- `PUT /api/users/:userId/stock-services/:service` - Обновление настроек сервиса
- `DELETE /api/users/:userId/stock-services/:service` - Удаление настроек сервиса
- `POST /api/users/:userId/stock-services/:service/test` - Тест соединения с сервисом

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|------------|--------------|--------------|----------|
| `PORT` | Нет | 3000 | Порт сервера |
| `NODE_ENV` | Нет | development | Окружение |
| `MONGODB_URI` | Да | - | URI подключения к MongoDB |
| `OPENAI_API_KEY` | Да | - | API ключ OpenAI |
| `OPENAI_BASE_URL` | Нет | https://api.openai.com/v1 | Базовый URL OpenAI API |
| `OPENAI_TIMEOUT` | Нет | 60000 | Таймаут OpenAI запросов (мс) |
| `FTP_HOST` | Нет | ftp.123rf.com | Хост FTP сервера 123RF |
| `FTP_PORT` | Нет | 21 | Порт FTP сервера |
| `FTP_USER` | Нет | - | Пользователь FTP |
| `FTP_PASSWORD` | Нет | - | Пароль FTP |
| `FTP_REMOTE_PATH` | Нет | /ai_image | Путь на FTP сервере |
| `FTP_SECURE` | Нет | false | Использовать FTPS |
| `FTP_TIMEOUT` | Нет | 30000 | Таймаут FTP соединения (мс) |
| `TEMP_DIR` | Нет | ./temp | Директория временных файлов |
| `MAX_FILE_SIZE` | Нет | 10485760 | Максимальный размер файла (байт) |
| `CLEANUP_INTERVAL` | Нет | 86400000 | Интервал очистки файлов (мс) |
| `RATE_LIMIT_MAX` | Нет | 100 | Лимит запросов за окно |
| `RATE_LIMIT_WINDOW` | Нет | 900000 | Окно rate limiting (мс) |
| `ALLOWED_ORIGINS` | Нет | localhost:3000,localhost:3001 | Разрешенные CORS источники |
| `ENCRYPTION_SECRET_KEY` | Да | - | Ключ шифрования (32 символа) |
| `JWT_SECRET` | Нет | development-jwt-secret | JWT секрет |
| `LOG_LEVEL` | Нет | info | Уровень логирования |

## 🏗️ Архитектура

### Структура проекта
```
backend/
├── src/
│   ├── app.js              # Express приложение
│   ├── server.js           # HTTP сервер
│   ├── config/
│   │   ├── config.js       # Конфигурация
│   │   └── database.js     # MongoDB подключение
│   ├── controllers/        # Контроллеры
│   │   ├── imageController.js
│   │   ├── uploadController.js
│   │   └── userController.js
│   ├── middleware/         # Middleware
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── routes/            # Маршруты
│   │   ├── index.js
│   │   ├── images.js
│   │   ├── upload.js
│   │   └── users.js
│   ├── services/          # Бизнес-логика
│   │   ├── imageService.js
│   │   ├── stockUploadService.js
│   │   └── ftpService.js
│   ├── models/            # MongoDB модели
│   │   ├── User.js
│   │   └── Image.js
│   └── utils/             # Утилиты
│       ├── logger.js
│       ├── encryption.js
│       └── mock-image-urls.js
├── temp/                  # Временные файлы
├── package.json
├── .env.example
└── README.md
```

### Middleware Stack
1. **Security** - Helmet для безопасности
2. **CORS** - Настройка cross-origin запросов
3. **Compression** - Сжатие ответов
4. **Body Parsing** - Парсинг JSON/URL-encoded
5. **Logging** - Morgan для HTTP логов
6. **Rate Limiting** - Защита от злоупотреблений
7. **Validation** - express-validator
8. **Error Handling** - Централизованная обработка ошибок

### Основные сервисы

#### ImageService
- Генерация изображений через OpenAI DALL-E 3
- Обработка изображений с помощью Sharp (изменение размера до 4000x4000)
- Fallback на mock изображения при недоступности OpenAI
- Потоковая передача изображений

#### StockUploadService
- Загрузка изображений на стоковые площадки
- Поддержка 123RF через FTP
- Управление настройками стоковых сервисов
- Отслеживание статуса загрузок

#### FtpService
- Подключение к FTP серверам
- Загрузка файлов с метаданными
- Тестирование соединений
- Обработка ошибок и повторные попытки

## 📊 Мониторинг и логирование

### Логи
- **Development**: Человекочитаемый формат
- **Production**: JSON формат для структурированного логирования
- **Уровни**: error, warn, info, debug

### Health Check
```bash
curl http://localhost:3000/health
```

Ответ:
```json
{
  "status": "OK",
  "timestamp": "2025-01-07T12:00:00.000Z",
  "uptime": 3600,
  "environment": "development",
  "version": "1.0.0",
  "database": "connected",
  "services": {
    "openai": "available",
    "ftp": "configured"
  }
}
```

## 🔒 Безопасность

### Rate Limiting
- **API общий**: 100 запросов / 15 минут
- **Генерация изображений**: 10 запросов / 5 минут  
- **Загрузки**: 20 запросов / 10 минут
- **Создание аккаунтов**: 5 запросов / час

### Шифрование данных
- Чувствительные данные (FTP пароли) шифруются в MongoDB
- Использование AES-256-GCM для шифрования
- Безопасное хранение ключей шифрования

### Валидация
- Все входные данные валидируются
- Поддержка sanitization
- Автоматическая генерация ошибок валидации

### Заголовки безопасности
- Content Security Policy
- X-Frame-Options
- X-Content-Type-Options
- И другие через Helmet

## 🐳 Docker

### Docker команды

```bash
# Основные команды
npm run docker:up:build    # Запуск с пересборкой
npm run docker:up          # Запуск без пересборки  
npm run docker:down        # Остановка сервисов
npm run docker:down:volumes # Остановка с удалением volumes
npm run docker:logs        # Просмотр логов backend

# Дополнительные команды
npm run docker:mongo       # Запуск только MongoDB
npm run docker:tools       # Запуск с Mongo Express
```

### Docker Compose структура

```yaml
# docker-compose.yml включает:
- backend:     Node.js API (build из Dockerfile)
- mongodb:     MongoDB 7.0.5 с персистентным storage
- mongo-express: Web UI для MongoDB (опционально)
```

### Volumes и Networks

- **mongodb_data**: Персистентное хранение данных MongoDB
- **ai-stock-bot-network**: Изолированная сеть для сервисов
- **Hot reload**: Код монтируется для live обновлений

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Линтинг
npm run lint

# Интеграционные тесты
npm run test:integration
```

## 📚 Примеры использования

### Генерация изображения
```bash
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful landscape with mountains",
    "userId": "user123",
    "userExternalId": "telegram_user_456",
    "options": {
      "model": "dall-e-3",
      "size": "1024x1024",
      "quality": "standard"
    }
  }'
```

### Потоковая передача изображения
```bash
curl -X GET "http://localhost:3000/api/images/img_123/stream?userId=user123" \
  --output image.jpg
```

### Загрузка на 123RF
```bash
curl -X POST http://localhost:3000/api/upload/123rf \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "img_123",
    "userId": "user123",
    "title": "Beautiful Mountain Landscape",
    "description": "AI-generated landscape with mountains",
    "keywords": ["landscape", "mountains", "nature", "ai"],
    "category": "Digital Art",
    "pricing": "standard"
  }'
```

### Создание пользователя
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "externalId": "telegram_123",
    "externalSystem": "telegram",
    "profile": {
      "username": "john_doe",
      "firstName": "John",
      "lastName": "Doe",
      "language": "en"
    }
  }'
```

## 🤝 Интеграция с клиентами

API предназначен для интеграции с:
- **Telegram Bot** (текущий основной клиент)
- **Web Interface** (планируемый)
- **Mobile Apps** (будущие интеграции)
- **Другие клиентские приложения**

### Потоковая передача изображений
- Изображения передаются через потоки без сохранения на клиенте
- Поддержка больших файлов (до 10MB)
- Эффективное использование памяти

## 📈 Масштабирование

- Горизонтальное масштабирование через load balancer
- Stateless архитектура
- Поддержка кластеризации
- MongoDB для персистентности данных
- Файловое хранилище может быть заменено на S3/MinIO

## 🚧 Roadmap

- [x] Реализация OpenAI DALL-E 3 интеграции
- [x] MongoDB модели и схемы
- [x] 123RF FTP загрузка
- [x] Система пользователей
- [x] Потоковая передача изображений
- [x] Шифрование чувствительных данных
- [ ] Shutterstock API интеграция
- [ ] Adobe Stock API интеграция
- [ ] Кэширование (Redis)
- [ ] Метрики и мониторинг (Prometheus)
- [ ] Swagger документация
- [ ] Unit и интеграционные тесты
- [ ] S3/MinIO для файлового хранилища

## 📝 Лицензия

MIT License
