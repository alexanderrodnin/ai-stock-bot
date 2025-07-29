# Production Deployment Guide

Руководство по развертыванию AI Stock Bot в продакшене с использованием Docker образов, автоматическими обновлениями и интегрированной платежной системой YooMoney.

## 🚀 Быстрый старт

### 1. Подготовка окружения

```bash
# Скопируйте файл с переменными окружения
cp .env.prod.example .env.prod

# Отредактируйте переменные окружения
nano .env.prod
```

### 2. Запуск в продакшене

```bash
# Запуск всех сервисов
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d

# Проверка статуса
docker-compose -f docker-compose-prod.yml ps

# Просмотр логов
docker-compose -f docker-compose-prod.yml logs -f
```

## 📦 Используемые Docker образы

- **Backend**: `alexanderrodnin/ai-stock-bot-backend:latest`
- **Telegram Bot**: `alexanderrodnin/ai-stock-bot-tg-bot:latest`
- **MongoDB**: `mongo:7.0.5`
- **Watchtower**: `containrrr/watchtower:latest`
- **MongoDB Express**: `mongo-express:latest` (опционально для разработки)

## 🔄 Автоматические обновления (Watchtower)

Watchtower автоматически проверяет обновления Docker образов каждые **30 секунд** и обновляет контейнеры при появлении новых версий.

### Настройки Watchtower:
- **Интервал проверки**: 30 секунд
- **Автоочистка**: Удаление старых образов после обновления
- **Область действия**: Только контейнеры с меткой `ai-stock-bot`
- **Уведомления**: Поддержка Discord, Slack, Telegram (опционально)

### Мониторируемые сервисы:
- ✅ Backend API
- ✅ Telegram Bot
- ❌ MongoDB (исключен для стабильности)
- ❌ MongoDB Express (исключен)
- ❌ Watchtower (исключен)

## 🔧 Конфигурация

### Обязательные переменные окружения:

```env
# Безопасность
JWT_SECRET=your_jwt_secret_key_here_minimum_32_characters
ENCRYPTION_KEY=your_encryption_key_here_exactly_32_characters

# MongoDB
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=your_secure_mongodb_password_here

# AI Providers
OPENAI_API_KEY=your_openai_api_key_here
SEGMIND_API_KEY=your_segmind_api_key_here

# Telegram Bot
TELEGRAM_TOKEN=your_telegram_bot_token_here

# YooMoney Payment System
YOOMONEY_SHOP_ID=your_yoomoney_shop_id_here
YOOMONEY_SECRET_KEY=your_yoomoney_secret_key_here
YOOMONEY_RETURN_URL=https://yourdomain.com/api/payments/success

# 123RF Stock Service (опционально)
RF123_USERNAME=your_123rf_username_here
RF123_PASSWORD=your_123rf_password_here
RF123_FTP_HOST=ftp.123rf.com
RF123_FTP_PORT=21
```

### Дополнительные переменные окружения:

```env
# API Configuration
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=60000
SEGMIND_BASE_URL=https://api.segmind.com/v1
SEGMIND_TIMEOUT=120000

# Server Configuration
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# Database Configuration
MONGODB_URI=mongodb://admin:password@mongodb:27017/ai-stock-bot?authSource=admin

# File Storage
TEMP_DIR=/app/temp
MAX_FILE_SIZE=50MB
```

### Опциональные уведомления Watchtower:

```env
# Discord
WATCHTOWER_NOTIFICATION_URL=discord://token@id

# Slack
WATCHTOWER_NOTIFICATION_URL=slack://token@channel

# Telegram
WATCHTOWER_NOTIFICATION_URL=telegram://token@chatid
```

## 📊 Мониторинг

### Доступные интерфейсы:
- **Backend API**: http://localhost:3000
- **Admin API**: http://localhost:3000/api/admin
- **Payment API**: http://localhost:3000/api/payments
- **MongoDB Express**: http://localhost:8081 (только для разработки)
- **Telegram Bot**: Работает в фоне

### Health Checks:

