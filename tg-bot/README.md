# AI Stock Bot - Telegram Bot

Telegram бот для генерации изображений с помощью DALL-E 3, Flux (Segmind) и автоматической загрузки на стоковую площадку 123RF. Работает в связке с Backend API.

## 🏗️ Архитектура

Telegram Bot является клиентом для Backend API и обеспечивает:
- Пользовательский интерфейс через Telegram
- Взаимодействие с Backend API через HTTP
- Потоковую передачу изображений без локального сохранения
- Управление настройками стоковых сервисов

```
Пользователь → Telegram Bot → Backend API → OpenAI/123RF
                     ↓              ↓
               Потоковая передача   MongoDB
               изображений         (пользователи,
                                   изображения,
                                   настройки)
```

## ✨ Возможности

### 🎨 Генерация изображений
- Генерация изображений по текстовым описаниям
- Поддержка DALL-E 3 и Flux (Segmind) через Backend API
- Автоматический fallback на демо изображения
- Валидация промптов (до 1000 символов)

### 📤 Загрузка на стоковую площадку
- Интеграция с 123RF через FTP
- Настройка учетных данных через бота
- Предпросмотр изображений перед загрузкой
- Отслеживание статуса загрузок

### ⚙️ Управление настройками
- Настройка стокового сервиса через inline клавиатуры
- Тестирование соединения с сервисом
- Редактирование и удаление настроек
- Справочная система

### 🔄 Режимы работы
- **Обычный режим**: Использование OpenAI API через Backend
- **Демо режим**: Mock изображения при недоступности API

## 🚀 Быстрый старт

