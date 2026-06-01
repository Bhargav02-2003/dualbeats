const express = require('express');
const router = express.Router();
const { searchYouTube } = require('../controllers/youtubeController');
const { protect } = require('../middleware/authMiddleware');

// Protected: only logged-in users can search
router.get('/search', protect, searchYouTube);

module.exports = router;
