const mongoose = require('mongoose');
const Property = require('../models/Property');
const { logAction } = require('../utils/securityLogger');
const { deleteFromSpacesByUrl } = require('./upload');
const { resolveAmenityFilterTokens } = require('../utils/amenityHelpers');
const { populateProperty } = require('../utils/propertyPopulate');
const { assertPropertyAccess } = require('../utils/propertyAccess');
const { toPublicProperty, toPublicPropertyList } = require('../utils/propertySerializer');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../middleware/errorHandler');

function dedupeObjectIdStrings(ids) {
  if (!Array.isArray(ids)) return ids;
  const seen = new Set();
  return ids.filter((id) => {
    const s = String(id);
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });
}

function parseCommaList(val) {
  if (val == null) return [];
  if (Array.isArray(val)) {
    return val
      .flatMap((v) => String(v).split(','))
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return String(val)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parsePositiveInt(val) {
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
}

async function buildPropertyQuery(query) {
  const { lake, amenityMatch, where, guests, minBedrooms, minBeds, minBathrooms } = query;
  const q = {};

  if (lake) q.lake = lake;

  if (where) {
    const re = new RegExp(String(where).trim(), 'i');
    q.$or = [{ lake: re }, { 'location.city': re }];
  }

  const g = parsePositiveInt(guests);
  if (g) q.guests = { $gte: g };

  const bd = parsePositiveInt(minBedrooms);
  if (bd) q.bedrooms = { $gte: bd };

  const bs = parsePositiveInt(minBeds);
  if (bs) q.beds = { $gte: bs };

  const ba = parsePositiveInt(minBathrooms);
  if (ba) q.bathrooms = { $gte: ba };

  const amenityTokens = parseCommaList(query.amenities);
  if (amenityTokens.length > 0) {
    const amenityIds = await resolveAmenityFilterTokens(amenityTokens);
    if (amenityIds.length === 0) {
      return { q, noResults: true };
    }
    const mode = String(amenityMatch || 'all').toLowerCase() === 'any' ? 'any' : 'all';
    q.amenities = mode === 'all' ? { $all: amenityIds } : { $in: amenityIds };
  }

  return { q, noResults: false };
}

// @desc    Get all properties (optional: ?lake=Name&page=1&limit=20 → { items, total, page, limit })
// @route   GET /api/properties
// @access  Public
exports.getProperties = asyncHandler(async (req, res) => {
  const hasPagination = req.query.page != null || req.query.limit != null;
  const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
  const limitRaw = parseInt(String(req.query.limit), 10);
  const limit = Math.min(Math.max(Number.isNaN(limitRaw) ? 20 : limitRaw, 1), 100);

  const { q, noResults } = await buildPropertyQuery(req.query);

  if (noResults) {
    return hasPagination
      ? res.json({ items: [], total: 0, page, limit })
      : res.json([]);
  }

  const base = populateProperty(Property.find(q)).sort({ createdAt: -1 });

  if (hasPagination) {
    const [items, total] = await Promise.all([
      base
        .clone()
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      Property.countDocuments(q),
    ]);
    return res.json({ items: toPublicPropertyList(items, { user: req.user }), total, page, limit });
  }

  const properties = await base.exec();
  res.json(toPublicPropertyList(properties, { user: req.user }));
});

// @desc    Get single property (by slug or id)
// @route   GET /api/properties/:slugOrId
// @access  Public
exports.getProperty = asyncHandler(async (req, res) => {
  const { id } = req.params;

  let property = await populateProperty(Property.findOne({ slug: id }));

  if (!property && mongoose.Types.ObjectId.isValid(id)) {
    property = await populateProperty(Property.findById(id));
  }
  if (!property) {
    throw httpError(404, 'Property not found');
  }
  res.json(toPublicProperty(property, { user: req.user }));
});

// @desc    Get properties for current user
// @route   GET /api/properties/my
// @access  Private
exports.getMyProperties = asyncHandler(async (req, res) => {
  // Hosts always see the full doc for their own properties — no gating.
  const properties = await populateProperty(Property.find({ host: req.user._id }));
  res.json(properties);
});

// @desc    Create property
// @route   POST /api/properties
// @access  Private (host or admin)
exports.createProperty = asyncHandler(async (req, res) => {
  const isAdmin = req.user?.role === 'admin';
  let hostIds = [];
  if (isAdmin && req.body.host != null) {
    hostIds = Array.isArray(req.body.host) ? req.body.host : [req.body.host];
    hostIds = hostIds.filter(Boolean).map((id) => (typeof id === 'string' ? id : id?.toString?.() || id));
  } else if (isAdmin && req.body.owner) {
    hostIds = [String(req.body.owner).trim()].filter(Boolean);
  }
  if (hostIds.length === 0) {
    hostIds = [req.user._id];
  }
  if (!hostIds.length) {
    throw httpError(400, 'At least one host is required.');
  }

  const { host, owner, ...rest } = req.body;
  if (Array.isArray(rest.amenities)) {
    rest.amenities = dedupeObjectIdStrings(rest.amenities);
  }
  const property = await Property.create({
    ...rest,
    host: hostIds,
  });
  logAction('property-create', { userId: req.user._id, success: true, detail: { propertyId: property._id } });
  const populated = await populateProperty(Property.findById(property._id));
  res.status(201).json(populated);
});

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (host or admin); ownership = user's _id in property.host array
exports.updateProperty = asyncHandler(async (req, res) => {
  const existing = await Property.findById(req.params.id);
  if (!existing) {
    throw httpError(404, 'Property not found');
  }

  const { isAdmin } = assertPropertyAccess(existing, req.user);

  const update = { ...req.body };
  if (update.images && Array.isArray(update.images)) {
    const withMain = update.images.filter((i) => i && i.isMain === true);
    if (withMain.length > 1) {
      const firstMainIndex = update.images.findIndex((i) => i && i.isMain === true);
      update.images.forEach((img, idx) => {
        if (img && typeof img === 'object') img.isMain = idx === firstMainIndex;
      });
    } else if (withMain.length === 0 && update.images.length > 0) {
      if (update.images[0] && typeof update.images[0] === 'object') {
        update.images[0].isMain = true;
      }
    }
  }
  if (update.host != null) {
    const newHost = Array.isArray(update.host) ? update.host : [update.host];
    const normalized = newHost.filter(Boolean).map((id) => (typeof id === 'string' ? id : id?.toString?.() || id));
    if (normalized.length < 1) {
      throw httpError(400, 'Property must have at least one host.');
    }
    if (!isAdmin && normalized.every((id) => id !== req.user._id.toString())) {
      throw httpError(400, 'You cannot remove yourself from the host list.');
    }
    update.host = normalized;
  } else if (!isAdmin) {
    delete update.host;
  }

  if (Array.isArray(update.amenities)) {
    update.amenities = dedupeObjectIdStrings(update.amenities);
  }

  const property = await populateProperty(
    Property.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    })
  );
  if (!property) {
    throw httpError(404, 'Property not found');
  }
  logAction('property-update', { userId: req.user._id, success: true, detail: { propertyId: req.params.id } });
  res.json(property);
});

