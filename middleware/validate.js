const { validationResult } = require('express-validator');

/**
 * Send 400 with first validation error message. Use after validation chains (PRD 4.4).
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  const first = errors.array({ onlyFirstError: true })[0];
  return res.status(400).json({ error: first.msg || 'Validation failed' });
}

module.exports = { handleValidationErrors };
