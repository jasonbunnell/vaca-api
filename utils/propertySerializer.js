/**
 * Convert a Property document to its public-facing JSON shape, gating fields
 * by the property's subscription plan (PRD B-06.7).
 *
 * Tiers:
 *   - free   → omit host email/phone, airBnB, vrbo, rate fields
 *   - boost  → include contact info, AirBnB/VRBO links, rate range
 *   - pro    → all of the above + OwnerRez fields when present
 *
 * `viewer` is { user } from the request (or null for public). Admins and the
 * property's own hosts always see the unredacted doc — gating is for guests.
 *
 * Pass either a Mongoose doc or a plain object. The result is always a plain
 * object safe to send via res.json().
 */
function isOwnerOrAdmin(property, viewer) {
  const user = viewer?.user;
  if (!user) return false;
  if (user.role === 'admin') return true;
  const userId = user._id?.toString();
  return (property.host || []).some((h) => {
    const hostId = h?._id?.toString?.() || h?.toString?.();
    return hostId && hostId === userId;
  });
}

function planOf(property) {
  const sub = property.subscription;
  // subscription may be: ObjectId (unpopulated), populated doc, or null.
  if (!sub || typeof sub === 'string' || (sub && sub.toHexString)) return 'free';
  return sub.plan || 'free';
}

function toPlain(property) {
  if (!property) return null;
  if (typeof property.toObject === 'function') return property.toObject({ getters: false });
  return JSON.parse(JSON.stringify(property));
}

function gateHostFields(hostArr, plan) {
  if (!Array.isArray(hostArr)) return hostArr;
  if (plan === 'free') {
    return hostArr.map((h) => {
      if (!h || typeof h !== 'object') return h;
      const { email: _e, phone: _p, ...rest } = h;
      return rest;
    });
  }
  return hostArr;
}

function toPublicProperty(property, viewer) {
  if (!property) return null;
  const plain = toPlain(property);

  if (isOwnerOrAdmin(plain, viewer)) {
    return plain;
  }

  const plan = planOf(plain);

  if (plan === 'free') {
    delete plain.airBnb;
    delete plain.vrbo;
    delete plain.rate;
    delete plain.rateFrom;
    delete plain.rateTo;
    plain.host = gateHostFields(plain.host, plan);
  }

  // 'boost' and 'pro' currently expose the same fields the model holds.
  // Pro-only fields (OwnerRez availability, dynamic pricing) are added by
  // separate endpoints under /api/ownerrez (F-08).

  return plain;
}

function toPublicPropertyList(properties, viewer) {
  return (properties || []).map((p) => toPublicProperty(p, viewer));
}

module.exports = { toPublicProperty, toPublicPropertyList };
