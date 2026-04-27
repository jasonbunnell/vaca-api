const { httpError } = require('../middleware/errorHandler');

/**
 * Decide whether `user` may modify `property`. Admins always pass; otherwise
 * the user must be in `property.host`.
 *
 * Returns `{ isAdmin, isHost }` so callers can branch (e.g. admin-only fields).
 * Throws an httpError(403) if the user has neither role.
 */
function assertPropertyAccess(property, user) {
  const isAdmin = user?.role === 'admin';
  const userId = user?._id?.toString();
  const isHost = (property.host || []).some(
    (h) => h && h.toString() === userId
  );
  if (!isAdmin && !isHost) {
    throw httpError(403, 'Forbidden: you are not a host of this property.');
  }
  return { isAdmin, isHost };
}

module.exports = { assertPropertyAccess };
