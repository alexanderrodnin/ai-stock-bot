const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  telegramId: {
    type: Number,
    required: true,
    index: true
  },
  paymentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  yoomoneyOperationId: {
    type: String,
    default: null
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    required: true,
    default: 'RUB'
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'completed', 'failed', 'expired', 'cancelled'],
    default: 'pending',
    index: true
  },
  label: {
    type: String,
    required: true
  },
  paymentUrl: {
    type: String,
    default: null
  },
  planType: {
    type: String,
    required: true,
    enum: ['plan_10', 'plan_100', 'plan_1000', 'plan_10000']
  },
  imagesCount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  cancelledAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  yoomoneyData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  attempts: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
paymentSchema.index({ telegramId: 1, status: 1 });
paymentSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
