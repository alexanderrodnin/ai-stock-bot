/**
 * Error Handling Middleware
 * Centralized error processing and response formatting
 */

const logger = require('../utils/logger');
const config = require('../config/config');

class AppError extends Error {
  constructor(message, statusCode = 500, code = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error details
  logger.error(`Error ${err.statusCode || 500}`, {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404, 'INVALID_ID');
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = 'Duplicate field value entered';
    error = new AppError(message, 400, 'DUPLICATE_FIELD');
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  // OpenAI API errors
  if (err.response && err.response.status) {
    switch (err.response.status) {
      case 401:
        error = new AppError('Invalid OpenAI API key', 401, 'OPENAI_AUTH_ERROR');
        break;
      case 429:
        error = new AppError('OpenAI rate limit exceeded', 429, 'OPENAI_RATE_LIMIT');
        break;
      case 400:
        error = new AppError('Invalid request to OpenAI', 400, 'OPENAI_BAD_REQUEST');
        break;
      default:
        error = new AppError('OpenAI service error', 500, 'OPENAI_SERVICE_ERROR');
    }
  }

  // FTP errors
  if (err.message && err.message.includes('FTP')) {
    error = new AppError('FTP upload failed', 500, 'FTP_ERROR');
  }

  // Default error response
  const statusCode = error.statusCode || 500;
  const response = {
    success: false,
    error: {
      message: error.message || 'Server Error',
      code: error.code || 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  };

  // Add stack trace in development
  if (config.nodeEnv === 'development') {
    response.error.stack = err.stack;
  }

  // Add request ID if available
  if (req.requestId) {
    response.error.requestId = req.requestId;
  }

  res.status(statusCode).json(response);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  asyncHandler,
  AppError
};
