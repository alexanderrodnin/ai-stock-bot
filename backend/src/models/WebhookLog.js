const mongoose = require('mongoose');

const webhookLogSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    required: true,
    index: true
  },
  yoomoneyOperationId: {
    type: String,
    default: null
  },
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  signatureValid: {
    type: Boolean,
    required: true,
    default: false
  },
  processed: {
    type: Boolean,
    required: true,
    default: false
  },
  receivedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  processedAt: {
    type: Date,
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Индексы для оптимизации запросов
webhookLogSchema.index({ receivedAt: 1 });
webhookLogSchema.index({ paymentId: 1 });
webhookLogSchema.index({ processed: 1 });

module.exports = mongoose.model('WebhookLog', webhookLogSchema);
