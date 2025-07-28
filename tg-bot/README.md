# AI Stock Bot - Telegram Bot

Telegram интерфейс для AI Stock Bot - системы генерации изображений с множественными AI моделями, интегрированной системой платежей и автоматической загрузки на стоковые площадки.

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- Telegram Bot Token (от [@BotFather](https://t.me/BotFather))
- Запущенный Backend API
- Настроенные переменные окружения

### Установка и запуск

#### Через Docker (рекомендуется)
```bash
# Из корневой директории проекта
docker-compose --profile bot up -d
```

#### Локальная разработка
```bash
cd tg-bot
npm install
cp .env.example .env
# Настройте переменные окружения в .env
npm start
```

## 🏗️ Архитектура Telegram Bot

### Структура проекта
```
tg-bot/
├── index.js                # Основной файл бота
├── services/
│   └── backendApiService.js # HTTP клиент для Backend API
├── package.json
├── .env.example
├── Dockerfile
└── README.md
```

### Основные компоненты

#### Main Bot (index.js)
- Инициализация Telegram Bot API
- Обработка команд и сообщений
- Управление пользовательскими сессиями
- Inline клавиатуры и callback queries
- Интеграция с Backend API

#### BackendApiService
- HTTP клиент для взаимодействия с Backend API
- Обработка ошибок и повторные попытки
- Потоковая передача изображений
- Управление таймаутами
- Fallback на демо режим

## 🔧 Конфигурация

### Переменные окружения

#### Обязательные
```bash
# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token_from_botfather

# Backend API
BACKEND_API_URL=http://localhost:3000/api
```

#### Опциональные
```bash
# Timeouts
BACKEND_API_TIMEOUT=120000

# Demo mode
DEMO_MODE=false

# Logging
LOG_LEVEL=info
```

### Полный список переменных в `.env.example`

## 📋 Команды и функциональность

### Основные команды
```
/start    - Начать работу с ботом, инициализация пользователя
/help     - Справка по использованию бота
/mystocks - Управление настройками стокового сервиса 123RF
/balance  - Проверить баланс изображений
/buy      - Купить изображения (тарифные планы)
```

### Взаимодействие с пользователем

#### Генерация изображений
- **Ввод**: Пользователь отправляет текстовое описание
- **Валидация**: Проверка длины промпта (до 1000 символов)
- **Обработка**: Отправка запроса на Backend API
- **Результат**: Потоковая передача изображения пользователю
- **Действия**: Inline кнопки для загрузки на стоковые сервисы

#### Управление подписками
- **Проверка баланса**: Автоматическая проверка при генерации
- **Покупка изображений**: Интеграция с YooMoney через Backend
- **Уведомления**: Мгновенные уведомления об успешных платежах
- **Блокировка**: Информирование о нулевом балансе

#### Настройка стоковых сервисов
- **123RF Integration**: Настройка FTP учетных данных
- **Тестирование**: Проверка соединения с сервисом
- **Управление**: Редактирование и удаление настроек
- **Загрузка**: Автоматическая загрузка изображений

## 🔄 Интеграция с Backend API

### API Endpoints используемые ботом

#### Пользователи
```javascript
// Инициализация пользователя
POST /api/users
{
  externalId: telegramUserId,
  externalSystem: "telegram",
  profile: { username, firstName, lastName, language }
}

// Получение пользователя
GET /api/users/external/{telegramUserId}/telegram

// Проверка баланса
GET /api/users/{userId}/stats
```

#### Генерация изображений
```javascript
// Генерация изображения
POST /api/images/generate
{
  prompt: "user prompt",
  userId: userId,
  userExternalId: telegramUserId,
  options: { model: "juggernaut-pro-flux" }
}

// Получение изображения (потоковая передача)
GET /api/images/{imageId}/file?userId={userId}
```

#### Платежи
```javascript
// Создание платежа
POST /api/payments/create
{
  userId: userId,
  telegramId: telegramUserId,
  planId: "plan_100_images",
  returnUrl: "https://t.me/your_bot"
}

// Получение тарифных планов
GET /api/payments/plans

// История платежей
GET /api/payments/history/{userId}
```

#### Стоковые сервисы
```javascript
// Получение настроек
GET /api/users/{userId}/stock-services

// Обновление настроек 123RF
PUT /api/users/{userId}/stock-services/123rf
{
  enabled: true,
  credentials: { username, password },
  settings: { ftpHost, ftpPath }
}

// Загрузка на 123RF
POST /api/upload/123rf
{
  imageId: imageId,
  userId: userId,
  title: "Image title",
  description: "Image description",
  keywords: ["keyword1", "keyword2"],
  category: "Digital Art"
}
```

## 🎯 Пользовательские сценарии

### 1. Первый запуск
```
Пользователь → /start
    ↓
Бот → Инициализация пользователя в Backend
    ↓
Бот → Проверка настроек стоковых сервисов
    ↓
Бот → Приветственное сообщение + меню настройки (если нужно)
```

### 2. Генерация изображения
```
Пользователь → Текстовое описание
    ↓
Бот → Валидация промпта
    ↓
Бот → Проверка баланса через Backend
    ↓
Бот → Запрос генерации к Backend API
    ↓
Backend → Генерация через AI провайдер
    ↓
Бот → Потоковая передача изображения
    ↓
Бот → Inline кнопки для загрузки на стоки
```

### 3. Покупка изображений
```
Пользователь → /buy или кнопка "Купить"
    ↓
Бот → Получение тарифных планов от Backend
    ↓
Бот → Inline клавиатура с планами
    ↓
Пользователь → Выбор плана
    ↓
Бот → Создание платежа через Backend
    ↓
Бот → Отправка ссылки на оплату YooMoney
    ↓
YooMoney → Webhook в Backend при успешной оплате
    ↓
Backend → Уведомление в Telegram через Bot API
```

### 4. Настройка 123RF
```
Пользователь → /mystocks
    ↓
Бот → Получение текущих настроек от Backend
    ↓
Бот → Inline клавиатура управления
    ↓
Пользователь → "Привязать 123RF"
    ↓
Бот → Запрос логина и пароля (многошаговый диалог)
    ↓
Бот → Отправка настроек в Backend
    ↓
Backend → Тестирование FTP соединения
    ↓
Бот → Уведомление о результате
```

## 🔒 Безопасность и валидация

### Валидация входных данных
```javascript
// Промпты
- Максимальная длина: 1000 символов
- Только текстовые сообщения
- Санитизация специальных символов

// Учетные данные 123RF
- Валидация формата логина/пароля
- Шифрование перед отправкой в Backend
- Безопасное хранение в сессии (временно)
```

### Управление сессиями
```javascript
// Многошаговые операции
const userSessions = new Map();

// Структура сессии
{
  userId: "telegram_user_id",
  step: "awaiting_123rf_username",
  data: { /* временные данные */ },
  timestamp: Date.now()
}

// Автоматическая очистка
setInterval(() => cleanExpiredSessions(), 300000); // 5 минут
```

### Обработка ошибок
```javascript
// API недоступность
if (apiError) {
  if (DEMO_MODE) {
    return sendDemoImage();
  } else {
    return sendErrorMessage("Сервис временно недоступен");
  }
}

// Недостаточный баланс
if (balance <= 0) {
  return sendBalanceMessage();
}

// Ошибки валидации
if (promptTooLong) {
  return sendMessage("Описание слишком длинное (макс. 1000 символов)");
}
```

## 📊 Мониторинг и логирование

### Логирование
```javascript
// Структурированное логирование
logger.info('User action', {
  userId: telegramUserId,
  action: 'generate_image',
  prompt: prompt.substring(0, 100),
  timestamp: new Date().toISOString()
});

// Ошибки API
logger.error('Backend API error', {
  endpoint: '/api/images/generate',
  status: response.status,
  error: response.data,
  userId: telegramUserId
});
```

### Health Check
```javascript
// Проверка доступности Backend API
async function checkBackendHealth() {
  try {
    const response = await backendApi.get('/health');
    return response.status === 200;
  } catch (error) {
    logger.warn('Backend API unavailable', { error: error.message });
    return false;
  }
}

// Периодическая проверка
setInterval(checkBackendHealth, 60000); // каждую минуту
```

## 🧪 Тестирование

### Ручное тестирование
```bash
# 1. Запустите Backend API
cd backend && npm run dev

# 2. Запустите Telegram Bot
cd tg-bot && npm start

# 3. Протестируйте команды
/start - инициализация
/help - справка
/balance - проверка баланса
/buy - покупка изображений
/mystocks - настройка 123RF

# 4. Протестируйте генерацию
Отправьте: "Beautiful sunset over mountains"
```

### Демо режим
```bash
# Запуск в демо режиме (без Backend API)
DEMO_MODE=true npm start

# Или через переменную окружения
echo "DEMO_MODE=true" >> .env
npm start
```

### Отладка
```bash
# Включение подробного логирования
LOG_LEVEL=debug npm start

# Просмотр логов в Docker
docker-compose logs -f tg-bot
```

## 🔄 Workflow интеграции

### Обработка сообщений
```javascript
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  try {
    // 1. Инициализация пользователя
    const user = await backendApi.initializeUser(userId, msg.from);
    
    // 2. Проверка баланса
    const balance = await backendApi.getUserBalance(user.id);
    if (balance <= 0) {
      return sendBalanceMessage(chatId);
    }
    
    // 3. Валидация промпта
    if (text.length > 1000) {
      return bot.sendMessage(chatId, 'Описание слишком длинное');
    }
    
    // 4. Генерация изображения
    const image = await backendApi.generateImage(text, user.id, userId);
    
    // 5. Отправка изображения
    await sendImageWithButtons(chatId, image);
    
  } catch (error) {
    logger.error('Message processing error', { error, userId });
    await sendErrorMessage(chatId);
  }
});
```

### Обработка callback queries
```javascript
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = JSON.parse(query.data);

  switch (data.action) {
    case 'upload_123rf':
      await handle123RFUpload(chatId, userId, data.imageId);
      break;
    case 'buy_plan':
      await handlePlanPurchase(chatId, userId, data.planId);
      break;
    case 'configure_123rf':
      await handleStockConfiguration(chatId, userId);
      break;
  }
});
```

## 📈 Производительность

### Оптимизации
```javascript
// Потоковая передача изображений
const imageStream = await backendApi.getImageStream(imageId);
await bot.sendPhoto(chatId, imageStream);

// Кэширование данных изображений для callback операций
const imageCache = new Map();
imageCache.set(imageId, { userId, metadata });

// Эффективное управление памятью
process.on('memoryUsage', () => {
  if (imageCache.size > 1000) {
    imageCache.clear();
  }
});
```

### Ограничения
```javascript
// Telegram API limits
- Максимум 30 сообщений в секунду
- Размер изображений: до 10MB
- Длина сообщений: до 4096 символов

// Наши ограничения
- Промпт: до 1000 символов
- Таймаут генерации: 2 минуты
- Сессии: автоочистка через 5 минут
```

## 🐳 Docker

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Копирование package files
COPY package*.json ./

# Установка зависимостей
RUN npm ci --only=production

# Копирование исходного кода
COPY . .

# Создание non-root пользователя
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
USER nodejs

# Запуск приложения
CMD ["npm", "start"]
```

### Docker Compose интеграция
```yaml
tg-bot:
  build: ./tg-bot
  environment:
    - TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
    - BACKEND_API_URL=http://backend:3000/api
    - DEMO_MODE=${DEMO_MODE:-false}
  depends_on:
    - backend
  restart: unless-stopped
  profiles:
    - bot
    - full
```

## 🚧 Roadmap

### Реализовано ✅
- Интеграция с Backend API
- Потоковая передача изображений
- Управление стоковыми сервисами через бота
- Система платежей с YooMoney
- Inline клавиатуры для управления
- Демо режим с fallback
- Многошаговые диалоги

### В планах 🔄
- Поддержка дополнительных стоковых сервисов
- Batch обработка изображений
- Расширенные настройки генерации
- Статистика использования
- Push уведомления о статусе загрузок
- Многоязычная поддержка

## 📝 Лицензия

MIT License

## 🤝 Contributing

1. Fork репозитория
2. Создайте feature branch
3. Следуйте code style проекта
4. Тестируйте изменения с Backend API
5. Создайте Pull Request

## 📞 Поддержка

Для вопросов по Telegram Bot:
1. Проверьте логи: `docker-compose logs tg-bot`
2. Убедитесь в доступности Backend API: `curl http://localhost:3000/api/health`
3. Проверьте правильность `TELEGRAM_TOKEN`
4. Изучите [общую документацию](../doc/README.md)
5. Создайте Issue в GitHub
