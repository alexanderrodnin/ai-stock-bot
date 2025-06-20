# Telegram Image Generator Bot

A Telegram bot that generates images based on text prompts using OpenAI's DALL·E 3 API.

## Features

- Accepts text prompts from users via Telegram messages
- Generates high-quality images using OpenAI's DALL·E 3 engine
- Delivers generated images back to users within Telegram
- Validates inputs and handles errors appropriately
- Fallback to DALL·E 2 if DALL·E 3 fails
- Demo mode with realistic mock images when API access is unavailable

## Prerequisites

- Node.js v18 or higher
- Telegram Bot Token (obtained from [@BotFather](https://t.me/BotFather))
- OpenAI API Key

## Installation

1. Clone this repository or download the source code.

2. Install the dependencies:
   ```bash
   cd tg-bot
   npm install
   ```

3. Create a `.env` file in the project directory and add your API credentials:
   ```
   TELEGRAM_TOKEN=your_telegram_token_here
   OPENAI_API_KEY=your_openai_api_key_here
   ```

## Usage

### Standard Mode
Start the bot with access to OpenAI API:
```bash
npm start
# or
node index.js
```

### Demo Mode
Start the bot in demo mode (uses mock images when API fails):
```bash
npm run demo
```

The bot will begin polling for messages. Users can interact with the bot by sending:
- `/start` - Displays welcome message
- `/help` - Shows usage instructions
- Any text prompt - The bot will generate an image based on the prompt

## Error Handling

The bot includes error handling for:
- Empty prompts
- Non-text inputs
- Prompts exceeding maximum length (1000 characters)
- OpenAI API failures
- Content policy violations
- API permission issues (with fallback to mock images)

## Project Structure

- `index.js` - Main bot application
- `.env` - Environment variables configuration (create from `.env.example`)
- `.env.example` - Template for environment variables
- `mock-image-urls.js` - Fallback images when OpenAI API is unavailable
- `test-openai.js` - Utility script to test OpenAI connectivity

## Security Notes

- API credentials are stored in environment variables
- Input validation is performed on all user inputs
- Error handling prevents sensitive information leakage

## Limitations

- Maximum prompt length: 1000 characters
- Expected latency: 5-30 seconds per request
- Rate limits from OpenAI API apply
- Content policy restrictions enforced by OpenAI

## Troubleshooting

If you encounter issues with OpenAI API access:

1. Verify your API key is valid and has proper permissions
2. Check that your OpenAI account has billing configured
3. Test API connectivity using the included test script:
   ```bash
   node test-openai.js
   ```
4. If API issues persist, the bot will automatically fall back to demo mode,
   which provides mock images related to the user's prompt

## License

ISC
