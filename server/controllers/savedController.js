const User = require('../models/User');

/**
 * GET /api/saved
 * Get all saved songs for the logged-in user
 */
const getSavedSongs = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('savedSongs');
    // Return newest saved first
    const songs = [...(user.savedSongs || [])].sort(
      (a, b) => new Date(b.savedAt) - new Date(a.savedAt)
    );
    res.json({ songs });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch saved songs.' });
  }
};

/**
 * POST /api/saved
 * Save a song to the user's library
 * Body: { videoId, title, channelName, thumbnail, duration }
 */
const saveSong = async (req, res) => {
  try {
    const { videoId, title, channelName, thumbnail, duration } = req.body;

    if (!videoId || !title) {
      return res.status(400).json({ message: 'videoId and title are required.' });
    }

    const user = await User.findById(req.user._id);

    // Avoid duplicates
    const alreadySaved = user.savedSongs.some((s) => s.videoId === videoId);
    if (alreadySaved) {
      return res.status(409).json({ message: 'Song already saved.', alreadySaved: true });
    }

    user.savedSongs.push({ videoId, title, channelName, thumbnail, duration });
    await user.save();

    res.status(201).json({ message: 'Song saved!', song: user.savedSongs[user.savedSongs.length - 1] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to save song.' });
  }
};

/**
 * DELETE /api/saved/:videoId
 * Remove a saved song from the user's library
 */
const removeSong = async (req, res) => {
  try {
    const { videoId } = req.params;
    const user = await User.findById(req.user._id);

    const originalCount = user.savedSongs.length;
    user.savedSongs = user.savedSongs.filter((s) => s.videoId !== videoId);

    if (user.savedSongs.length === originalCount) {
      return res.status(404).json({ message: 'Song not found in saved list.' });
    }

    await user.save();
    res.json({ message: 'Song removed from library.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove song.' });
  }
};

module.exports = { getSavedSongs, saveSong, removeSong };
