/**
 * Wrap an async route handler so thrown errors propagate to Express's error
 * middleware instead of leaving the request hanging. Replaces per-handler
 * try/catch + res.status(500) boilerplate.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
