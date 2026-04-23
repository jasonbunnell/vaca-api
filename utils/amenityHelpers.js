const mongoose = require('mongoose');
const Amenity = require('../models/Amenity');
const { slugifyDisplay } = require('./slugify');

/** Legacy seed strings → canonical amenity `name` (slug) */
const LEGACY_LABEL_TO_NAME = {
  wifi: 'wifi',
  'wi-fi': 'wifi',
  kitchen: 'stovetop-oven',
  kitchenette: 'microwave',
  'air conditioning': 'air-conditioning',
  washer: 'washer',
  dock: 'dock',
  parking: 'parking-on-property',
  'street parking': 'parking',
};

/**
 * Resolve filter tokens: Mongo ObjectId strings OR amenity `name` slugs.
 * @param {string[]} tokens
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
async function resolveAmenityFilterTokens(tokens) {
  const ids = [];
  const seen = new Set();
  for (const raw of tokens) {
    const t = String(raw).trim();
    if (!t) continue;
    let id = null;
    if (mongoose.Types.ObjectId.isValid(t) && String(new mongoose.Types.ObjectId(t)) === t) {
      id = new mongoose.Types.ObjectId(t);
    } else {
      const byName = await Amenity.findOne({ name: t.toLowerCase(), isActive: true }).select('_id').lean();
      if (byName) id = byName._id;
    }
    if (id) {
      const key = id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        ids.push(id);
      }
    }
  }
  return ids;
}

/**
 * Map legacy string labels from JSON/DB to Amenity ObjectIds (best effort).
 * @param {unknown[]} values
 * @returns {Promise<mongoose.Types.ObjectId[]>}
 */
async function legacyAmenityStringsToIds(values) {
  if (!Array.isArray(values) || values.length === 0) return [];
  const out = [];
  const seen = new Set();
  for (const v of values) {
    if (v == null) continue;
    if (mongoose.Types.ObjectId.isValid(v) && String(v).length === 24) {
      const id = new mongoose.Types.ObjectId(v);
      const key = id.toString();
      if (seen.has(key)) continue;
      const doc = await Amenity.findOne({ _id: id, isActive: true }).select('_id').lean();
      if (doc) {
        seen.add(key);
        out.push(doc._id);
      }
      continue;
    }
    const label = String(v).trim();
    if (!label) continue;

    const mapped = LEGACY_LABEL_TO_NAME[label.toLowerCase()];
    const slug = mapped || slugifyDisplay(label);

    let doc =
      (await Amenity.findOne({ name: slug, isActive: true }).select('_id').lean()) ||
      (await Amenity.findOne({
        displayName: new RegExp(`^${escapeRegex(label)}$`, 'i'),
        isActive: true,
      })
        .select('_id')
        .lean());
    if (doc) {
      const key = doc._id.toString();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(doc._id);
      }
    }
  }
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate that all IDs exist and are active amenities.
 * @param {string[]} ids24
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
async function validateActiveAmenityIds(ids24) {
  if (!Array.isArray(ids24) || ids24.length === 0) return { ok: true };
  const unique = [...new Set(ids24.map((id) => String(id)))];
  for (const id of unique) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return { ok: false, message: `Invalid amenity id: ${id}` };
    }
  }
  const oidList = unique.map((id) => new mongoose.Types.ObjectId(id));
  const count = await Amenity.countDocuments({
    _id: { $in: oidList },
    isActive: true,
  });
  if (count !== unique.length) {
    return { ok: false, message: 'One or more amenities are invalid or inactive' };
  }
  return { ok: true };
}

module.exports = {
  resolveAmenityFilterTokens,
  legacyAmenityStringsToIds,
  validateActiveAmenityIds,
  LEGACY_LABEL_TO_NAME,
};
