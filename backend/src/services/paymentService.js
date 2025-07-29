const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const WebhookLog = require('../models/WebhookLog');
const config = require('../config/config');
const logger = require('../utils/logger');

// Тарифные планы (загружаются из конфигурации)
const { paymentPlans: PAYMENT_PLANS } = config;

/**
 * Генерация уникального ID платежа
 * Формат: pay_telegramId_timestamp_random
 */
function generatePaymentId(telegramId) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `pay_${telegramId}_${timestamp}_${random}`;
}

/**
 * Генерация URL для оплаты YooMoney QuickPay
 */
function generateYooMoneyPaymentUrl(paymentId, planType, telegramId) {
  const plan = PAYMENT_PLANS[planType];
  if (!plan) {
    throw new Error(`Invalid plan type: ${planType}`);
  }

  const params = new URLSearchParams({
    receiver: config.yoomoney.wallet,
    'quickpay-form': 'donate',
    targets: `Оплата тарифа: ${plan.name}`,
    paymentType: 'AC',
    sum: plan.amount,
    label: paymentId,
    successURL: `${config.app.baseUrl}/api/payments/success?paymentId=${paymentId}`
  });

  return `${config.yoomoney.quickpayUrl}?${params.toString()}`;
}

/**
 * Проверка подписи webhook от YooMoney
 */
function verifyWebhookSignature(data) {
  const {
    notification_type, operation_id, amount, currency,
    datetime, sender, codepro, label, sha1_hash
  } = data;

  const hashString = `${notification_type}&${operation_id}&${amount}&${currency}&${datetime}&${sender}&${codepro}&${config.yoomoney.webhookSecret}&${label || ''}`;
  
  const calculatedHash = crypto
    .createHash('sha1')
    .update(hashString, 'utf8')
    .digest('hex');
  
  return sha1_hash === calculatedHash;
}

/**
 * Отмена активных платежей пользователя
 */
async function cancelActivePayments(telegramId, excludePaymentId = null) {
  try {
    const query = {
      telegramId,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    };

    // Исключить определенный платеж, если указан
    if (excludePaymentId) {
      query.paymentId = { $ne: excludePaymentId };
    }

    const activePayments = await Payment.find(query);
    
    if (activePayments.length > 0) {
      // Обновить статус всех активных платежей на 'cancelled'
      const result = await Payment.updateMany(query, {
        status: 'cancelled',
        cancelledAt: new Date()
      });

      logger.info('Active payments cancelled', {
        telegramId,
        cancelledCount: result.modifiedCount,
        excludePaymentId
      });

      return result.modifiedCount;
    }

    return 0;
  } catch (error) {
    logger.error('Error cancelling active payments', {
      error: error.message,
      telegramId,
      excludePaymentId
    });
    throw error;
  }
}

/**
 * Создание нового платежа
 */
async function createPayment(userId, planType, telegramId) {
  try {
    // Проверка валидности тарифа
    const plan = PAYMENT_PLANS[planType];
    if (!plan) {
      throw new Error(`Invalid plan type: ${planType}`);
    }

    // Поиск пользователя
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Проверка активных платежей для того же тарифа
    const activePay = await Payment.findOne({
      telegramId,
      planType,
      status: 'pending',
      expiresAt: { $gt: new Date() }
    });

    if (activePay) {
      logger.info('Active payment found for same plan', { 
        paymentId: activePay.paymentId, 
        telegramId, 
        planType 
      });
      return {
        success: true,
        payment: {
          paymentId: activePay.paymentId,
          paymentUrl: activePay.paymentUrl,
          amount: activePay.amount,
          imagesCount: activePay.imagesCount,
          expiresAt: activePay.expiresAt,
          planName: plan.name
        },
        message: 'Активный платеж для этого тарифа уже существует'
      };
    }

    // Отменить все другие активные платежи пользователя
    const cancelledCount = await cancelActivePayments(telegramId);
    if (cancelledCount > 0) {
      logger.info('Cancelled previous active payments', {
        telegramId,
        cancelledCount,
        newPlanType: planType
      });
    }

    // Генерация уникального ID платежа
    const paymentId = generatePaymentId(telegramId);

    // Создание записи платежа
    const payment = new Payment({
      userId: user._id,
      telegramId,
      paymentId,
      amount: plan.amount,
      currency: 'RUB',
      status: 'pending',
      label: paymentId,
      planType,
      imagesCount: plan.images,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000) // 1 час
    });

    // Генерация URL для оплаты
    const paymentUrl = generateYooMoneyPaymentUrl(paymentId, planType, telegramId);
    payment.paymentUrl = paymentUrl;

    await payment.save();

    logger.info('Payment created', {
      paymentId,
      telegramId,
      userId: user._id,
      planType,
      amount: plan.amount,
      cancelledPreviousPayments: cancelledCount
    });

    return {
      success: true,
      payment: {
        paymentId: payment.paymentId,
        paymentUrl: payment.paymentUrl,
        amount: payment.amount,
        imagesCount: payment.imagesCount,
        expiresAt: payment.expiresAt,
        planName: plan.name
      },
      message: 'Платеж создан успешно'
    };

  } catch (error) {
    logger.error('Error creating payment', {
      error: error.message,
      userId,
      planType,
      telegramId
    });
    throw error;
  }
}

