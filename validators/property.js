const { body } = require('express-validator');
const Property = require('../models/Property');

const lakeValidator = body('lake')
  .optional()
  .trim()
  .custom((v) => {
    if (v === '' || v == null) return true;
    return Property.FINGER_LAKES.includes(v);
  })
  .withMessage('Invalid lake');

const createProperty = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('slug').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('bedrooms').isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms').isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
  body('beds').isInt({ min: 0 }).withMessage('Beds must be a non-negative integer'),
  body('guests').isInt({ min: 1 }).withMessage('Guests (max occupancy) must be at least 1'),
  lakeValidator,
  body('amenities').optional().isArray(),
  body('features').optional().isArray(),
  body('host')
    .optional()
    .custom((v) => {
      const arr = Array.isArray(v) ? v : [v];
      return arr.every((id) => /^[a-fA-F0-9]{24}$/.test(String(id)));
    })
    .withMessage('host must be a single User ObjectId or array of ObjectIds'),
];

const updateProperty = [
  body('title').optional().trim().isLength({ max: 200 }),
  body('slug').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('address').optional().trim().isLength({ max: 500 }),
  body('bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms').optional().isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
  body('beds').optional().isInt({ min: 0 }).withMessage('Beds must be a non-negative integer'),
  body('guests').optional().isInt({ min: 1 }).withMessage('Guests must be at least 1'),
  lakeValidator,
  body('amenities').optional().isArray(),
  body('features').optional().isArray(),
  body('host')
    .optional()
    .custom((v) => {
      const arr = Array.isArray(v) ? v : [v];
      return arr.every((id) => /^[a-fA-F0-9]{24}$/.test(String(id)));
    })
    .withMessage('host must be a single User ObjectId or array of ObjectIds'),
];

module.exports = { createProperty, updateProperty };
