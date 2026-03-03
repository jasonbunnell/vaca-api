const express = require('express');
const router = express.Router();
const { login, getMe, changePassword, forgotPassword, resetPassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');

router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;

