import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

/**
 * SavedSongs — shows the user's saved music library in YTM style
 * Props:
 *   onPlay(song)       — play a single song
 *   onPlayAll(songs)   — load all songs into queue and play from first
 *   onAddToQueue(song) — add a single song to queue
 *   refreshTrigger     — increment to force re-fetch
 *   savedVideoIds      — Set of saved videoIds
 *   onLibraryChange    — called when library changes
 */
const SavedSongs = ({ onPlay, onPlayAll, onAddToQueue, refreshTrigger, savedVideoIds, onLibraryChange }) => {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
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

  useEffect(() => { fetchSaved(); }, [fetchSaved, refreshTrigger]);

  const handleRemove = async (videoId) => {
    setRemoving(videoId);
    try {
      await api.delete(`/api/saved/${videoId}`);
      const updated = songs.filter((s) => s.videoId !== videoId);
      setSongs(updated);
      if (onLibraryChange) onLibraryChange(new Set(updated.map((s) => s.videoId)));
    } catch {} finally {
      setRemoving(null);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header — click to collapse/expand */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-cardHover transition-colors select-none"
        onClick={() => setCollapsed((c) => !c)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-accentMuted flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 24 24">
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

        <div className="flex items-center gap-2">
          {/* Play All button — stop propagation so it doesn't toggle collapse */}
          {!loading && songs.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPlayAll && onPlayAll(songs);
              }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-accent text-white font-semibold hover:bg-accentDark transition-all shadow-sm"
              title="Play all saved songs"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play All
            </button>
          )}

          {/* Collapse chevron */}
          <svg
            className={`w-4 h-4 text-text-muted transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-border">
          {loading ? (
            <div className="p-3 space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3 p-2.5 animate-pulse">
                  <div className="w-14 h-10 bg-border rounded-lg flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-border rounded w-3/4" />
                    <div className="h-2.5 bg-border rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : songs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="w-14 h-14 rounded-full bg-accentMuted flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-accent opacity-60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <p className="text-text-primary text-sm font-semibold">Your library is empty</p>
              <p className="text-text-muted text-xs mt-1 max-w-xs">
                Tap ♥ on any song to save it here
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border max-h-80 overflow-y-auto">
              {songs.map((song, idx) => (
                <div
                  key={song.videoId}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-cardHover transition-colors group cursor-pointer"
                  onClick={() => onPlay && onPlay(song)}
                >
                  {/* Index — hidden on hover, replaced by play icon */}
                  <span className="text-text-muted text-xs w-5 text-center flex-shrink-0 group-hover:hidden">
                    {idx + 1}
                  </span>
                  <svg
                    className="w-4 h-4 text-text-primary hidden group-hover:block flex-shrink-0"
                    fill="currentColor" viewBox="0 0 24 24"
                  >
                    <path d="M8 5v14l11-7z"/>
                  </svg>

                  {/* Thumbnail */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={song.thumbnail || `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`}
                      alt={song.title}
                      className="w-10 h-10 object-cover rounded-lg"
                      onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`; }}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary text-xs font-semibold truncate" title={song.title}>{song.title}</p>
                    <p className="text-text-muted text-xs truncate">{song.channelName}</p>
                  </div>

                  {/* Duration */}
                  {song.duration && (
                    <span className="text-text-muted text-xs flex-shrink-0 opacity-70 hidden sm:block">{song.duration}</span>
                  )}

                  {/* Action buttons — visible on hover */}
                  <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Add to Queue */}
                    {onAddToQueue && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onAddToQueue(song); }}
                        className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accentMuted transition-all"
                        title="Add to queue"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    )}
                    {/* Remove from library */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemove(song.videoId); }}
                      disabled={removing === song.videoId}
                      className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error hover:bg-opacity-10 transition-all"
                      title="Remove from library"
                    >
                      {removing === song.videoId ? (
                        <span className="spinner-sm" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
