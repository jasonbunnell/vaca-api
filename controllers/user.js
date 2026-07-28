const User = require('../models/User');
const { logAction } = require('../utils/securityLogger');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../middleware/errorHandler');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (admin only)
exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// @desc    Get single user (self or admin)
// @route   GET /api/users/:id
// @access  Private
exports.getUser = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const isSelf = req.user && req.user._id.toString() === req.params.id;

  if (!isAdmin && !isSelf) {
    throw httpError(403, 'Forbidden: cannot view this user.');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw httpError(404, 'User not found');
  }
  res.json(user);
});

// @desc    Create user (public registration)
// @route   POST /api/users
// @access  Public
// Required-field and email/password validation runs in validators/user.js.
// Role is forced to 'user' so a public registrant cannot self-promote to host or admin.
exports.createUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  const user = await User.create({
    firstName,
    lastName,
    name: `${firstName} ${lastName}`.trim(),
    email,
    phone,
    password,
    role: 'user',
  });
  logAction('user-create', { userId: user._id, success: true });

  // Welcome email (CRM-1) — best-effort, never blocks or fails registration.
  sendEmail({
    to: user.email,
    subject: 'Welcome to FLX Vacations',
    text:
      `Hi ${user.firstName || 'there'},\n\n` +
      `Welcome to FLX Vacations — the commission-free way to find and book Finger Lakes vacation rentals.\n\n` +
      `Have a property on one of the lakes? List it free: ${(process.env.PUBLIC_SITE_URL || 'https://flxvacations.com').replace(/\/+$/, '')}/pricing\n\n` +
      `Questions? Just reply to this email.\n\n— FLX Vacations`,
  }).catch((err) => console.error('[email] welcome send failed:', err.message));

  res.status(201).json(user);
});

// @desc    Update user (self or admin)
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  const isSelf = req.user && req.user._id.toString() === req.params.id;

  if (!isAdmin && !isSelf) {
    throw httpError(403, 'Forbidden: cannot update this user.');
  }

  const update = { ...req.body };
  // No one can change email or password via PUT (PRD 4.4)
  delete update.email;
  delete update.password;
  if (!isAdmin) {
    delete update.role;
  }

  const user = await User.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  if (!user) {
    throw httpError(404, 'User not found');
  }
  logAction('user-update', { userId: req.user._id, success: true, detail: { targetUserId: req.params.id, byAdmin: isAdmin } });
  res.json(user);
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (admin only)
exports.deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    throw httpError(404, 'User not found');
  }
  logAction('user-delete', { userId: req.user._id, success: true, detail: { targetUserId: req.params.id } });
  res.json({ message: 'User deleted' });
});
