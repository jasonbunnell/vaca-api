const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  getMyProperties,
  createProperty,
  updateProperty,
  deleteProperty,
  deletePropertyImage,
} = require('../controllers/property');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const propertyValidators = require('../validators/property');

router
  .route('/')
  .get(getProperties)
  .post(protect, authorize('host', 'admin'), propertyValidators.createProperty, handleValidationErrors, createProperty);

router.get('/my', protect, getMyProperties);

router.delete(
  '/:id/images/:index',
  protect,
  authorize('host', 'admin'),
  deletePropertyImage
);

router
  .route('/:id')
  .get(getProperty)
  .put(protect, authorize('host', 'admin'), propertyValidators.updateProperty, handleValidationErrors, updateProperty)
  .delete(protect, authorize('host', 'admin'), deleteProperty);

module.exports = router;
