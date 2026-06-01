const yts = require('yt-search');

/**
 * GET /api/youtube/search?q=QUERY
 * Searches YouTube using yt-search (no API key required)
 */
const searchYouTube = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.status(400).json({ message: 'Search query is required.' });
    }

    // Search YouTube Music — append "music" to bias results toward songs
    const searchQuery = `${q.trim()} music`;
    const result = await yts(searchQuery);

    const videos = result.videos.slice(0, 8);

    const results = videos.map((video) => ({
      videoId: video.videoId,
      title: video.title,
      channelName: video.author?.name || 'Unknown Artist',
      thumbnail:
        video.thumbnail ||
        `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
      duration: video.timestamp,
      views: video.views,
    }));

    res.status(200).json({ results });
  } catch (error) {
    console.error('YouTube search error:', error.message);

    if (error.message?.includes('timeout') || error.code === 'ECONNABORTED') {
      return res.status(504).json({
        message: 'Search timed out. Please try again.',
        results: [],
      });
    }

    res.status(500).json({
      message: 'Failed to search YouTube. Please try again.',
      results: [],
    });
  }
};

module.exports = { searchYouTube };

