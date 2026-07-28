const express = require('express');
const rateLimit = require('express-rate-limit');
const { honeypot } = require('../middleware/honeypot');
const { submitContact } = require('../controllers/contact');

const router = express.Router();

// 5 submissions/hour/IP is plenty for humans, hostile for bots.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages — please try again later.' },
});

router.post('/', contactLimiter, honeypot('website'), submitContact);

module.exports = router;
