require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { cleanupTempFiles } = require('./download-image');
const BackendApiService = require('./services/backendApiService');

// Check if running in demo mode
const DEMO_MODE = process.env.DEMO_MODE === 'true';

if (DEMO_MODE) {
  console.log('Running in DEMO MODE - using backend API with fallback support');
}

// Clean up temporary files every 24 hours
setInterval(() => {
  console.log('Cleaning up temporary image files...');
  cleanupTempFiles();
}, 86400000); // 24 hours

// Check for required environment variables
if (!process.env.TELEGRAM_TOKEN) {
  console.error('Error: Missing required environment variables. Please check your .env file.');
  console.error('Required variables: TELEGRAM_TOKEN');
  process.exit(1);
}

// Initialize Telegram bot with polling
const bot = new TelegramBot(process.env.TELEGRAM_TOKEN, { polling: true });

// Initialize the backend API service
const backendApi = new BackendApiService({
  baseURL: process.env.BACKEND_API_URL || 'http://localhost:3000/api',
  timeout: parseInt(process.env.BACKEND_API_TIMEOUT) || 30000
});

// Constants
const MAX_PROMPT_LENGTH = 1000;

// User session storage for multi-step operations
const userSessions = new Map();

// Image cache for callback operations
const userImageCache = new Map();

/**
 * Initialize or get user from backend
 */
async function initializeUser(telegramUser) {
  try {
    const userData = {
      externalId: telegramUser.id.toString(),
      externalSystem: 'telegram',
      profile: {
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        language: telegramUser.language_code || 'en'
      },
      metadata: {
        source: 'telegram_bot',
        version: '2.0'
      }
    };

    const user = await backendApi.createOrGetUser(userData);
    console.log(`User initialized: ${user.id} (${user.externalId})`);
    return user;
  } catch (error) {
    console.error('Error initializing user:', error.message);
    throw error;
  }
}

/**
 * Check if backend is available
 */
async function checkBackendHealth() {
  try {
    const isAvailable = await backendApi.isAvailable();
    if (!isAvailable) {
      console.warn('Backend API is not available');
    }
    return isAvailable;
  } catch (error) {
    console.error('Backend health check failed:', error.message);
    return false;
  }
}

/**
 * Show stock setup menu
 */
async function showStockSetupMenu(chatId, userId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🔗 Привязать 123RF", callback_data: "setup_123rf" }],
      [{ text: "🔗 Привязать Shutterstock", callback_data: "setup_shutterstock" }],
      [{ text: "🔗 Привязать Adobe Stock", callback_data: "setup_adobe" }],
      [{ text: "ℹ️ Помощь по настройке", callback_data: "setup_help" }]
    ]
  };

  const message = `🔧 *Настройка стоковых сервисов*

Для генерации изображений необходимо привязать хотя бы один стоковый сервис.

Выберите сервис для настройки:`;

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}

/**
 * Show image actions menu
 */
function getImageActionsKeyboard(imageId, userId, availableServices = []) {
  const keyboard = [];
  
  // Add upload buttons for each available service
  if (availableServices.includes('123rf')) {
    keyboard.push([{ text: "📤 Загрузить на 123RF", callback_data: `upload_123rf_${imageId}` }]);
  }
  if (availableServices.includes('shutterstock')) {
    keyboard.push([{ text: "📤 Загрузить на Shutterstock", callback_data: `upload_shutterstock_${imageId}` }]);
  }
  if (availableServices.includes('adobeStock')) {
    keyboard.push([{ text: "📤 Загрузить на Adobe Stock", callback_data: `upload_adobe_${imageId}` }]);
  }
  
  // Add management buttons
  keyboard.push([{ text: "📊 Статус загрузок", callback_data: `status_${imageId}` }]);
  keyboard.push([{ text: "⚙️ Настройки стоков", callback_data: "manage_stocks" }]);

  return { inline_keyboard: keyboard };
}

/**
 * Get available stock services for user
 */
async function getAvailableStockServices(userId) {
  try {
    const stockServices = await backendApi.getStockServices(userId);
    const available = [];
    
    if (stockServices.rf123?.enabled) available.push('123rf');
    if (stockServices.shutterstock?.enabled) available.push('shutterstock');
    if (stockServices.adobeStock?.enabled) available.push('adobeStock');
    
    return available;
  } catch (error) {
    console.error('Error getting available stock services:', error.message);
    return [];
  }
}

