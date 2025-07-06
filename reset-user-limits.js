/**
 * Reset user daily limits for testing
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: './backend/.env' });

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-stock-bot';

async function resetUserLimits() {
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Update all users to reset their daily usage
    const result = await mongoose.connection.db.collection('users').updateMany(
      {},
      {
        $set: {
          'subscription.usage.imagesToday': 0,
          'subscription.usage.resetDate': new Date(),
          'subscription.limits.imagesPerDay': 1000,
          'subscription.limits.imagesPerMonth': 10000
        }
      }
    );

    console.log(`Updated ${result.modifiedCount} users`);
    
    // Show updated user info
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    users.forEach(user => {
      console.log(`User ${user.externalId}: imagesToday=${user.subscription?.usage?.imagesToday || 0}, limit=${user.subscription?.limits?.imagesPerDay || 10}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetUserLimits();
