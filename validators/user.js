const { body } = require('express-validator');

const createUser = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 100 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Valid email is required'),
  body('phone').optional({ values: 'null' }).trim().isLength({ max: 50 }),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('role').optional().isIn(['user', 'host', 'admin']).withMessage('Invalid role'),
];

const updateUser = [
  body('firstName').optional().trim().isLength({ max: 100 }),
  body('lastName').optional().trim().isLength({ max: 100 }),
  body('phone').optional({ values: 'null' }).trim().isLength({ max: 50 }),
  body('role').optional().isIn(['user', 'host', 'admin']).withMessage('Invalid role'),
];

module.exports = { createUser, updateUser };