/**
 * Save image locally for Telegram
 */
async function saveImageLocally(imageBuffer, imageId) {
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const fileName = `${imageId}_${Date.now()}.jpg`;
  const filePath = path.join(tempDir, fileName);
  
  fs.writeFileSync(filePath, imageBuffer);
  return filePath;
}

// Start command handler
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Check backend health
    const backendAvailable = await checkBackendHealth();
    if (!backendAvailable) {
      return bot.sendMessage(chatId, 
        '⚠️ Сервис временно недоступен. Попробуйте позже.'
      );
    }

    // Initialize user
    const user = await initializeUser(msg.from);
    
    const welcomeMessage = `🎨 *Добро пожаловать в AI Stock Bot!*

Я помогу вам генерировать изображения с помощью DALL·E 3 и загружать их на стоковые площадки.

*Возможности:*
• Генерация изображений по текстовому описанию
• Автоматическая загрузка на 123RF, Shutterstock, Adobe Stock
• Управление настройками стоковых сервисов
• Отслеживание статуса загрузок

*Команды:*
/help - справка по использованию
/settings - настройки профиля и стоков
/mystocks - управление стоковыми сервисами
/myimages - история изображений
/stats - статистика`;

    await bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });

    // Check if user has active stock services
    const hasActiveStocks = await backendApi.hasActiveStockServices(user.id);
    if (!hasActiveStocks) {
      await bot.sendMessage(chatId, 
        '⚠️ *Необходима настройка стоковых сервисов*\n\nДля генерации изображений нужно привязать хотя бы один стоковый сервис.',
        { parse_mode: 'Markdown' }
      );
      return showStockSetupMenu(chatId, user.id);
    } else {
      await bot.sendMessage(chatId, 
        '\n✅ Стоковые сервисы настроены. Отправьте текстовое описание изображения для начала работы!'
      );
    }
  } catch (error) {
    console.error('Error in /start command:', error.message);
    await bot.sendMessage(chatId, 
      '❌ Произошла ошибка при инициализации. Попробуйте позже.'
    );
  }
});

// Help command handler
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpMessage = `📖 *Справка по использованию*

*Генерация изображений:*
1. Отправьте текстовое описание изображения
2. Дождитесь генерации (может занять до 30 секунд)
3. Выберите стоковый сервис для загрузки

*Настройка стоков:*
• Используйте /mystocks для управления сервисами
• Для каждого сервиса нужны учетные данные
• Можно настроить автоматическую загрузку

*Ограничения:*
• Промт должен быть текстовым и до 1000 символов
• Изображения генерируются в формате 1024x1024
• Соблюдайте правила контента стоковых площадок

*Команды:*
/start - начать работу
/settings - настройки
/mystocks - управление стоками
/myimages - история изображений
/stats - статистика`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Settings command handler
bot.onText(/\/settings/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await initializeUser(msg.from);
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "🎨 Настройки генерации", callback_data: "settings_generation" }],
        [{ text: "📤 Настройки загрузки", callback_data: "settings_upload" }],
        [{ text: "🔔 Уведомления", callback_data: "settings_notifications" }],
        [{ text: "🔗 Стоковые сервисы", callback_data: "manage_stocks" }]
      ]
    };

    await bot.sendMessage(chatId, 
      `⚙️ *Настройки профиля*\n\nВыберите категорию настроек:`, 
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  } catch (error) {
    console.error('Error in /settings command:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки настроек.');
  }
});