// @desc    Delete one image from a property (removes from Spaces and DB)
// @route   DELETE /api/properties/:id/images/:index
// @access  Private (host or admin for this property)
exports.deletePropertyImage = asyncHandler(async (req, res) => {
  const property = await Property.findById(req.params.id);
  if (!property) {
    throw httpError(404, 'Property not found');
  }

  assertPropertyAccess(property, req.user);

  const index = parseInt(req.params.index, 10);
  if (Number.isNaN(index) || index < 0 || index >= property.images.length) {
    throw httpError(400, 'Invalid image index');
  }

  const removed = property.images[index];
  const wasMain = removed && removed.isMain;

  await deleteFromSpacesByUrl(removed.url);
  property.images.splice(index, 1);

  if (wasMain && property.images.length > 0) {
    property.images[0].isMain = true;
  }
  await property.save();

  logAction('image-delete', {
    userId: req.user._id,
    success: true,
    detail: { propertyId: property._id, imageUrl: removed.url },
  });

  res.json({ message: 'Image removed', property: property });
});

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (host or admin)
exports.deleteProperty = asyncHandler(async (req, res) => {
  const existing = await Property.findById(req.params.id);
  if (!existing) {
    throw httpError(404, 'Property not found');
  }

  assertPropertyAccess(existing, req.user);

  await existing.deleteOne();
  logAction('property-delete', { userId: req.user._id, success: true, detail: { propertyId: req.params.id } });
  res.json({ message: 'Property deleted' });
});
