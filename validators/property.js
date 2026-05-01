const { body } = require('express-validator');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { validateActiveAmenityIds } = require('../utils/amenityHelpers');

const amenitiesBodyValidator = body('amenities')
  .optional()
  .isArray()
  .withMessage('amenities must be an array')
  .custom(async (arr) => {
    if (!Array.isArray(arr)) return false;
    const ids = arr.map((x) => String(x).trim()).filter(Boolean);
    for (const id of ids) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Each amenity must be a valid Mongo ObjectId');
      }
    }
    const check = await validateActiveAmenityIds(ids);
    if (!check.ok) throw new Error(check.message);
    return true;
  });

const lakeValidator = body('lake')
  .optional()
  .trim()
  .custom((v) => {
    if (v === '' || v == null) return true;
    return Property.FINGER_LAKES.includes(v);
  })
  .withMessage('Invalid lake');

const vacaRentalSoftwareValidator = body('vacaRentalSoftware')
  .optional()
  .trim()
  .custom((v) => {
    if (v === '' || v == null) return true;
    return Property.VACA_RENTAL_SOFTWARE.includes(v);
  })
  .withMessage('Invalid vacation rental software');

const otaLinksValidator = body('otaLinks')
  .optional()
  .isArray({ max: 10 })
  .withMessage('otaLinks must be an array of up to 10 entries')
  .custom((arr) => {
    if (!Array.isArray(arr)) return false;
    for (const entry of arr) {
      if (!entry || typeof entry !== 'object') {
        throw new Error('Each otaLinks entry must be an object');
      }
      if (!Property.OTA_PROVIDERS.includes(entry.ota)) {
        throw new Error(`Invalid OTA provider: ${entry.ota}`);
      }
      const url = String(entry.url || '').trim();
      if (!/^https?:\/\/.+/i.test(url)) {
        throw new Error('Each otaLinks entry must include a valid http(s) URL');
      }
      if (entry.label != null && String(entry.label).length > 60) {
        throw new Error('OTA label must be 60 characters or fewer');
      }
    }
    return true;
  });

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
  vacaRentalSoftwareValidator,
  otaLinksValidator,
  amenitiesBodyValidator,
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
  vacaRentalSoftwareValidator,
  otaLinksValidator,
  amenitiesBodyValidator,
  body('host')
    .optional()
    .custom((v) => {
      const arr = Array.isArray(v) ? v : [v];
      return arr.every((id) => /^[a-fA-F0-9]{24}$/.test(String(id)));
    })
    .withMessage('host must be a single User ObjectId or array of ObjectIds'),
];

module.exports = { createProperty, updateProperty };
