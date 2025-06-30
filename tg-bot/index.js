require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { cleanupTempFiles } = require('./download-image');
const ImageService = require('./services/imageService');
const FtpService = require('./services/ftpService');

// Check if running in demo mode
const DEMO_MODE = process.env.DEMO_MODE === 'true';

if (DEMO_MODE) {
  console.log('Running in DEMO MODE - OpenAI API will not be used');
  console.log('Mock images will be provided instead of real AI-generated images');
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

// Initialize the image service
const imageService = new ImageService({
  apiKey: process.env.OPENAI_API_KEY,
  demoMode: process.env.DEMO_MODE === 'true'
});

// Initialize the FTP service
const ftpService = new FtpService({
  host: process.env.FTP_HOST,
  user: process.env.FTP_USER,
  password: process.env.FTP_PASSWORD,
  remoteDir: process.env.FTP_REMOTE_DIR || '/ai_image'
});

// Constants
const MAX_PROMPT_LENGTH = 1000;
const IMAGE_SIZE = '1024x1024';

// Start command handler
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'Welcome to the Image Generator Bot! Send me a text description, and I\'ll generate an image for you using DALL·E 3.'
  );
});

// Help command handler
bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    'How to use this bot:\n\n' +
    '1. Simply send me a text description of the image you want to create\n' +
    '2. Wait a few seconds while the image is being generated\n' +
    '3. Receive your generated image\n\n' +
    'Note: Prompts must be text only and less than 1000 characters.'
  );
});

// Main message handler
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  
  // Skip command messages (they're handled by specific handlers)
  if (msg.text && (msg.text.startsWith('/start') || msg.text.startsWith('/help'))) {
    return;
  }

  // Check if the message is text
  if (!msg.text) {
    bot.sendMessage(chatId, 'Only text prompts are supported. Please send a text description.');
    return;
  }

  // Validate prompt content
  const prompt = msg.text.trim();
  
  if (!prompt) {
    bot.sendMessage(chatId, 'Please provide a text description for image generation.');
    return;
  }

  if (prompt.length > MAX_PROMPT_LENGTH) {
    bot.sendMessage(
      chatId, 
      `Prompt is too long. Please limit your description to ${MAX_PROMPT_LENGTH} characters.`
    );
    return;
  }

  // Notify user that processing has started
  const processingMessage = await bot.sendMessage(chatId, 'Generating your image, please wait...');

  try {
    console.log('Generating image for prompt:', prompt);
    
    // Generate the image using the image service
    // This will download the image to a local file in all cases
    const result = await imageService.generateImage(prompt);
    
    // Send the image to the user
    let caption = '';
    if (result.usedSource === 'OpenAI') {
      caption = `Generated image based on your prompt using ${result.usedModel}`;
    } else if (result.usedSource === 'Demo Mode') {
      caption = 'Demo Mode: Using a stock image related to your prompt. (OpenAI API unavailable)';
    } else if (result.usedSource.includes('Content Policy')) {
      caption = 'Content Policy Restriction: Using a stock image instead. Your prompt may contain restricted content.';
    } else if (result.usedSource.includes('Content Restriction')) {
      caption = 'Content Restriction: Using a stock image instead. Your prompt may contain restricted content.';
    } else if (result.usedSource.includes('Fallback')) {
      caption = 'API Error: Using a stock image related to your prompt. The OpenAI service encountered an error.';
    } else {
      caption = 'Using a stock image related to your prompt. (OpenAI API unavailable)';
    }
    
    // Create inline keyboard with a button to place image on 123RF
    const options = {
      caption: caption, // Preserve the existing caption text
      reply_markup: {
        inline_keyboard: [
          [{ text: "Place this image on 123RF", callback_data: "place_on_123rf" }]
        ]
      }
    };

    // Store the image path in the cache for this user
    userImageCache.set(msg.from.id, result.imageUrl);
    console.log(`Stored image path in cache for user ${msg.from.id}: ${result.imageUrl}`);
    
    // Send the local image file
    console.log(`Sending local image file: ${result.imageUrl}`);
    await bot.sendPhoto(chatId, fs.createReadStream(result.imageUrl), options);
    
    // We no longer clean up the image immediately after sending
    // Instead, we'll keep it for potential upload to 123RF
    // The cleanupTempFiles function will handle old files

    // Delete the processing message
    bot.deleteMessage(chatId, processingMessage.message_id);
  } catch (error) {
    console.error('Error sending image:', error);
    
    let errorMessage = 'Failed to deliver the image. Please try again later.';
    
    bot.sendMessage(chatId, errorMessage);
    
    // Delete the processing message on error
    bot.deleteMessage(chatId, processingMessage.message_id).catch(() => {});
  }
});

