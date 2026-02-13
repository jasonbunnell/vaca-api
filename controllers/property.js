const Property = require('../models/Property');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Public (Phase 1; auth in Phase 2)
exports.getProperties = async (req, res) => {
  try {
    const properties = await Property.find().populate('owner', 'name email role');
    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Public
exports.getProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('owner', 'name email role');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Create property
// @route   POST /api/properties
// @access  Private (Phase 2: host/admin only)
exports.createProperty = async (req, res) => {
  try {
    const property = await Property.create(req.body);
    const populated = await Property.findById(property._id).populate('owner', 'name email role');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private (Phase 2: owner or admin)
exports.updateProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('owner', 'name email role');
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private (Phase 2: owner or admin)
exports.deleteProperty = async (req, res) => {
  try {
    const property = await Property.findByIdAndDelete(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
