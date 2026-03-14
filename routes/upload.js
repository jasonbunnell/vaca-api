const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

const { uploadImage } = require('../controllers/upload');

router.post('/image', protect, authorize('host', 'admin'), upload.single('image'), uploadImage);

module.exports = router;