// My stocks command handler
bot.onText(/\/mystocks/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await initializeUser(msg.from);
    const stockServices = await backendApi.getStockServices(user.id);
    
    let message = `📊 *Ваши стоковые сервисы*\n\n`;
    
    // 123RF
    const rf123Status = stockServices.rf123?.enabled ? '✅ Активен' : '❌ Не настроен';
    message += `🔸 **123RF**: ${rf123Status}\n`;
    
    // Shutterstock
    const shutterstockStatus = stockServices.shutterstock?.enabled ? '✅ Активен' : '❌ Не настроен';
    message += `🔸 **Shutterstock**: ${shutterstockStatus}\n`;
    
    // Adobe Stock
    const adobeStatus = stockServices.adobeStock?.enabled ? '✅ Активен' : '❌ Не настроен';
    message += `🔸 **Adobe Stock**: ${adobeStatus}\n\n`;
    
    const hasActiveServices = await backendApi.hasActiveStockServices(user.id);
    if (!hasActiveServices) {
      message += `⚠️ *Нет активных сервисов*\nДля генерации изображений необходимо настроить хотя бы один стоковый сервис.`;
    }

    const keyboard = {
      inline_keyboard: [
        [{ text: "🔗 Добавить сервис", callback_data: "manage_stocks" }],
        [{ text: "🔧 Настроить существующий", callback_data: "configure_existing" }]
      ]
    };

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error in /mystocks command:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки информации о стоках.');
  }
});

// My images command handler
bot.onText(/\/myimages/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await initializeUser(msg.from);
    const imagesData = await backendApi.getUserImages(user.id, { limit: 10 });
    
    if (!imagesData.images || imagesData.images.length === 0) {
      return bot.sendMessage(chatId, 
        '📷 У вас пока нет сгенерированных изображений.\n\nОтправьте текстовое описание для создания первого изображения!'
      );
    }

    let message = `📷 *Ваши изображения* (${imagesData.pagination.total})\n\n`;
    
    imagesData.images.slice(0, 5).forEach((image, index) => {
      const date = new Date(image.createdAt).toLocaleDateString('ru-RU');
      const uploadsCount = image.uploads?.length || 0;
      message += `${index + 1}. ${image.prompt.substring(0, 50)}...\n`;
      message += `   📅 ${date} | 📤 ${uploadsCount} загрузок\n\n`;
    });

    if (imagesData.pagination.total > 5) {
      message += `... и еще ${imagesData.pagination.total - 5} изображений`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /myimages command:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки истории изображений.');
  }
});

// Stats command handler
bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await initializeUser(msg.from);
    const stats = await backendApi.getUserStats(user.id);
    
    const message = `📊 *Ваша статистика*

🎨 **Изображений сгенерировано:** ${stats.imagesGenerated || 0}
📤 **Изображений загружено:** ${stats.imagesUploaded || 0}
🔄 **Всего запросов:** ${stats.totalRequests || 0}
📅 **Последняя активность:** ${new Date(stats.lastActivity).toLocaleDateString('ru-RU')}

💳 **Подписка:** ${stats.subscription?.plan || 'free'}
📈 **Лимиты:** ${stats.subscription?.usage?.imagesToday || 0}/${stats.subscription?.limits?.imagesPerDay || 10} сегодня`;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /stats command:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки статистики.');
  }
});

