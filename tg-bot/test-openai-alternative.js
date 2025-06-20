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
  console.log('API Key type:', typeof process.env.OPENAI_API_KEY);
  console.log('API Key length:', process.env.OPENAI_API_KEY.length);
  console.log('API Key first 10 chars:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
  
  // Try with DALL-E 2 instead
  try {
    console.log('\nAttempting with DALL-E 2 model...');
    const response = await openai.images.generate({
      model: 'dall-e-2', // Try DALL-E 2 instead
      prompt: testPrompt,
      n: 1, 
      size: '1024x1024',
    });
    
    console.log('Success! Response:', JSON.stringify(response, null, 2));
    if (response.data && response.data[0] && response.data[0].url) {
      console.log('Image URL:', response.data[0].url);
    } else {
      console.log('Response has unexpected structure:', response);
    }
  } catch (error) {
    console.error('DALL-E 2 Error:');
    console.error('Status:', error.status);
    console.error('Type:', error.type);
    console.error('Message:', error.message);
  }

  // Try without specifying model (use default)
  try {
    console.log('\nAttempting without specifying model...');
    const response = await openai.images.generate({
      prompt: testPrompt,
      n: 1, 
      size: '1024x1024',
    });
    
    console.log('Success! Response:', JSON.stringify(response, null, 2));
    if (response.data && response.data[0] && response.data[0].url) {
      console.log('Image URL:', response.data[0].url);
    } else {
      console.log('Response has unexpected structure:', response);
    }
  } catch (error) {
    console.error('Default model Error:');
    console.error('Status:', error.status);
    console.error('Type:', error.type);
    console.error('Message:', error.message);
  }
  
  // Check available models
  try {
    console.log('\nChecking available models...');
    const models = await openai.models.list();
    console.log('Available models:');
    const imageModels = models.data.filter(model => 
      model.id.includes('dall-e') || model.id.includes('image')
    );
    console.log(imageModels.map(m => m.id));
  } catch (error) {
    console.error('Error listing models:', error.message);
  }
}

// Run the test
testImageGeneration();
