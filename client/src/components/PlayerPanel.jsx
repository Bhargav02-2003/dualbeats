import React, { useState, useRef, useCallback } from 'react';
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

const PlayerPanel = ({
  socket,
  roomCode,
  syncedVideoId,
  syncedAction,
  externalVideo,
  savedVideoIds,
  onSaveToggle,
  onAddToQueue,    // fn(video) — add song to queue
  onVideoEnded,    // fn() — called when song ends, triggers next in queue
}) => {
  const playerId = 'player1';
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [playerInstance, setPlayerInstance] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);

  const lastSyncedVideoRef = useRef(null);
  const volumeRef = useRef(70);
  const isMutedRef = useRef(false);
  const expectingSyncRef = useRef(null);
  React.useEffect(() => { volumeRef.current = volume; }, [volume]);
  React.useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Handle external video (from Library or Queue) — LOCAL only
  React.useEffect(() => {
    if (!externalVideo) return;
    setActiveVideo(externalVideo);
    setSearchResults([]);
  }, [externalVideo]);

  // Handle room sync — video change
  React.useEffect(() => {
    if (!syncedVideoId || syncedVideoId === lastSyncedVideoRef.current) return;
    lastSyncedVideoRef.current = syncedVideoId;
    if (syncedVideoId !== activeVideo?.videoId) {
      setActiveVideo((prev) => ({ ...prev, videoId: syncedVideoId }));
    }
  }, [syncedVideoId]);

  // Handle room sync — play/pause/seek with latency compensation
  React.useEffect(() => {
    if (!syncedAction || !playerInstance) return;
    try {
      const delaySeconds = syncedAction.serverTs
        ? (Date.now() - syncedAction.serverTs) / 1000
        : 0;
      
      expectingSyncRef.current = {
        type: syncedAction.type,
        timestamp: Date.now()
      };

      if (syncedAction.type === 'play') {
        playerInstance.seekTo((syncedAction.currentTime || 0) + delaySeconds, true);
        playerInstance.playVideo();
      } else if (syncedAction.type === 'pause') {
        if (syncedAction.currentTime !== undefined) playerInstance.seekTo(syncedAction.currentTime, true);
        playerInstance.pauseVideo();
      } else if (syncedAction.type === 'seek') {
        playerInstance.seekTo((syncedAction.currentTime || 0) + delaySeconds, true);
      }
    } catch {}
  }, [syncedAction]);

  const handlePlayerReady = useCallback((player) => {
    setPlayerInstance(player);
    try {
      player.setVolume(volumeRef.current);
      if (isMutedRef.current) player.mute();
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleStateChange = useCallback(({ state, currentTime }) => {
    // Prevent sync loop/stuttering from programmatic player state changes
    const sync = expectingSyncRef.current;
    if (sync && Date.now() - sync.timestamp < 2000) {
      if (state === YT_STATES.PLAYING && (sync.type === 'play' || sync.type === 'seek')) {
        setIsPlaying(true);
        return;
      }
      if (state === YT_STATES.PAUSED && (sync.type === 'pause' || sync.type === 'seek')) {
        setIsPlaying(false);
        return;
      }
    }

    if (state === YT_STATES.PLAYING) {
      setIsPlaying(true);
      if (socket && roomCode) {
        socket.emit('room:play', { roomCode, videoId: activeVideo?.videoId, currentTime });
      }
    } else if (state === YT_STATES.PAUSED) {
      setIsPlaying(false);
      if (socket && roomCode) {
        socket.emit('room:pause', { roomCode, currentTime });
      }
    } else if (state === YT_STATES.ENDED) {
      setIsPlaying(false);
      // Auto-play next from queue
      if (onVideoEnded) onVideoEnded();
    }
  }, [socket, roomCode, activeVideo, onVideoEnded]);

  const handleSelectVideo = useCallback((video) => {
    setActiveVideo(video);
    setSearchResults([]);
    if (socket && roomCode) {
      socket.emit('room:video-change', { roomCode, videoId: video.videoId, title: video.title });
    }
  }, [socket, roomCode]);

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

  return (
    <div className="player-panel flex flex-col animate-fade-in">
      {/* Search */}
      <SearchBar
        playerId={playerId}
        onResults={setSearchResults}
        onLoading={setSearchLoading}
      />

      {/* Search Results — shown above player */}
      {(searchResults.length > 0 || searchLoading) && (
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

      {/* YouTube Player — always mounted so song keeps playing during search */}
      <div className={`flex-1 px-4 ${(searchResults.length > 0 || searchLoading) ? 'hidden' : ''}`}>
        <YouTubePlayer
          playerId={playerId}
          videoId={activeVideo?.videoId || null}
          onPlayerReady={handlePlayerReady}
          onStateChange={handleStateChange}
        />
      </div>

      {/* Now Playing + Controls */}
      {activeVideo && (
        <div className="border-t border-border px-4 py-3">
          <div className="mb-3">
            <p className="text-text-primary text-xs font-semibold truncate">{activeVideo.title}</p>
            <p className="text-text-muted text-xs truncate">{activeVideo.channelName}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              id="player1-playpause-btn"
              onClick={handlePlayPause}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110 bg-accent"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Mute */}
            <button
              id="player1-mute-btn"
              onClick={handleMute}
              className="text-text-muted hover:text-text-primary transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6a7.975 7.975 0 015.657 2.343M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>

            {/* Volume slider */}
            <input
              id="player1-volume-slider"
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, #6c5ce7 ${isMuted ? 0 : volume}%, #2a2a2a ${isMuted ? 0 : volume}%)`
              }}
              title={`Volume: ${isMuted ? 0 : volume}%`}
            />
            <span className="text-text-muted text-xs w-7 text-right">
              {isMuted ? '0' : volume}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerPanel;