/**
 * Обработка webhook от YooMoney
 */
async function processWebhook(webhookData) {
  let webhookLog;
  
  try {
    // Логирование webhook
    webhookLog = new WebhookLog({
      paymentId: webhookData.label,
      yoomoneyOperationId: webhookData.operation_id,
      webhookData,
      receivedAt: new Date()
    });
    await webhookLog.save();

    // Проверка подписи
    const isSignatureValid = verifyWebhookSignature(webhookData);
    
    await WebhookLog.findByIdAndUpdate(webhookLog._id, {
      signatureValid: isSignatureValid
    });

    if (!isSignatureValid) {
      logger.error('Invalid webhook signature', { webhookData });
      throw new Error('Invalid webhook signature');
    }

    // Поиск платежа
    const { label, operation_id, amount, currency } = webhookData;
    const payment = await Payment.findOne({ paymentId: label });

    if (!payment) {
      logger.error('Payment not found for webhook', { label, operation_id });
      throw new Error(`Payment not found for label: ${label}`);
    }

    // Проверка, что платеж еще не обработан
    if (payment.status === 'completed') {
      logger.info('Payment already processed', { paymentId: payment.paymentId });
      await WebhookLog.findByIdAndUpdate(webhookLog._id, {
        processed: true,
        processedAt: new Date()
      });
      return { success: true, message: 'Payment already processed' };
    }

    // Проверка суммы с допустимым диапазоном ±3% (учитывает комиссию YooMoney)
    const receivedAmount = parseFloat(amount);
    const expectedAmount = payment.amount;
    const tolerance = 0.03; // 3% tolerance for YooMoney fees
    
    const minAcceptableAmount = expectedAmount * (1 - tolerance); // 97%
    const maxAcceptableAmount = expectedAmount * (1 + tolerance); // 103%
    
    logger.info('Payment amount validation', {
      expected: expectedAmount,
      received: receivedAmount,
      difference: receivedAmount - expectedAmount,
      percentageDifference: ((receivedAmount - expectedAmount) / expectedAmount * 100).toFixed(2) + '%',
      minAcceptable: minAcceptableAmount,
      maxAcceptable: maxAcceptableAmount,
      withinRange: receivedAmount >= minAcceptableAmount && receivedAmount <= maxAcceptableAmount,
      paymentId: payment.paymentId
    });
    
    if (receivedAmount < minAcceptableAmount || receivedAmount > maxAcceptableAmount) {
      logger.error('Payment amount out of acceptable range', {
        expected: expectedAmount,
        received: receivedAmount,
        minAcceptable: minAcceptableAmount,
        maxAcceptable: maxAcceptableAmount,
        tolerance: `±${(tolerance * 100)}%`,
        paymentId: payment.paymentId
      });
      throw new Error(`Payment amount out of range: received ${receivedAmount}, expected ${expectedAmount} ±${(tolerance * 100)}%`);
    }

    // Обновление статуса платежа
    await Payment.findByIdAndUpdate(payment._id, {
      status: 'completed',
      yoomoneyOperationId: operation_id,
      completedAt: new Date(),
      yoomoneyData: webhookData
    });

    // Поиск пользователя и начисление изображений
    const user = await User.findById(payment.userId);
    if (!user) {
      throw new Error('User not found for payment');
    }

    // Добавление транзакции
    const transaction = {
      type: 'credit',
      amount: payment.imagesCount,
      description: `Пополнение: ${PAYMENT_PLANS[payment.planType].name}`,
      paymentId: payment._id,
      createdAt: new Date()
    };

    // Обновление пользователя
    await User.findByIdAndUpdate(user._id, {
      $set: {
        'subscription.plan': payment.planType,
        'subscription.isActive': true,
        'subscription.purchasedAt': new Date(),
        'subscription.lastPaymentId': payment.paymentId
      },
      $inc: {
        'subscription.imagesRemaining': payment.imagesCount
      },
      $push: {
        paymentHistory: payment._id,
        transactions: transaction
      }
    });

    // Отметка webhook как обработанный
    await WebhookLog.findByIdAndUpdate(webhookLog._id, {
      processed: true,
      processedAt: new Date()
    });

    logger.info('Payment processed successfully', {
      paymentId: payment.paymentId,
      userId: user._id,
      telegramId: payment.telegramId,
      amount: payment.amount,
      imagesAdded: payment.imagesCount
    });

    return {
      success: true,
      payment,
      user,
      message: 'Payment processed successfully'
    };

  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      webhookData
    });

    // Обновление лога с ошибкой
    if (webhookLog) {
      await WebhookLog.findByIdAndUpdate(webhookLog._id, {
        processed: false,
        errorMessage: error.message,
        processedAt: new Date()
      });
    }

    throw error;
  }
}

