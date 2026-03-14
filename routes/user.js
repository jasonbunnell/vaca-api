const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/user');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validate');
const userValidators = require('../validators/user');

router
  .route('/')
  .get(protect, authorize('admin'), getUsers)
  .post(userValidators.createUser, handleValidationErrors, createUser);

router
  .route('/:id')
  .get(protect, getUser)
  .put(protect, userValidators.updateUser, handleValidationErrors, updateUser)
  .delete(protect, authorize('admin'), deleteUser);

module.exports = router;
