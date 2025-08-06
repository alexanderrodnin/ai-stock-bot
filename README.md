# 🤖 AI Stock Bot

Комплексная система генерации изображений с помощью множественных AI моделей, интегрированной платежной системой YooMoney и автоматической загрузкой на стоковые площадки через Telegram интерфейс.

## 📋 Содержание

- [Обзор проекта](#-обзор-проекта)
- [Архитектура системы](#️-архитектура-системы)
- [Предварительные настройки](#-предварительные-настройки)
- [Быстрый старт](#-быстрый-старт)
- [Управление контейнерами](#-управление-контейнерами)
- [База данных](#️-база-данных)
- [Admin панель](#️-admin-панель)

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

#### 2. **Система платежей** ([подробная документация](doc/PAYMENT_SYSTEM_GUIDE.md))
- **Подписочная модель** с покупкой пакетов изображений
- **Интеграция YooMoney** для приема платежей в рублях
- **Webhook обработка** для автоматического пополнения баланса
- **Тарифные планы** с различными пакетами изображений
- **Полный аудит** всех платежных транзакций

#### 3. **Telegram Bot** ([подробная документация](tg-bot/README.md))
- **Интуитивный интерфейс** с командами и inline кнопками
- **Многошаговые диалоги** для сложных операций
- **Потоковая передача** изображений
- **Уведомления** о платежах и статусе операций

#### 4. **База данных** ([подробная документация](doc/DATABASE_GUIDE.md))
- **MongoDB 7.0.5** с оптимизированными индексами
- **Коллекции**: Users, Images, Payments, AppConfig, ConfigAuditLog, WebhookLog
- **Связи и агрегации** для сложных запросов
- **Автоматические миграции** при обновлениях

### Прочие компоненты

#### 1. **AI модели и провайдеры** ([подробная документация](doc/AI_MODELS_GUIDE.md))
- **4 AI модели**: Juggernaut Pro Flux, DALL-E 3, Seedream V3, HiDream-I1 Fast
- **Автоматические фоллбеки** при сбоях провайдеров
- **Динамическое переключение** моделей без перезапуска системы

#### 2. **Административное управление** ([подробная документация](doc/ADMIN_API_GUIDE.md))
- **Переключение активной модели** без перезапуска системы
- **Мониторинг статуса** всех AI провайдеров
- **Полный аудит** всех изменений конфигурации
- **Health checks** и системная диагностика


## 📋 Предварительные настройки

### 1. Docker и Docker Compose

#### Установка Docker

**Windows:**
1. Скачайте Docker Desktop с официального сайта: https://www.docker.com/products/docker-desktop/
2. Запустите установочный файл и следуйте инструкциям
3. После установки перезагрузите компьютер
4. Запустите Docker Desktop и дождитесь полной инициализации
5. Проверьте установку: `docker --version`

**macOS:**
1. Скачайте Docker Desktop для Mac: https://www.docker.com/products/docker-desktop/
2. Перетащите Docker.app в папку Applications
3. Запустите Docker из Applications
4. Проверьте установку: `docker --version`

**Linux (Ubuntu/Debian):**
```bash
# Обновление пакетов
sudo apt update

# Установка зависимостей
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release

# Добавление официального GPG ключа Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Добавление репозитория Docker
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io

# Добавление пользователя в группу docker
sudo usermod -aG docker $USER

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Перезагрузка для применения изменений
sudo reboot

# Проверка установки после перезагрузки
docker --version
docker-compose --version
```

**Примечание:** Docker Compose обычно включен в Docker Desktop для Windows и macOS.

### 2. Telegram Bot Token от @BotFather

#### Создание Telegram бота

1. **Откройте Telegram** и найдите бота [@BotFather](https://t.me/BotFather)

2. **Начните диалог** с @BotFather, отправив команду `/start`

3. **Создайте нового бота** командой `/newbot`

4. **Введите имя бота** (отображаемое имя):
   ```
   AI Stock Bot
   ```

5. **Введите username бота** (должен заканчиваться на 'bot'):
   ```
   your_unique_ai_stock_bot
   ```

6. **Получите токен** - BotFather отправит вам сообщение с токеном вида:
   ```
   1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

7. **Сохраните токен** - это ваш `TELEGRAM_TOKEN` для конфигурации

#### Дополнительные настройки бота (опционально)

```bash
# Установка описания бота
/setdescription
# Введите: AI Stock Bot для генерации изображений и загрузки на стоковые площадки

# Установка команд бота
/setcommands
# Введите:
start - Начать работу с ботом
help - Справка по использованию
balance - Проверить баланс изображений
buy - Купить изображения
mystocks - Управление стоковыми сервисами
```

### 3. API ключи: OpenAI, Segmind

#### Получение OpenAI API ключа

1. **Регистрация на OpenAI:**
   - Перейдите на https://platform.openai.com/
   - Создайте аккаунт или войдите в существующий

2. **Создание API ключа:**
   - Перейдите в раздел "API Keys": https://platform.openai.com/api-keys
   - Нажмите "Create new secret key"
   - Введите название ключа (например, "AI Stock Bot")
   - Скопируйте и сохраните ключ (он показывается только один раз!)

3. **Настройка биллинга:**
   - Перейдите в "Billing": https://platform.openai.com/account/billing
   - Добавьте способ оплаты
   - Установите лимиты расходов для контроля бюджета

4. **Проверка ключа:**
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

#### Получение Segmind API ключа

1. **Регистрация на Segmind:**
   - Перейдите на https://www.segmind.com/
   - Создайте аккаунт через email или социальные сети

2. **Получение API ключа:**
   - Войдите в личный кабинет
   - Перейдите в раздел "API Keys" или "Developer"
   - Создайте новый API ключ
   - Скопируйте и сохраните ключ

3. **Настройка биллинга:**
   - Войдите в личный кабинет Segmind
   - Перейдите в раздел "Billing" или "Credits"
   - Пополните баланс аккаунта для использования API
   - Рекомендуется начать с минимального пополнения для тестирования

4. **Проверка ключа:**
   ```bash
   curl -X POST https://api.segmind.com/v1/models \
     -H "Authorization: Bearer YOUR_SEGMIND_API_KEY"
   ```

### 4. YooMoney аккаунт для платежей

#### Создание и верификация кошелька

Для начала работы необходимо зайти на официальный сайт YooMoney (https://yoomoney.ru/) и зарегистрировать новый кошелек.

В результате регистрации вы получите уникальный номер кошелька, состоящий из 16 цифр. Этот номер отображается на главной странице личного кабинета (важно: это именно номер кошелька, а не номер банковской карты) и потребуется для дальнейшей настройки системы.

Для полноценной работы с платежами необходимо пройти процедуру верификации. Перейдите в раздел "Настройки" → "Основной кошелек" → "Именной кошелек" и завершите верификацию минимум до уровня "Именной".

#### Регистрация приложения

После успешной верификации необходимо зарегистрировать ваше приложение в системе YooMoney. Для этого перейдите по ссылке https://yoomoney.ru/myservices/new и заполните следующие поля:

- **"Название для пользователей"** - укажите понятное название вашего приложения
- **"Адрес сайта"** - введите URL вашего сайта или приложения
- **"Почта для связи"** - укажите контактный email адрес
- **"Redirect URI"** - URL для перенаправления пользователей после OAuth2 авторизации. Поскольку в данном проекте OAuth не используется, можно указать любой валидный URL
- **"Notification URI"** - адрес для получения уведомлений об операциях, инициированных приложением:
  - При наличии домена: `http(s)://yourdomain.com/api/payments/webhook`
  - При использовании IP-адреса: `http(s)://ip-address:port/api/payments/webhook`

По завершении регистрации вы получите **client_id**, который понадобится для настройки системы.

#### Конфигурация HTTP-уведомлений

Завершающим этапом является настройка системы уведомлений. Перейдите в раздел настройки HTTP-уведомлений по адресу https://yoomoney.ru/transfer/myservices/http-notification?lang=ru и укажите endpoint для получения webhook-уведомлений:

- При наличии домена: `http(s)://yourdomain.com/api/payments/webhook`
- При использовании IP-адреса: `http(s)://ip-address:port/api/payments/webhook`

После настройки вы получите **секретный ключ для проверки подлинности**, который также потребуется для конфигурации системы.

## 🚀 Быстрый старт

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

Скопируйте файл `.env.prod.example` в `.env.prod` и заполните все переменные:

```bash
# Настройка переменных окружения для продакшена
cp .env.prod.example .env.prod
nano .env.prod  # Отредактируйте файл с вашими значениями
```

**Основные переменные:**

```bash
# Node.js Environment
NODE_ENV=production                    # Режим работы приложения
PORT=3000                             # Порт для Backend API

# MongoDB Configuration
MONGO_INITDB_ROOT_USERNAME=admin      # Имя администратора MongoDB (можно изменить)
MONGO_INITDB_ROOT_PASSWORD=your_secure_mongodb_password_here  # Пароль администратора MongoDB (нужно придумать свой пароль)
MONGO_INITDB_DATABASE=ai_stock_bot    # Название базы данных

# MongoDB Express Configuration (для веб-интерфейса управления БД)
ME_CONFIG_MONGODB_ADMINUSERNAME=admin                        # Имя пользователя для MongoDB Express (должно совпадать с MONGO_INITDB_ROOT_USERNAME)
ME_CONFIG_MONGODB_ADMINPASSWORD=your_secure_mongodb_password_here  # Пароль для MongoDB Express (должен совпадать с MONGO_INITDB_ROOT_PASSWORD)
ME_CONFIG_BASICAUTH_USERNAME=admin                           # Имя пользователя для веб-интерфейса MongoDB Express
ME_CONFIG_BASICAUTH_PASSWORD=your_secure_web_ui_password_here # Пароль для веб-интерфейса MongoDB Express (можно отличаться от пароля БД)

# AI Providers Configuration
OPENAI_API_KEY=your_openai_api_key_here    # API ключ OpenAI для DALL-E 3 (нужно подставить ключ, который выдал OpenAI)
SEGMIND_API_KEY=your_segmind_api_key_here  # API ключ Segmind для других AI моделей (нужно подставить ключ, который выдал Segmind)

# YooMoney Payment System Configuration
YOOMONEY_CLIENT_ID=your_yoomoney_client_id_here           # Client ID приложения YooMoney (получили при регистрации приложения)
YOOMONEY_WALLET=your_yoomoney_wallet_number_here          # Номер кошелька YooMoney (16 цифр)
YOOMONEY_API_URL=https://yoomoney.ru/api                  # URL API YooMoney (не менять)
YOOMONEY_QUICKPAY_URL=https://yoomoney.ru/quickpay/confirm.xml  # URL для создания платежей (не менять)
YOOMONEY_WEBHOOK_SECRET=your_secure_yoomoney_webhook_secret_here  # Секретный ключ для webhook (получили после настройки HTTP уведомлений)
YOOMONEY_NOTIFICATION_URI=http://localhost:3000/api/payments/webhook  # URL для webhook уведомлений
BACKEND_URL=http://localhost:3000                        # URL вашего сервера

# Security Keys (Generate secure random strings)
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters  # JWT секрет (минимум 32 символа)
ENCRYPTION_KEY=your_encryption_key_here_exactly_32_characters  # Ключ шифрования (ровно 32 символа)

# Telegram Bot Configuration
TELEGRAM_TOKEN=your_telegram_bot_token_here               # Токен Telegram бота от @BotFather

# Backend API Configuration
BACKEND_API_TIMEOUT=30000             # Таймаут API запросов (30 секунд)
DEMO_MODE=false                       # Демо режим (false для продакшена)

# Trial Subscription Configuration
TRIAL_IMAGES_COUNT=10                 # Количество подарочных изображений для новых пользователей

# Payment Plans Configuration (Тарифные планы)
PAYMENT_PLAN_1_NAME=10 изображений    # Название тарифа 1
PAYMENT_PLAN_1_AMOUNT=2               # Стоимость тарифа 1 (в рублях)
PAYMENT_PLAN_1_IMAGES=10              # Количество изображений в тарифе 1

PAYMENT_PLAN_2_NAME=100 изображений   # Название тарифа 2
PAYMENT_PLAN_2_AMOUNT=3               # Стоимость тарифа 2 (в рублях)
PAYMENT_PLAN_2_IMAGES=100             # Количество изображений в тарифе 2

PAYMENT_PLAN_3_NAME=1000 изображений  # Название тарифа 3
PAYMENT_PLAN_3_AMOUNT=4               # Стоимость тарифа 3 (в рублях)
PAYMENT_PLAN_3_IMAGES=1000            # Количество изображений в тарифе 3

PAYMENT_PLAN_4_NAME=10000 изображений # Название тарифа 4
PAYMENT_PLAN_4_AMOUNT=5               # Стоимость тарифа 4 (в рублях)
PAYMENT_PLAN_4_IMAGES=10000           # Количество изображений в тарифе 4

# Rate Limiting Configuration (Ограничения скорости запросов)
RATE_LIMIT_WINDOW=900000              # Окно для общих лимитов API (15 минут)
RATE_LIMIT_MAX=400                    # Максимум запросов в окне для общего API

IMAGE_GENERATION_WINDOW=3600000       # Окно для лимитов генерации (1 час)
IMAGE_GENERATION_MAX=100              # Максимум генераций в час

UPLOAD_WINDOW=3600000                 # Окно для лимитов загрузки (1 час)
UPLOAD_MAX=100                        # Максимум загрузок в час

# Feature Flags (Флаги функций)
STOCKS_ENABLED=true                   # Включить/выключить функциональность стоковых сервисов

# Watchtower Notifications (Опционально - уведомления об обновлениях)
# WATCHTOWER_NOTIFICATION_URL=discord://token@id     # Discord webhook
# WATCHTOWER_NOTIFICATION_URL=slack://token@channel  # Slack webhook
# WATCHTOWER_NOTIFICATION_URL=telegram://token@chatid # Telegram уведомления
```

**Важно:** Если вам потребуется изменить переменные окружения после запуска контейнеров, необходимо будет пересобрать и перезапустить соответствующие сервисы. Простое редактирование файла `.env.prod` не применит изменения к уже запущенным контейнерам. Подробные команды для управления контейнерами приведены в следующем разделе.

### 3. Запуск системы

```bash
# Запуск production версии
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d
```

## 🐳 Управление контейнерами

### Основные команды

#### Запуск и остановка

```bash
# Запуск всех сервисов в фоновом режиме
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d

# Остановка всех сервисов
docker-compose -f docker-compose-prod.yml down

# Остановка с удалением volumes (ВНИМАНИЕ: удалит все данные!)
docker-compose -f docker-compose-prod.yml down -v

# Перезапуск всех сервисов
docker-compose -f docker-compose-prod.yml restart

# Перезапуск конкретного сервиса
docker-compose -f docker-compose-prod.yml restart backend
docker-compose -f docker-compose-prod.yml restart tg-bot
docker-compose -f docker-compose-prod.yml restart mongodb
```

#### Просмотр статуса и логов

```bash
# Проверка статуса всех сервисов
docker-compose -f docker-compose-prod.yml ps

# Просмотр логов всех сервисов
docker-compose -f docker-compose-prod.yml logs

# Просмотр логов в реальном времени
docker-compose -f docker-compose-prod.yml logs -f

# Просмотр логов конкретного сервиса
docker-compose -f docker-compose-prod.yml logs backend
docker-compose -f docker-compose-prod.yml logs tg-bot
docker-compose -f docker-compose-prod.yml logs mongodb

# Просмотр последних 100 строк логов
docker-compose -f docker-compose-prod.yml logs --tail=100 backend
```

#### Подключение к контейнерам

```bash
# Подключение к backend контейнеру
docker-compose -f docker-compose-prod.yml exec backend bash

# Подключение к MongoDB контейнеру
docker-compose -f docker-compose-prod.yml exec mongodb bash

# Подключение к MongoDB через mongosh
docker-compose -f docker-compose-prod.yml exec mongodb mongosh -u admin -p

# Подключение к Telegram Bot контейнеру
docker-compose -f docker-compose-prod.yml exec tg-bot bash
```

#### Управление данными

```bash
# Создание backup базы данных
docker-compose -f docker-compose-prod.yml exec mongodb mongodump --authenticationDatabase admin -u admin -p --db ai_stock_bot --out /backup

# Восстановление базы данных из backup
docker-compose -f docker-compose-prod.yml exec mongodb mongorestore --authenticationDatabase admin -u admin -p --db ai_stock_bot /backup/ai_stock_bot

# Просмотр использования дисков volumes
docker system df

# Очистка неиспользуемых Docker ресурсов
docker system prune -f

# Очистка неиспользуемых volumes
docker volume prune -f
```

#### Мониторинг ресурсов

```bash
# Просмотр использования ресурсов контейнерами
docker stats

# Просмотр использования ресурсов конкретными контейнерами
docker stats ai-stock-bot-backend-prod ai-stock-bot-telegram-prod ai-stock-bot-mongodb-prod

# Просмотр информации о контейнере
docker inspect ai-stock-bot-backend-prod

```

#### Проверка работоспособности

```bash
# Проверка health status контейнеров
docker-compose -f docker-compose-prod.yml ps

# Проверка API endpoints
curl http://localhost:3000/api/health
curl http://localhost:3000/api/admin/status

# Проверка подключения к MongoDB
docker-compose -f docker-compose-prod.yml exec mongodb mongosh --authenticationDatabase admin -u admin -p --eval "db.adminCommand('ping')"
```

#### Отладка и диагностика

```bash
# Просмотр событий Docker
docker events

# Просмотр процессов внутри контейнера
docker-compose -f docker-compose-prod.yml exec backend ps aux

# Просмотр сетевых подключений
docker network ls
docker network inspect ai-stock-bot-network-prod

# Просмотр volumes
docker volume ls
docker volume inspect ai-stock-bot-mongodb-data-prod
```

## 🗄️ База данных

### Подключение к MongoDB

#### Подключение через контейнер (рекомендуется)

```bash
# Подключение к MongoDB контейнеру - для отладки и исследования файловой системы
docker-compose -f docker-compose-prod.yml exec mongodb bash
# Используйте когда: нужно проверить файлы, логи, или выполнить системные команды

# Подключение к MongoDB через mongosh с аутентификацией - для административных задач
docker-compose -f docker-compose-prod.yml exec mongodb mongosh --authenticationDatabase admin -u admin -p
# Используйте когда: нужно управлять пользователями, индексами, или выполнять административные команды

# Прямое подключение к базе данных приложения - для работы с данными
docker-compose -f docker-compose-prod.yml exec mongodb mongosh --authenticationDatabase admin -u admin -p ai_stock_bot
# Используйте когда: нужно просматривать, изменять или анализировать данные приложения
```

### Резервное копирование

#### Создание backup

```bash
# Полный backup всей базы данных - для регулярного резервного копирования
docker-compose -f docker-compose-prod.yml exec mongodb mongodump \
  --authenticationDatabase admin \
  --username admin \
  --password \
  --db ai_stock_bot \
  --out /backup
```

#### Восстановление из backup

```bash
# Восстановление полной базы данных - для полного восстановления системы
docker-compose -f docker-compose-prod.yml exec mongodb mongorestore \
  --authenticationDatabase admin \
  --username admin \
  --password \
  --db ai_stock_bot \
  /backup/ai_stock_bot
```

### Мониторинг и обслуживание

```bash
# Проверка статуса MongoDB
docker-compose -f docker-compose-prod.yml exec mongodb mongosh \
  --authenticationDatabase admin -u admin -p \
  --eval "db.adminCommand('ping')"

# Проверка размера базы данных
docker-compose -f docker-compose-prod.yml exec mongodb mongosh \
  --authenticationDatabase admin -u admin -p ai_stock_bot \
  --eval "db.stats()"

# Проверка количества документов в коллекциях
docker-compose -f docker-compose-prod.yml exec mongodb mongosh \
  --authenticationDatabase admin -u admin -p ai_stock_bot \
  --eval "
    print('Users: ' + db.users.countDocuments());
    print('Images: ' + db.images.countDocuments());
    print('Payments: ' + db.payments.countDocuments());
  "
```

## ⚙️ Admin панель

### Настройки в базе данных

Система использует коллекцию `appconfigs` в MongoDB для хранения конфигурационных настроек. Основные настройки включают:

#### Управление через API

```bash
# Получение текущего статуса системы
curl http://localhost:3000/api/admin/status

# Получение конфигурации AI моделей
curl http://localhost:3000/api/admin/config

# Переключение модели через API
curl -X POST http://localhost:3000/api/admin/config/ai-model/switch \
  -H "Content-Type: application/json" \
  -d '{"model": "dall_e_3", "reason": "Переключение для тестирования"}'

# Получение доступных моделей
curl http://localhost:3000/api/admin/config/ai-models/available

# Получение истории переключений моделей
curl http://localhost:3000/api/admin/config/ai-models/history
```
