# AI Stock Bot

Система генерации изображений с помощью DALL-E 3 и автоматической загрузки на стоковые площадки (123RF).

## 🏗️ Архитектура проекта

Проект состоит из двух основных компонентов:

```
AI Stock Bot
├── backend/          # RESTful API сервер
│   ├── MongoDB       # База данных
│   ├── OpenAI API    # Генерация изображений
│   ├── Sharp         # Обработка изображений
│   └── FTP Service   # Загрузка на 123RF
└── tg-bot/           # Telegram Bot клиент
    └── Backend API   # Взаимодействие через HTTP
```

### Схема взаимодействия

```
Пользователь → Telegram Bot → Backend API → OpenAI/123RF
                     ↓              ↓
               Потоковая передача   MongoDB
               изображений         (пользователи,
                                   изображения,
                                   настройки)
```

## 🚀 Быстрый старт

### Предварительные требования

- Node.js 18+
- MongoDB
- OpenAI API ключ
- Telegram Bot Token
- 123RF FTP учетные данные (опционально)

### Установка

1. **Клонируйте репозиторий:**
```bash
git clone https://github.com/alexanderrodnin/ai-stock-bot.git
cd ai-stock-bot
```

2. **Настройте Backend:**
```bash
cd backend
npm install
cp .env.example .env
# Заполните переменные окружения в .env
npm start
```

3. **Настройте Telegram Bot:**
```bash
cd ../tg-bot
npm install
cp .env.example .env
# Заполните переменные окружения в .env
npm start
```

### Запуск через Docker

```bash
# Backend
cd backend
docker-compose up -d --build

# Telegram Bot
cd ../tg-bot
docker-compose up -d --build
```

## ✨ Основные возможности

### 🎨 Генерация изображений
- Генерация изображений через DALL-E 3
- Автоматическое изменение размера до 4000x4000 для стоков
- Демо режим с mock изображениями при недоступности OpenAI
- Потоковая передача изображений без дублирования файлов

### 📤 Загрузка на стоковые площадки
- Интеграция с 123RF через FTP
- Управление учетными данными стоковых сервисов
- Автоматическая загрузка с метаданными
- Отслеживание статуса загрузок

### 👥 Управление пользователями
- Система пользователей с профилями
- Настройки стоковых сервисов для каждого пользователя
- История генераций и загрузок
- Статистика использования

### 🤖 Telegram интерфейс
- Интуитивный интерфейс через Telegram
- Настройка стоковых сервисов через бота
- Предпросмотр изображений перед загрузкой
- Управление через inline клавиатуры

## 📋 Основные команды

### Telegram Bot
- `/start` - Начать работу с ботом
- `/help` - Справка по использованию
- `/mystocks` - Управление стоковыми сервисами
- Отправка текста - Генерация изображения

### Backend API
- `GET /api/health` - Проверка статуса
- `POST /api/images/generate` - Генерация изображения
- `GET /api/images/:id/stream` - Потоковая передача изображения
- `POST /api/upload/123rf` - Загрузка на 123RF
- `POST /api/users` - Создание/получение пользователя

## 🔧 Конфигурация

### Backend (.env)
```bash
# Обязательные
MONGODB_URI=mongodb://localhost:27017/ai-stock-bot
OPENAI_API_KEY=your_openai_api_key

# 123RF FTP (опционально)
FTP_HOST=ftp.123rf.com
FTP_USER=your_ftp_username
FTP_PASSWORD=your_ftp_password
FTP_REMOTE_PATH=/ai_image

# Дополнительные
PORT=3000
NODE_ENV=development
```

### Telegram Bot (.env)
```bash
# Обязательные
TELEGRAM_TOKEN=your_telegram_bot_token
BACKEND_API_URL=http://localhost:3000/api

# Режим работы
DEMO_MODE=false  # true для демо режима
```

## 🏗️ Техническая архитектура

### Backend компоненты
- **Express.js** - HTTP сервер
- **MongoDB + Mongoose** - База данных
- **Sharp** - Обработка изображений
- **FTP Client** - Загрузка на 123RF
- **Winston** - Логирование
- **Rate Limiting** - Защита от злоупотреблений

### Telegram Bot компоненты
- **node-telegram-bot-api** - Telegram интеграция
- **Axios** - HTTP клиент для Backend API
- **Потоковая передача** - Прямая передача изображений

### Устранение дублирования файлов
- Изображения обрабатываются только на Backend
- Telegram Bot получает изображения через потоковую передачу
- Нет локального сохранения файлов в боте
- Централизованное управление файлами

## 📊 Workflow

1. **Пользователь отправляет промт** в Telegram
2. **Bot валидирует** и отправляет запрос на Backend
3. **Backend генерирует** изображение через OpenAI
4. **Sharp обрабатывает** изображение (4000x4000)
5. **Backend сохраняет** в MongoDB и файловой системе
6. **Bot получает** изображение через потоковую передачу
7. **Пользователь видит** изображение с кнопками действий
8. **При загрузке** Backend отправляет файл на 123RF через FTP

## 🔒 Безопасность

- Шифрование чувствительных данных в MongoDB
- Rate limiting для API endpoints
- Валидация всех входных данных
- Безопасное хранение FTP учетных данных
- CORS настройки для API

## 📈 Мониторинг

- Структурированное логирование (Winston)
- Health check endpoints
- Отслеживание статуса загрузок
- Статистика пользователей

## 🚧 Roadmap

- [ ] Поддержка дополнительных стоковых площадок (Shutterstock, Adobe Stock)
- [ ] Web интерфейс для управления
- [ ] Расширенная аналитика
- [ ] Batch обработка изображений
- [ ] API для сторонних интеграций

## 📁 Структура проекта

```
ai-stock-bot/
├── backend/                 # Backend API сервер
│   ├── src/
│   │   ├── controllers/     # API контроллеры
│   │   ├── models/         # MongoDB модели
│   │   ├── services/       # Бизнес-логика
│   │   ├── routes/         # API маршруты
│   │   ├── middleware/     # Express middleware
│   │   ├── config/         # Конфигурация
│   │   └── utils/          # Утилиты
│   ├── temp/               # Временные файлы
│   └── docker-compose.yml  # Docker конфигурация
├── tg-bot/                 # Telegram Bot
│   ├── services/           # API клиенты
│   ├── index.js           # Основной файл бота
│   └── docker-compose.yml # Docker конфигурация
└── doc/                   # Документация
```

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📝 Лицензия

MIT License

## 📞 Поддержка

Для вопросов и предложений создавайте Issues в GitHub репозитории.
