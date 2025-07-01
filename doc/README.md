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

**API Gateway:**
- Централизованная точка входа для всех frontend интерфейсов
- REST API для унифицированного доступа к функциональности
- Управление сессиями и кэшированием

**Core Services (Основные сервисы):**
- **Image Service**: оркестрация генерации изображений с системой фоллбеков
- **FTP Service**: загрузка изображений на 123RF через FTP
- **Download Service**: загрузка и управление временными файлами
- **Mock Image Service**: предоставление запасных изображений
- **User Service**: управление пользователями и сессиями
- **Configuration Manager**: управление конфигурацией и переменными окружения

**Data Layer (Слой данных):**
- **Temporary File Storage**: временное хранение изображений
- **User Session Cache**: кэш сессий пользователей (Redis/Memory)
- **Database**: постоянное хранение данных пользователей и метаданных изображений

### 3. External Systems (Внешние системы)
- **Telegram Platform**: платформа для Telegram bot интерфейса
- **OpenAI Platform**: сервис генерации изображений DALL-E 3/2
- **123RF Platform**: стоковая платформа с FTP сервером
- **External Image Sources**: источники запасных изображений

## Преимущества архитектуры:

**Масштабируемость:**
- Модульная структура сервисов
- Поддержка множественных интерфейсов
- Горизонтальное масштабирование через API Gateway

**Расширяемость:**
- Легкое добавление новых интерфейсов (Web и другие)
- Независимое развитие backend сервисов
- Централизованное управление пользователями

**Надежность:**
- Разделение ответственности между сервисами
- Система фоллбеков для генерации изображений
- Кэширование для повышения производительности
- Постоянное хранение данных

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
