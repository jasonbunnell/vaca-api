const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const RATE_LIMIT_MESSAGE =
  'You have exceeded login attempts! Try again after an hour or contact an admin.';

/**
 * 3 attempts per hour per email (or IP if email missing). Use for login and forgot-password.
 */
const rateLimitByEmail = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: RATE_LIMIT_MESSAGE },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase?.();
    if (email) return `email:${email}`;
    return ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1');
  },
});

/**
 * 3 attempts per hour per IP. Use for reset-password (no email in body).
 */
const rateLimitAuthByIp = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: RATE_LIMIT_MESSAGE },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1'),
});

/**
 * 5 registrations per hour per IP. More permissive than auth limits — a family
 * sharing a connection should be able to make a few accounts — but tight enough
 * that volumetric registration spam from a single source gets blocked.
 */
const rateLimitRegistrationByIp = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many accounts created from this network. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || req.socket?.remoteAddress || '127.0.0.1'),
});

module.exports = { rateLimitByEmail, rateLimitAuthByIp, rateLimitRegistrationByIp };
