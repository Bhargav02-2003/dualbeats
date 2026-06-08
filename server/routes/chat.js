const express = require('express');
const router = express.Router();
const { getHistory, clearHistory } = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes are protected (require login)
router.get('/:roomCode/history', protect, getHistory);
router.delete('/:roomCode', protect, clearHistory);

module.exports = router;