/**
 * Получение статуса платежа
 */
async function getPaymentStatus(paymentId) {
  try {
    const payment = await Payment.findOne({ paymentId }).populate('userId');
    
    if (!payment) {
      return { success: false, message: 'Payment not found' };
    }

    return {
      success: true,
      payment: {
        id: payment.paymentId,
        status: payment.status,
        amount: payment.amount,
        planType: payment.planType,
        imagesCount: payment.imagesCount,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        expiresAt: payment.expiresAt
      }
    };

  } catch (error) {
    logger.error('Error getting payment status', {
      error: error.message,
      paymentId
    });
    throw error;
  }
}

/**
 * Получение подписки пользователя
 */
async function getUserSubscription(userId) {
  try {
    const user = await User.findById(userId);
    
    if (!user) {
      throw new Error('User not found');
    }

    return {
      success: true,
      subscription: {
        plan: user.subscription.plan,
        isActive: user.subscription.isActive,
        imagesRemaining: user.subscription.imagesRemaining,
        purchasedAt: user.subscription.purchasedAt,
        lastPaymentId: user.subscription.lastPaymentId
      }
    };

  } catch (error) {
    logger.error('Error getting user subscription', {
      error: error.message,
      userId
    });
    throw error;
  }
}

/**
 * Очистка истекших платежей (для cron задач)
 */
async function cleanupExpiredPayments() {
  try {
    const result = await Payment.updateMany(
      {
        status: 'pending',
        expiresAt: { $lt: new Date() }
      },
      { status: 'expired' }
    );

    logger.info('Expired payments cleaned up', { count: result.modifiedCount });
    return result.modifiedCount;

  } catch (error) {
    logger.error('Error cleaning up expired payments', { error: error.message });
    throw error;
  }
}

/**
 * Проверка pending платежей (для cron задач)
 */
async function checkPendingPayments() {
  try {
    const pendingPayments = await Payment.find({
      status: 'pending',
      createdAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } // старше 10 минут
    });

    logger.info('Checking pending payments', { count: pendingPayments.length });

    // Здесь можно добавить логику проверки через YooMoney API
    // Пока просто логируем

    return pendingPayments.length;

  } catch (error) {
    logger.error('Error checking pending payments', { error: error.message });
    throw error;
  }
}

module.exports = {
  PAYMENT_PLANS,
  generatePaymentId,
  generateYooMoneyPaymentUrl,
  verifyWebhookSignature,
  cancelActivePayments,
  createPayment,
  processWebhook,
  getPaymentStatus,
  getUserSubscription,
  cleanupExpiredPayments,
  checkPendingPayments
};
