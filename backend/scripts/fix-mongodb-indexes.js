/**
 * Fix MongoDB Indexes Script
 * Removes old/invalid indexes and ensures correct schema indexes
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const logger = require('../src/utils/logger');

async function fixMongoDBIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Get the images collection
    const db = mongoose.connection.db;
    const imagesCollection = db.collection('images');

    // Get current indexes
    console.log('\n=== Current Indexes ===');
    const currentIndexes = await imagesCollection.indexes();
    currentIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });

    // Check for problematic imageId index
    const imageIdIndex = currentIndexes.find(index => 
      index.name === 'imageId_1' || 
      (index.key && index.key.imageId)
    );

    if (imageIdIndex) {
      console.log('\n=== Removing problematic imageId index ===');
      console.log('Found imageId index:', imageIdIndex.name);
      
      try {
        await imagesCollection.dropIndex(imageIdIndex.name);
        console.log(`✅ Successfully dropped index: ${imageIdIndex.name}`);
      } catch (error) {
        console.log(`❌ Failed to drop index ${imageIdIndex.name}:`, error.message);
      }
    } else {
      console.log('\n✅ No problematic imageId index found');
    }

    // Check for other potentially problematic indexes
    const problematicIndexes = currentIndexes.filter(index => {
      // Skip the default _id index
      if (index.name === '_id_') return false;
      
      // Check if index key contains fields that don't exist in current schema
      const indexKeys = Object.keys(index.key);
      const problematicFields = ['imageId', 'externalImageId'];
      
      return indexKeys.some(key => problematicFields.includes(key));
    });

    if (problematicIndexes.length > 0) {
      console.log('\n=== Removing other problematic indexes ===');
      for (const index of problematicIndexes) {
        try {
          await imagesCollection.dropIndex(index.name);
          console.log(`✅ Successfully dropped index: ${index.name}`);
        } catch (error) {
          console.log(`❌ Failed to drop index ${index.name}:`, error.message);
        }
      }
    }

    // Recreate proper indexes based on current schema
    console.log('\n=== Recreating proper indexes ===');
    
    const properIndexes = [
      { key: { userId: 1, createdAt: -1 }, name: 'userId_1_createdAt_-1' },
      { key: { userExternalId: 1, userExternalSystem: 1, createdAt: -1 }, name: 'userExternal_compound' },
      { key: { status: 1, createdAt: -1 }, name: 'status_1_createdAt_-1' },
      { key: { 'uploads.service': 1, 'uploads.status': 1 }, name: 'uploads_service_status' },
      { key: { 'metadata.keywords': 1 }, name: 'metadata_keywords_1' },
      { key: { 'metadata.category': 1 }, name: 'metadata_category_1' },
      { key: { 'flags.isPublic': 1, 'flags.moderationResult': 1 }, name: 'flags_public_moderation' },
      { key: { 'file.hash': 1 }, name: 'file_hash_1', sparse: true }
    ];

    for (const indexSpec of properIndexes) {
      try {
        const options = { name: indexSpec.name };
        if (indexSpec.sparse) options.sparse = true;
        
        await imagesCollection.createIndex(indexSpec.key, options);
        console.log(`✅ Created index: ${indexSpec.name}`);
      } catch (error) {
        if (error.code === 85) {
          console.log(`ℹ️  Index ${indexSpec.name} already exists`);
        } else {
          console.log(`❌ Failed to create index ${indexSpec.name}:`, error.message);
        }
      }
    }

    // Create text index for search
    try {
      await imagesCollection.createIndex(
        { 
          'generation.prompt': 'text', 
          'metadata.title': 'text', 
          'metadata.description': 'text' 
        },
        { name: 'text_search_index' }
      );
      console.log('✅ Created text search index');
    } catch (error) {
      if (error.code === 85) {
        console.log('ℹ️  Text search index already exists');
      } else {
        console.log('❌ Failed to create text search index:', error.message);
      }
    }

    // Show final indexes
    console.log('\n=== Final Indexes ===');
    const finalIndexes = await imagesCollection.indexes();
    finalIndexes.forEach((index, i) => {
      console.log(`${i + 1}. ${index.name}:`, JSON.stringify(index.key));
    });

    console.log('\n✅ MongoDB indexes fixed successfully!');

  } catch (error) {
    console.error('❌ Error fixing MongoDB indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixMongoDBIndexes()
    .then(() => {
      console.log('\n🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMongoDBIndexes };
