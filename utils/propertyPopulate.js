/**
 * Standard `.populate()` arguments for Property reads. Apply both to every
 * property read so the API response shape stays consistent.
 *
 * Usage:
 *   Property.find(q).populate(...PROPERTY_POPULATE)
 *   Property.findById(id).populate(...PROPERTY_POPULATE)
 *
 * Each entry is `[path, fields]`; spread the whole array into a chained
 * `.populate(POPULATE_HOST).populate(POPULATE_AMENITIES)` is also fine.
 */
const POPULATE_HOST = ['host', 'name email role'];
const POPULATE_AMENITIES = [
  'amenities',
  'name displayName category color icon description isActive',
];

/**
 * Apply both populates to a Mongoose query in one call.
 * @template T
 * @param {import('mongoose').Query<T, any>} query
 * @returns {import('mongoose').Query<T, any>}
 */
function populateProperty(query) {
  return query.populate(...POPULATE_HOST).populate(...POPULATE_AMENITIES);
}

module.exports = { POPULATE_HOST, POPULATE_AMENITIES, populateProperty };
