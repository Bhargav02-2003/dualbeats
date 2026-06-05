import React, { useState, useRef, useCallback, useEffect } from 'react';
import SearchBar from './SearchBar';
import SearchResults from './SearchResults';
import YouTubePlayer from './YouTubePlayer';

// YT.PlayerState constants
const YT_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

// Loop modes
const LOOP = { NONE: 'none', ONE: 'one', ALL: 'all' };

/**
 * PlayerPanel — central music player
 * Props:
 *   socket, roomCode, syncedVideo, syncedAction — room sync
 *   externalVideo — video triggered from library/queue/trending
 *   savedVideoIds, onSaveToggle — library save state
 *   onAddToQueue — adds a song to the queue
 *   onVideoEnded — called when song ends (for auto-queue)
 *   queue — current queue array (for shuffle)
 *   currentQueueIdx — current queue index
 *   onPlayFromQueue — fn(idx) to play from queue (for shuffle)
 *   activeVideo (controlled) — current song meta from parent
 *   onActiveVideoChange — fn(video) to update parent
 */
const PlayerPanel = ({
  socket,
  roomCode,
  syncedVideo,
  syncedAction,
  externalVideo,
  savedVideoIds,
  onSaveToggle,
  onAddToQueue,
  onVideoEnded,
  queue = [],
  currentQueueIdx = -1,
  onPlayFromQueue,
  activeVideo: activeVideoProp,
  onActiveVideoChange,
}) => {
  const playerId = 'player1';
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Internal active video (used if parent doesn't provide one)
  const [localActiveVideo, setLocalActiveVideo] = useState(null);
  const activeVideo = activeVideoProp !== undefined ? activeVideoProp : localActiveVideo;

  const setActiveVideo = useCallback((v) => {
    if (onActiveVideoChange) {
      onActiveVideoChange(v);
    } else {
      setLocalActiveVideo(v);
    }
  }, [onActiveVideoChange]);

  const [playerInstance, setPlayerInstance] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loopMode, setLoopMode] = useState(LOOP.NONE);
  const [shuffle, setShuffle] = useState(false);

  const lastSyncedVideoRef = useRef(null);
  const volumeRef = useRef(70);
  const isMutedRef = useRef(false);
  const expectingSyncRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const loopModeRef = useRef(LOOP.NONE);
  const shuffleRef = useRef(false);
  const queueRef = useRef(queue);
  const currentQueueIdxRef = useRef(currentQueueIdx);
  const isPlayingRef = useRef(isPlaying);
  const silentAudioRef = useRef(null);

  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { loopModeRef.current = loopMode; }, [loopMode]);
  useEffect(() => { shuffleRef.current = shuffle; }, [shuffle]);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  useEffect(() => { currentQueueIdxRef.current = currentQueueIdx; }, [currentQueueIdx]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const playSilentAudio = useCallback(() => {
    if (silentAudioRef.current) {
      silentAudioRef.current.play().catch(() => {});
    }
  }, []);

  const pauseSilentAudio = useCallback(() => {
    if (silentAudioRef.current) {
      try { silentAudioRef.current.pause(); } catch {}
    }
  }, []);

  // ── MediaSession API — lock screen controls ─────────────────────────
  const updateMediaSession = useCallback((video, playing) => {
    if (!('mediaSession' in navigator) || !video) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: video.title || 'Unknown',
        artist: video.channelName || 'Unknown Artist',
        album: 'DualBeats',
        artwork: [
          {
            src: video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`,
            sizes: '320x180',
            type: 'image/jpeg',
          },
          {
            src: `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
            sizes: '480x360',
            type: 'image/jpeg',
          },
        ],
      });
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    } catch (e) {
      console.warn('MediaSession update failed:', e);
    }
  }, []);

  const setupMediaSessionHandlers = useCallback(() => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler('play', () => {
        playSilentAudio();
        if (playerInstance) { try { playerInstance.playVideo(); } catch {} }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        pauseSilentAudio();
        if (playerInstance) { try { playerInstance.pauseVideo(); } catch {} }
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        handleNext();
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        // Restart current song if >3s in, else prev
        if (playerInstance) {
          try {
            const t = playerInstance.getCurrentTime() || 0;
            if (t > 3) { playerInstance.seekTo(0, true); }
            else {
              const prevIdx = currentQueueIdxRef.current - 1;
              if (prevIdx >= 0 && onPlayFromQueue) onPlayFromQueue(prevIdx);
            }
          } catch {}
        }
      });
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (playerInstance && details.seekTime !== undefined) {
          try { playerInstance.seekTo(details.seekTime, true); } catch {}
        }
      });
    } catch (e) {
      console.warn('MediaSession handlers failed:', e);
    }
  }, [playerInstance]); // eslint-disable-line react-hooks/exhaustive-deps

  // Setup MediaSession handlers when player changes
  useEffect(() => {
    setupMediaSessionHandlers();
  }, [setupMediaSessionHandlers]);

  // Update MediaSession metadata when song changes
  useEffect(() => {
    if (activeVideo) updateMediaSession(activeVideo, isPlaying);
  }, [activeVideo, isPlaying, updateMediaSession]);

  // ── Visibility Change Auto-Resume ───────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (isPlayingRef.current && playerInstance) {
          try {
            const state = playerInstance.getPlayerState();
            if (state !== YT_STATES.PLAYING) {
              playSilentAudio();
              playerInstance.playVideo();
            }
          } catch {}
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [playerInstance, playSilentAudio]);

  // ── Progress bar polling ────────────────────────────────────────────
  useEffect(() => {
    if (isPlaying && playerInstance) {
      progressIntervalRef.current = setInterval(() => {
        try {
          const ct = playerInstance.getCurrentTime() || 0;
          const dur = playerInstance.getDuration() || 0;
          setCurrentTime(ct);
          setDuration(dur);
          // Update MediaSession position state
          if ('mediaSession' in navigator && dur > 0) {
            try {
              navigator.mediaSession.setPositionState({
                duration: dur,
                playbackRate: 1,
                position: Math.min(ct, dur),
              });
            } catch {}
          }
        } catch {}
      }, 1000);
    } else {
      clearInterval(progressIntervalRef.current);
    }
    return () => clearInterval(progressIntervalRef.current);
  }, [isPlaying, playerInstance]);

  // ── Handle external video (from Library or Queue) ───────────────────
  useEffect(() => {
    if (!externalVideo) return;
    setActiveVideo(externalVideo);
    setSearchResults([]);
    setCurrentTime(0);
    setDuration(0);
  }, [externalVideo]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle room sync — video change ────────────────────────────────
  useEffect(() => {
    if (!syncedVideo || syncedVideo.videoId === lastSyncedVideoRef.current) return;
    lastSyncedVideoRef.current = syncedVideo.videoId;
    if (syncedVideo.videoId !== activeVideo?.videoId) {
      setActiveVideo(syncedVideo);
    }
  }, [syncedVideo, activeVideo, setActiveVideo]);

  // Emit video change to room when activeVideo changes locally
  useEffect(() => {
    if (!activeVideo || !activeVideo.videoId) return;
    if (activeVideo.videoId !== lastSyncedVideoRef.current) {
      lastSyncedVideoRef.current = activeVideo.videoId;
      if (socket && roomCode) {
        socket.emit('room:video-change', {
          roomCode,
          videoId: activeVideo.videoId,
          title: activeVideo.title,
          channelName: activeVideo.channelName,
          thumbnail: activeVideo.thumbnail,
        });
      }
    }
  }, [activeVideo, socket, roomCode]);

  // ── Handle room sync — play/pause/seek ─────────────────────────────
  useEffect(() => {
    if (!syncedAction || !playerInstance) return;
    try {
      const delaySeconds = syncedAction.serverTs
        ? (Date.now() - syncedAction.serverTs) / 1000
        : 0;
      expectingSyncRef.current = { type: syncedAction.type, timestamp: Date.now() };
      if (syncedAction.type === 'play') {
        playSilentAudio();
        playerInstance.seekTo((syncedAction.currentTime || 0) + delaySeconds, true);
        playerInstance.playVideo();
      } else if (syncedAction.type === 'pause') {
        pauseSilentAudio();
        if (syncedAction.currentTime !== undefined) playerInstance.seekTo(syncedAction.currentTime, true);
        playerInstance.pauseVideo();
      } else if (syncedAction.type === 'seek') {
        playerInstance.seekTo((syncedAction.currentTime || 0) + delaySeconds, true);
      }
    } catch {}
  }, [syncedAction, playerInstance, playSilentAudio, pauseSilentAudio]);

  const handlePlayerReady = useCallback((player) => {
    setPlayerInstance(player);
    try {
      player.setVolume(volumeRef.current);
      if (isMutedRef.current) player.mute();
    } catch {}
  }, []);

  // ── Handle next song (queue / shuffle / loop) ───────────────────────
  const handleNext = useCallback(() => {
    const lm = loopModeRef.current;
    const sh = shuffleRef.current;
    const q = queueRef.current;
    const curIdx = currentQueueIdxRef.current;

    if (lm === LOOP.ONE) {
      // Restart current song
      if (playerInstance) { try { playerInstance.seekTo(0, true); playerInstance.playVideo(); } catch {} }
      return;
    }

    if (q.length > 0) {
      if (sh) {
        // Random song from queue
        const randomIdx = Math.floor(Math.random() * q.length);
        if (onPlayFromQueue) onPlayFromQueue(randomIdx);
      } else {
        // Next in queue
        const nextIdx = curIdx + 1;
        if (nextIdx < q.length) {
          if (onPlayFromQueue) onPlayFromQueue(nextIdx);
        } else if (lm === LOOP.ALL && q.length > 0) {
          if (onPlayFromQueue) onPlayFromQueue(0);
        } else {
          if (onVideoEnded) onVideoEnded();
        }
      }
    } else {
      if (onVideoEnded) onVideoEnded();
    }
  }, [playerInstance, onPlayFromQueue, onVideoEnded]);

  const handleStateChange = useCallback(({ state, currentTime: ct }) => {
    const sync = expectingSyncRef.current;
    if (sync && Date.now() - sync.timestamp < 2000) {
      if (state === YT_STATES.PLAYING && (sync.type === 'play' || sync.type === 'seek')) {
        setIsPlaying(true);
        playSilentAudio();
        return;
      }
      if (state === YT_STATES.PAUSED && (sync.type === 'pause' || sync.type === 'seek')) {
        setIsPlaying(false);
        if (document.visibilityState === 'visible') {
          pauseSilentAudio();
        }
        return;
      }
    }

    if (state === YT_STATES.PLAYING) {
      setIsPlaying(true);
      playSilentAudio();
      if (socket && roomCode) {
        socket.emit('room:play', { roomCode, videoId: activeVideo?.videoId, currentTime: ct });
      }
    } else if (state === YT_STATES.PAUSED) {
      // Only pause fully and emit pause if tab is visible
      if (document.visibilityState === 'visible') {
        setIsPlaying(false);
        pauseSilentAudio();
        if (socket && roomCode) {
          socket.emit('room:pause', { roomCode, currentTime: ct });
        }
      }
    } else if (state === YT_STATES.ENDED) {
      setIsPlaying(false);
      pauseSilentAudio();
      handleNext();
    }
  }, [socket, roomCode, activeVideo, handleNext, playSilentAudio, pauseSilentAudio]);

  const handleSelectVideo = useCallback((video) => {
    setActiveVideo(video);
    setSearchResults([]);
    setCurrentTime(0);
    setDuration(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePlayPause = () => {
    if (!playerInstance) return;
    try {
      const state = playerInstance.getPlayerState();
      if (state === YT_STATES.PLAYING) playerInstance.pauseVideo();
      else playerInstance.playVideo();
    } catch {}
  };

  const handleMute = () => {
    if (!playerInstance) return;
    try {
      if (isMuted) { playerInstance.unMute(); setIsMuted(false); }
      else { playerInstance.mute(); setIsMuted(true); }
    } catch {}
  };

  const handleVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setVolume(vol);
    if (playerInstance) {
      try {
        playerInstance.setVolume(vol);
        if (vol === 0) { playerInstance.mute(); setIsMuted(true); }
        else if (isMuted) { playerInstance.unMute(); setIsMuted(false); }
      } catch {}
    }
  };

  const handleSeek = (e) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (playerInstance) {
      try { playerInstance.seekTo(seekTo, true); } catch {}
    }
  };

  const cycleLoop = () => {
    setLoopMode((prev) => {
      if (prev === LOOP.NONE) return LOOP.ALL;
      if (prev === LOOP.ALL) return LOOP.ONE;
      return LOOP.NONE;
    });
  };

  const formatTime = (s) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const showSearch = searchResults.length > 0 || searchLoading;
  const isSaved = savedVideoIds?.has(activeVideo?.videoId);

  return (
    <div className="player-panel flex flex-col animate-fade-in">
      {/* Search */}
      <SearchBar
        playerId={playerId}
        onResults={setSearchResults}
        onLoading={setSearchLoading}
      />

      {/* Search Results */}
      {showSearch && (
        <SearchResults
          results={searchResults}
          loading={searchLoading}
          onSelect={handleSelectVideo}
          activeVideoId={activeVideo?.videoId}
          playerId={playerId}
          savedVideoIds={savedVideoIds}
          onSaveToggle={onSaveToggle}
          onAddToQueue={onAddToQueue}
        />
      )}

      {/* YouTube Player — always mounted */}
      <div className={`flex-1 px-3 pt-2 ${showSearch ? 'hidden' : ''}`}>
        <YouTubePlayer
          playerId={playerId}
          videoId={activeVideo?.videoId || null}
          onPlayerReady={handlePlayerReady}
          onStateChange={handleStateChange}
        />
      </div>

      {/* Now Playing Info + Controls */}
      {activeVideo && !showSearch && (
        <div className="px-4 pb-4 pt-3 space-y-3 border-t border-border mt-2">

          {/* Song meta + save */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-text-primary text-sm font-semibold truncate leading-tight">{activeVideo.title}</p>
              <p className="text-text-muted text-xs truncate mt-0.5">{activeVideo.channelName}</p>
            </div>
            {/* Save / Like */}
            <button
              onClick={() => onSaveToggle && onSaveToggle(activeVideo)}
              className={`flex-shrink-0 p-1.5 rounded-full transition-all ${isSaved ? 'text-accent' : 'text-text-muted hover:text-accent'}`}
              title={isSaved ? 'Remove from library' : 'Save to library'}
            >
              <svg className="w-5 h-5" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 1}
              value={currentTime}
              onChange={handleSeek}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #ff0000 ${duration ? (currentTime / duration) * 100 : 0}%, #2a2a2a ${duration ? (currentTime / duration) * 100 : 0}%)`
              }}
            />
            <div className="flex justify-between text-xs text-text-muted">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Controls row */}
          <div className="flex items-center justify-between">
            {/* Shuffle */}
            <button
              onClick={() => setShuffle((s) => !s)}
              className={`ctrl-btn ${shuffle ? 'active' : ''}`}
              title="Shuffle"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
              </svg>
            </button>

            {/* Prev */}
            <button
              onClick={() => {
                const prevIdx = currentQueueIdx - 1;
                if (prevIdx >= 0 && onPlayFromQueue) onPlayFromQueue(prevIdx);
                else if (playerInstance) { try { playerInstance.seekTo(0, true); } catch {} }
              }}
              className="ctrl-btn"
              title="Previous"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Play / Pause */}
            <button
              id="player1-playpause-btn"
              onClick={handlePlayPause}
              className="ctrl-btn primary"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Next */}
            <button
              onClick={handleNext}
              className="ctrl-btn"
              title="Next"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>

            {/* Loop */}
            <button
              onClick={cycleLoop}
              className={`ctrl-btn ${loopMode !== LOOP.NONE ? 'active' : ''} relative`}
              title={loopMode === LOOP.NONE ? 'No loop' : loopMode === LOOP.ALL ? 'Loop all' : 'Loop one'}
            >
              {loopMode === LOOP.ONE ? (
                // Repeat-one icon
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z"/>
                </svg>
              ) : (
                // Repeat-all icon
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z"/>
                </svg>
              )}
              {loopMode !== LOOP.NONE && (
                <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full" />
              )}
            </button>
          </div>

          {/* Volume row */}
          <div className="flex items-center gap-2">
            <button
              id="player1-mute-btn"
              onClick={handleMute}
              className="ctrl-btn flex-shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
              ) : volume < 50 ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              )}
            </button>
            <input
              id="player1-volume-slider"
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, #ffffff ${isMuted ? 0 : volume}%, #2a2a2a ${isMuted ? 0 : volume}%)`
              }}
              title={`Volume: ${isMuted ? 0 : volume}%`}
            />
            <span className="text-text-muted text-xs w-6 text-right">{isMuted ? '0' : volume}</span>
          </div>
        </div>
      )}
      {/* Hidden audio element playing silent WAV to keep background audio context active */}
      <audio
        ref={silentAudioRef}
        src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA"
        loop
        preload="auto"
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default PlayerPanel;
