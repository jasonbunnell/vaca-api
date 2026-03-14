const { body } = require('express-validator');

const createProperty = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('slug').optional().trim().isLength({ max: 200 }),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('bedrooms').isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms').isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
  body('lake').optional().trim().isLength({ max: 100 }),
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
  body('bedrooms').optional().isInt({ min: 0 }).withMessage('Bedrooms must be a non-negative integer'),
  body('bathrooms').optional().isInt({ min: 0 }).withMessage('Bathrooms must be a non-negative integer'),
  body('lake').optional().trim().isLength({ max: 100 }),
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
