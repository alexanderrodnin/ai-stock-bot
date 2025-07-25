require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const BackendApiService = require('./services/backendApiService');

// Check if running in demo mode
let DEMO_MODE = process.env.DEMO_MODE === 'true';
let demoModeActivatedByError = false;

if (DEMO_MODE) {
  console.log('Running in DEMO MODE - using mock images instead of OpenAI API');
} else {
  console.log('Running in NORMAL MODE - using backend API with OpenAI integration');
}

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
  timeout: parseInt(process.env.BACKEND_API_TIMEOUT) || 120000 // 2 minutes
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
 * Show stock setup menu
 */
async function showStockSetupMenu(chatId, userId) {
  const keyboard = {
    inline_keyboard: [
      [{ text: "🔗 Привязать 123RF", callback_data: "setup_123rf" }],
      // [{ text: "🔗 Привязать Shutterstock", callback_data: "setup_shutterstock" }],
      // [{ text: "🔗 Привязать Adobe Stock", callback_data: "setup_adobe" }],
      [{ text: "ℹ️ Помощь по настройке", callback_data: "setup_help" }]
    ]
  };

  const message = `🔧 Настройка стоковых сервисов

Для генерации изображений необходимо привязать стоковый сервис 123RF.

Выберите действие:`;

  await bot.sendMessage(chatId, message, {
    reply_markup: keyboard
  });
}

/**
 * Show setup help information
 */
async function showSetupHelp(chatId) {
  const helpMessage = `ℹ️ *Помощь по настройке стоковых сервисов*

*🔧 123RF:*
• Нужен аккаунт на [123rf.com](https://123rf.com)
• Используются **nickname** (не email!) и пароль от аккаунта
• FTP настройки устанавливаются автоматически
• После настройки можно загружать изображения

*📋 Где найти nickname:*
• Войдите в свой аккаунт на 123RF
• Перейдите в профиль (Profile)
• Nickname отображается в верхней части страницы
• Это НЕ ваш email адрес!

*📐 Требования к изображениям:*
• Минимум 4000x4000 пикселей
• Формат JPEG высокого качества
• Качество не менее 300 DPI
• Соответствие правилам контента 123RF

*🔒 Безопасность:*
• Все данные шифруются при хранении
• Соединение защищено SSL/TLS
• Данные используются только для загрузки

*❓ Частые вопросы:*
• **Q:** Можно ли использовать email вместо nickname?
• **A:** Нет, обязательно нужен именно nickname

• **Q:** Где взять FTP настройки?
• **A:** Они устанавливаются автоматически

• **Q:** Безопасно ли вводить пароль?
• **A:** Да, все данные шифруются`;

  const keyboard = {
    inline_keyboard: [
      [{ text: "🌐 Открыть 123RF", url: "https://www.123rf.com/profile" }],
      [{ text: "📖 Правила контента", url: "https://www.123rf.com/help_center/contributor_help/content_guidelines/" }]
    ]
  };

  await bot.sendMessage(chatId, helpMessage, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard,
    disable_web_page_preview: true
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
  // if (availableServices.includes('shutterstock')) {
  //   keyboard.push([{ text: "📤 Загрузить на Shutterstock", callback_data: `upload_shutterstock_${imageId}` }]);
  // }
  // if (availableServices.includes('adobeStock')) {
  //   keyboard.push([{ text: "📤 Загрузить на Adobe Stock", callback_data: `upload_adobe_${imageId}` }]);
  // }
  
  // Add management buttons
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
    // if (stockServices.shutterstock?.enabled) available.push('shutterstock');
    // if (stockServices.adobeStock?.enabled) available.push('adobeStock');
    
    return available;
  } catch (error) {
    console.error('Error getting available stock services:', error.message);
    return [];
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
 * Activate demo mode due to API error
 */
function activateDemoMode(reason = 'API Error') {
  if (!demoModeActivatedByError) {
    console.log(`🔄 ACTIVATING DEMO MODE: ${reason}`);
    demoModeActivatedByError = true;
    DEMO_MODE = true;
  }
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

Я помогу вам генерировать изображения с помощью современных AI моделей и загружать их на стоковую площадку 123RF.

*🤖 Доступные AI модели:*
• Juggernaut Pro Flux (по умолчанию)
• DALL-E 3 (OpenAI)
• Seedream V3
• HiDream-I1 Fast

*📤 Возможности:*
• Генерация изображений по текстовому описанию
• Автоматическая загрузка на 123RF
• Управление настройками стокового сервиса

*Команды:*
/help - справка по использованию
/mystocks - управление стоковым сервисом`;

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

*🤖 AI Модели:*
• **Juggernaut Pro Flux** (по умолчанию) - профессиональные реалистичные изображения
• **DALL-E 3** (OpenAI) - высококачественная генерация с отличным пониманием промптов
• **Seedream V3** - художественная и креативная генерация
• **HiDream-I1 Fast** - быстрая высококачественная генерация

*Генерация изображений:*
1. Отправьте текстовое описание изображения
2. Дождитесь генерации (может занять до 30 секунд)
3. Загрузите изображение на 123RF

*Настройка стоков:*
• Используйте /mystocks для управления сервисом 123RF
• Нужны **nickname** (не email!) и пароль от аккаунта 123RF
• Можно настроить автоматическую загрузку

*Подписка и оплата:*
• Используйте /balance для проверки баланса изображений
• Используйте /buy для покупки изображений
• Доступны тарифы: 10, 100, 1000, 10000 изображений

*Ограничения:*
• Промт должен быть текстовым и до 1000 символов
• Изображения обрабатываются в формате 4000x4000 для загрузки
• Соблюдайте правила контента стоковой площадки 123RF

*Команды:*
/start - начать работу
/mystocks - управление стоковым сервисом
/balance - проверить баланс изображений
/buy - купить изображения`;

  bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Balance command handler
bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await initializeUser(msg.from);
    const subscription = await backendApi.getUserSubscription(user.id);
    
    let message = `💰 *Ваш баланс*\n\n`;
    
    if (subscription.isActive) {
      message += `✅ **Статус:** Активная подписка\n`;
      message += `📊 **План:** ${subscription.plan}\n`;
      message += `🖼️ **Осталось изображений:** ${subscription.imagesRemaining}\n`;
      
      if (subscription.expiresAt) {
        const expiryDate = new Date(subscription.expiresAt);
        message += `⏰ **Действует до:** ${expiryDate.toLocaleDateString('ru-RU')}\n`;
      }
    } else {
      message += `❌ **Статус:** Подписка неактивна\n`;
      message += `🖼️ **Изображений:** 0\n\n`;
      message += `💡 Для генерации изображений необходимо приобрести тариф.`;
    }
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "💳 Купить изображения", callback_data: "buy_images" }],
        [{ text: "📊 История платежей", callback_data: "payment_history" }]
      ]
    };
    
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error in /balance command:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка получения информации о балансе.');
  }
});

