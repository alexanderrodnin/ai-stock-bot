/**
 * Payment Controller
 * Handles payment creation, webhook processing, and payment status
 */

const paymentService = require('../services/paymentService');
const User = require('../models/User');
const Payment = require('../models/Payment');
const logger = require('../utils/logger');

/**
 * Create a new payment
 * POST /api/payments/create
 */
const createPayment = async (req, res) => {
  try {
    const { userId, planType, telegramId } = req.body;

    // Validation
    if (!userId || !planType || !telegramId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, planType, telegramId'
      });
    }

    // Validate plan type
    if (!paymentService.PAYMENT_PLANS[planType]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid plan type'
      });
    }

    // Create payment
    const result = await paymentService.createPayment(userId, planType, telegramId);

    res.status(201).json({
      success: true,
      data: {
        paymentId: result.payment.paymentId,
        paymentUrl: result.payment.paymentUrl,
        amount: result.payment.amount,
        planType: result.payment.planType,
        imagesCount: result.payment.imagesCount,
        expiresAt: result.payment.expiresAt
      },
      message: result.message
    });

  } catch (error) {
    logger.error('Error creating payment', {
      error: error.message,
      body: req.body
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create payment',
      message: error.message
    });
  }
};

/**
 * Handle YooMoney webhook
 * POST /api/payments/webhook
 */
const handleWebhook = async (req, res) => {
  try {
    logger.info('Webhook received', { body: req.body });

    // Process webhook
    const result = await paymentService.processWebhook(req.body);

    // Send notification to Telegram if payment was processed successfully
    if (result.success && result.payment && result.user) {
      // Here we would send a notification to the Telegram bot
      // For now, just log it
      logger.info('Payment completed - should notify user', {
        telegramId: result.payment.telegramId,
        paymentId: result.payment.paymentId,
        amount: result.payment.amount,
        imagesAdded: result.payment.imagesCount
      });
    }

    res.status(200).json({
      success: true,
      message: result.message
    });

  } catch (error) {
    logger.error('Error processing webhook', {
      error: error.message,
      body: req.body
    });

    res.status(400).json({
      success: false,
      error: 'Failed to process webhook',
      message: error.message
    });
  }
};

/**
 * Get payment status
 * GET /api/payments/status/:paymentId
 */
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const result = await paymentService.getPaymentStatus(paymentId);
    
    if (!result.success) {
      return res.status(404).json({ error: result.message });
    }
    
    res.json(result.payment);
  } catch (error) {
    logger.error('Error getting payment status', { error: error.message, paymentId: req.params.paymentId });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user subscription
 * GET /api/payments/subscription/:userId
 */
const getUserSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }

    const result = await paymentService.getUserSubscription(userId);

    res.json({
      success: true,
      data: result.subscription
    });

  } catch (error) {
    logger.error('Error getting user subscription', {
      error: error.message,
      userId: req.params.userId
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get user subscription',
      message: error.message
    });
  }
};

/**
 * Payment success page (redirect from YooMoney)
 * GET /api/payments/success
 */
