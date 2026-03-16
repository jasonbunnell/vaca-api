const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes: require valid JWT, attach user to req
exports.protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'Not authorized, token missing' });
    }

    // Normalize: strip whitespace, newlines, and surrounding quotes (copy-paste / env variable quirks)
    token = String(token).trim().replace(/\s+/g, '').replace(/^["']|["']$/g, '');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Support both id and _id in payload (e.g. different token formats or legacy)
    const userId = decoded.id ?? decoded._id;
    if (!userId || (typeof userId === 'string' && userId.length < 10)) {
      return res.status(401).json({ error: 'Not authorized, token invalid' });
    }
    const user = await User.findById(userId);

    if (!user) {
      return res.status(401).json({ error: 'Not authorized. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (err) {
    // In development, log reason (expired vs invalid) to help debug; never expose in response
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[auth] JWT verify failed:', err.message || err.name);
    }
    return res.status(401).json({ error: 'Not authorized, token invalid' });
  }
};

// Restrict to specific roles (e.g. admin, host)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
};

