/**
 * Test script for stock service validation
 * Tests the new logic for checking stock services before image generation
 */

const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_API_URL || 'http://localhost:3000/api';

async function testStockValidation() {
  console.log('🧪 Testing stock service validation...\n');

  try {
    // Test 1: Create a test user without stock services
    console.log('1️⃣ Creating test user without stock services...');
    const userData = {
      externalId: 'test_user_' + Date.now(),
      externalSystem: 'telegram',
      profile: {
        username: 'test_user',
        firstName: 'Test',
        lastName: 'User'
      }
    };

    const userResponse = await axios.post(`${BACKEND_URL}/users`, userData);
    const user = userResponse.data.data;
    console.log(`✅ User created: ${user.id}`);

    // Test 2: Try to generate image without stock services (should fail)
    console.log('\n2️⃣ Attempting to generate image without stock services...');
    try {
      const imageResponse = await axios.post(`${BACKEND_URL}/images/generate`, {
        userId: user.id,
        userExternalId: user.externalId,
        prompt: 'A beautiful sunset over mountains',
        options: {
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        }
      });
      console.log('❌ ERROR: Image generation should have failed but succeeded!');
    } catch (error) {
      if (error.response?.data?.error?.code === 'NO_ACTIVE_STOCK_SERVICES') {
        console.log('✅ Correctly blocked image generation - no active stock services');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }

    // Test 3: Add a stock service
    console.log('\n3️⃣ Adding 123RF stock service...');
    const stockSettings = {
      enabled: true,
      credentials: {
        username: 'test_user',
        password: 'test_password',
        ftpHost: 'ftp.123rf.com',
        ftpPort: 21,
        remotePath: '/uploads'
      },
      settings: {
        autoUpload: false,
        defaultKeywords: ['test', 'ai'],
        defaultDescription: 'Test image'
      }
    };

    await axios.put(`${BACKEND_URL}/users/${user.id}/stock-services/123rf`, stockSettings);
    console.log('✅ 123RF stock service added');

    // Test 4: Check if user has active stock services
    console.log('\n4️⃣ Checking if user has active stock services...');
    const stockResponse = await axios.get(`${BACKEND_URL}/users/${user.id}/stock-services`);
    const stockServices = stockResponse.data.data.stockServices;
    const hasActiveStocks = Object.values(stockServices).some(service => service.enabled === true);
    
    if (hasActiveStocks) {
      console.log('✅ User now has active stock services');
    } else {
      console.log('❌ User still has no active stock services');
    }

    // Test 5: Try to generate image with stock services (should succeed)
    console.log('\n5️⃣ Attempting to generate image with stock services...');
    try {
      // Note: This will still fail because we don't have OpenAI API configured in test
      // But it should pass the stock validation check
      const imageResponse = await axios.post(`${BACKEND_URL}/images/generate`, {
        userId: user.id,
        userExternalId: user.externalId,
        prompt: 'A beautiful sunset over mountains',
        options: {
          model: 'dall-e-3',
          size: '1024x1024',
          quality: 'standard',
          style: 'vivid'
        }
      });
      console.log('✅ Image generation request passed stock validation');
    } catch (error) {
      if (error.response?.data?.error?.code === 'NO_ACTIVE_STOCK_SERVICES') {
        console.log('❌ Stock validation still failing');
      } else {
        console.log('✅ Stock validation passed (failed at image generation step, which is expected)');
        console.log(`   Error: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    console.log('\n🎉 Stock validation tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
if (require.main === module) {
  testStockValidation();
}

module.exports = { testStockValidation };
