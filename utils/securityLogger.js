/**
 * Log sensitive actions for security and support (PRD 4.4).
 * Do not log passwords, tokens, or full PII in detail.
 */
function logAction(action, options = {}) {
  const { userId, success = true, detail } = options;
  const payload = {
    ts: new Date().toISOString(),
    action,
    success: !!success,
  };
  if (userId) payload.userId = userId.toString();
  if (detail && typeof detail === 'object') payload.detail = detail;
  else if (detail != null) payload.detail = String(detail).slice(0, 200);
  console.log('[security]', JSON.stringify(payload));
}

module.exports = { logAction };