const paymentSuccess = async (req, res) => {
  try {
    const { paymentId } = req.query;

    if (!paymentId) {
      return res.status(400).send(`
        <html>
          <head><title>Ошибка оплаты</title></head>
          <body>
            <h1>Ошибка</h1>
            <p>Не указан ID платежа</p>
          </body>
        </html>
      `);
    }

    // Get payment status
    const result = await paymentService.getPaymentStatus(paymentId);

    if (!result.success) {
      return res.status(404).send(`
        <html>
          <head><title>Платеж не найден</title></head>
          <body>
            <h1>Платеж не найден</h1>
            <p>Платеж с ID ${paymentId} не найден</p>
          </body>
        </html>
      `);
    }

    const payment = result.payment;
    const statusText = payment.status === 'completed' ? 'успешно завершен' : 
                     payment.status === 'pending' ? 'ожидает подтверждения' : 
                     payment.status;

    res.send(`
      <html>
        <head>
          <title>Статус оплаты</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
            .success { color: #28a745; }
            .pending { color: #ffc107; }
            .failed { color: #dc3545; }
          </style>
        </head>
        <body>
          <h1>Статус оплаты</h1>
          <p><strong>ID платежа:</strong> ${payment.id}</p>
          <p><strong>Сумма:</strong> ${payment.amount} руб.</p>
          <p><strong>Тариф:</strong> ${payment.imagesCount} изображений</p>
          <p><strong>Статус:</strong> <span class="${payment.status}">${statusText}</span></p>
          
          ${payment.status === 'completed' ? 
            '<p class="success">✅ Оплата прошла успешно! Изображения добавлены на ваш счет.</p>' :
            '<p class="pending">⏳ Платеж обрабатывается. Изображения будут добавлены после подтверждения.</p>'
          }
          
          <p><small>Вы можете закрыть эту страницу и вернуться в Telegram бот.</small></p>
        </body>
      </html>
    `);

  } catch (error) {
    logger.error('Error in payment success page', {
      error: error.message,
      query: req.query
    });

    res.status(500).send(`
      <html>
        <head><title>Ошибка</title></head>
        <body>
          <h1>Произошла ошибка</h1>
          <p>Не удалось получить информацию о платеже</p>
        </body>
      </html>
    `);
  }
};

/**
 * Get payment plans
 * GET /api/payments/plans
 */
const getPaymentPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      data: paymentService.PAYMENT_PLANS
    });
  } catch (error) {
    logger.error('Error getting payment plans', { error: error.message });
    
    res.status(500).json({
      success: false,
      error: 'Failed to get payment plans',
      message: error.message
    });
  }
};

/**
 * Get payment history for user
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    logger.info('Get payment history request', { userId, page, limit });
    
    // Get user payments
    const payments = await Payment.find({ userId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('userId', 'profile');
    
    // Get user transactions
    const user = await User.findById(userId);
    const transactions = user?.transactions || [];
    
    res.json({
      success: true,
      payments: payments.map(payment => ({
        id: payment.paymentId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        planType: payment.planType,
        imagesCount: payment.imagesCount,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt
      })),
      transactions: transactions.slice(0, parseInt(limit)).map(transaction => ({
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: payments.length
      }
    });
    
  } catch (error) {
    logger.error('Error getting payment history', { 
      error: error.message, 
      userId: req.params.userId 
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get recently completed payments for bot notifications
 */
const getRecentCompletedPayments = async (req, res) => {
  try {
    const { since } = req.query;
    const sinceDate = since ? new Date(parseInt(since)) : new Date(Date.now() - 60000); // Default: last minute
    
    logger.info('Get recent completed payments request', { since: sinceDate });
    
    // Find payments completed after the specified time
    const recentPayments = await Payment.find({
      status: 'completed',
      completedAt: { $gte: sinceDate }
    })
    .sort({ completedAt: -1 })
    .limit(50) // Limit to prevent too many results
    .populate('userId', 'profile');
    
    const result = recentPayments.map(payment => ({
      paymentId: payment.paymentId,
      telegramId: payment.telegramId,
      userId: payment.userId._id,
      amount: payment.amount,
      imagesCount: payment.imagesCount,
      planType: payment.planType,
      completedAt: payment.completedAt,
      userProfile: payment.userId.profile
    }));
    
    logger.info('Recent completed payments found', { count: result.length });
    
    res.json({
      success: true,
      payments: result,
      count: result.length,
      since: sinceDate
    });
    
  } catch (error) {
    logger.error('Error getting recent completed payments', { 
      error: error.message,
      since: req.query.since
    });
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  createPayment,
  handleWebhook,
  getPaymentStatus,
  getUserSubscription,
  paymentSuccess,
  getPaymentPlans,
  getPaymentHistory,
  getRecentCompletedPayments
};