```bash
# Общий health check
curl http://localhost:3000/api/health

# Admin health check
curl http://localhost:3000/api/admin/health

# Статус системы
curl http://localhost:3000/api/admin/status

# Проверка конфигурации AI моделей
curl http://localhost:3000/api/admin/config

# Проверка тарифных планов
curl http://localhost:3000/api/payments/plans
```

### Проверка логов:

```bash
# Все сервисы
docker-compose -f docker-compose-prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose-prod.yml logs -f backend
docker-compose -f docker-compose-prod.yml logs -f tg-bot
docker-compose -f docker-compose-prod.yml logs -f watchtower

# Фильтрация логов по уровню
docker-compose -f docker-compose-prod.yml logs -f backend | grep ERROR
docker-compose -f docker-compose-prod.yml logs -f backend | grep WARN
```

### Мониторинг платежной системы:

```bash
# Проверка недавних платежей
curl "http://localhost:3000/api/payments/recent?since=$(date -d '1 hour ago' +%s)000"

# Статистика платежей
curl http://localhost:3000/api/admin/payments/stats

# Проверка webhook логов
curl "http://localhost:3000/api/admin/webhooks/logs?limit=10"
```

### Проверка обновлений:

```bash
# Статус Watchtower
docker logs ai-stock-bot-watchtower

# Принудительная проверка обновлений
docker exec ai-stock-bot-watchtower watchtower --run-once
```

### Мониторинг AI моделей:

```bash
# Текущая активная модель
curl http://localhost:3000/api/admin/config | jq '.data.config.activeModel'

# История переключений моделей
curl "http://localhost:3000/api/admin/config/ai-models/history?limit=5"

# Статистика генерации по моделям
curl http://localhost:3000/api/admin/images/stats
```

## 🔄 Управление

### Остановка сервисов:

```bash
docker-compose -f docker-compose-prod.yml down
```

### Обновление конфигурации:

```bash
# Перезапуск с новой конфигурацией
docker-compose -f docker-compose-prod.yml down
docker-compose -f docker-compose-prod.yml --env-file .env.prod up -d
```

### Резервное копирование данных:

```bash
# Создание бэкапа MongoDB
docker exec ai-stock-bot-mongodb-prod mongodump --out /tmp/backup
docker cp ai-stock-bot-mongodb-prod:/tmp/backup ./mongodb-backup-$(date +%Y%m%d)
```

## 🛡️ Безопасность

### Рекомендации:
1. **Используйте сильные пароли** для всех сервисов
2. **Ограничьте доступ** к портам через firewall
3. **Регулярно обновляйте** переменные окружения
4. **Мониторьте логи** на предмет подозрительной активности
5. **Делайте резервные копии** данных MongoDB

### Сетевая безопасность:
- Все сервисы изолированы в отдельной Docker сети
- Внешний доступ только к необходимым портам
- MongoDB доступна только внутри сети

## 🚨 Устранение неполадок

### Проблемы с обновлениями:

```bash
# Проверка статуса Watchtower
docker logs ai-stock-bot-watchtower --tail 50

# Ручное обновление образов
docker-compose -f docker-compose-prod.yml pull
docker-compose -f docker-compose-prod.yml up -d
```

### Проблемы с подключением к MongoDB:

```bash
# Проверка статуса MongoDB
docker exec ai-stock-bot-mongodb-prod mongosh --eval "db.adminCommand('ismaster')"

# Проверка подключения из backend
docker exec ai-stock-bot-backend-prod curl -f http://localhost:3000/health || echo "Backend недоступен"
```

### Очистка системы:

```bash
# Удаление неиспользуемых образов
docker image prune -f

# Удаление неиспользуемых volumes
docker volume prune -f

# Полная очистка (ОСТОРОЖНО!)
docker system prune -af
```

## 📈 Масштабирование

Для масштабирования можно:
1. Запустить несколько экземпляров backend
2. Использовать load balancer (nginx, traefik)
3. Настроить MongoDB replica set
4. Добавить Redis для кэширования

## 🔗 Полезные ссылки

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Watchtower Documentation](https://containrrr.dev/watchtower/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [GitHub Actions Workflows](.github/workflows/)
