const Message = require('../models/Message');

/**
 * GET /api/chat/:roomCode/history
 * Returns last 50 messages for a room, sorted oldest first
 */
const getHistory = async (req, res) => {
  try {
    const { roomCode } = req.params;
    const messages = await Message.find({ roomCode })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
    res.json({ success: true, messages });
  } catch (err) {
    console.error('getHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch chat history' });
  }
};

/**
 * DELETE /api/chat/:roomCode
 * Clear all messages for a room (any authenticated member can call this)
 */
const clearHistory = async (req, res) => {
  try {
    const { roomCode } = req.params;
    await Message.deleteMany({ roomCode });
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (err) {
    console.error('clearHistory error:', err);
    res.status(500).json({ success: false, message: 'Failed to clear chat history' });
  }
};

module.exports = { getHistory, clearHistory };
