import React from 'react';
import api from '../api/axios';

const SearchResults = ({ results, loading, onSelect, activeVideoId, playerId, savedVideoIds, onSaveToggle, onAddToQueue }) => {
  if (loading) {
    return (
      <div className="px-4 pb-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-xl animate-pulse">
            <div className="w-16 h-12 bg-border rounded-lg flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-border rounded w-3/4"></div>
              <div className="h-3 bg-border rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) return null;

  const handleSaveToggle = async (e, video) => {
    e.stopPropagation();
    if (onSaveToggle) onSaveToggle(video);
  };

  return (
    <div className="px-4 pb-4 space-y-1 max-h-72 overflow-y-auto">
      <p className="text-text-muted text-xs mb-2 px-1 uppercase tracking-wide">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </p>
      {results.map((video, i) => {
        const isActive = video.videoId === activeVideoId;
        const isSaved = savedVideoIds?.has(video.videoId);
        return (
          <div
            key={video.videoId}
            className={`search-result-item w-full text-left ${isActive ? 'active' : ''} flex items-center gap-3`}
          >
            {/* Clickable area */}
            <button
              id={`result-${playerId}-${i}`}
              onClick={() => onSelect(video)}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
              title={video.title}
            >
              {/* Thumbnail */}
              <div className="relative flex-shrink-0">
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-16 h-12 object-cover rounded-lg"
                  loading="lazy"
                  onError={(e) => {
                    e.target.src = `https://via.placeholder.com/64x48/1a1a1a/6c5ce7?text=♪`;
                  }}
                />
                {isActive && (
                  <div className="absolute inset-0 bg-accent bg-opacity-30 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm">▶</span>
                  </div>
                )}
                {/* YouTube Music badge for Topic channels */}
                {video.isMusicChannel && (
                  <div className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center" title="YouTube Music">
                    <span className="text-white text-xs font-bold leading-none">♪</span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-medium line-clamp-2 leading-tight ${
                    isActive ? 'text-accentLight' : 'text-text-primary'
                  }`}
                >
                  {video.title}
                </p>
                <p className="text-text-muted text-xs mt-0.5 truncate">{video.channelName}</p>
              </div>

              {/* Playing indicator */}
              {isActive && (
                <div className="flex-shrink-0 flex flex-col gap-0.5">
                  {[1, 2, 3].map((bar) => (
                    <div
                      key={bar}
                      className="w-0.5 bg-accent rounded-full animate-pulse-slow"
                      style={{ height: `${bar * 4}px`, animationDelay: `${bar * 0.15}s` }}
                    ></div>
                  ))}
                </div>
              )}
            </button>

            {/* Action buttons */}
            <div className="flex-shrink-0 flex items-center gap-1">
              {/* Add to Queue */}
              {onAddToQueue && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToQueue(video); }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent hover:bg-opacity-10 transition-all duration-200 hover:scale-110"
                  title="Add to queue"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              {/* Save / Heart */}
              <button
                onClick={(e) => handleSaveToggle(e, video)}
                className={`p-1.5 rounded-lg transition-all duration-200 hover:scale-110 ${
                  isSaved ? 'text-red-400 hover:text-red-300' : 'text-text-muted hover:text-red-400'
                }`}
                title={isSaved ? 'Remove from library' : 'Save to library'}
              >
                <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SearchResults;
