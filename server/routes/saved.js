const express = require('express');
const router = express.Router();
const { getSavedSongs, saveSong, removeSong } = require('../controllers/savedController');
const { protect } = require('../middleware/authMiddleware');

// All saved routes are protected (require login)
router.get('/', protect, getSavedSongs);
router.post('/', protect, saveSong);
router.delete('/:videoId', protect, removeSong);

module.exports = router;
