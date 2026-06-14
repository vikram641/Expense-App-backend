const User = require('../models/user.model');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendSuccess, sendError } = require('../utils/response');

// ── Register ──────────────────────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) return sendError(res, 'DUPLICATE_ERROR', 'Email already registered', 409, 'email');

    const user = await User.create({ name, email, password });
    sendSuccess(res, {
      id:        user.userId,
      name:      user.name,
      email:     user.email,
      createdAt: user.createdAt
    }, 201);
  } catch (err) { next(err); }
};

// ── Login ─────────────────────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);

    const match = await user.comparePassword(password);
    if (!match) return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshTokens.push(refreshToken);
    await user.save();

    sendSuccess(res, {
      accessToken,
      refreshToken,
      expiresIn: 900,
      user: {
        id:       user.userId,
        name:     user.name,
        email:    user.email,
        currency: user.currency
      }
    });
  } catch (err) { next(err); }
};

// ── Refresh Token ─────────────────────────────────────────────────────────────
exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'UNAUTHORIZED', 'Refresh token required', 401);

    let decoded;
    try { decoded = verifyRefreshToken(refreshToken); }
    catch { return sendError(res, 'UNAUTHORIZED', 'Invalid or expired refresh token', 401); }

    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return sendError(res, 'UNAUTHORIZED', 'Refresh token not recognised', 401);
    }

    const newAccessToken = generateAccessToken(user._id);
    sendSuccess(res, { accessToken: newAccessToken, expiresIn: 900 });
  } catch (err) { next(err); }
};

// ── Logout ────────────────────────────────────────────────────────────────────
exports.logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return sendError(res, 'BAD_REQUEST', 'Refresh token required', 400);

    const user = await User.findById(req.user._id);
    if (user) {
      user.refreshTokens = user.refreshTokens.filter(t => t !== refreshToken);
      await user.save();
    }
    sendSuccess(res, { message: 'Logged out successfully' });
  } catch (err) { next(err); }
};
