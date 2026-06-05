import React from 'react';

const SearchResults = ({ results, loading, onSelect, activeVideoId, playerId, savedVideoIds, onSaveToggle, onAddToQueue }) => {
  if (loading) {
    return (
      <div className="px-3 pb-3 space-y-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-2.5 rounded-lg animate-pulse">
            <div className="w-16 h-11 bg-border rounded-lg flex-shrink-0" />
            <div className="flex-1 space-y-2 py-1">
              <div className="h-3 bg-border rounded w-3/4" />
              <div className="h-2.5 bg-border rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) return null;

  return (
    <div className="px-3 pb-3 space-y-0.5 max-h-80 overflow-y-auto">
      <p className="text-text-muted text-xs mb-2 px-1 uppercase tracking-wider font-semibold">
        {results.length} result{results.length !== 1 ? 's' : ''}
      </p>

      {results.map((video, i) => {
        const isActive = video.videoId === activeVideoId;
        const isSaved = savedVideoIds?.has(video.videoId);

        return (
          <div
            key={video.videoId}
            className={`search-result-item ${isActive ? 'active' : ''}`}
          >
            {/* Clickable main area */}
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
                  className="w-16 h-11 object-cover rounded-lg"
                  loading="lazy"
                  onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`; }}
                />
                {/* Playing indicator overlay */}
                {isActive && (
                  <div className="absolute inset-0 bg-accent bg-opacity-40 rounded-lg flex items-center justify-center">
                    <div className="flex items-end gap-0.5 h-4">
                      <span className="eq-bar" style={{ height: '8px', animationDelay: '0s' }} />
                      <span className="eq-bar" style={{ height: '14px', animationDelay: '0.15s' }} />
                      <span className="eq-bar" style={{ height: '6px', animationDelay: '0.3s' }} />
                    </div>
                  </div>
                )}
                {/* Music badge */}
                {video.isMusicChannel && !isActive && (
                  <div className="absolute -top-1 -right-1 bg-accent rounded-full w-4 h-4 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold line-clamp-2 leading-tight ${isActive ? 'text-accent' : 'text-text-primary'}`}>
                  {video.title}
                </p>
                <p className="text-text-muted text-xs mt-0.5 truncate">{video.channelName}</p>
                {video.duration && (
                  <p className="text-text-muted text-xs mt-0.5 opacity-70">{video.duration}</p>
                )}
              </div>
            </button>

            {/* Action buttons */}
            <div className="flex-shrink-0 flex items-center gap-0.5">
              {onAddToQueue && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToQueue(video); }}
                  className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accentMuted transition-all"
                  title="Add to queue"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onSaveToggle && onSaveToggle(video); }}
                className={`p-1.5 rounded-lg transition-all ${isSaved ? 'text-accent' : 'text-text-muted hover:text-accent hover:bg-accentMuted'}`}
                title={isSaved ? 'Remove from library' : 'Save to library'}
              >
                <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
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
