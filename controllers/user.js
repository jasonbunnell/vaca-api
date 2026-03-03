const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Phase 2: admin only)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get single user (self or admin)
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user && req.user._id.toString() === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden: cannot view this user.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create user (public registration)
// @route   POST /api/users
// @access  Public (Phase 1; Phase 2: register flow)
exports.createUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'First name, last name, email, and password are required.' });
    }

    const user = await User.create({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      email,
      phone,
      password,
      role: role || 'user',
    });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Update user (self or admin)
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'admin';
    const isSelf = req.user && req.user._id.toString() === req.params.id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: 'Forbidden: cannot update this user.' });
    }

    const update = { ...req.body };
    if (!isAdmin) {
      delete update.role;
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Phase 2: admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
