const express = require('express');
const router = express.Router();
const { login, getMe, changePassword, forgotPassword, resetPassword } = require('../controllers/auth');
const { protect } = require('../middleware/auth');
const { rateLimitByEmail, rateLimitAuthByIp } = require('../middleware/rateLimit');
const { handleValidationErrors } = require('../middleware/validate');
const authValidators = require('../validators/auth');

router.post('/login', rateLimitByEmail, authValidators.login, handleValidationErrors, login);
router.get('/me', protect, getMe);
router.post('/change-password', protect, authValidators.changePassword, handleValidationErrors, changePassword);
router.post('/forgot-password', rateLimitByEmail, authValidators.forgotPassword, handleValidationErrors, forgotPassword);
router.post('/reset-password', rateLimitAuthByIp, authValidators.resetPassword, handleValidationErrors, resetPassword);

module.exports = router;

