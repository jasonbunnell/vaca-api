const mongoose = require('mongoose');
const Property = require('../models/Property');
const { logAction } = require('../utils/securityLogger');
const { deleteFromSpacesByUrl } = require('./upload');

// @desc    Get all properties (optional: ?lake=Name&page=1&limit=20 → { items, total, page, limit })
// @route   GET /api/properties
// @access  Public
exports.getProperties = async (req, res) => {
  try {
    const { lake } = req.query;
    const hasPagination = req.query.page != null || req.query.limit != null;
    const page = Math.max(parseInt(String(req.query.page), 10) || 1, 1);
    const limitRaw = parseInt(String(req.query.limit), 10);
    const limit = Math.min(Math.max(Number.isNaN(limitRaw) ? 20 : limitRaw, 1), 100);

    const q = {};
    if (lake) {
      q.lake = lake;
    }

    const base = Property.find(q).populate('host', 'name email role').sort({ createdAt: -1 });

    if (hasPagination) {
      const [items, total] = await Promise.all([
        base
          .clone()
          .skip((page - 1) * limit)
          .limit(limit)
          .exec(),
        Property.countDocuments(q),
      ]);
      return res.json({ items, total, page, limit });
    }

    const properties = await base.exec();
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get single property (by slug or id)
// @route   GET /api/properties/:slugOrId
// @access  Public
exports.getProperty = async (req, res) => {
  try {
    const { id } = req.params;
    let property = null;

    // Prefer slug lookup so URLs can be /properties/:slug
    property = await Property.findOne({ slug: id }).populate('host', 'name email role');

    // Fallback to ObjectId for existing ID-based URLs
    if (!property && mongoose.Types.ObjectId.isValid(id)) {
      property = await Property.findById(id).populate('host', 'name email role');
    }
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get properties for current user
// @route   GET /api/properties/my
// @access  Private
exports.getMyProperties = async (req, res) => {
  try {
    const properties = await Property.find({ host: req.user._id }).populate('host', 'name email role');
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create property
// @route   POST /api/properties
// @access  Private (host or admin)
exports.createProperty = async (req, res) => {
  try {
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
      return res.status(400).json({ error: 'At least one host is required.' });
    }

    const { host, owner, ...rest } = req.body;
    const property = await Property.create({
      ...rest,
      host: hostIds,
    });
    logAction('property-create', { userId: req.user._id, success: true, detail: { propertyId: property._id } });
    const populated = await Property.findById(property._id).populate('host', 'name email role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (host or admin); ownership = user's _id in property.host array
exports.updateProperty = async (req, res) => {
  try {
    const existing = await Property.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const hostIds = existing.host || [];
    const isHost = hostIds.some((h) => h && h.toString() === req.user?._id?.toString());

    if (!isAdmin && !isHost) {
      return res.status(403).json({ error: 'Forbidden: you are not a host of this property.' });
    }

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
        return res.status(400).json({ error: 'Property must have at least one host.' });
      }
      if (!isAdmin && normalized.every((id) => id !== req.user._id.toString())) {
        return res.status(400).json({ error: 'You cannot remove yourself from the host list.' });
      }
      update.host = normalized;
    } else if (!isAdmin) {
      delete update.host;
    }

    const property = await Property.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    }).populate('host', 'name email role');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    logAction('property-update', { userId: req.user._id, success: true, detail: { propertyId: req.params.id } });
    res.json(property);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Delete one image from a property (removes from Spaces and DB)
// @route   DELETE /api/properties/:id/images/:index
// @access  Private (host or admin for this property)
exports.deletePropertyImage = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const hostIds = property.host || [];
    const isHost = hostIds.some((h) => h && h.toString() === req.user?._id?.toString());
    if (!isAdmin && !isHost) {
      return res.status(403).json({ error: 'Forbidden: you are not a host of this property.' });
    }

    const index = parseInt(req.params.index, 10);
    if (Number.isNaN(index) || index < 0 || index >= property.images.length) {
      return res.status(400).json({ error: 'Invalid image index' });
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (host or admin)
exports.deleteProperty = async (req, res) => {
  try {
    const existing = await Property.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const isAdmin = req.user?.role === 'admin';
    const hostIds = existing.host || [];
    const isHost = hostIds.some((h) => h && h.toString() === req.user?._id?.toString());

    if (!isAdmin && !isHost) {
      return res.status(403).json({ error: 'Forbidden: you are not a host of this property.' });
    }

    await existing.deleteOne();
    logAction('property-delete', { userId: req.user._id, success: true, detail: { propertyId: req.params.id } });
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