// Main message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id;
  
  // Skip command messages (they're handled by specific handlers)
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }

  // Check if user is in a setup session
  const session = userSessions.get(telegramUserId);
  if (session && session.action === 'setup_stock') {
    return handleSetupStep(msg, session);
  }

  // Check if the message is text
  if (!msg.text) {
    bot.sendMessage(chatId, 'Поддерживаются только текстовые промпты. Отправьте текстовое описание изображения.');
    return;
  }

  // Validate prompt content
  const prompt = msg.text.trim();
  
  if (!prompt) {
    bot.sendMessage(chatId, 'Пожалуйста, отправьте описание изображения для генерации.');
    return;
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    bot.sendMessage(
      chatId, 
      `Описание слишком длинное. Ограничьте описание до ${MAX_PROMPT_LENGTH} символов.`
    );
    return;
  }

  try {
    // Check backend health first
    const backendAvailable = await checkBackendHealth();
    if (!backendAvailable) {
      return bot.sendMessage(chatId, '⚠️ Сервис временно недоступен. Попробуйте позже.');
    }

    // Initialize user
    const user = await initializeUser(msg.from);
    
    // Check if user has active stock services BEFORE starting generation
    const hasActiveStocks = await backendApi.hasActiveStockServices(user.id);
    if (!hasActiveStocks) {
      await bot.sendMessage(chatId, 
        '⚠️ *Необходима настройка стоковых сервисов*\n\nДля генерации изображений нужно привязать хотя бы один стоковый сервис.',
        { parse_mode: 'Markdown' }
      );
      return showStockSetupMenu(chatId, user.id);
    }

    // Only start processing if user has active stocks
    const processingMessage = await bot.sendMessage(chatId, '🎨 Генерирую изображение, пожалуйста подождите...');

    console.log('Generating image for prompt:', prompt);
    
    // Generate the image using backend API
    const imageData = await backendApi.generateImage({
      userId: user.id,
      userExternalId: user.externalId,
      prompt: prompt,
      options: {
        model: 'dall-e-3',
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid'
      }
    });

    // Download image from backend
    const imageBuffer = await backendApi.downloadImage(imageData.id, user.id, 'file');
    
    // Save image locally for Telegram
    const localImagePath = await saveImageLocally(imageBuffer, imageData.id);
    
    // Get available stock services for this user
    const availableServices = await getAvailableStockServices(user.id);
    
    // Create caption
    let caption = `🎨 Изображение сгенерировано!\n\n`;
    caption += `📝 **Промт:** ${prompt}\n`;
    caption += `🤖 **Модель:** ${imageData.model}\n`;
    caption += `📐 **Размер:** ${imageData.size}`;
    
    // Create inline keyboard with upload options
    const keyboard = getImageActionsKeyboard(imageData.id, user.id, availableServices);
    
    // Store the image data in cache for callback operations
    userImageCache.set(msg.from.id, {
      imageId: imageData.id,
      localPath: localImagePath,
      prompt: prompt
    });
    
    console.log(`Stored image data in cache for user ${msg.from.id}: ${imageData.id}`);
    
    // Send the image
    await bot.sendPhoto(chatId, fs.createReadStream(localImagePath), {
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });

    // Delete the processing message
    await bot.deleteMessage(chatId, processingMessage.message_id);
    
  } catch (error) {
    console.error('Error generating image:', error.message);
    
    let errorMessage = '❌ Не удалось сгенерировать изображение. ';
    
    if (error.message.includes('NO_ACTIVE_STOCK_SERVICES')) {
      // This should not happen due to frontend check, but handle it anyway
      await bot.deleteMessage(chatId, processingMessage.message_id);
      await bot.sendMessage(chatId, 
        '⚠️ *Необходима настройка стоковых сервисов*\n\nДля генерации изображений нужно привязать хотя бы один стоковый сервис.',
        { parse_mode: 'Markdown' }
      );
      return showStockSetupMenu(chatId, user.id);
    } else if (error.message.includes('Backend health check failed')) {
      errorMessage += 'Сервис временно недоступен.';
    } else if (error.message.includes('Failed to generate image')) {
      errorMessage += 'Ошибка генерации. Попробуйте изменить описание.';
    } else {
      errorMessage += 'Попробуйте позже.';
    }
    
    await bot.editMessageText(errorMessage, {
      chat_id: chatId,
      message_id: processingMessage.message_id
    });
  }
});

// Handle callback queries from inline keyboard buttons
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  try {
    // Initialize user
    const user = await initializeUser(callbackQuery.from);
    
    // Handle different callback data
    if (data === 'setup_123rf') {
      await handleStockSetup(chatId, userId, user.id, '123rf');
    } else if (data === 'setup_shutterstock') {
      await handleStockSetup(chatId, userId, user.id, 'shutterstock');
    } else if (data === 'setup_adobe') {
      await handleStockSetup(chatId, userId, user.id, 'adobeStock');
    } else if (data === 'setup_help') {
      await showSetupHelp(chatId);
    } else if (data === 'manage_stocks') {
      await showStockSetupMenu(chatId, user.id);
    } else if (data.startsWith('upload_')) {
      await handleImageUpload(callbackQuery, user);
    } else if (data.startsWith('status_')) {
      await handleStatusCheck(callbackQuery, user);
    }
    
    // Acknowledge the button press
    await bot.answerCallbackQuery(callbackQuery.id);
    
  } catch (error) {
    console.error('Error handling callback query:', error.message);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'Произошла ошибка. Попробуйте позже.',
      show_alert: true
    });
  }
});

