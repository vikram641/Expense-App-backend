const { verifyAccessToken } = require('../utils/jwt');
const { sendError } = require('../utils/response');
const User = require('../models/user.model');
const logger = require('../utils/logger'); // 👈 add logger

module.exports = async function protect(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // 🔍 Log incoming request
    logger.info(`🔐 Auth check: ${req.method} ${req.originalUrl}`);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn(`⚠️ No token provided`);
      return sendError(res, 'UNAUTHORIZED', 'No token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // ⚠️ Don't log full token in production (security risk)
    logger.info(`🪪 Token received (partial): ${token.slice(0, 10)}...`);

    const decoded = verifyAccessToken(token);

    logger.info(`✅ Token verified for userId: ${decoded.id}`);

    const user = await User.findById(decoded.id).select('-password -refreshTokens');

    if (!user) {
      logger.warn(`❌ User not found for ID: ${decoded.id}`);
      return sendError(res, 'UNAUTHORIZED', 'User not found', 401);
    }

    req.user = user;

    logger.info(`👤 Auth success: ${user._id}`);

    next();

  } catch (err) {
    // ❌ Log error details
    logger.error(`🔥 Auth error: ${err.name} - ${err.message}`);

    if (err.name === 'TokenExpiredError') {
      logger.warn(`⌛ Token expired`);
      return sendError(res, 'TOKEN_EXPIRED', 'Access token expired', 401);
    }

    return sendError(res, 'UNAUTHORIZED', 'Invalid token', 401);
  }
};