// Buy command handler
bot.onText(/\/buy/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await initializeUser(msg.from);
    await showPaymentPlans(chatId, user.id, msg.from.id);
  } catch (error) {
    console.error('Error in /buy command:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки тарифов.');
  }
});


// My stocks command handler
bot.onText(/\/mystocks/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    const user = await initializeUser(msg.from);
    const stockServices = await backendApi.getStockServices(user.id);
    
    let message = `📊 *Управление стоковыми сервисами*\n\n`;
    
    const keyboard = {
      inline_keyboard: []
    };
    
    // 123RF
    const rf123Status = stockServices.rf123?.enabled ? '✅ Активен' : '❌ Не настроен';
    message += `🔸 **123RF**: ${rf123Status}\n\n`;
    
    if (stockServices.rf123?.enabled) {
      // Если сервис привязан - показываем кнопки управления
      message += `Сервис 123RF настроен и готов к работе.`;
      keyboard.inline_keyboard.push([
        { text: "👁️ Посмотреть 123RF", callback_data: "view_rf123" }
      ]);
      keyboard.inline_keyboard.push([
        { text: "✏️ Изменить данные 123RF", callback_data: "edit_rf123" }
      ]);
      keyboard.inline_keyboard.push([
        { text: "🗑️ Удалить 123RF", callback_data: "delete_rf123" }
      ]);
    } else {
      // Если сервис не привязан - показываем только кнопку привязки
      message += `⚠️ *Сервис не настроен*\nДля генерации изображений необходимо привязать стоковый сервис 123RF.`;
      keyboard.inline_keyboard.push([
        { text: "🔗 Привязать 123RF", callback_data: "setup_123rf" }
      ]);
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error in /mystocks command:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки информации о стоков.');
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
  if (session && (session.action === 'setup_stock' || session.action === 'edit_stock')) {
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

    try {
      console.log('Generating image for prompt:', prompt);
      
      // Generate the image using backend API
      const imageData = await backendApi.generateImage({
        userId: user.id,
        userExternalId: user.externalId,
        prompt: prompt,
        demoMode: DEMO_MODE,
        options: {
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        }
      });

      // Get image stream from backend for direct sending
      const imageStream = await backendApi.getImageStream(imageData.id, user.id);
      
      // Get available stock services for this user
      const availableServices = await getAvailableStockServices(user.id);
      
      // Create caption based on whether it's a fallback/demo image
      let caption;
      const isFallbackOrDemo = (
        (imageData.usedSource && (imageData.usedSource.includes('Fallback') || imageData.usedSource.includes('Demo'))) ||
        (imageData.fallbackReason && imageData.fallbackReason !== 'None') ||
        DEMO_MODE ||
        demoModeActivatedByError
      );
      
      if (isFallbackOrDemo) {
        caption = `🎨 Демо-изображение сгенерировано!\n\n`;
        caption += `⚠️ *Это тестовое изображение* (OpenAI API недоступен)\n\n`;
      } else {
        caption = `🎨 Изображение сгенерировано!\n\n`;
      }
      caption += `📝 **Промт:** ${prompt}\n`;
      caption += `🤖 **Модель:** ${imageData.model}\n`;
      caption += `📐 **Размер:** 4000x4000`;
      
      // Create inline keyboard with upload options
      const keyboard = getImageActionsKeyboard(imageData.id, user.id, availableServices);
      
      // Store the image data in cache for callback operations (without local path)
      userImageCache.set(msg.from.id, {
        imageId: imageData.id,
        prompt: prompt
      });
      
      console.log(`Stored image data in cache for user ${msg.from.id}: ${imageData.id}`);
      
      // Send the image using stream directly from backend
      await bot.sendPhoto(chatId, imageStream, {
        caption: caption,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      // Delete the processing message (safely)
      try {
        await bot.deleteMessage(chatId, processingMessage.message_id);
      } catch (deleteError) {
        // Ignore deletion errors - message might already be deleted or too old
        console.log('Could not delete processing message:', deleteError.message);
      }
      
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
  } catch (error) {
    console.error('Error in main message handler:', error.message);
    await bot.sendMessage(chatId, '❌ Произошла ошибка. Попробуйте позже.');
  }
});

// Handle callback queries from inline keyboard buttons
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const userId = callbackQuery.from.id;
  const data = callbackQuery.data;
  
  // Try to acknowledge the callback query immediately to prevent timeout
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (ackError) {
    // If acknowledgment fails (e.g., query too old), log it but continue processing
    console.error('Failed to acknowledge callback query:', ackError.message);
    
    // If the query is too old, send a new message instead of trying to process it
    if (ackError.message.includes('query is too old')) {
      return bot.sendMessage(chatId, 
        '⚠️ Кнопка устарела. Пожалуйста, сгенерируйте новое изображение или используйте команды /start или /mystocks.'
      );
    }
  }
  
  try {
    // Initialize user
    const user = await initializeUser(callbackQuery.from);
    
    // Handle different callback data
    if (data === 'setup_123rf') {
      await handleStockSetup(chatId, userId, user.id, '123rf');
    // } else if (data === 'setup_shutterstock') {
    //   await handleStockSetup(chatId, userId, user.id, 'shutterstock');
    // } else if (data === 'setup_adobe') {
    //   await handleStockSetup(chatId, userId, user.id, 'adobeStock');
    } else if (data === 'setup_help') {
      await showSetupHelp(chatId);
    } else if (data === 'manage_stocks') {
      await showStockSetupMenu(chatId, user.id);
    } else if (data === 'configure_existing') {
      await showConfigureExistingMenu(chatId, user.id);
    } else if (data.startsWith('view_')) {
      await handleViewStock(callbackQuery, user);
    } else if (data.startsWith('delete_')) {
      await handleDeleteStock(callbackQuery, user);
    } else if (data.startsWith('edit_')) {
      await handleEditStock(callbackQuery, user);
    } else if (data.startsWith('confirm_delete_')) {
      await handleConfirmDelete(callbackQuery, user);
    } else if (data === 'cancel_delete') {
      await bot.sendMessage(chatId, '❌ Удаление отменено.');
    } else if (data.startsWith('confirm_save_')) {
      await handleConfirmSave(callbackQuery, user);
    } else if (data.startsWith('confirm_cancel_')) {
      await handleConfirmCancel(callbackQuery, user);
    } else if (data.startsWith('confirm_edit_')) {
      await handleConfirmEdit(callbackQuery, user);
    } else if (data.startsWith('skip_username_')) {
      await handleSkipUsername(callbackQuery, user);
    } else if (data.startsWith('skip_password_')) {
      await handleSkipPassword(callbackQuery, user);
    } else if (data.startsWith('cancel_setup_')) {
      await handleCancelSetup(callbackQuery, user);
    } else if (data.startsWith('upload_')) {
      await handleImageUpload(callbackQuery, user);
    } else if (data === 'buy_images') {
      await showPaymentPlans(chatId, user.id, callbackQuery.from.id);
    } else if (data === 'payment_history') {
      await showPaymentHistory(callbackQuery, user);
    } else if (data.startsWith('buy_plan_')) {
      await handlePaymentPlan(callbackQuery, user);
    } else if (data.startsWith('check_payment_')) {
      await handlePaymentStatusCheck(callbackQuery, user);
    }
    
  } catch (error) {
    console.error('Error handling callback query:', error.message);
    
    // Send error message to user
    try {
      await bot.sendMessage(chatId, 
        '❌ Произошла ошибка при обработке запроса. Попробуйте позже или используйте команды /start или /mystocks.'
      );
    } catch (sendError) {
      console.error('Failed to send error message:', sendError.message);
    }
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
    '123rf': '123RF'
    // 'shutterstock': 'Shutterstock',
    // 'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[session.service];
  
  try {
    // Initialize user to get userId
    const user = await initializeUser(msg.from);
    
    switch (session.step) {
      case 'username':
        // Handle editing mode
        if (session.action === 'edit_stock') {
          if (input.toLowerCase() === 'пропустить' || input.toLowerCase() === 'skip') {
            // Keep current username
            session.data.username = session.data.currentData.username;
          } else if (!input) {
            return bot.sendMessage(chatId, '❌ Логин не может быть пустым. Попробуйте еще раз или отправьте "пропустить":');
          } else {
            session.data.username = input;
          }
          
          session.step = 'password';
          await bot.sendMessage(chatId, 
            `✅ Логин: ${session.data.username}\n\n🔐 Введите новый пароль для ${serviceName} или отправьте "пропустить" чтобы оставить текущий:`
          );
        } else {
          // Handle setup mode
          if (!input) {
            return bot.sendMessage(chatId, '❌ Логин не может быть пустым. Попробуйте еще раз:');
          }
          
          // Check if user entered email instead of nickname for 123RF
          if (session.service === '123rf' && input.includes('@')) {
            return bot.sendMessage(chatId, 
              '⚠️ Вы ввели email адрес, но для 123RF нужен nickname (логин)\n\n' +
              '📝 Nickname - это ваше имя пользователя на сайте 123RF, которое вы видите в профиле.\n' +
              '❌ НЕ email адрес (user@example.com)\n' +
              '✅ Nickname (например: john_photographer)\n\n' +
              'Попробуйте еще раз:'
            );
          }
          
          session.data.username = input;
          session.step = 'password';
          
          const message = `✅ Логин сохранен: ${input}\n\n🔐 Теперь введите пароль для ${serviceName}:`;
          
          const keyboard = {
            inline_keyboard: [
              [{ text: "❌ Отмена", callback_data: `cancel_setup_${telegramUserId}` }]
            ]
          };
          
          await bot.sendMessage(chatId, message, {
            reply_markup: keyboard
          });
        }
        break;
        
      case 'password':
        // Handle editing mode
        if (session.action === 'edit_stock') {
          if (input.toLowerCase() === 'пропустить' || input.toLowerCase() === 'skip') {
            // Keep current password
            session.data.password = session.data.currentData.password || '';
          } else if (!input) {
            return bot.sendMessage(chatId, '❌ Пароль не может быть пустым. Попробуйте еще раз или отправьте "пропустить":');
          } else {
            session.data.password = input;
          }
        } else {
          // Handle setup mode
          if (!input) {
            return bot.sendMessage(chatId, '❌ Пароль не может быть пустым. Попробуйте еще раз:');
          }
          session.data.password = input;
        }
        
        // Different next steps based on service
        if (session.service === '123rf') {
          session.step = 'confirm';
          
          // Set default FTP settings for 123RF
          session.data.ftpHost = 'ftp.123rf.com';
          session.data.ftpPort = 21;
          session.data.remotePath = '/ai_image';
          
          // Show confirmation for 123RF with inline buttons
          const passwordLength = (session.data.password || '').length;
          const rf123ConfirmMessage = `📋 Проверьте настройки ${serviceName}:

👤 Логин: ${session.data.username}
🔐 Пароль: ${'*'.repeat(passwordLength)}
🌐 FTP хост: ${session.data.ftpHost} (автоматически)
🔌 FTP порт: ${session.data.ftpPort} (автоматически)
📁 Путь: ${session.data.remotePath} (автоматически)

Все верно?`;

          const confirmKeyboard = {
            inline_keyboard: [
              [
                { text: "✅ Сохранить", callback_data: `confirm_save_${telegramUserId}` },
                { text: "❌ Отмена", callback_data: `confirm_cancel_${telegramUserId}` }
              ],
              [
                { text: "✏️ Изменить", callback_data: `confirm_edit_${telegramUserId}` }
              ]
            ]
          };
          
          await bot.sendMessage(chatId, rf123ConfirmMessage, {
            reply_markup: confirmKeyboard
          });
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
        // This case should not be reached anymore as we use inline buttons
        // But keep it for backward compatibility
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
    '123rf': '123RF'
    // 'shutterstock': 'Shutterstock',
    // 'adobeStock': 'Adobe Stock'
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
        let successMessage;
        if (session.action === 'edit_stock') {
          successMessage = `✅ *Данные ${serviceName} успешно обновлены!*

🎉 Соединение протестировано и работает.
Новые настройки сохранены и готовы к использованию.`;
        } else {
          successMessage = `✅ *${serviceName} успешно настроен!*

🎉 Соединение протестировано и работает.
Теперь вы можете генерировать изображения и загружать их на ${serviceName}.

Отправьте текстовое описание изображения для начала работы!`;
        }
        
        await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      } else {
        // Analyze error type and provide specific guidance
        let errorMessage = `⚠️ *Не удалось подключиться к ${serviceName}*\n\n`;
        const errorText = testResult.error || testResult.message || 'Неизвестная ошибка';
        
        if (errorText.includes('Authentication failed') || 
            errorText.includes('Login incorrect') ||
            errorText.includes('530') ||
            errorText.includes('Login authentication failed')) {
          errorMessage += `🔐 **Проблема с данными входа:**\n`;
          if (session.service === '123rf') {
            errorMessage += `• Проверьте nickname (не email!)\n`;
            errorMessage += `• Убедитесь, что вводите именно nickname, а не email адрес\n`;
          } else {
            errorMessage += `• Проверьте логин\n`;
          }
          errorMessage += `• Проверьте пароль\n`;
          errorMessage += `• Убедитесь, что аккаунт активен на ${serviceName}\n\n`;
          errorMessage += `💡 **Подсказка:** Nickname - это ваше имя пользователя, которое отображается в профиле на сайте ${serviceName}.`;
        } else if (errorText.includes('Connection refused') || 
                   errorText.includes('timeout') ||
                   errorText.includes('ECONNREFUSED') ||
                   errorText.includes('ETIMEDOUT')) {
          errorMessage += `🌐 **Проблема с соединением:**\n`;
          errorMessage += `• Проверьте интернет-соединение\n`;
          errorMessage += `• Попробуйте позже\n`;
          errorMessage += `• Возможно, сервер ${serviceName} временно недоступен`;
        } else if (errorText.includes('Host not found') || 
                   errorText.includes('ENOTFOUND')) {
          errorMessage += `🌐 **Проблема с хостом:**\n`;
          errorMessage += `• Проверьте настройки FTP хоста\n`;
          errorMessage += `• Убедитесь в правильности адреса сервера`;
        } else {
          errorMessage += `❌ **Ошибка:** ${errorText}\n\n`;
          errorMessage += `🔧 **Рекомендации:**\n`;
          if (session.service === '123rf') {
            errorMessage += `• Убедитесь, что используете nickname, а не email\n`;
          }
          errorMessage += `• Проверьте правильность всех данных\n`;
          errorMessage += `• Попробуйте позже`;
        }
        
        let finalMessage;
        if (session.action === 'edit_stock') {
          finalMessage = `⚠️ *Данные ${serviceName} обновлены, но есть проблемы с соединением*\n\n${errorMessage}`;
        } else {
          finalMessage = `⚠️ *${serviceName} настроен, но есть проблемы с соединением*\n\n${errorMessage}`;
        }
        
        await bot.sendMessage(chatId, finalMessage, { parse_mode: 'Markdown' });
      }
    } catch (testError) {
      await bot.deleteMessage(chatId, savingMessage.message_id);
      
      let warningMessage;
      if (session.action === 'edit_stock') {
        warningMessage = `⚠️ *Данные ${serviceName} обновлены, но тест соединения не удался*

Настройки сохранены, но не удалось протестировать соединение.
Вы можете попробовать загрузить изображение для проверки.`;
      } else {
        warningMessage = `⚠️ *${serviceName} настроен, но тест соединения не удался*

Настройки сохранены, но не удалось протестировать соединение.
Вы можете попробовать загрузить изображение для проверки.`;
      }
      
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
    '123rf': '123RF'
    // 'shutterstock': 'Shutterstock',
    // 'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[service];
  
  // Store session data
  userSessions.set(telegramUserId, {
    action: 'setup_stock',
    service: service,
    step: 'username',
    data: {}
  });
  
  let message;
  if (service === '123rf') {
    message = `🔧 Настройка ${serviceName}

Для настройки потребуются данные от вашего аккаунта 123RF:

👤 Nickname (логин) - это ваше имя пользователя на 123RF
   ❌ НЕ email адрес (user@example.com)
   ✅ Nickname (например: john_photographer)

Введите ваш nickname:`;
  } else {
    message = `🔧 Настройка ${serviceName}

Для настройки ${serviceName} потребуются учетные данные.

👤 Введите ваш логин для ${serviceName}:`;
  }

  const keyboard = {
    inline_keyboard: [
      [{ text: "❌ Отмена", callback_data: `cancel_setup_${telegramUserId}` }]
    ]
  };
  
  await bot.sendMessage(chatId, message, { 
    reply_markup: keyboard
  });
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
      let successMessage;
      if (service === '123rf') {
        successMessage = `✅ *Изображение успешно загружено на 123RF!*

📋 **Следующие шаги:**

1️⃣ Перейдите на [страницу загрузки 123RF](https://www.123rf.com/contributor/upload-content?category=ai-images)

2️⃣ Нажмите "**Upload via FTP**", затем "**Proceed**"

3️⃣ Изображение появится в "**Manage content**" → вкладка "**Draft**"

4️⃣ Нажмите на изображение, заполните:
   • Описание (минимум 7 слов)
   • Теги (минимум 7 ключевых слов)
   • Категорию

5️⃣ Нажмите "**Submit for review**"

⏱️ Модерация обычно занимает 1-3 рабочих дня.

💡 **Совет:** Используйте релевантные английские ключевые слова для лучшей продаваемости!`;

        const keyboard = {
          inline_keyboard: [
            [{ text: "🌐 Открыть 123RF", url: "https://www.123rf.com/contributor/upload-content?category=ai-images" }],
            [{ text: "📊 Manage Content", url: "https://www.123rf.com/contributor/manage-content" }]
          ]
        };

        await bot.sendMessage(chatId, successMessage, { 
          parse_mode: 'Markdown',
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      } else {
        successMessage = `✅ *Изображение успешно загружено на ${service.toUpperCase()}!*\n\n`;
        await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      }
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
 * Show configure existing menu
 */
async function showConfigureExistingMenu(chatId, userId) {
  try {
    const stockServices = await backendApi.getStockServices(userId);
    
    const keyboard = {
      inline_keyboard: []
    };
    
    let message = `🔧 *Настройка существующих сервисов*\n\nВыберите сервис для редактирования:\n\n`;
    
    // Add edit buttons for active services
    if (stockServices.rf123?.enabled) {
      message += `✅ **123RF** - активен\n`;
      keyboard.inline_keyboard.push([{ text: "✏️ Редактировать 123RF", callback_data: "edit_rf123" }]);
    }
    
    // if (stockServices.shutterstock?.enabled) {
    //   message += `✅ **Shutterstock** - активен\n`;
    //   keyboard.inline_keyboard.push([{ text: "✏️ Редактировать Shutterstock", callback_data: "edit_shutterstock" }]);
    // }
    
    // if (stockServices.adobeStock?.enabled) {
    //   message += `✅ **Adobe Stock** - активен\n`;
    //   keyboard.inline_keyboard.push([{ text: "✏️ Редактировать Adobe Stock", callback_data: "edit_adobeStock" }]);
    // }
    
    if (keyboard.inline_keyboard.length === 0) {
      message = `❌ *Нет активных сервисов для редактирования*\n\nСначала добавьте стоковый сервис.`;
      keyboard.inline_keyboard.push([{ text: "🔗 Добавить сервис", callback_data: "manage_stocks" }]);
    }
    
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error showing configure existing menu:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки списка сервисов.');
  }
}

/**
 * Handle view stock details
 */
async function handleViewStock(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const service = callbackQuery.data.split('_')[1]; // view_rf123 -> rf123
  
  try {
    const stockServices = await backendApi.getStockServices(user.id);
    const serviceData = stockServices[service];
    
    if (!serviceData || !serviceData.enabled) {
      return bot.sendMessage(chatId, '❌ Сервис не найден или не активен.');
    }
    
    const serviceNames = {
      'rf123': '123RF',
      'shutterstock': 'Shutterstock',
      'adobeStock': 'Adobe Stock'
    };
    
    const serviceName = serviceNames[service];
    
    let message = `👁️ *Информация о ${serviceName}*\n\n`;
    message += `📊 **Статус:** ✅ Активен\n`;
    message += `👤 **Логин:** ${serviceData.credentials.username}\n`;
    message += `🔐 **Пароль:** ${'*'.repeat((serviceData.credentials.password || '').length)}\n`;
    
    if (service === '123rf') {
      message += `🌐 **FTP хост:** ${serviceData.credentials.ftpHost}\n`;
      message += `🔌 **FTP порт:** ${serviceData.credentials.ftpPort}\n`;
      message += `📁 **Путь:** ${serviceData.credentials.remotePath}\n`;
    } else if (service === 'shutterstock') {
      message += `🔑 **API ключ:** ${serviceData.credentials.apiKey.substring(0, 8)}...\n`;
    } else if (service === 'adobeStock') {
      message += `🔑 **API ключ:** ${serviceData.credentials.apiKey.substring(0, 8)}...\n`;
      message += `🔐 **API секрет:** ${serviceData.credentials.secret.substring(0, 8)}...\n`;
    }
    
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error viewing stock details:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки информации о сервисе.');
  }
}

/**
 * Handle delete stock service
 */
async function handleDeleteStock(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const service = callbackQuery.data.split('_')[1]; // delete_rf123 -> rf123
  
  const serviceNames = {
    'rf123': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[service];
  
  try {
    // Show confirmation dialog
    const keyboard = {
      inline_keyboard: [
        [
          { text: "✅ Да, удалить", callback_data: `confirm_delete_${service}` },
          { text: "❌ Отмена", callback_data: "cancel_delete" }
        ]
      ]
    };
    
    const message = `⚠️ *Подтверждение удаления*\n\nВы действительно хотите удалить настройки для ${serviceName}?\n\nЭто действие нельзя отменить.`;
    
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error handling delete stock:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка при удалении сервиса.');
  }
}

/**
 * Handle edit stock service
 */
async function handleEditStock(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  const service = callbackQuery.data.split('_')[1]; // edit_rf123 -> rf123
  
  const serviceNames = {
    'rf123': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  // Map internal service names to external API names for session
  const serviceApiMapping = {
    'rf123': '123rf',
    'shutterstock': 'shutterstock',
    'adobeStock': 'adobeStock'
  };
  
  const serviceName = serviceNames[service];
  const apiServiceName = serviceApiMapping[service];
  
  try {
    // Get current service data
    const stockServices = await backendApi.getStockServices(user.id);
    const serviceData = stockServices[service];
    
    if (!serviceData || !serviceData.enabled) {
      return bot.sendMessage(chatId, '❌ Сервис не найден или не активен.');
    }
    
    // Store session data for editing - use API service name for backend calls
    userSessions.set(telegramUserId, {
      action: 'edit_stock',
      service: apiServiceName, // Use API service name for backend calls
      step: 'username',
      data: {
        currentData: serviceData.credentials
      }
    });
    
    const message = `✏️ *Редактирование ${serviceName}*\n\nТекущий логин: ${serviceData.credentials.username}\n\nВведите новый логин или нажмите "Пропустить" чтобы оставить текущий:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "⏭️ Пропустить", callback_data: `skip_username_${telegramUserId}` }],
        [{ text: "❌ Отмена", callback_data: `cancel_setup_${telegramUserId}` }]
      ]
    };
    
    await bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error handling edit stock:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка при редактировании сервиса.');
  }
}

/**
 * Handle confirm delete stock service
 */
async function handleConfirmDelete(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const service = callbackQuery.data.split('_')[2]; // confirm_delete_rf123 -> rf123
  
  // Map internal service names to external API names
  const serviceApiMapping = {
    'rf123': '123rf',
    'shutterstock': 'shutterstock',
    'adobeStock': 'adobeStock'
  };
  
  const serviceNames = {
    'rf123': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[service];
  const apiServiceName = serviceApiMapping[service];
  
  try {
    const deletingMessage = await bot.sendMessage(chatId, 
      `🗑️ Удаляю настройки ${serviceName}...`
    );
    
    // Delete the stock service via backend API using correct service name
    await backendApi.deleteStockService(user.id, apiServiceName);
    
    await bot.deleteMessage(chatId, deletingMessage.message_id);
    
    const successMessage = `✅ *Настройки ${serviceName} успешно удалены*\n\nСервис отвязан от вашего аккаунта.`;
    
    await bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error deleting stock service:', error.message);
    await bot.sendMessage(chatId, `❌ Ошибка удаления ${serviceName}: ${error.message}`);
  }
}

/**
 * Handle confirm save button
 */
async function handleConfirmSave(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  
  // Get session data
  const session = userSessions.get(telegramUserId);
  if (!session) {
    return bot.sendMessage(chatId, '❌ Сессия истекла. Начните настройку заново.');
  }
  
  // Save settings to backend
  await saveStockServiceSettings(chatId, telegramUserId, user.id, session);
}

/**
 * Handle confirm cancel button
 */
async function handleConfirmCancel(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  
  // Clear session
  userSessions.delete(telegramUserId);
  
  // Return to /mystocks menu instead of just showing cancellation message
  try {
    const stockServices = await backendApi.getStockServices(user.id);
    
    let message = `📊 *Управление стоковыми сервисами*\n\n`;
    
    const keyboard = {
      inline_keyboard: []
    };
    
    // 123RF
    const rf123Status = stockServices.rf123?.enabled ? '✅ Активен' : '❌ Не настроен';
    message += `🔸 **123RF**: ${rf123Status}\n\n`;
    
    if (stockServices.rf123?.enabled) {
      // Если сервис привязан - показываем кнопки управления
      message += `Сервис 123RF настроен и готов к работе.`;
      keyboard.inline_keyboard.push([
        { text: "👁️ Посмотреть 123RF", callback_data: "view_rf123" }
      ]);
      keyboard.inline_keyboard.push([
        { text: "✏️ Изменить данные 123RF", callback_data: "edit_rf123" }
      ]);
      keyboard.inline_keyboard.push([
        { text: "🗑️ Удалить 123RF", callback_data: "delete_rf123" }
      ]);
    } else {
      // Если сервис не привязан - показываем только кнопку привязки
      message += `⚠️ *Сервис не настроен*\nДля генерации изображений необходимо привязать стоковый сервис 123RF.`;
      keyboard.inline_keyboard.push([
        { text: "🔗 Привязать 123RF", callback_data: "setup_123rf" }
      ]);
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error in handleConfirmCancel:', error.message);
    await bot.sendMessage(chatId, '❌ Настройка отменена.');
  }
}

/**
 * Handle confirm edit button
 */
async function handleConfirmEdit(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  
  // Get session data
  const session = userSessions.get(telegramUserId);
  if (!session) {
    return bot.sendMessage(chatId, '❌ Сессия истекла. Начните настройку заново.');
  }
  
  // Reset to username step for editing
  session.step = 'username';
  session.action = 'edit_stock'; // Set action to edit mode
  
  const serviceNames = {
    '123rf': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[session.service];
  
  // Get current data for editing context
  try {
    const stockServices = await backendApi.getStockServices(user.id);
    const serviceData = stockServices[session.service === '123rf' ? 'rf123' : session.service];
    
    if (serviceData && serviceData.credentials) {
      session.data.currentData = serviceData.credentials;
    }
    
    const message = `✏️ *Редактирование ${serviceName}*\n\nТекущий логин: ${serviceData?.credentials?.username || 'не указан'}\n\nВведите новый логин или нажмите "Пропустить" чтобы оставить текущий:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "⏭️ Пропустить", callback_data: `skip_username_${telegramUserId}` }],
        [{ text: "❌ Отмена", callback_data: `cancel_setup_${telegramUserId}` }]
      ]
    };
    
    await bot.sendMessage(chatId, message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error in handleConfirmEdit:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка при загрузке данных для редактирования.');
  }
}

/**
 * Handle skip username button
 */
async function handleSkipUsername(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  
  // Get session data
  const session = userSessions.get(telegramUserId);
  if (!session) {
    return bot.sendMessage(chatId, '❌ Сессия истекла. Начните настройку заново.');
  }
  
  // Keep current username
  session.data.username = session.data.currentData?.username || '';
  session.step = 'password';
  
  const serviceNames = {
    '123rf': '123RF',
    'shutterstock': 'Shutterstock',
    'adobeStock': 'Adobe Stock'
  };
  
  const serviceName = serviceNames[session.service];
  
  const message = `✅ Логин: ${session.data.username}\n\n🔐 Введите новый пароль для ${serviceName} или нажмите "Пропустить" чтобы оставить текущий:`;
  
  const keyboard = {
    inline_keyboard: [
      [{ text: "⏭️ Пропустить", callback_data: `skip_password_${telegramUserId}` }],
      [{ text: "❌ Отмена", callback_data: `cancel_setup_${telegramUserId}` }]
    ]
  };
  
  await bot.sendMessage(chatId, message, {
    reply_markup: keyboard
  });
}

/**
 * Handle skip password button
 */
async function handleSkipPassword(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  
  // Get session data
  const session = userSessions.get(telegramUserId);
  if (!session) {
    return bot.sendMessage(chatId, '❌ Сессия истекла. Начните настройку заново.');
  }
  
  // Keep current password
  session.data.password = session.data.currentData?.password || '';
  
  // Continue with confirmation step for 123RF
  if (session.service === '123rf') {
    session.step = 'confirm';
    
    // Set default FTP settings for 123RF
    session.data.ftpHost = 'ftp.123rf.com';
    session.data.ftpPort = 21;
    session.data.remotePath = '/ai_image';
    
    const serviceNames = {
      '123rf': '123RF',
      'shutterstock': 'Shutterstock',
      'adobeStock': 'Adobe Stock'
    };
    
    const serviceName = serviceNames[session.service];
    
    // Show confirmation for 123RF with inline buttons
    const passwordLength = (session.data.password || '').length;
    const rf123ConfirmMessage = `📋 Проверьте настройки ${serviceName}:

👤 Логин: ${session.data.username}
🔐 Пароль: ${'*'.repeat(passwordLength)}
🌐 FTP хост: ${session.data.ftpHost} (автоматически)
🔌 FTP порт: ${session.data.ftpPort} (автоматически)
📁 Путь: ${session.data.remotePath} (автоматически)

Все верно?`;

    const confirmKeyboard = {
      inline_keyboard: [
        [
          { text: "✅ Сохранить", callback_data: `confirm_save_${telegramUserId}` },
          { text: "❌ Отмена", callback_data: `confirm_cancel_${telegramUserId}` }
        ],
        [
          { text: "✏️ Изменить", callback_data: `confirm_edit_${telegramUserId}` }
        ]
      ]
    };
    
    await bot.sendMessage(chatId, rf123ConfirmMessage, {
      reply_markup: confirmKeyboard
    });
  }
}

/**
 * Handle cancel setup button
 */
async function handleCancelSetup(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const telegramUserId = callbackQuery.from.id;
  
  // Clear session
  userSessions.delete(telegramUserId);
  
  // Return to /mystocks menu instead of just showing cancellation message
  try {
    const stockServices = await backendApi.getStockServices(user.id);
    
    let message = `📊 *Управление стоковыми сервисами*\n\n`;
    
    const keyboard = {
      inline_keyboard: []
    };
    
    // 123RF
    const rf123Status = stockServices.rf123?.enabled ? '✅ Активен' : '❌ Не настроен';
    message += `🔸 **123RF**: ${rf123Status}\n\n`;
    
    if (stockServices.rf123?.enabled) {
      // Если сервис привязан - показываем кнопки управления
      message += `Сервис 123RF настроен и готов к работе.`;
      keyboard.inline_keyboard.push([
        { text: "👁️ Посмотреть 123RF", callback_data: "view_rf123" }
      ]);
      keyboard.inline_keyboard.push([
        { text: "✏️ Изменить данные 123RF", callback_data: "edit_rf123" }
      ]);
      keyboard.inline_keyboard.push([
        { text: "🗑️ Удалить 123RF", callback_data: "delete_rf123" }
      ]);
    } else {
      // Если сервис не привязан - показываем только кнопку привязки
      message += `⚠️ *Сервис не настроен*\nДля генерации изображений необходимо привязать стоковый сервис 123RF.`;
      keyboard.inline_keyboard.push([
        { text: "🔗 Привязать 123RF", callback_data: "setup_123rf" }
      ]);
    }

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } catch (error) {
    console.error('Error in handleCancelSetup:', error.message);
    await bot.sendMessage(chatId, '❌ Настройка отменена.');
  }
}

/**
 * Show payment plans
 */
async function showPaymentPlans(chatId, userId, telegramId) {
  try {
    const plans = await backendApi.getPaymentPlans();
    
    let message = `💳 *Тарифы на изображения*\n\n`;
    message += `Выберите подходящий тариф:\n\n`;
    
    const keyboard = {
      inline_keyboard: []
    };
    
    // Add plan buttons
    Object.entries(plans).forEach(([planKey, plan]) => {
      message += `📦 **${plan.name}** - ${plan.amount} руб.\n`;
      keyboard.inline_keyboard.push([
        { text: `💳 ${plan.name} - ${plan.amount} руб.`, callback_data: `buy_plan_${planKey}` }
      ]);
    });
    
    message += `\n💡 После оплаты изображения будут добавлены на ваш счет автоматически.`;
    
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error showing payment plans:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки тарифов.');
  }
}

/**
 * Handle payment plan selection
 */
async function handlePaymentPlan(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const telegramId = callbackQuery.from.id;
  
  // Parse callback data: buy_plan_planType
  const planType = data.split('_')[2];
  
  try {
    const plans = await backendApi.getPaymentPlans();
    const selectedPlan = plans[planType];
    
    if (!selectedPlan) {
      return bot.sendMessage(chatId, '❌ Выбранный тариф не найден.');
    }
    
    const processingMessage = await bot.sendMessage(chatId, 
      `💳 Создаю платеж для тарифа "${selectedPlan.name}"...`
    );
    
    // Create payment
    const payment = await backendApi.createPayment({
      userId: user.id,
      planType: planType,
      telegramId: telegramId.toString()
    });
    
    await bot.deleteMessage(chatId, processingMessage.message_id);
    
    const message = `💳 *Оплата тарифа "${selectedPlan.name}"*\n\n`;
    const paymentMessage = message + 
      `💰 **Сумма:** ${payment.amount} руб.\n` +
      `🖼️ **Изображений:** ${payment.imagesCount}\n` +
      `⏰ **Действует:** 24 часа\n\n` +
      `Нажмите кнопку ниже для перехода к оплате:`;
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "💳 Перейти к оплате", url: payment.paymentUrl }],
        [{ text: "📊 Проверить статус", callback_data: `check_payment_${payment.paymentId}` }]
      ]
    };
    
    await bot.sendMessage(chatId, paymentMessage, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error handling payment plan:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка создания платежа. Попробуйте позже.');
  }
}

/**
 * Handle payment status check
 */
async function handlePaymentStatusCheck(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  // Parse callback data: check_payment_paymentId
  const paymentId = data.split('_')[2];
  
  try {
    const payment = await backendApi.getPaymentStatus(paymentId);
    
    let message = `📊 *Статус платежа*\n\n`;
    message += `💰 **Сумма:** ${payment.amount} руб.\n`;
    message += `🖼️ **Изображений:** ${payment.imagesCount}\n`;
    
    if (payment.status === 'completed') {
      message += `✅ **Статус:** Оплачено\n\n`;
      message += `🎉 Изображения добавлены на ваш счет!`;
      
      // Update user's subscription info
      const subscription = await backendApi.getUserSubscription(user.id);
      message += `\n\n💰 **Текущий баланс:** ${subscription.imagesRemaining} изображений`;
      
    } else if (payment.status === 'pending') {
      message += `⏳ **Статус:** Ожидает оплаты\n\n`;
      message += `💡 Платеж еще не завершен. Проверьте статус через несколько минут.`;
      
    } else if (payment.status === 'failed') {
      message += `❌ **Статус:** Ошибка оплаты\n\n`;
      message += `💡 Попробуйте создать новый платеж.`;
      
    } else {
      message += `⏳ **Статус:** ${payment.status}\n\n`;
      message += `💡 Платеж обрабатывается.`;
    }
    
    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    
  } catch (error) {
    console.error('Error checking payment status:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка проверки статуса платежа.');
  }
}

/**
 * Show payment history
 */
async function showPaymentHistory(callbackQuery, user) {
  const chatId = callbackQuery.message.chat.id;
  
  try {
    const history = await backendApi.getPaymentHistory(user.id, { limit: 10 });
    
    let message = `📊 *История платежей*\n\n`;
    
    if (history.payments && history.payments.length > 0) {
      history.payments.forEach((payment, index) => {
        const date = new Date(payment.createdAt).toLocaleDateString('ru-RU');
        const statusEmoji = payment.status === 'completed' ? '✅' : 
                           payment.status === 'pending' ? '⏳' : '❌';
        
        message += `${index + 1}. ${statusEmoji} ${payment.amount} руб. - ${payment.imagesCount} изображений\n`;
        message += `   📅 ${date}\n\n`;
      });
      
      if (history.transactions && history.transactions.length > 0) {
        message += `📈 *Последние операции:*\n\n`;
        history.transactions.slice(0, 5).forEach((transaction, index) => {
          const date = new Date(transaction.createdAt).toLocaleDateString('ru-RU');
          const typeEmoji = transaction.type === 'credit' ? '➕' : '➖';
          
          message += `${typeEmoji} ${transaction.amount} - ${transaction.description}\n`;
          message += `   📅 ${date}\n\n`;
        });
      }
    } else {
      message += `📭 История платежей пуста.\n\n`;
      message += `💡 Приобретите тариф для начала работы с ботом.`;
    }
    
    const keyboard = {
      inline_keyboard: [
        [{ text: "💳 Купить изображения", callback_data: "buy_images" }]
      ]
    };
    
    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
    
  } catch (error) {
    console.error('Error showing payment history:', error.message);
    await bot.sendMessage(chatId, '❌ Ошибка загрузки истории платежей.');
  }
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
