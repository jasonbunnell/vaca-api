const express = require('express');
const router = express.Router();
const {
  getAmenities,
  createAmenity,
  updateAmenity,
  deleteAmenity,
} = require('../controllers/amenity');
const { protect, authorize, optionalProtect } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const amenityValidators = require('../validators/amenity');

router.get('/', optionalProtect, getAmenities);

router.post(
  '/',
  protect,
  authorize('admin'),
  amenityValidators.createAmenity,
  handleValidationErrors,
  createAmenity
);

router.put(
  '/:id',
  protect,
  authorize('admin'),
  amenityValidators.updateAmenity,
  handleValidationErrors,
  updateAmenity
);

router.delete(
  '/:id',
  protect,
  authorize('admin'),
  amenityValidators.deleteAmenity,
  handleValidationErrors,
  deleteAmenity
);

module.exports = router;
