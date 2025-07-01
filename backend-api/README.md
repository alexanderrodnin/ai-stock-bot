# AI Stock Bot Backend API

RESTful API backend для AI Stock Bot - системы генерации изображений с помощью DALL-E и загрузки на 123RF.

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- MongoDB
- OpenAI API ключ

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

# Рекомендуемые
FTP_HOST=ftp.123rf.com
FTP_USER=your_ftp_username  
FTP_PASSWORD=your_ftp_password
```

4. Запустите сервер:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

API будет доступен по адресу: `http://localhost:3000`

## 📋 API Endpoints

### Health Check
- `GET /health` - Проверка статуса API
- `GET /api/health` - Проверка статуса API (с rate limiting)

### Images
- `POST /api/images/generate` - Генерация изображения
- `GET /api/images/:userId` - История изображений пользователя
- `GET /api/images/:userId/:imageId` - Детали конкретного изображения
- `DELETE /api/images/:userId/:imageId` - Удаление изображения

### Upload
- `POST /api/upload/123rf` - Загрузка на 123RF
- `POST /api/upload/validate` - Валидация изображения перед загрузкой
- `GET /api/upload/status/:uploadId` - Статус загрузки
- `GET /api/upload/history/:userId` - История загрузок пользователя

### Users
- `POST /api/users` - Создание пользователя
- `GET /api/users/:id` - Получение пользователя по ID
- `GET /api/users/telegram/:telegramId` - Получение пользователя по Telegram ID
- `PUT /api/users/:id` - Обновление пользователя
- `DELETE /api/users/:id` - Удаление пользователя
- `GET /api/users/:id/stats` - Статистика пользователя

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|------------|--------------|--------------|----------|
| `PORT` | Нет | 3000 | Порт сервера |
| `NODE_ENV` | Нет | development | Окружение |
| `MONGODB_URI` | Да | - | URI подключения к MongoDB |
| `OPENAI_API_KEY` | Да | - | API ключ OpenAI |
| `FTP_HOST` | Нет | - | Хост FTP сервера 123RF |
| `FTP_USER` | Нет | - | Пользователь FTP |
| `FTP_PASSWORD` | Нет | - | Пароль FTP |
| `RATE_LIMIT_MAX` | Нет | 100 | Лимит запросов за окно |
| `ALLOWED_ORIGINS` | Нет | localhost:3000,localhost:3001 | Разрешенные CORS источники |

## 🏗️ Архитектура

### Структура проекта
```
backend-api/
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
│   ├── models/            # MongoDB модели
│   └── utils/             # Утилиты
│       └── logger.js
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

## 📊 Мониторинг и логирование

### Логи
- **Development**: Человекочитаемый формат
- **Production**: JSON формат для структурированного логирования

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
  "version": "1.0.0"
}
```

## 🔒 Безопасность

### Rate Limiting
- **API общий**: 100 запросов / 15 минут
- **Генерация изображений**: 10 запросов / 5 минут  
- **Загрузки**: 20 запросов / 10 минут
- **Создание аккаунтов**: 5 запросов / час

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

```dockerfile
# Dockerfile будет добавлен отдельно
```

## 🧪 Тестирование

```bash
# Запуск тестов
npm test

# Линтинг
npm run lint
```

## 📚 Примеры использования

### Генерация изображения
```bash
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A beautiful landscape with mountains",
    "userId": "user123",
    "model": "dall-e-3",
    "size": "1024x1024"
  }'
```

### Загрузка на 123RF
```bash
curl -X POST http://localhost:3000/api/upload/123rf \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "img_123",
    "userId": "user123",
    "title": "Beautiful Mountain Landscape",
    "keywords": ["landscape", "mountains", "nature"]
  }'
```

## 🤝 Интеграция с фронтендом

API предназначен для интеграции с:
- Telegram Bot (текущий)
- Web Interface (планируемый)
- Другие клиентские приложения

## 📈 Масштабирование

- Горизонтальное масштабирование через load balancer
- Stateless архитектура
- Поддержка кластеризации
- MongoDB для персистентности данных

## 🚧 Roadmap

- [ ] Реализация реальных сервисов (OpenAI, FTP)
- [ ] MongoDB модели и схемы
- [ ] Аутентификация и авторизация  
- [ ] Кэширование (Redis)
- [ ] Метрики и мониторинг
- [ ] Swagger документация
- [ ] Unit и интеграционные тесты

## 📝 Лицензия

MIT License
