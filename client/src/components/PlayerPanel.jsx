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
  playerId,          // 'player1' | 'player2'
  title,             // 'Player 1' | 'Player 2'
  accentColor,       // CSS color string for accent
  socket,            // Socket.io instance (optional)
  roomCode,          // Room code (optional)
  syncedVideoId,     // Video ID pushed from room sync
  syncedAction,      // { type: 'play'|'pause'|'seek', currentTime } from sync
}) => {
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null); // { videoId, title, thumbnail, channelName }
  const [playerInstance, setPlayerInstance] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(70);

  const lastSyncedVideoRef = useRef(null);

  // Handle sync events from room
  React.useEffect(() => {
    if (!syncedVideoId || syncedVideoId === lastSyncedVideoRef.current) return;
    lastSyncedVideoRef.current = syncedVideoId;
    // Video change from room — update active video if different
    if (syncedVideoId !== activeVideo?.videoId) {
      setActiveVideo((prev) => ({ ...prev, videoId: syncedVideoId }));
    }
  }, [syncedVideoId]);

  React.useEffect(() => {
    if (!syncedAction || !playerInstance) return;
    try {
      if (syncedAction.type === 'play') {
        if (syncedAction.currentTime !== undefined) {
          playerInstance.seekTo(syncedAction.currentTime, true);
        }
        playerInstance.playVideo();
      } else if (syncedAction.type === 'pause') {
        if (syncedAction.currentTime !== undefined) {
          playerInstance.seekTo(syncedAction.currentTime, true);
        }
        playerInstance.pauseVideo();
      } else if (syncedAction.type === 'seek') {
        playerInstance.seekTo(syncedAction.currentTime, true);
      }
    } catch {}
  }, [syncedAction]);

  const handlePlayerReady = useCallback((player) => {
    setPlayerInstance(player);
    try {
      player.setVolume(volume);
      if (isMuted) player.mute();
    } catch {}
  }, [volume, isMuted]);

  const handleStateChange = useCallback(({ state, currentTime }) => {
    if (state === YT_STATES.PLAYING) {
      setIsPlaying(true);
      // Emit to room
      if (socket && roomCode) {
        socket.emit('room:play', { roomCode, videoId: activeVideo?.videoId, currentTime });
      }
    } else if (state === YT_STATES.PAUSED) {
      setIsPlaying(false);
      if (socket && roomCode) {
        socket.emit('room:pause', { roomCode, currentTime });
      }
    }
  }, [socket, roomCode, activeVideo]);

  const handleSelectVideo = useCallback((video) => {
    setActiveVideo(video);
    setSearchResults([]);
    // Emit video change to room
    if (socket && roomCode) {
      socket.emit('room:video-change', { roomCode, videoId: video.videoId, title: video.title });
    }
  }, [socket, roomCode]);

  const handlePlayPause = () => {
    if (!playerInstance) return;
    try {
      const state = playerInstance.getPlayerState();
      if (state === YT_STATES.PLAYING) {
        playerInstance.pauseVideo();
      } else {
        playerInstance.playVideo();
      }
    } catch {}
  };

  const handleMute = () => {
    if (!playerInstance) return;
    try {
      if (isMuted) {
        playerInstance.unMute();
        setIsMuted(false);
      } else {
        playerInstance.mute();
        setIsMuted(true);
      }
    } catch {}
  };

  const handleVolumeChange = (e) => {
    const vol = parseInt(e.target.value);
    setVolume(vol);
    if (playerInstance) {
      try {
        playerInstance.setVolume(vol);
        if (vol === 0) {
          playerInstance.mute();
          setIsMuted(true);
        } else if (isMuted) {
          playerInstance.unMute();
          setIsMuted(false);
        }
      } catch {}
    }
  };

  const isPlayer1 = playerId === 'player1';

  return (
    <div className="player-panel flex-1 min-h-0 animate-fade-in">
      {/* Panel header */}
      <div
        className="px-4 py-3 border-b border-border flex items-center gap-2"
        style={{ background: `linear-gradient(135deg, ${isPlayer1 ? 'rgba(108,92,231,0.15)' : 'rgba(0,184,148,0.12)'}, transparent)` }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: isPlayer1 ? '#6c5ce7' : '#00b894' }}
        ></div>
        <h2 className="text-text-primary font-bold text-sm">{title}</h2>
        {activeVideo && (
          <span className="ml-auto text-text-muted text-xs truncate max-w-[180px]" title={activeVideo.title}>
            {activeVideo.title}
          </span>
        )}
      </div>

      {/* Search */}
      <SearchBar
        playerId={playerId}
        onResults={setSearchResults}
        onLoading={setSearchLoading}
      />

      {/* Search Results — overlays player when shown */}
      {(searchResults.length > 0 || searchLoading) && (
        <SearchResults
          results={searchResults}
          loading={searchLoading}
          onSelect={handleSelectVideo}
          activeVideoId={activeVideo?.videoId}
          playerId={playerId}
        />
      )}

      {/* YouTube Player */}
      {(!searchResults.length && !searchLoading) && (
        <div className="flex-1 px-4">
          <YouTubePlayer
            playerId={playerId}
            videoId={activeVideo?.videoId || null}
            onPlayerReady={handlePlayerReady}
            onStateChange={handleStateChange}
          />
        </div>
      )}

      {/* Controls bar */}
      {activeVideo && (
        <div className="mt-auto border-t border-border px-4 py-3">
          {/* Now playing */}
          <div className="mb-3">
            <p className="text-text-primary text-xs font-semibold truncate">{activeVideo.title}</p>
            <p className="text-text-muted text-xs truncate">{activeVideo.channelName}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button
              id={`${playerId}-playpause-btn`}
              onClick={handlePlayPause}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 hover:scale-110"
              style={{ background: isPlayer1 ? '#6c5ce7' : '#00b894' }}
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
              id={`${playerId}-mute-btn`}
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
              id={`${playerId}-volume-slider`}
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, ${isPlayer1 ? '#6c5ce7' : '#00b894'} ${isMuted ? 0 : volume}%, #2a2a2a ${isMuted ? 0 : volume}%)`
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
