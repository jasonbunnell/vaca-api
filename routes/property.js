const express = require('express');
const router = express.Router();
const {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} = require('../controllers/property');
const { protect, authorize } = require('../middleware/auth');

router
  .route('/')
  .get(getProperties)
  .post(protect, authorize('host', 'admin'), createProperty);

router
  .route('/:id')
  .get(getProperty)
  .put(protect, authorize('host', 'admin'), updateProperty)
  .delete(protect, authorize('host', 'admin'), deleteProperty);

module.exports = router;
