require('dotenv').config();
const fs = require('fs');
const path = require('path');
const ImageService = require('./services/imageService');

// Test prompt for generating an image
const PROMPT = 'Снег в Новосибирске летом';

async function testImageGeneration() {
  console.log('=== Image Generation Test ===');
  console.log(`Prompt: "${PROMPT}"`);
  console.log('==========================');
  
  // Create the image service with options
  const options = {
    apiKey: process.env.OPENAI_API_KEY,
    demoMode: process.env.DEMO_MODE === 'true'
  };
  
  console.log(`Demo mode: ${options.demoMode ? 'ON' : 'OFF'}`);
  console.log(`API Key type: ${typeof options.apiKey}`);
  console.log(`API Key length: ${options.apiKey ? options.apiKey.length : 0}`);
  
  if (options.apiKey) {
    console.log(`API Key first 10 chars: ${options.apiKey.substring(0, 10)}...`);
  }
  
  const imageService = new ImageService(options);
  
  try {
    console.log('\nGenerating image...');
    
    // Generate the image
    const result = await imageService.generateImage(PROMPT);
    
    console.log('\nImage generation successful!');
    console.log('Result:', JSON.stringify({
      usedSource: result.usedSource,
      usedModel: result.usedModel,
      isLocalFile: result.isLocalFile
    }, null, 2));
    
    // Display the image URL or path
    if (result.isLocalFile) {
      console.log(`Local image file: ${result.imageUrl}`);
      
      // Get file size if it's a local file
      const stats = fs.statSync(result.imageUrl);
      console.log(`File size: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // Don't cleanup the file so we can examine it
      console.log('Note: Local file will be kept for inspection');
    } else {
      console.log(`Remote image URL: ${result.imageUrl}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error generating image:');
    console.error(error);
    return null;
  }
}

// Execute the test
testImageGeneration()
  .then(result => {
    console.log('\nTest completed');
    if (result) {
      console.log('✅ SUCCESS');
    } else {
      console.log('❌ FAILED');
    }
  })
  .catch(err => {
    console.error('Unhandled error during test:');
    console.error(err);
    console.log('❌ FAILED');
  });