### Предварительные требования
- Node.js 18+
- Telegram Bot Token (от [@BotFather](https://t.me/BotFather))
- Запущенный Backend API
- 123RF FTP учетные данные (опционально)

### Установка

1. **Установите зависимости:**
```bash
cd tg-bot
npm install
```

2. **Создайте файл окружения:**
```bash
cp .env.example .env
```

3. **Заполните переменные окружения в `.env`:**
```bash
# Обязательные
TELEGRAM_TOKEN=your_telegram_bot_token
BACKEND_API_URL=http://localhost:3000/api

# Опциональные
BACKEND_API_TIMEOUT=120000
DEMO_MODE=false
```

4. **Запустите бота:**
```bash
# Обычный режим
npm start

# Демо режим
npm run demo
```

### Запуск через Docker

1. **Перейдите в корневую директорию проекта:**
```bash
cd ..  # из папки tg-bot в корень проекта
```

2. **Настройте переменные окружения:**
```bash
cp .env.example .env
# Отредактируйте .env файл
```

3. **Запустите контейнер:**
```bash
# Только Telegram Bot (требует запущенный backend)
docker-compose --profile bot up -d

# Или полный стек
docker-compose --profile backend --profile bot up -d
```

4. **Просмотр логов:**
```bash
docker-compose logs -f tg-bot
```

## 📋 Команды бота

### Основные команды
- `/start` - Начать работу с ботом, инициализация пользователя
- `/help` - Справка по использованию бота
- `/mystocks` - Управление настройками стокового сервиса

### Взаимодействие
- **Отправка текста** - Генерация изображения по описанию
- **Inline кнопки** - Управление настройками и загрузка изображений

## 🔧 Конфигурация

### Переменные окружения

| Переменная | Обязательная | По умолчанию | Описание |
|------------|--------------|--------------|----------|
| `TELEGRAM_TOKEN` | Да | - | Токен Telegram бота |
| `BACKEND_API_URL` | Да | http://localhost:3000/api | URL Backend API |
| `BACKEND_API_TIMEOUT` | Нет | 120000 | Таймаут запросов к API (мс) |
| `DEMO_MODE` | Нет | false | Режим демонстрации |

### Настройка Backend API
Убедитесь, что Backend API запущен и доступен по указанному URL. Бот автоматически проверяет доступность API при запуске.

## 🎯 Пользовательские сценарии

### 1. Первый запуск
1. Пользователь отправляет `/start`
2. Бот инициализирует пользователя в Backend
3. Проверяется наличие настроенных стоковых сервисов
4. При отсутствии настроек показывается меню настройки

### 2. Генерация изображения
1. Пользователь отправляет текстовое описание
2. Бот валидирует промт и отправляет на Backend
3. Backend генерирует изображение через OpenAI
4. Изображение передается пользователю через потоковую передачу
5. Показываются кнопки для загрузки на стоковые сервисы

### 3. Настройка 123RF
1. Пользователь выбирает "Привязать 123RF"
2. Бот запрашивает логин и пароль
3. Автоматически настраиваются FTP параметры
4. Тестируется соединение с сервисом
5. Настройки сохраняются в Backend

### 4. Загрузка на 123RF
1. После генерации изображения пользователь нажимает "Загрузить на 123RF"
2. Бот отправляет запрос на Backend
3. Backend загружает файл через FTP
4. Пользователь получает уведомление о результате

## 🏗️ Техническая архитектура

### Основные компоненты

#### BackendApiService
- HTTP клиент для взаимодействия с Backend API
- Обработка ошибок и повторные попытки
- Потоковая передача изображений
- Управление таймаутами

#### Обработчики команд
- `/start` - Инициализация пользователя
- `/help` - Справочная информация
- `/mystocks` - Управление стоковыми сервисами

#### Обработчики сообщений
- Валидация текстовых промптов
- Генерация изображений через Backend API
- Обработка callback queries от inline кнопок

#### Управление сессиями
- Многошаговые операции (настройка сервисов)
- Кэширование данных изображений
- Управление состоянием пользователей

### Устранение дублирования файлов
- **Нет локального сохранения** изображений в боте
- **Потоковая передача** напрямую от Backend к Telegram
- **Централизованная обработка** файлов на Backend
- **Эффективное использование** памяти и дискового пространства

## 🔒 Безопасность

### Валидация входных данных
- Проверка длины промптов (максимум 1000 символов)
- Валидация типов сообщений (только текст)
- Санитизация пользовательского ввода

### Управление сессиями
- Безопасное хранение временных данных
- Автоматическая очистка устаревших сессий
- Защита от несанкционированного доступа

### Обработка ошибок
- Graceful handling API недоступности
- Автоматический fallback на демо режим
- Информативные сообщения об ошибках

## 📊 Мониторинг и логирование

### Логирование
- Все API запросы логируются с статусами
- Ошибки записываются с подробностями
- Пользовательские действия отслеживаются

### Health Check
- Автоматическая проверка доступности Backend API
- Уведомления о проблемах с соединением
- Переключение в демо режим при недоступности API

## 🧪 Тестирование

### Ручное тестирование
1. Запустите Backend API
2. Запустите Telegram Bot
3. Отправьте `/start` в Telegram
4. Протестируйте генерацию изображений
5. Настройте 123RF и протестируйте загрузку

### Демо режим
```bash
# Запуск в демо режиме
DEMO_MODE=true npm start

# Или через npm script
npm run demo
```

## 🔄 Workflow интеграции

### Взаимодействие с Backend API

1. **Инициализация пользователя**
   ```
   POST /api/users
   ```

2. **Проверка стоковых сервисов**
   ```
   GET /api/users/:userId/stock-services
   ```

3. **Генерация изображения**
   ```
   POST /api/images/generate
   ```

4. **Получение изображения**
   ```
   GET /api/images/:imageId/stream
   ```

5. **Загрузка на 123RF**
   ```
   POST /api/upload/123rf
   ```

### Обработка ошибок API
- **Таймауты**: Автоматические повторные попытки
- **Недоступность API**: Переключение в демо режим
- **Ошибки валидации**: Информативные сообщения пользователю
- **Ошибки загрузки**: Предложение повторной попытки

## 📈 Производительность

### Оптимизации
- Потоковая передача изображений без буферизации
- Кэширование данных изображений для callback операций
- Эффективное управление памятью
- Минимальное использование дискового пространства

### Ограничения
- Максимальная длина промпта: 1000 символов
- Таймаут генерации: 2 минуты
- Размер изображений: до 10MB (ограничение Telegram)

## 🚧 Roadmap

- [x] Интеграция с Backend API
- [x] Потоковая передача изображений
- [x] Управление стоковыми сервисами через бота
- [x] Демо режим с fallback изображениями
- [x] Inline клавиатуры для управления
- [ ] Поддержка дополнительных стоковых сервисов
- [ ] Batch обработка изображений
- [ ] Расширенные настройки генерации
- [ ] Статистика использования
- [ ] Уведомления о статусе загрузок

## 🐳 Docker

### Dockerfile
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  tg-bot:
    build: .
    environment:
      - TELEGRAM_TOKEN=${TELEGRAM_TOKEN}
      - BACKEND_API_URL=${BACKEND_API_URL}
      - DEMO_MODE=${DEMO_MODE}
    restart: unless-stopped
```

## 🤝 Интеграция

### Требования к Backend API
- Доступность по HTTP/HTTPS
- Поддержка потоковой передачи изображений
- API для управления пользователями и стоковыми сервисами
- Health check endpoint

### Совместимость
- Node.js 18+
- Telegram Bot API
- Backend API v1.0+

## 📝 Лицензия

MIT License

## 📞 Поддержка

Для вопросов по Telegram Bot:
1. Проверьте логи бота
2. Убедитесь в доступности Backend API
3. Проверьте правильность токена Telegram
4. Создайте Issue в GitHub репозитории