/**
 * Handle setup step processing
 */
async function handleSetupStep(msg, session) {
  const chatId = msg.chat.id;
  const telegramUserId = msg.from.id;
  const input = msg.text.trim();
  
  // Handle cancel command
  if (input.toLowerCase() === '/cancel' || input.toLowerCase() === 'отмена') {
    userSessions.delete(telegramUserId);
    return bot.sendMessage(chatId, '❌ Настройка отменена.');
  }
  
  const serviceNames = {
    '123rf': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[session.service];
  
  try {
    // Initialize user to get userId
    const user = await initializeUser(msg.from);
    
    switch (session.step) {
      case 'username':
        if (!input) {
          return bot.sendMessage(chatId, '❌ Логин не может быть пустым. Попробуйте еще раз:');
        }
        
        session.data.username = input;
        session.step = 'password';
        
        await bot.sendMessage(chatId, 
          `✅ Логин сохранен: ${input}\n\n🔐 Теперь введите пароль для ${serviceName}:`
        );
        break;
        
      case 'password':
        if (!input) {
          return bot.sendMessage(chatId, '❌ Пароль не может быть пустым. Попробуйте еще раз:');
        }
        
        session.data.password = input;
        
        // Different next steps based on service
        if (session.service === '123rf') {
          session.step = 'confirm';
          
          // Set default FTP settings for 123RF
          session.data.ftpHost = 'ftp.123rf.com';
          session.data.ftpPort = 21;
          session.data.remotePath = '/ai_images';
          
          // Show confirmation for 123RF with default settings
          const rf123ConfirmMessage = `📋 Проверьте настройки ${serviceName}:

👤 Логин: ${session.data.username}
🔐 Пароль: ${'*'.repeat(session.data.password.length)}
🌐 FTP хост: ${session.data.ftpHost} (автоматически)
🔌 FTP порт: ${session.data.ftpPort} (автоматически)
📁 Путь: ${session.data.remotePath} (автоматически)

Все верно? Отправьте "да" для сохранения или "нет" для отмены.`;
          
          await bot.sendMessage(chatId, rf123ConfirmMessage);
        } else if (session.service === 'shutterstock') {
          session.step = 'api_key';
          await bot.sendMessage(chatId, 
            `✅ Пароль сохранен.\n\n🔑 Введите API ключ Shutterstock:`
          );
        } else if (session.service === 'adobeStock') {
          session.step = 'api_key';
          await bot.sendMessage(chatId, 
            `✅ Пароль сохранен.\n\n🔑 Введите API ключ Adobe Stock:`
          );
        }
        break;
        
        
      case 'api_key':
        if (!input) {
          return bot.sendMessage(chatId, '❌ API ключ не может быть пустым. Попробуйте еще раз:');
        }
        
        session.data.apiKey = input;
        
        if (session.service === 'adobeStock') {
          session.step = 'api_secret';
          await bot.sendMessage(chatId, 
            `✅ API ключ сохранен.\n\n🔐 Введите API секрет Adobe Stock:`
          );
        } else {
          session.step = 'confirm';
          
          // Show confirmation for Shutterstock
          const shutterstockConfirmMessage = `📋 *Проверьте настройки ${serviceName}:*

👤 **Логин:** ${session.data.username}
🔐 **Пароль:** ${'*'.repeat(session.data.password.length)}
🔑 **API ключ:** ${session.data.apiKey.substring(0, 8)}...

Все верно? Отправьте "да" для сохранения или "нет" для отмены.`;
          
          await bot.sendMessage(chatId, shutterstockConfirmMessage, { parse_mode: 'Markdown' });
        }
        break;
        
      case 'api_secret':
        if (!input) {
          return bot.sendMessage(chatId, '❌ API секрет не может быть пустым. Попробуйте еще раз:');
        }
        
        session.data.apiSecret = input;
        session.step = 'confirm';
        
        // Show confirmation for Adobe Stock
        const adobeConfirmMessage = `📋 *Проверьте настройки ${serviceName}:*

👤 **Логин:** ${session.data.username}
🔐 **Пароль:** ${'*'.repeat(session.data.password.length)}
🔑 **API ключ:** ${session.data.apiKey.substring(0, 8)}...
🔐 **API секрет:** ${session.data.apiSecret.substring(0, 8)}...

Все верно? Отправьте "да" для сохранения или "нет" для отмены.`;
        
        await bot.sendMessage(chatId, adobeConfirmMessage, { parse_mode: 'Markdown' });
        break;
        
      case 'confirm':
        const confirmation = input.toLowerCase();
        
        if (confirmation === 'да' || confirmation === 'yes' || confirmation === 'y') {
          // Save settings to backend
          await saveStockServiceSettings(chatId, telegramUserId, user.id, session);
        } else {
          userSessions.delete(telegramUserId);
          await bot.sendMessage(chatId, '❌ Настройка отменена.');
        }
        break;
        
      default:
        userSessions.delete(telegramUserId);
        await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте начать настройку заново.');
    }
    
  } catch (error) {
    console.error('Error in setup step:', error.message);
    userSessions.delete(telegramUserId);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
  }
}

/**
 * Save stock service settings to backend
 */
async function saveStockServiceSettings(chatId, telegramUserId, userId, session) {
  const serviceNames = {
    '123rf': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[session.service];
  
  try {
    // Show saving message
    const savingMessage = await bot.sendMessage(chatId, 
      `💾 Сохраняю настройки ${serviceName}...`
    );
    
    // Prepare settings object based on service type
    let settings = {
      enabled: true,
      credentials: {
        username: session.data.username,
        password: session.data.password
      },
      settings: {
        autoUpload: false,
        defaultKeywords: ['ai', 'generated', 'digital', 'art'],
        defaultDescription: 'AI-generated digital artwork',
        pricing: 'standard'
      }
    };
    
    // Add service-specific credentials
    if (session.service === '123rf') {
      settings.credentials.ftpHost = session.data.ftpHost;
      settings.credentials.ftpPort = session.data.ftpPort;
      settings.credentials.remotePath = session.data.remotePath;
    } else if (session.service === 'shutterstock') {
      settings.credentials.apiKey = session.data.apiKey;
    } else if (session.service === 'adobeStock') {
      settings.credentials.apiKey = session.data.apiKey;
      settings.credentials.secret = session.data.apiSecret;
    }
    
    // Save to backend
    const result = await backendApi.updateStockService(userId, session.service, settings);
    
    // Test connection
    await bot.editMessageText(
      `🔍 Тестирую соединение с ${serviceName}...`,
      { chat_id: chatId, message_id: savingMessage.message_id }
    );
    
    try {
      const testResult = await backendApi.testStockServiceConnection(userId, session.service);
      
      await bot.deleteMessage(chatId, savingMessage.message_id);
      
      if (testResult.success) {
        const successMessage = `✅ *${serviceName} успешно настроен!*

🎉 Соединение протестировано и работает.
Теперь вы можете генерировать изображения и загружать их на ${serviceName}.

Отправьте текстовое описание изображения для начала работы!`;
        
        await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      } else {
        const warningMessage = `⚠️ *${serviceName} настроен, но есть проблемы с соединением*

Настройки сохранены, но тест соединения не прошел:
${testResult.message || 'Неизвестная ошибка'}

Проверьте настройки и попробуйте позже.`;
        
        await bot.sendMessage(chatId, warningMessage, { parse_mode: 'Markdown' });
      }
    } catch (testError) {
      await bot.deleteMessage(chatId, savingMessage.message_id);
      
      const warningMessage = `⚠️ *${serviceName} настроен, но тест соединения не удался*

Настройки сохранены, но не удалось протестировать соединение.
Вы можете попробовать загрузить изображение для проверки.`;
      
      await bot.sendMessage(chatId, warningMessage, { parse_mode: 'Markdown' });
    }
    
    // Clear session
    userSessions.delete(telegramUserId);
    
  } catch (error) {
    console.error('Error saving stock service settings:', error.message);
    
    await bot.editMessageText(
      `❌ Ошибка сохранения настроек ${serviceName}: ${error.message}`,
      { chat_id: chatId, message_id: savingMessage.message_id }
    );
    
    userSessions.delete(telegramUserId);
  }
}

/**
 * Handle stock service setup
 */
async function handleStockSetup(chatId, telegramUserId, userId, service) {
  const serviceNames = {
    '123rf': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[service];
  
  // Store session data
  userSessions.set(telegramUserId, {
    action: 'setup_stock',
    service: service,
    step: 'username',
    data: {}
  });
  
  const message = `🔧 *Настройка ${serviceName}*

Для настройки ${serviceName} потребуются учетные данные.
Отправьте "отмена" в любой момент для прерывания.

👤 Введите ваш логин для ${serviceName}:`;
  
  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
}

/**
 * Handle image upload to stock service
 */
async function handleImageUpload(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const telegramUserId = callbackQuery.from.id;
  
  // Parse callback data: upload_service_imageId
  const parts = data.split('_');
  const service = parts[1];
  const imageId = parts[2];
  
  // Check if we have the image data
  const imageData = userImageCache.get(telegramUserId);
  if (!imageData || imageData.imageId !== imageId) {
    return bot.sendMessage(chatId, 
      '❌ Изображение больше недоступно. Сгенерируйте новое изображение.'
    );
  }
  
  const statusMessage = await bot.sendMessage(chatId, 
    `📤 Загружаю изображение на ${service.toUpperCase()}...`
  );
  
  try {
    // Upload to stock service via backend
    const uploadResult = await backendApi.uploadToStock({
      userId: user.id,
      imageId: imageId,
      service: service,
      title: `AI Generated: ${imageData.prompt.substring(0, 50)}`,
      description: `AI-generated digital artwork: ${imageData.prompt}`,
      keywords: imageData.prompt.split(' ').slice(0, 10),
      category: 'Digital Art',
      pricing: 'standard'
    });
    
    await bot.deleteMessage(chatId, statusMessage.message_id);
    
    if (uploadResult.success) {
      const successMessage = `✅ *Изображение успешно загружено на ${service.toUpperCase()}!*\n\n`;
      await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    } else {
      await bot.sendMessage(chatId, 
        `❌ Ошибка загрузки на ${service.toUpperCase()}: ${uploadResult.message || 'Неизвестная ошибка'}`
      );
    }
    
  } catch (error) {
    await bot.deleteMessage(chatId, statusMessage.message_id);
    console.error('Error uploading to stock:', error.message);
    await bot.sendMessage(chatId, 
      `❌ Ошибка загрузки на ${service.toUpperCase()}. Попробуйте позже.`
    );
  }
}

/**
 * Handle status check
 */
async function handleStatusCheck(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Parse callback data: status_imageId
  const imageId = data.split('_')[1];
  
  try {
    const uploadStatus = await backendApi.getUploadStatus(imageId, user.id);
    
    let message = `📊 *Статус загрузок*\n\n`;
    
    if (!uploadStatus.uploads || uploadStatus.uploads.length === 0) {
      message += 'Изображение еще не загружалось на стоковые сервисы.';
    } else {
      uploadStatus.uploads.forEach(upload => {
        const status = upload.status === 'completed' ? '✅' : 
                      upload.status === 'failed' ? '❌' : '⏳';
        const date = new Date(upload.uploadedAt).toLocaleDateString('ru-RU');
        message += `${status} **${upload.service.toUpperCase()}** - ${date}\n`;
      });
    }
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error checking upload status:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка получения статуса загрузок.');
  }
}

/**
 * Show setup help
 */
async function showSetupHelp(chatId) {
  const helpMessage = `ℹ️ *Помощь по настройке стоков*

**123RF:**
• Нужен только логин и пароль от аккаунта
• FTP настройки устанавливаются автоматически
• Обычно совпадают с данными для входа на сайт

**Shutterstock:**
• Требуется API ключ
• Получить можно в настройках аккаунта
• Раздел "API Access"

**Adobe Stock:**
• Нужен API ключ и секрет
• Настраивается в Adobe Developer Console
• Требуется верификация аккаунта

*Все данные хранятся в зашифрованном виде и используются только для загрузки ваших изображений.*`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
}

// Log when bot is started
console.log('🤖 Telegram Bot (Backend Integration) is running...');

// Handle errors
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Bot is shutting down...');
  bot.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Bot is shutting down...');
  bot.close();
  process.exit(0);
});
