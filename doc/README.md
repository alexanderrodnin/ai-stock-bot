# Документация диаграмм

## C4 Component Diagram

Файл `c4-components.puml` содержит C4 диаграмму компонентов для AI Stock Bot - многоинтерфейсной системы генерации изображений.

### Просмотр диаграммы в VSCode

1. **Установите расширение PlantUML**:
   - Extensions → Поиск "PlantUML" (автор jebbs) → Install

2. **Настройте PlantUML (если нет Graphviz)**:
   - VSCode → Settings (`Cmd+,`)
   - Поиск "PlantUML"
   - Найдите "PlantUML: Render" и измените на "PlantUMLServer"
   - Найдите "PlantUML: Server" и установите: `https://www.plantuml.com/plantuml`
   - Или через JSON settings: 
     ```json
     {
       "plantuml.render": "PlantUMLServer",
       "plantuml.server": "https://www.plantuml.com/plantuml"
     }
     ```

3. **Просмотр диаграммы**:
   - Откройте файл `c4-components.puml`
   - Нажмите `Alt+D` (Windows/Linux) или `Cmd+D` (Mac)
   - Или используйте Command Palette (`Ctrl+Shift+P`):
     - "PlantUML: Preview Current Diagram"

4. **Экспорт в изображение**:
   - Command Palette → "PlantUML: Export Current Diagram"
   - Выберите формат: PNG, SVG, PDF

### Онлайн просмотр

Если не хотите устанавливать расширение, можете использовать:
- [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
- Скопируйте содержимое файла и вставьте в онлайн редактор

### Описание диаграммы

Диаграмма показывает модульную архитектуру AI Stock Bot с выделенным backend сервисом:

## Архитектурные слои:

### 1. Frontend Interfaces (Интерфейсы пользователя)
- **Telegram Bot**: текущий интерфейс через Telegram
- **Web Interface**: планируемый веб-интерфейс

### 2. AI Stock Bot Backend (Основная система)

**API Gateway (Express.js Application):**
- **API Routes**: определение маршрутов (/api/images, /api/upload, /api/users)
- **Controllers**: бизнес-логика (ImageController, UploadController, UserController)
- **Middleware**: валидация, авторизация, обработка ошибок, логирование
- **API Configuration**: CORS, body parser, rate limiting, безопасность

**Core Services (Основные сервисы):**
- **Image Service**: оркестрация генерации изображений с системой фоллбеков
- **FTP Service**: загрузка изображений на 123RF через FTP
- **Download Service**: загрузка и управление временными файлами
- **Mock Image Service**: предоставление запасных изображений
- **User Service**: управление пользователями и сессиями
- **Configuration Manager**: управление конфигурацией и переменными окружения

**Data Layer (Слой данных):**
- **Temporary File Storage**: временное хранение изображений
- **Database (MongoDB)**: постоянное хранение данных пользователей и метаданных изображений

### 3. External Systems (Внешние системы)
- **Telegram Platform**: платформа для Telegram bot интерфейса
- **OpenAI Platform**: сервис генерации изображений DALL-E 3/2
- **123RF Platform**: стоковая платформа с FTP сервером
- **External Image Sources**: источники запасных изображений

## Детали Backend API:

### API Endpoints:
```
POST /api/images/generate     - Генерация изображения
POST /api/upload/123rf        - Загрузка на 123RF
GET  /api/users/:id          - Получить пользователя
POST /api/users              - Создать пользователя
GET  /api/images/:userId     - История изображений
GET  /api/health             - Проверка здоровья API
```

### Express.js Pipeline:
```
Request → API Routes → Middleware → Controllers → Services → Database/External APIs
```

### Middleware Stack:
- **Authentication**: проверка токенов/API ключей
- **Validation**: валидация входных данных по схемам
- **Error Handling**: централизованная обработка ошибок
- **Logging**: логирование запросов и ответов
- **CORS**: настройка политик кросс-доменных запросов
- **Rate Limiting**: защита от превышения лимитов

## Преимущества архитектуры:

**Масштабируемость:**
- Модульная структура API Gateway
- Поддержка множественных интерфейсов
- Горизонтальное масштабирование через load balancer
- Четкое разделение на Routes → Controllers → Services

**Расширяемость:**
- Легкое добавление новых endpoints
- Независимое развитие middleware компонентов
- Централизованное управление конфигурацией
- Подключение новых frontend интерфейсов

**Надежность:**
- Централизованная обработка ошибок
- Валидация на уровне middleware
- Система фоллбеков для генерации изображений
- Health check endpoints для мониторинга
- Простая и понятная архитектура

### Требования

- Java 8+ (у вас установлена Java 23.0.1 ✅)
- VSCode с расширением PlantUML

### Решение проблем

**Ошибка "Cannot run program dot" или "No PlantUML server":**
1. **Вариант 1 (рекомендуется)**: Настройте PlantUML на использование сервера:
   - Settings → PlantUML: Render → "PlantUMLServer"
   - Settings → PlantUML: Server → "https://www.plantuml.com/plantuml"
   
2. **Вариант 2**: Установите Graphviz:
   ```bash
   # Исправьте права доступа Homebrew (если нужно):
   sudo chown -R $(whoami) /opt/homebrew
   
   # Установите Graphviz:
   brew install graphviz
   ```

3. **Вариант 3**: Используйте онлайн PlantUML редактор:
   - http://www.plantuml.com/plantuml/uml/
