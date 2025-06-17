require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const { cleanupTempFiles } = require('./download-image');
const ImageService = require('./services/imageService');

// Check if running in demo mode
const DEMO_MODE = process.env.DEMO_MODE === 'true';

if (DEMO_MODE) {
  console.log('Running in DEMO MODE - OpenAI API will not be used');
  console.log('Mock images will be provided instead of real AI-generated images');
}

// Clean up temporary files every hour
setInterval(() => {
  console.log('Cleaning up temporary image files...');
  cleanupTempFiles();
}, 3600000); // 1 hour

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
    
    // Different approach based on whether it's a URL or local file
    if (!result.isLocalFile) {
      // For OpenAI generated images, use the URL
      await bot.sendPhoto(chatId, result.imageUrl, { caption });
    } else {
      // For local files, use fs.createReadStream
      console.log(`Sending local image file: ${result.imageUrl}`);
      await bot.sendPhoto(chatId, fs.createReadStream(result.imageUrl), { caption });
      
      // Clean up the local file after sending
      imageService.cleanupLocalImage(result.imageUrl);
    }

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
