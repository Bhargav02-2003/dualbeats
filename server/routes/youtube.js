const express = require('express');
const router = express.Router();
const { searchYouTube, getTrending, getSuggestions } = require('../controllers/youtubeController');
const { protect } = require('../middleware/authMiddleware');

// Protected: only logged-in users
router.get('/search', protect, searchYouTube);
router.get('/trending', protect, getTrending);
router.get('/suggestions', protect, getSuggestions);

module.exports = router;
