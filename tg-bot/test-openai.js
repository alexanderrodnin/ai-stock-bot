require('dotenv').config();
const { OpenAI } = require('openai');

// Check if OpenAI API key is available
if (!process.env.OPENAI_API_KEY) {
  console.error('Error: Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Test prompt
const testPrompt = 'A beautiful sunset over the ocean';

async function testImageGeneration() {
  console.log('Testing OpenAI image generation with prompt:', testPrompt);
  console.log('Using API key:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
  
  try {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: testPrompt,
      n: 1, 
      size: '1024x1024',
      quality: 'standard',
    });
    
    console.log('Success! Response:', JSON.stringify(response, null, 2));
    console.log('Image URL:', response.data[0].url);
  } catch (error) {
    console.error('Error occurred:');
    console.error('Status:', error.status);
    console.error('Type:', error.type);
    console.error('Message:', error.message);
    console.error('Full error details:', JSON.stringify(error, null, 2));
  }
}

// Run the test
testImageGeneration();
