import React, { useEffect, useRef, useCallback, useState } from 'react';

// Track if the YouTube IFrame API script has been loaded globally
let ytApiLoaded = false;
let ytApiLoadPromise = null;

const loadYouTubeAPI = () => {
  if (ytApiLoadPromise) return ytApiLoadPromise;

  ytApiLoadPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve(window.YT);
      return;
    }

    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.head.appendChild(script);
    }

    const originalCallback = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      ytApiLoaded = true;
      if (originalCallback) originalCallback();
      resolve(window.YT);
    };
  });

  return ytApiLoadPromise;
};

/**
 * YouTubePlayer component
 * Props:
 *   playerId {string} - unique id for the player div
 *   videoId {string|null} - YouTube video ID to load
 *   onPlayerReady {function} - called with YT.Player instance
 *   onStateChange {function} - called with {state, currentTime}
 */
const YouTubePlayer = ({ playerId, videoId, onPlayerReady, onStateChange }) => {
  const playerRef = useRef(null); // YT.Player instance
  const containerRef = useRef(null);
  const initializedRef = useRef(false);
  const pendingVideoRef = useRef(null);
  const [embedError, setEmbedError] = useState(null); // null | 'blocked' | 'notfound'

  // Stable refs for callbacks — so initPlayer NEVER recreates when parent re-renders
  const onStateChangeRef = useRef(onStateChange);
  const onPlayerReadyRef = useRef(onPlayerReady);
  useEffect(() => { onStateChangeRef.current = onStateChange; }, [onStateChange]);
  useEffect(() => { onPlayerReadyRef.current = onPlayerReady; }, [onPlayerReady]);

  const initPlayer = useCallback(async (vid) => {
    if (!containerRef.current) return;
    setEmbedError(null);

    try {
      const YT = await loadYouTubeAPI();

      // Destroy existing player
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }

      // Recreate the div (YouTube API replaces it with iframe)
      const divId = `yt-player-${playerId}`;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const div = document.createElement('div');
        div.id = divId;
        containerRef.current.appendChild(div);
      }

      playerRef.current = new YT.Player(divId, {
        height: '100%',
        width: '100%',
        videoId: vid,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            if (onPlayerReadyRef.current) onPlayerReadyRef.current(playerRef.current);
          },
          onStateChange: (e) => {
            if (onStateChangeRef.current) {
              onStateChangeRef.current({
                state: e.data,
                currentTime: playerRef.current?.getCurrentTime?.() || 0,
              });
            }
          },
          onError: (e) => {
            console.error(`Player ${playerId} error:`, e.data);
            if (e.data === 101 || e.data === 150) {
              setEmbedError('blocked');
            } else if (e.data === 100) {
              setEmbedError('notfound');
            }
          },
        },
      });
    } catch (err) {
      console.error('Failed to initialize YouTube player:', err);
    }
  // Only recreates when playerId changes — callbacks use refs so they don't cause recreation
  }, [playerId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize player when videoId changes
  useEffect(() => {
    if (!videoId) return;
    setEmbedError(null);

    if (playerRef.current && playerRef.current.loadVideoById) {
      // Player already exists — just load new video
      playerRef.current.loadVideoById(videoId);
    } else {
      initPlayer(videoId);
    }
  }, [videoId, initPlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, []);

  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6">
        <div className="text-6xl mb-4 opacity-30">🎵</div>
        <p className="text-text-muted text-sm">Search for a song and select it to start playing</p>
      </div>
    );
  }

  // Embedding blocked by video owner (copyrighted songs: Taylor Swift, Bruno Mars, etc.)
  if (embedError === 'blocked') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 gap-3">
        <div className="text-5xl">🔒</div>
        <p className="text-text-primary font-semibold text-sm">Embedding Restricted</p>
        <p className="text-text-muted text-xs max-w-[240px] leading-relaxed">
          This video's owner has disabled playback outside of YouTube.
          Try searching for a{' '}
          <span className="text-accent font-medium">lyric video</span>,{' '}
          <span className="text-accent font-medium">cover</span>, or{' '}
          <span className="text-accent font-medium">audio version</span> instead.
        </p>
        <a
          href={`https://www.youtube.com/watch?v=${videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors"
        >
          ▶ Watch on YouTube
        </a>
      </div>
    );
  }

  if (embedError === 'notfound') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center p-6 gap-3">
        <div className="text-5xl">🔍</div>
        <p className="text-text-primary font-semibold text-sm">Video Not Found</p>
        <p className="text-text-muted text-xs">This video may be private or has been removed.</p>
      </div>
    );
  }

  return (
    <div className="yt-player-wrapper w-full">
      <div ref={containerRef} className="w-full h-full"></div>
    </div>
  );
};

export default YouTubePlayer;
