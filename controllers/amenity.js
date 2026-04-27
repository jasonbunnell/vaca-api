const Amenity = require('../models/Amenity');
const { logAction } = require('../utils/securityLogger');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../middleware/errorHandler');

const GROUP_ORDER = [
  'essentials',
  'location',
  'kitchen',
  'outside',
  'entertainment',
  'luxury',
  'environmentally-friendly',
];

function groupAmenities(docs) {
  const map = {};
  for (const c of Amenity.CATEGORIES) {
    map[c] = [];
  }
  for (const a of docs) {
    const o = a.toObject ? a.toObject() : a;
    if (!map[o.category]) map[o.category] = [];
    map[o.category].push(o);
  }
  const grouped = {};
  for (const key of GROUP_ORDER) {
    if (map[key] && map[key].length) grouped[key] = map[key];
  }
  for (const key of Object.keys(map)) {
    if (!GROUP_ORDER.includes(key) && map[key].length) {
      if (!grouped.other) grouped.other = [];
      grouped.other.push(...map[key]);
    }
  }
  return grouped;
}

// @route   GET /api/amenities
// @access  Public (includeInactive requires admin JWT)
exports.getAmenities = asyncHandler(async (req, res) => {
  const grouped = req.query.grouped === 'true';
  const includeInactive = req.query.includeInactive === 'true';

  if (includeInactive) {
    if (!req.user) {
      throw httpError(401, 'Authentication required for includeInactive');
    }
    if (req.user.role !== 'admin') {
      throw httpError(403, 'Forbidden: admin only');
    }
  }

  const filter = includeInactive ? {} : { isActive: true };
  const list = await Amenity.find(filter).sort({ category: 1, displayName: 1 }).exec();

  if (grouped) {
    return res.json(groupAmenities(list));
  }
  res.json(list);
});

// @route   POST /api/amenities
// @access  Admin
exports.createAmenity = asyncHandler(async (req, res) => {
  const { name: _ignoredName, ...payload } = req.body;
  const doc = await Amenity.create(payload);
  logAction('amenity-create', { userId: req.user._id, success: true, detail: { amenityId: doc._id } });
  res.status(201).json(doc);
});

// @route   PUT /api/amenities/:id
// @access  Admin
exports.updateAmenity = asyncHandler(async (req, res) => {
  const doc = await Amenity.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!doc) {
    throw httpError(404, 'Amenity not found');
  }
  logAction('amenity-update', { userId: req.user._id, success: true, detail: { amenityId: doc._id } });
  res.json(doc);
});

// @route   DELETE /api/amenities/:id
// @access  Admin (soft delete)
exports.deleteAmenity = asyncHandler(async (req, res) => {
  const doc = await Amenity.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true, runValidators: true }
  );
  if (!doc) {
    throw httpError(404, 'Amenity not found');
  }
  logAction('amenity-deactivate', { userId: req.user._id, success: true, detail: { amenityId: doc._id } });
  res.json({ message: 'Amenity deactivated', amenity: doc });
});
