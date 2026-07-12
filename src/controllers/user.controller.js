const User = require('../models/user.model');
const { sendSuccess, sendError } = require('../utils/response');

// ── Get profile ───────────────────────────────────────────────────────────────
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password -refreshTokens');
    if (!user) return sendError(res, 'NOT_FOUND', 'User not found', 404);
    sendSuccess(res, {
      id:        user.userId,
      name:      user.name,
      email:     user.email,
      currency:  user.currency,
      fcmToken:  user.fcmToken,
      createdAt: user.createdAt
    });
  } catch (err) { next(err); }
};

// ── Update profile ─────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, currency, fcmToken } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 'NOT_FOUND', 'User not found', 404);

    if (name)     user.name     = name;
    if (currency) user.currency = currency;
    if (fcmToken) user.fcmToken = fcmToken;

    await user.save();
    sendSuccess(res, { id: user.userId, name: user.name, currency: user.currency });
  } catch (err) { next(err); }
};

// ── Save FCM token ──────────────────────────────────────────────────────────────
exports.saveFcmToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    if (!fcmToken) return sendError(res, 'VALIDATION_ERROR', 'fcmToken is required', 400, 'fcmToken');

    const user = await User.findById(req.user._id);
    if (!user) return sendError(res, 'NOT_FOUND', 'User not found', 404);

    user.fcmToken = fcmToken;
    await user.save();

    sendSuccess(res, { message: 'FCM token saved successfully' });
  } catch (err) { next(err); }
};

// ── Change password ────────────────────────────────────────────────────────────
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const match = await user.comparePassword(currentPassword);
    if (!match) return sendError(res, 'INVALID_CREDENTIALS', 'Current password is incorrect', 400, 'currentPassword');

    user.password = newPassword;
    await user.save();
    sendSuccess(res, { message: 'Password updated successfully' });
  } catch (err) { next(err); }
};
