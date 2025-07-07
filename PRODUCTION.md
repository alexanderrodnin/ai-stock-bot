# Production Deployment Guide

Руководство по развертыванию AI Stock Bot в продакшене с использованием Docker образов и автоматическими обновлениями.

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

- **Backend**: `alexanderrodnin/ai-stock-bot-backend:backend`
- **Telegram Bot**: `alexanderrodnin/ai-stock-bot-tg-bot:backend`
- **MongoDB**: `mongo:7.0.5`
- **MongoDB Express**: `mongo-express:1.0.0`
- **Watchtower**: `containrrr/watchtower:latest`

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

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Telegram
TELEGRAM_TOKEN=your_telegram_bot_token_here
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
- **MongoDB Express**: http://localhost:8081
- **Telegram Bot**: Работает в фоне

### Проверка логов:

```bash
# Все сервисы
docker-compose -f docker-compose-prod.yml logs -f

# Конкретный сервис
docker-compose -f docker-compose-prod.yml logs -f backend
docker-compose -f docker-compose-prod.yml logs -f tg-bot
docker-compose -f docker-compose-prod.yml logs -f watchtower
```

### Проверка обновлений:

```bash
# Статус Watchtower
docker logs ai-stock-bot-watchtower

# Принудительная проверка обновлений
docker exec ai-stock-bot-watchtower watchtower --run-once
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
