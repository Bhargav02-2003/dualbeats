import React, { useEffect, useRef, useCallback } from 'react';

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

  const initPlayer = useCallback(async (vid) => {
    if (!containerRef.current) return;

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
            if (onPlayerReady) onPlayerReady(playerRef.current);
          },
          onStateChange: (e) => {
            if (onStateChange) {
              onStateChange({
                state: e.data,
                currentTime: playerRef.current?.getCurrentTime?.() || 0,
              });
            }
          },
          onError: (e) => {
            console.error(`Player ${playerId} error:`, e.data);
          },
        },
      });
    } catch (err) {
      console.error('Failed to initialize YouTube player:', err);
    }
  }, [playerId, onPlayerReady, onStateChange]);

  // Initialize player when videoId changes
  useEffect(() => {
    if (!videoId) return;

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

  return (
    <div className="yt-player-wrapper w-full">
      <div ref={containerRef} className="w-full h-full">
        <div id={`yt-player-${playerId}`}></div>
      </div>
    </div>
  );
};

export default YouTubePlayer;
