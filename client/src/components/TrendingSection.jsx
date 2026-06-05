import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * TrendingSection — YouTube Music-style trending & suggestions rows
 * Props:
 *   onPlay(video) — play a song
 *   onAddToQueue(video) — add to queue
 *   onSaveToggle(video) — save/unsave
 *   savedVideoIds — Set of saved video IDs
 *   currentVideoId — currently playing video ID (for suggestions)
 *   currentVideoTitle — currently playing video title (for suggestions)
 */
const TrendingSection = ({
  onPlay,
  onAddToQueue,
  onSaveToggle,
  savedVideoIds,
  currentVideoId,
  currentVideoTitle,
}) => {
  const [trending, setTrending] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Trending');

  const CATEGORIES = ['Trending', 'Pop', 'Hip-Hop', 'Electronic', 'Bollywood', 'Lo-fi'];

  // Fetch trending / category
  const fetchTrending = useCallback(async (category = 'Trending') => {
    setTrendingLoading(true);
    try {
      let endpoint = '/api/youtube/trending';
      if (category !== 'Trending') {
        // Use search for specific categories
        const { data } = await api.get(`/api/youtube/search?q=${encodeURIComponent(category + ' music hits 2025')}`);
        setTrending(data.results || []);
        setTrendingLoading(false);
        return;
      }
      const { data } = await api.get(endpoint);
      setTrending(data.videos || []);
    } catch {
      setTrending([]);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  // Fetch suggestions based on current song
  const fetchSuggestions = useCallback(async () => {
    if (!currentVideoId && !currentVideoTitle) return;
    setSuggestionsLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentVideoId) params.set('videoId', currentVideoId);
      if (currentVideoTitle) params.set('title', currentVideoTitle);
      const { data } = await api.get(`/api/youtube/suggestions?${params}`);
      setSuggestions(data.videos || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  }, [currentVideoId, currentVideoTitle]);

  useEffect(() => { fetchTrending('Trending'); }, [fetchTrending]);
  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    fetchTrending(cat);
  };

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Category chips ── */}
      <div className="scroll-row">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`chip flex-shrink-0 ${activeCategory === cat ? 'active' : ''}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Trending / Category Songs ── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">
            {activeCategory === 'Trending' ? '🔥 Trending' : `🎵 ${activeCategory}`}
          </h2>
          <button
            onClick={() => fetchTrending(activeCategory)}
            className="text-text-muted hover:text-text-primary text-xs transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {trendingLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="w-full aspect-video bg-border rounded-xl mb-2" />
                <div className="h-3 bg-border rounded w-3/4 mb-1" />
                <div className="h-3 bg-border rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="text-center py-10 text-text-muted text-sm">No songs found. Try refreshing.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {trending.map((video) => (
              <SongCard
                key={video.videoId}
                video={video}
                isSaved={savedVideoIds?.has(video.videoId)}
                onPlay={onPlay}
                onAddToQueue={onAddToQueue}
                onSaveToggle={onSaveToggle}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Suggestions (based on currently playing) ── */}
      {(currentVideoId || currentVideoTitle) && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-title">✨ Suggested for you</h2>
            <button
              onClick={fetchSuggestions}
              className="text-text-muted hover:text-text-primary text-xs transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>

          {suggestionsLoading ? (
            <div className="scroll-row">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-40 animate-pulse">
                  <div className="w-40 h-24 bg-border rounded-xl mb-2" />
                  <div className="h-3 bg-border rounded w-3/4 mb-1" />
                  <div className="h-3 bg-border rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : suggestions.length > 0 ? (
            <div className="scroll-row">
              {suggestions.map((video) => (
                <div key={video.videoId} className="flex-shrink-0 w-40">
                  <SongCard
                    video={video}
                    isSaved={savedVideoIds?.has(video.videoId)}
                    onPlay={onPlay}
                    onAddToQueue={onAddToQueue}
                    onSaveToggle={onSaveToggle}
                    compact
                  />
                </div>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
};

// ── Song Card ────────────────────────────────────────────────────────────────
const SongCard = ({ video, isSaved, onPlay, onAddToQueue, onSaveToggle, compact }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="song-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Thumbnail */}
      <div className="thumb-wrap w-full aspect-video rounded-xl overflow-hidden relative mb-2 flex-shrink-0">
        <img
          src={video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`; }}
        />
        {/* Play overlay */}
        <div className={`play-overlay ${hovered ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={() => onPlay && onPlay(video)}
            className="w-10 h-10 bg-accent rounded-full flex items-center justify-center hover:bg-accentDark transition-colors shadow-xl"
          >
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>
        {/* Duration badge */}
        {video.duration && (
          <div className="absolute bottom-1 right-1 bg-black bg-opacity-80 text-white text-xs px-1 rounded">
            {video.duration}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="px-0.5">
        <p className="text-text-primary text-xs font-semibold line-clamp-2 leading-snug">{video.title}</p>
        <p className="text-text-muted text-xs truncate mt-0.5">{video.channelName}</p>
      </div>

      {/* Action buttons */}
      <div className={`flex items-center gap-1 mt-1.5 px-0.5 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`}>
        {onAddToQueue && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToQueue(video); }}
            className="p-1 rounded-lg text-text-muted hover:text-accent hover:bg-accentMuted transition-all text-xs flex items-center gap-0.5"
            title="Add to queue"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onSaveToggle && onSaveToggle(video); }}
          className={`p-1 rounded-lg transition-all ${isSaved ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
          title={isSaved ? 'Remove from library' : 'Save to library'}
        >
          <svg className="w-3.5 h-3.5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TrendingSection;
