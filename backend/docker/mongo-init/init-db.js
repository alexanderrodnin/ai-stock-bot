// MongoDB initialization script
// This script runs when MongoDB container starts for the first time

// Switch to ai-stock-bot database
db = db.getSiblingDB('ai-stock-bot');

// Create application user with read/write permissions
db.createUser({
  user: 'ai-stock-bot',
  pwd: 'ai-stock-bot-password',
  roles: [
    {
      role: 'readWrite',
      db: 'ai-stock-bot'
    }
  ]
});

// Create collections with initial indexes
db.createCollection('users');
db.createCollection('images');
db.createCollection('uploads');

// Create indexes for better performance
db.users.createIndex({ "telegramId": 1 }, { unique: true });
db.users.createIndex({ "email": 1 }, { unique: true, sparse: true });
db.users.createIndex({ "createdAt": 1 });

db.images.createIndex({ "userId": 1 });
db.images.createIndex({ "imageId": 1 }, { unique: true });
db.images.createIndex({ "createdAt": 1 });
db.images.createIndex({ "status": 1 });

db.uploads.createIndex({ "imageId": 1 });
db.uploads.createIndex({ "userId": 1 });
db.uploads.createIndex({ "uploadId": 1 }, { unique: true });
db.uploads.createIndex({ "createdAt": 1 });
db.uploads.createIndex({ "status": 1 });

print('Database ai-stock-bot initialized successfully');
print('Created user: ai-stock-bot');
print('Created collections: users, images, uploads');
print('Created indexes for optimal performance');
