const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAction } = require('../utils/securityLogger');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../middleware/errorHandler');
const sendEmail = require('../utils/sendEmail');

function signToken(user) {
  const payload = { id: user._id, role: user.role };
  const expiresIn = process.env.JWT_EXPIRE || '30d';
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}

function buildUserResponse(user) {
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    profileImage: user.profileImage,
    city: user.city,
    state: user.state,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// @desc    Log in user
// @route   POST /api/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw httpError(400, 'Email and password are required.');
  }

  // Match User schema: email is stored lowercase
  const emailNorm = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: emailNorm }).select('+password');
  if (!user) {
    logAction('login', { success: false, detail: 'user not found' });
    throw httpError(401, 'Invalid credentials.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    logAction('login', { userId: user._id, success: false, detail: 'invalid password' });
    throw httpError(401, 'Invalid credentials.');
  }

  logAction('login', { userId: user._id, success: true });
  const token = signToken(user);
  res.json({ token, user: buildUserResponse(user) });
});

// @desc    Get current logged-in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res) => {
  res.json(buildUserResponse(req.user));
});

// @desc    Change password for current user
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw httpError(400, 'Current and new password are required.');
  }
  if (newPassword.length < 8) {
    throw httpError(400, 'New password must be at least 8 characters.');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    throw httpError(404, 'User not found.');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw httpError(400, 'Current password is incorrect.');
  }

  user.password = newPassword;
  await user.save();
  logAction('change-password', { userId: req.user._id, success: true });
  res.json({ message: 'Password updated successfully.' });
});

// @desc    Forgot password – email a reset link (CRM-1)
// @route   POST /api/auth/forgot-password
// @access  Public
// Always responds with the same generic 200 so the endpoint can't be used to
// enumerate accounts, and NEVER returns the token (it's only in the email).
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw httpError(400, 'Email is required.');
  }
  const genericResponse = { message: 'If that email exists, a reset link has been sent.' };
  const emailNorm = String(email).trim().toLowerCase();
  const user = await User.findOne({ email: emailNorm });
  if (!user) {
    logAction('forgot-password', { success: false, detail: { email: emailNorm, reason: 'no-user' } });
    return res.json(genericResponse);
  }
  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  const siteUrl = (process.env.PUBLIC_SITE_URL || 'https://flxvacations.com').replace(/\/+$/, '');
  const resetUrl = `${siteUrl}/reset-password?token=${token}`;
  const result = await sendEmail({
    to: user.email,
    subject: 'Reset your FLX Vacations password',
    text:
      `Hi ${user.firstName || 'there'},\n\n` +
      `We received a request to reset your FLX Vacations password. Use the link below within 1 hour:\n\n` +
      `${resetUrl}\n\n` +
      `If you didn't request this, you can safely ignore this email — your password is unchanged.\n\n` +
      `— FLX Vacations`,
  });
  if (result?.skipped && process.env.NODE_ENV !== 'production') {
    console.log(`[dev] SMTP unconfigured — reset URL for ${user.email}: ${resetUrl}`);
  }
  logAction('forgot-password', { userId: user._id, success: true });
  res.json(genericResponse);
});

// @desc    Reset password with token from forgot-password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    throw httpError(400, 'Token and new password are required.');
  }
  if (newPassword.length < 8) {
    throw httpError(400, 'New password must be at least 8 characters.');
  }
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+password +resetPasswordToken +resetPasswordExpire');
  if (!user) {
    throw httpError(400, 'Invalid or expired reset token.');
  }
  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();
  logAction('reset-password', { userId: user._id, success: true });
  res.json({ message: 'Password reset successfully. You can log in with your new password.' });
});
