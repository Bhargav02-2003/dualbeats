import React from 'react';

const SearchResults = ({ results, loading, onSelect, activeVideoId, playerId }) => {
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

  return (
    <div className="px-4 pb-4 space-y-1 max-h-72 overflow-y-auto">
      <p className="text-text-muted text-xs mb-2 px-1 uppercase tracking-wide">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </p>
      {results.map((video, i) => {
        const isActive = video.videoId === activeVideoId;
        return (
          <button
            key={video.videoId}
            id={`result-${playerId}-${i}`}
            onClick={() => onSelect(video)}
            className={`search-result-item w-full text-left ${isActive ? 'active' : ''}`}
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
        );
      })}
    </div>
  );
};

export default SearchResults;
