# 🤖 AI Stock Bot

Телеграм бот для генерации изображений с помощью множественных AI моделей (DALL·E 3, Juggernaut Pro Flux, Seedream V3, HiDream-I1) и автоматической загрузки на стоковые площадки.

## 🏗️ Архитектура

Проект состоит из двух микросервисов:

- **Backend API** - REST API для управления пользователями, изображениями и интеграции со стоковыми сервисами
- **Telegram Bot** - Интерфейс для взаимодействия с пользователями через Telegram

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
- `TELEGRAM_TOKEN` - токен бота от @BotFather
- `OPENAI_API_KEY` - API ключ OpenAI
- `JWT_SECRET` - секретный ключ для JWT (32+ символов)
- `ENCRYPTION_KEY` - ключ шифрования (ровно 32 символа)

**Опциональные переменные:**
- `SEGMIND_API_KEY` - API ключ Segmind для дополнительных AI моделей

## 🎨 AI Модели

Система поддерживает несколько AI моделей для генерации изображений:

### Juggernaut Pro Flux (по умолчанию)
- **Провайдер**: Segmind
- **Описание**: Профессиональные реалистичные изображения с отличной детализацией
- **Требует**: `SEGMIND_API_KEY`

### OpenAI DALL-E 3
- **Провайдер**: OpenAI
- **Описание**: Высококачественная генерация с отличным пониманием промптов
- **Требует**: `OPENAI_API_KEY`

### Seedream V3
- **Провайдер**: Segmind
- **Описание**: Художественная и креативная генерация изображений
- **Требует**: `SEGMIND_API_KEY`

### HiDream-I1 Fast
- **Провайдер**: Segmind
- **Описание**: Быстрая высококачественная генерация изображений
- **Требует**: `SEGMIND_API_KEY`

### Переключение моделей
Модели можно переключать через Admin API или автоматически при сбоях. Подробнее в [AI Models Guide](backend/AI_MODELS_GUIDE.md).

### Мониторинг моделей
```bash
# Проверка статуса всех моделей через Admin API
curl http://localhost:3000/api/admin/status
```

### 3. Запуск с Docker Compose

#### Полный стек (рекомендуется)
```bash
# Запуск всех сервисов
docker-compose --profile backend --profile bot --profile tools up -d

# Или только основные сервисы (без MongoDB Express)
docker-compose --profile backend --profile bot up -d
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
- **MongoDB Express**: http://localhost:8081 (admin/admin)
- **Telegram Bot**: найдите вашего бота в Telegram и отправьте `/start`

## 🛠️ Разработка

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

### Структура проекта

```
ai-stock-bot/
├── backend/                 # Backend API сервис
│   ├── src/
│   │   ├── controllers/     # Контроллеры API
│   │   ├── models/         # Модели данных (MongoDB)
│   │   ├── routes/         # Маршруты API
│   │   ├── services/       # Бизнес-логика
│   │   └── utils/          # Утилиты
│   ├── Dockerfile
│   └── package.json
├── tg-bot/                 # Telegram Bot сервис
│   ├── services/           # Сервисы бота
│   ├── Dockerfile
│   ├── index.js           # Основной файл бота
│   └── package.json
├── docker-compose.yml      # Разработка
├── docker-compose-prod.yml # Продакшен
├── .env.example           # Пример переменных окружения
└── README.md
```

## 📋 Возможности

### Для пользователей:
- 🎨 Генерация изображений по текстовому описанию
- 📤 Загрузка на стоковую площадку 123RF
- ⚙️ Управление настройками стокового сервиса
- 📊 История изображений

### Для разработчиков:
- 🔐 Система аутентификации и авторизации
- 🗄️ MongoDB для хранения данных
- 🔒 Шифрование чувствительных данных
- 📝 Подробное логирование
- 🐳 Docker контейнеризация
- 🔄 Hot reload для разработки

## 🔧 API Endpoints

### Пользователи
- `POST /api/users` - Создание пользователя
- `GET /api/users/:id` - Получение пользователя
- `PUT /api/users/:id/stock-services` - Обновление стоковых сервисов

### Изображения
- `POST /api/images/generate` - Генерация изображения
- `GET /api/images/:id/download` - Скачивание изображения
- `GET /api/users/:userId/images` - История изображений

### Загрузка на стоки
- `POST /api/upload/stock` - Загрузка на стоковый сервис
- `GET /api/upload/:imageId/status` - Статус загрузки

### Admin API
- `GET /api/admin/status` - Статус системы и AI моделей
- `GET /api/admin/config` - Текущая конфигурация AI моделей
- `PUT /api/admin/config/model/:modelName` - Переключение AI модели
- `POST /api/admin/config/ai-model/switch` - Альтернативный способ переключения модели
- `GET /api/admin/config/ai-models/available` - Список доступных моделей
- `GET /api/admin/config/ai-models/history` - История переключений моделей

Подробнее в [Admin API Guide](backend/ADMIN_API_GUIDE.md).

## 🔒 Безопасность

- Все чувствительные данные шифруются
- JWT токены для аутентификации
- Rate limiting для API
- Валидация входных данных
- Non-root пользователи в Docker контейнерах

## 📝 Логи

Логи доступны через Docker:

```bash
# Backend логи
docker logs ai-stock-bot-backend

# Telegram Bot логи
docker logs ai-stock-bot-telegram

# MongoDB логи
docker logs ai-stock-bot-mongodb
```

## 🐛 Отладка

### Проверка подключения к MongoDB
```bash
docker exec -it ai-stock-bot-mongodb mongosh -u admin -p password123
```

### Проверка API
```bash
curl http://localhost:3000/api/health
```

### Проверка переменных окружения
```bash
docker exec ai-stock-bot-backend env | grep -E "(TELEGRAM|OPENAI|MONGO)"
```

## 📄 Лицензия

MIT License

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📞 Поддержка

Если у вас возникли вопросы или проблемы:

1. Проверьте [Issues](https://github.com/alexanderrodnin/ai-stock-bot/issues)
2. Создайте новый Issue с подробным описанием
3. Приложите логи и конфигурацию (без секретных данных)
