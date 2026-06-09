import React from 'react';

/**
 * QueueList — displays the upcoming song queue
 * Props:
 *   queue        — array of { videoId, title, channelName, thumbnail, duration }
 *   currentIdx   — index of currently playing song (-1 if none from queue)
 *   onPlay(idx)  — play a specific song in the queue
 *   onPlayAll()  — play from the first song in the queue
 *   onRemove(idx)— remove a song from queue
 *   onClear()    — clear the whole queue
 */
const QueueList = ({ queue, currentIdx, onPlay, onPlayAll, onRemove, onClear }) => {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accentMuted flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
            </svg>
          </div>
          <div>
            <h3 className="text-text-primary font-bold text-sm">Queue</h3>
            <p className="text-text-muted text-xs">{queue.length} song{queue.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Action buttons */}
        {queue.length > 0 && (
          <div className="flex items-center gap-1">
            {/* Play All */}
            <button
              onClick={() => onPlayAll && onPlayAll()}
              className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-accent text-white font-semibold hover:bg-accentDark transition-all"
              title="Play all songs from beginning"
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Play All
            </button>
            {/* Clear */}
            <button
              onClick={onClear}
              className="text-text-muted hover:text-error text-xs px-2 py-1.5 rounded-full hover:bg-error hover:bg-opacity-10 transition-all"
              title="Clear queue"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Queue items */}
      <div className="flex-1 overflow-y-auto">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
            <div className="w-12 h-12 rounded-full bg-accentMuted flex items-center justify-center mb-3 opacity-50">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
              </svg>
            </div>
            <p className="text-text-muted text-sm font-medium">Queue is empty</p>
            <p className="text-text-muted text-xs mt-1 leading-relaxed">
              Search a song and click <span className="text-accent font-semibold">+</span> to add it here
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {queue.map((song, idx) => {
              const isCurrent = idx === currentIdx;
              return (
                <div
                  key={`${song.videoId}-${idx}`}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all group cursor-pointer ${
                    isCurrent
                      ? 'bg-accentMuted border border-accent border-opacity-30'
                      : 'hover:bg-cardHover'
                  }`}
                  onClick={() => !isCurrent && onPlay(idx)}
                >
                  {/* Index / Playing indicator */}
                  <div className="w-5 flex-shrink-0 text-center">
                    {isCurrent ? (
                      <div className="flex items-end justify-center gap-0.5 h-4">
                        {[1, 2, 3].map((b) => (
                          <div
                            key={b}
                            className="w-0.5 bg-accent rounded-full animate-pulse-slow"
                            style={{ height: `${b * 4}px`, animationDelay: `${b * 0.15}s` }}
                          />
                        ))}
                      </div>
                    ) : (
                      <>
                        <span className="text-text-muted text-xs group-hover:hidden">{idx + 1}</span>
                        <svg className="w-3.5 h-3.5 text-text-primary hidden group-hover:block mx-auto" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z"/>
                        </svg>
                      </>
                    )}
                  </div>

                  {/* Thumbnail */}
                  <img
                    src={song.thumbnail || `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`}
                    alt={song.title}
                    className="w-10 h-8 object-cover rounded-lg flex-shrink-0"
                    onError={(e) => { e.target.src = `https://i.ytimg.com/vi/${song.videoId}/mqdefault.jpg`; }}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isCurrent ? 'text-accent' : 'text-text-primary'}`}>
                      {song.title}
                    </p>
                    <p className="text-text-muted text-xs truncate">{song.channelName}</p>
                  </div>

                  {/* Duration */}
                  {song.duration && (
                    <span className="text-text-muted text-xs flex-shrink-0 opacity-70">
                      {song.duration}
                    </span>
                  )}

                  {/* Remove — show on hover on desktop, always show on mobile */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(idx); }}
                    className="flex-shrink-0 p-1 rounded-lg text-text-muted hover:text-error hover:bg-error hover:bg-opacity-10 transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100"
                    title="Remove from queue"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QueueList;
