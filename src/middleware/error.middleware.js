const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const field = Object.keys(err.errors)[0];
    return sendError(res, 'VALIDATION_ERROR', err.errors[field].message, 400, field);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return sendError(res, 'DUPLICATE_ERROR', `${field} already exists`, 409, field);
  }

  // Mongoose cast error (bad ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, 'INVALID_ID', 'Invalid resource ID', 400);
  }

  return sendError(res, 'SERVER_ERROR', 'Internal server error', 500);
};

module.exports = { errorHandler };
