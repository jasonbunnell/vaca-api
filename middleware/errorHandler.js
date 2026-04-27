/**
 * Convert any error thrown by an async handler into a JSON response.
 * - Mongoose ValidationError → 400 with the first sub-error message
 * - Mongoose CastError       → 400 (e.g. malformed ObjectId)
 * - Duplicate key (E11000)   → 400 with the offending field
 * - Errors with `.statusCode`→ use as-is (created via `httpError` below)
 * - Anything else            → 500
 *
 * Always last-mounted in server.js.
 */
function errorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  let status = err.statusCode || 500;
  let message = err.message || 'Server error';

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    const first = Object.values(err.errors)[0];
    message = first?.message || message;
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.code === 11000) {
    status = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `Duplicate ${field}`;
  }

  if (status >= 500 && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  res.status(status).json({ error: message });
}

/**
 * Build an Error with an explicit HTTP status. Use inside controllers when
 * returning a non-200 status (e.g. `throw httpError(404, 'Property not found')`).
 */
function httpError(statusCode, message) {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
}

module.exports = { errorHandler, httpError };
