/**
 * Standard `.populate()` arguments for Property reads. Apply to every property
 * read so the API response shape stays consistent and the plan-gating
 * serializer in `utils/propertySerializer.js` has the data it needs.
 */
const POPULATE_HOST = ['host', 'name email phone role'];
const POPULATE_AMENITIES = [
  'amenities',
  'name displayName category color icon description isActive',
];
const POPULATE_SUBSCRIPTION = [
  'subscription',
  'plan billingType isLifetime status currentPeriodStart currentPeriodEnd cancelAtPeriodEnd',
];

/**
 * Apply all standard populates to a Mongoose query in one call.
 * @template T
 * @param {import('mongoose').Query<T, any>} query
 * @returns {import('mongoose').Query<T, any>}
 */
function populateProperty(query) {
  return query
    .populate(...POPULATE_HOST)
    .populate(...POPULATE_AMENITIES)
    .populate(...POPULATE_SUBSCRIPTION);
}

module.exports = {
  POPULATE_HOST,
  POPULATE_AMENITIES,
  POPULATE_SUBSCRIPTION,
  populateProperty,
};
