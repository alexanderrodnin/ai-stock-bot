/**
 * AI Models Test Script
 * Tests all available AI models for image generation
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const config = require('../src/config/config');
const imageService = require('../src/services/imageService');
const configService = require('../src/services/configService');
const logger = require('../src/utils/logger');

// Test configuration
const TEST_CONFIG = {
  prompt: 'A beautiful sunset over mountains with vibrant colors',
  userId: null, // Will be set after creating test user
  userExternalId: 'test-user-ai-models',
  userExternalSystem: 'test',
  models: [
    'dall-e-3',
    'juggernaut-pro-flux',
    'seedream-v3',
    'hidream-i1-fast'
  ]
};

/**
 * Create a test user for image generation
 */
async function createTestUser() {
  const User = require('../src/models/User');
  
  try {
    // Remove existing test user
    await User.deleteOne({ externalId: TEST_CONFIG.userExternalId });
    
    // Create new test user
    const testUser = new User({
      externalId: TEST_CONFIG.userExternalId,
      externalSystem: TEST_CONFIG.userExternalSystem,
      profile: {
        firstName: 'Test',
        lastName: 'User',
        username: 'test-ai-models'
      },
      subscription: {
        plan: 'premium',
        status: 'active',
        limits: {
          imagesPerDay: 100,
          uploadsPerDay: 50
        },
        usage: {
          imagesToday: 0,
          uploadsToday: 0
        }
      }
    });
    
    await testUser.save();
    logger.info('Test user created', { userId: testUser._id });
    
    return testUser._id.toString();
  } catch (error) {
    logger.error('Failed to create test user', { error: error.message });
    throw error;
  }
}

/**
 * Test a specific AI model
 */
async function testModel(modelName, userId) {
  logger.info(`Testing AI model: ${modelName}`);
  
  try {
    // Switch to the model
    await configService.switchAIModel(modelName, 'test-script', `Testing ${modelName}`);
    
    // Wait a moment for configuration to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Generate image
    const startTime = Date.now();
    const result = await imageService.generateImage({
      prompt: TEST_CONFIG.prompt,
      userId,
      userExternalId: TEST_CONFIG.userExternalId,
      userExternalSystem: TEST_CONFIG.userExternalSystem,
      demoMode: false
    });
    const endTime = Date.now();
    
    const generationTime = endTime - startTime;
    
    logger.info(`✅ ${modelName} test successful`, {
      model: modelName,
      imageId: result.id,
      generationTime: `${generationTime}ms`,
      fileSize: result.metadata?.fileSize || 'unknown',
      provider: result.provider
    });
    
    return {
      model: modelName,
      success: true,
      imageId: result.id,
      generationTime,
      provider: result.provider,
      url: result.url
    };
    
  } catch (error) {
    logger.error(`❌ ${modelName} test failed`, {
      model: modelName,
      error: error.message,
      status: error.status
    });
    
    return {
      model: modelName,
      success: false,
      error: error.message,
      status: error.status
    };
  }
}

/**
 * Run all AI model tests
 */