// Log when bot is started
console.log('Telegram Bot is running...');

// Store image paths for callback queries
// This will store the image path when a user receives an image
// and then retrieve it when they click the "Place on 123RF" button
const userImageCache = new Map();

// Handle callback queries from inline keyboard buttons
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const userId = callbackQuery.from.id;
  
  // Handle different callback data
  if (callbackQuery.data === 'place_on_123rf') {
    // Acknowledge the button press
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: 'Processing your request to publish on 123RF...'
    });
    
    // Check if we have the image path for this user
    const imagePath = userImageCache.get(userId);
    
    if (!imagePath || !fs.existsSync(imagePath)) {
      // If we don't have the image path or the file doesn't exist anymore
      await bot.sendMessage(
        chatId,
        'Sorry, the image is no longer available. Please generate a new image and try again.'
      );
      return;
    }
    
    // Send a status message
    const statusMessage = await bot.sendMessage(
      chatId,
      'Uploading image to 123RF, please wait...'
    );
    
    try {
      // Upload the image to 123RF
      console.log(`Attempting to upload image ${imagePath} to 123RF for user ${userId}`);
      const uploadResult = await ftpService.uploadImage(imagePath);
      
      // Delete the status message
      await bot.deleteMessage(chatId, statusMessage.message_id);
      
      if (uploadResult.success) {
        // If upload was successful
        await bot.sendMessage(
          chatId,
          `✅ Your image has been successfully uploaded to 123RF!\n\nFollow the [link](https://www.123rf.com/contributor/upload-content?category=ai-images#uploadQueue) and click on "Upload via FTP" and then "Proceed" to accept the image!\n\nAfter that, you will be redirected to the "Manage content" page in the "Draft" tab. Wait for the image to be processed, click on it and click on the "AI auto-fill all" button to add a description and meta tags to the image. After that, click "Submit for review"`,
          { parse_mode: 'Markdown' }
        );
        
        // Make a copy of the image before it gets deleted
        // This is useful if the user wants to upload the same image again
        const tempDir = path.join(__dirname, 'temp');
        const originalFileName = path.basename(imagePath);
        const backupFileName = `${userId}_${Date.now()}_${originalFileName}`;
        const backupFilePath = path.join(tempDir, backupFileName);
        
        try {
          fs.copyFileSync(imagePath, backupFilePath);
          userImageCache.set(userId, backupFilePath);
          console.log(`Created backup of image at ${backupFilePath}`);
        } catch (copyErr) {
          console.error(`Error creating backup of image: ${copyErr.message}`);
          // If we can't create a backup, just keep the original path
        }
      } else {
        // If upload failed
        await bot.sendMessage(
          chatId,
          `❌ Failed to upload image to 123RF: ${uploadResult.message}\n\nPlease try again later or contact support.`
        );
      }
    } catch (error) {
      // Delete the status message
      await bot.deleteMessage(chatId, statusMessage.message_id).catch(() => {});
      
      // Handle unexpected errors
      console.error('Error uploading to 123RF:', error);
      await bot.sendMessage(
        chatId,
        '❌ An unexpected error occurred while uploading to 123RF. Please try again later.'
      );
    }
    
    // Log the action
    console.log(`User ${userId} requested to place image on 123RF`);
  }
});

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
