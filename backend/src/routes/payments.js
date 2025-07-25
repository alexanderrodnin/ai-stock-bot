/**
 * Payment Routes
 * Routes for payment processing and management
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const rateLimiter = require('../middleware/rateLimiter');

// Rate limiting for payment operations
const paymentLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 payment operations per 15 minutes
  message: 'Слишком много попыток создания платежей. Попробуйте позже.'
});

const webhookLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 webhook calls per minute
  message: 'Too many webhook requests'
});

/**
 * @route   POST /api/payments/create
 * @desc    Create a new payment
 * @access  Public (but requires valid user data)
 * @body    { userId, planType, telegramId }
 */
router.post('/create', paymentLimiter, paymentController.createPayment);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle YooMoney webhook notifications
 * @access  Public (YooMoney service)
 * @body    YooMoney webhook data
 */
router.post('/webhook', webhookLimiter, paymentController.handleWebhook);

/**
 * @route   GET /api/payments/status/:paymentId
 * @desc    Get payment status by payment ID
 * @access  Public
 * @params  paymentId - Payment identifier
 */
router.get('/status/:paymentId', paymentController.getPaymentStatus);

/**
 * @route   GET /api/payments/subscription/:userId
 * @desc    Get user subscription information
 * @access  Public (but requires valid user ID)
 * @params  userId - User identifier
 */
router.get('/subscription/:userId', paymentController.getUserSubscription);

/**
 * @route   GET /api/payments/success
 * @desc    Payment success page (redirect from YooMoney)
 * @access  Public
 * @query   paymentId - Payment identifier
 */
router.get('/success', paymentController.paymentSuccess);

/**
 * @route   GET /api/payments/plans
 * @desc    Get available payment plans
 * @access  Public
 */
router.get('/plans', paymentController.getPaymentPlans);

/**
 * @route   GET /api/payments/history/:userId
 * @desc    Get user payment history
 * @access  Public (but requires valid user ID)
 * @params  userId - User identifier
 * @query   page, limit - Pagination parameters
 */
router.get('/history/:userId', paymentController.getPaymentHistory);

module.exports = router;