async function runAllTests() {
  logger.info('Starting AI Models Test Suite');
  
  try {
    // Connect to database
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');
    
    // Initialize configuration service
    await configService.initializeDefaultAIConfig();
    logger.info('Configuration service initialized');
    
    // Create test user
    const userId = await createTestUser();
    TEST_CONFIG.userId = userId;
    
    // Test results
    const results = [];
    
    // Test each model
    for (const modelName of TEST_CONFIG.models) {
      const result = await testModel(modelName, userId);
      results.push(result);
      
      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('AI MODELS TEST SUMMARY');
    console.log('='.repeat(60));
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`Total Models Tested: ${results.length}`);
    console.log(`Successful: ${successful.length}`);
    console.log(`Failed: ${failed.length}`);
    console.log('');
    
    // Successful tests
    if (successful.length > 0) {
      console.log('✅ SUCCESSFUL TESTS:');
      successful.forEach(result => {
        console.log(`  • ${result.model} (${result.provider}) - ${result.generationTime}ms`);
      });
      console.log('');
    }
    
    // Failed tests
    if (failed.length > 0) {
      console.log('❌ FAILED TESTS:');
      failed.forEach(result => {
        console.log(`  • ${result.model} - ${result.error}`);
      });
      console.log('');
    }
    
    // Recommendations
    console.log('📋 RECOMMENDATIONS:');
    if (failed.length === 0) {
      console.log('  • All models are working correctly!');
    } else {
      console.log('  • Check API keys for failed models');
      console.log('  • Verify network connectivity');
      console.log('  • Check rate limits and quotas');
    }
    
    console.log('='.repeat(60));
    
    // Switch back to default model
    await configService.switchAIModel('dall-e-3', 'test-script', 'Switching back to default after tests');
    
    return results;
    
  } catch (error) {
    logger.error('Test suite failed', { error: error.message });
    throw error;
  } finally {
    // Cleanup
    try {
      if (TEST_CONFIG.userId) {
        const User = require('../src/models/User');
        await User.deleteOne({ _id: TEST_CONFIG.userId });
        logger.info('Test user cleaned up');
      }
    } catch (cleanupError) {
      logger.warn('Failed to cleanup test user', { error: cleanupError.message });
    }
    
    // Close database connection
    await mongoose.connection.close();
    logger.info('Database connection closed');
  }
}

/**
 * Test specific model only
 */
async function testSpecificModel(modelName) {
  if (!TEST_CONFIG.models.includes(modelName)) {
    console.error(`❌ Unknown model: ${modelName}`);
    console.log(`Available models: ${TEST_CONFIG.models.join(', ')}`);
    process.exit(1);
  }
  
  logger.info(`Testing specific AI model: ${modelName}`);
  
  try {
    // Connect to database
    await mongoose.connect(config.mongodb.uri, config.mongodb.options);
    logger.info('Connected to MongoDB');
    
    // Initialize configuration service
    await configService.initializeDefaultAIConfig();
    
    // Create test user
    const userId = await createTestUser();
    
    // Test the specific model
    const result = await testModel(modelName, userId);
    
    // Print result
    console.log('\n' + '='.repeat(40));
    console.log(`${modelName.toUpperCase()} TEST RESULT`);
    console.log('='.repeat(40));
    
    if (result.success) {
      console.log(`✅ SUCCESS`);
      console.log(`Provider: ${result.provider}`);
      console.log(`Generation Time: ${result.generationTime}ms`);
      console.log(`Image ID: ${result.imageId}`);
      console.log(`URL: ${result.url}`);
    } else {
      console.log(`❌ FAILED`);
      console.log(`Error: ${result.error}`);
      if (result.status) {
        console.log(`Status: ${result.status}`);
      }
    }
    
    console.log('='.repeat(40));
    
    return result;
    
  } catch (error) {
    logger.error('Specific model test failed', { error: error.message });
    throw error;
  } finally {
    // Cleanup
    try {
      if (TEST_CONFIG.userId) {
        const User = require('../src/models/User');
        await User.deleteOne({ _id: TEST_CONFIG.userId });
      }
    } catch (cleanupError) {
      logger.warn('Failed to cleanup test user', { error: cleanupError.message });
    }
    
    await mongoose.connection.close();
  }
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Run all tests
    runAllTests()
      .then(() => {
        console.log('\n🎉 Test suite completed successfully!');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n💥 Test suite failed:', error.message);
        process.exit(1);
      });
  } else if (args.length === 1) {
    // Test specific model
    const modelName = args[0];
    testSpecificModel(modelName)
      .then(() => {
        console.log('\n🎉 Model test completed!');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n💥 Model test failed:', error.message);
        process.exit(1);
      });
  } else {
    console.error('Usage:');
    console.error('  node ai-models-test.js                    # Test all models');
    console.error('  node ai-models-test.js <model-name>       # Test specific model');
    console.error('');
    console.error('Available models:', TEST_CONFIG.models.join(', '));
    process.exit(1);
  }
}

module.exports = {
  runAllTests,
  testSpecificModel,
  testModel
};
