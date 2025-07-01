# Документация диаграмм

## C4 Component Diagram

Файл `c4-components.puml` содержит C4 диаграмму компонентов для AI Stock Bot.

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

Диаграмма показывает полную архитектуру AI Stock Bot:

**Основные компоненты:**
- **Bot Controller**: главная логика бота, обработка команд, сообщений и callback-запросов
- **Image Service**: сервис генерации изображений с системой фоллбеков
- **FTP Service**: загрузка изображений на платформу 123RF через FTP
- **Download Service**: загрузка и управление временными файлами
- **Mock Image Service**: предоставление запасных изображений
- **Configuration Manager**: управление переменными окружения

**Внешние системы:**
- **Telegram API**: платформа для взаимодействия с пользователями
- **OpenAI API**: сервис генерации изображений DALL-E 3/2
- **123RF Platform**: стоковая платформа с FTP сервером и веб-интерфейсом
- **Stock Image APIs**: внешние источники изображений для фоллбеков

**Ключевые потоки:**
1. Генерация изображений: пользователь → OpenAI API → локальное хранение
2. Загрузка на 123RF: callback-кнопка → FTP сервис → 123RF FTP сервер
3. Система фоллбеков: OpenAI → стоковые изображения при ошибках
4. Кэширование: пути к изображениям сохраняются для callback-запросов

**Управление данными:**
- Временное файловое хранилище с очисткой каждые 24 часа
- In-memory кэш путей к изображениям для пользователей
- Backup копии изображений после успешной загрузки на 123RF

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
