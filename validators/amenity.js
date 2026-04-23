const { body, param } = require('express-validator');
const Amenity = require('../models/Amenity');

const AMENITY_CATEGORIES = Amenity.CATEGORIES || [
  'location',
  'essentials',
  'kitchen',
  'outside',
  'entertainment',
  'luxury',
  'environmentally-friendly',
];

const createAmenity = [
  body('displayName').trim().notEmpty().withMessage('displayName is required').isLength({ max: 120 }),
  body('name').optional().trim().isLength({ max: 120 }),
  body('category').trim().notEmpty().isIn(AMENITY_CATEGORIES).withMessage('Invalid category'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('color').optional().trim().isLength({ max: 64 }),
  body('icon').optional().trim().isLength({ max: 128 }),
  body('isActive').optional().isBoolean(),
];

const updateAmenity = [
  param('id').isMongoId().withMessage('Invalid amenity id'),
  body('displayName').optional().trim().notEmpty().isLength({ max: 120 }),
  body('name').optional().trim().isLength({ max: 120 }),
  body('category').optional().trim().isIn(AMENITY_CATEGORIES).withMessage('Invalid category'),
  body('description').optional().trim().isLength({ max: 2000 }),
  body('color').optional().trim().isLength({ max: 64 }),
  body('icon').optional().trim().isLength({ max: 128 }),
  body('isActive').optional().isBoolean(),
];

const deleteAmenity = [param('id').isMongoId().withMessage('Invalid amenity id')];

module.exports = { createAmenity, updateAmenity, deleteAmenity };
