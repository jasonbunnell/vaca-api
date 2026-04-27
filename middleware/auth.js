const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Pull the JWT from `Authorization: Bearer ...` or the `token` cookie, if any.
 * Returns null when no token is present. Strips whitespace, surrounding quotes,
 * and embedded newlines that sneak in via copy-paste or env vars.
 */
function extractToken(req, { allowCookie = true } = {}) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (allowCookie && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return null;
  return String(token).trim().replace(/\s+/g, '').replace(/^["']|["']$/g, '');
}

/**
 * Verify a token and load the user. Returns the User document, or null if
 * the token is missing/invalid/expired or the user no longer exists.
 */
async function verifyAndLoadUser(token) {
  if (!token) return null;
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // Support both id and _id in payload (different token formats / legacy)
  const userId = decoded.id ?? decoded._id;
  if (!userId || (typeof userId === 'string' && userId.length < 10)) return null;
  return User.findById(userId);
}

// Protect routes: require valid JWT, attach user to req
exports.protect = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Not authorized, token missing' });
    }
    const user = await verifyAndLoadUser(token);
    if (!user) {
      return res.status(401).json({ error: 'Not authorized. Please log in again.' });
    }
    req.user = user;
    next();
  } catch (err) {
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

/**
 * If Authorization Bearer JWT is present and valid, attach req.user; otherwise continue.
 * Used for public routes that have admin-only query options (e.g. GET /api/amenities?includeInactive=true).
 */
exports.optionalProtect = async (req, res, next) => {
  try {
    const token = extractToken(req, { allowCookie: false });
    if (!token) return next();
    const user = await verifyAndLoadUser(token);
    if (user) req.user = user;
    next();
  } catch {
    next();
  }
};
