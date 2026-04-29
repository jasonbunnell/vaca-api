const express = require('express');
const router = express.Router();
const {
  getMySubscriptions,
  createSubscription,
  cancelSubscription,
  createPortalSession,
} = require('../controllers/subscription');
const { protect } = require('../middleware/auth');

// NOTE: the webhook route is mounted separately in server.js with raw body
// parsing. It is intentionally NOT in this router.

router.get('/', protect, getMySubscriptions);
router.post('/', protect, createSubscription);
router.post('/portal-session', protect, createPortalSession);
router.post('/:id/cancel', protect, cancelSubscription);

module.exports = router;
