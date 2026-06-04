import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * SavedSongs — shows the user's saved music library
 * Props:
 *   onPlay(video, playerId) — called when user clicks play
 *   refreshTrigger — increment to force re-fetch
 *   savedVideoIds — Set of saved videoIds (for parent state sync)
 *   onLibraryChange(newSet) — called when library changes
 */
const SavedSongs = ({ onPlay, refreshTrigger, savedVideoIds, onLibraryChange }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null); // videoId being removed
  const [collapsed, setCollapsed] = useState(false);

  const fetchSaved = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/api/saved');
      setSongs(data.songs || []);
      if (onLibraryChange) {
        onLibraryChange(new Set((data.songs || []).map((s) => s.videoId)));
      }
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  }, [onLibraryChange]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved, refreshTrigger]);

  const handleRemove = async (videoId) => {
    setRemoving(videoId);
    try {
      await api.delete(`/api/saved/${videoId}`);
      const updated = songs.filter((s) => s.videoId !== videoId);
      setSongs(updated);
      if (onLibraryChange) {
        onLibraryChange(new Set(updated.map((s) => s.videoId)));
      }
    } catch {
      // Silently fail
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-cardHover transition-colors"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-red-500 bg-opacity-20 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-text-primary font-bold text-sm">My Library</h3>
            <p className="text-text-muted text-xs">
              {loading ? 'Loading…' : `${songs.length} saved song${songs.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-border">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-2 animate-pulse">
                  <div className="w-12 h-9 bg-border rounded-lg flex-shrink-0"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-border rounded w-3/4"></div>
                    <div className="h-3 bg-border rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="text-4xl mb-3 opacity-30">🎵</div>
              <p className="text-text-muted text-sm">No saved songs yet</p>
              <p className="text-text-muted text-xs mt-1">
                Click the ♡ on any search result to save it here
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-1 p-3 max-h-80 overflow-y-auto">
              {songs.map((song) => (
                <div
                  key={song.videoId}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-cardHover transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={song.thumbnail || `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`}
                      alt={song.title}
                      className="w-12 h-9 object-cover rounded-lg"
                      onError={(e) => {
                        e.target.src = `https://via.placeholder.com/48x36/1a1a1a/6c5ce7?text=♪`;
                      }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-xs font-medium truncate" title={song.title}>
                      {song.title}
                    </p>
                    <p className="text-text-muted text-xs truncate">{song.channelName}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Play */}
                    <button
                      onClick={() => onPlay && onPlay(song)}
                      className="p-1.5 rounded-lg bg-accent bg-opacity-20 hover:bg-opacity-40 text-accent transition-all"
                      title="Play now"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                    {/* Remove */}
                    <button
                      onClick={() => handleRemove(song.videoId)}
                      disabled={removing === song.videoId}
                      className="p-1.5 rounded-lg bg-red-500 bg-opacity-10 hover:bg-opacity-30 text-red-400 transition-all"
                      title="Remove from library"
                    >
                      {removing === song.videoId ? (
                        <span className="spinner w-3 h-3"></span>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SavedSongs;
