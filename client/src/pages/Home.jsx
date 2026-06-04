import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import PlayerPanel from '../components/PlayerPanel';
import QueueList from '../components/QueueList';
import SavedSongs from '../components/SavedSongs';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const MODAL = { NONE: 'none', CREATE: 'create', JOIN: 'join', CREATED: 'created' };

const Home = () => {
  const { user } = useAuth();

  // ── Socket ──────────────────────────────────────────────────────────
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomInfo, setRoomInfo] = useState(null);
  const [modal, setModal] = useState(MODAL.NONE);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [notification, setNotification] = useState('');
  const [syncedAction, setSyncedAction] = useState(null);
  const [syncedVideoId, setSyncedVideoId] = useState(null);
  const socketRef = useRef(null);

  // ── Queue ────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState([]);         // upcoming songs
  const [currentQueueIdx, setCurrentQueueIdx] = useState(-1);

  // ── Saved songs ──────────────────────────────────────────────────────
  const [savedVideoIds, setSavedVideoIds] = useState(new Set());
  const [savedRefresh, setSavedRefresh] = useState(0);

  // ── External video (from library / queue) ────────────────────────────
  const [externalVideo, setExternalVideo] = useState(null);

  // ── Notification ─────────────────────────────────────────────────────
  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }, []);

  // ── Save / unsave ────────────────────────────────────────────────────
  const handleSaveToggle = useCallback(async (video) => {
    const isSaved = savedVideoIds.has(video.videoId);
    if (isSaved) {
      try {
        await api.delete(`/api/saved/${video.videoId}`);
        setSavedVideoIds((prev) => { const n = new Set(prev); n.delete(video.videoId); return n; });
        showNotification('Removed from library.');
        setSavedRefresh((r) => r + 1);
      } catch { showNotification('Failed to remove.'); }
    } else {
      try {
        await api.post('/api/saved', {
          videoId: video.videoId, title: video.title,
          channelName: video.channelName, thumbnail: video.thumbnail, duration: video.duration,
        });
        setSavedVideoIds((prev) => new Set([...prev, video.videoId]));
        showNotification('💖 Saved to library!');
        setSavedRefresh((r) => r + 1);
      } catch (err) {
        showNotification(err.response?.status === 409 ? 'Already saved.' : 'Failed to save.');
      }
    }
  }, [savedVideoIds, showNotification]);

  // ── Queue management ─────────────────────────────────────────────────
  const queueRef = useRef(queue); // stable ref so handleVideoEnded never recreates
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const addToQueue = useCallback((video) => {
    setQueue((prev) => [...prev, video]);
    showNotification(`Added to queue: ${video.title.slice(0, 30)}…`);
  }, [showNotification]);

  const removeFromQueue = useCallback((idx) => {
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // Adjust currentQueueIdx if needed
      setCurrentQueueIdx((cur) => {
        if (cur === idx) return -1;
        if (cur > idx) return cur - 1;
        return cur;
      });
      return next;
    });
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentQueueIdx(-1);
    showNotification('Queue cleared.');
  }, [showNotification]);

  const playFromQueue = useCallback((idx) => {
    setCurrentQueueIdx(idx);
    setExternalVideo({ ...queue[idx], _ts: Date.now() });
  }, [queue]);

  // Called when current song ends → auto-play next in queue
  // Uses queueRef (not queue state) so this callback is stable and never recreates
  const handleVideoEnded = useCallback(() => {
    setCurrentQueueIdx((cur) => {
      const nextIdx = cur + 1;
      if (nextIdx < queueRef.current.length) {
        setExternalVideo({ ...queueRef.current[nextIdx], _ts: Date.now() });
        return nextIdx;
      }
      return -1; // queue finished
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Play from library ────────────────────────────────────────────────
  const handlePlayFromLibrary = useCallback((song) => {
    setExternalVideo({ ...song, _ts: Date.now() });
    setCurrentQueueIdx(-1); // not from queue
    showNotification(`▶ Playing: ${song.title.slice(0, 30)}…`);
  }, [showNotification]);

  // ── Socket init ──────────────────────────────────────────────────────
  useEffect(() => {
    const s = io(SOCKET_URL, { withCredentials: true, transports: ['websocket', 'polling'] });
    s.on('connect', () => console.log('Socket connected:', s.id));
    s.on('disconnect', () => console.log('Socket disconnected'));

    s.on('room:user-joined', ({ userName, userCount }) => {
      setRoomInfo((prev) => prev ? { ...prev, userCount } : prev);
      showNotification(`${userName} joined the room!`);
    });
    s.on('room:user-left', ({ userCount }) => {
      setRoomInfo((prev) => prev ? { ...prev, userCount } : prev);
      showNotification('A user left the room.');
    });
    s.on('room:play', ({ videoId, currentTime, serverTs }) =>
      setSyncedAction({ type: 'play', currentTime, serverTs: serverTs || Date.now(), ts: Date.now() }));
    s.on('room:pause', ({ currentTime, serverTs }) =>
      setSyncedAction({ type: 'pause', currentTime, serverTs: serverTs || Date.now(), ts: Date.now() }));
    s.on('room:seek', ({ currentTime, serverTs }) =>
      setSyncedAction({ type: 'seek', currentTime, serverTs: serverTs || Date.now(), ts: Date.now() }));
    s.on('room:video-change', ({ videoId, title }) => {
      setSyncedVideoId(videoId);
      if (title) showNotification(`Now syncing: ${title}`);
    });

    socketRef.current = s;
    setSocket(s);
    return () => s.disconnect();
  }, [showNotification]);

  // ── Auto-rejoin Room ────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;

    const handleConnect = () => {
      const storedRoomCode = localStorage.getItem('activeRoomCode');
      if (storedRoomCode) {
        console.log('Attempting to auto-rejoin room:', storedRoomCode);
        socket.emit('room:join', { roomCode: storedRoomCode, userName: user?.name }, (res) => {
          if (res.success) {
            setRoomCode(storedRoomCode);
            setRoomInfo({ code: storedRoomCode, userCount: res.userCount });
            showNotification(`Rejoined room ${storedRoomCode}!`);
          } else {
            console.log('Failed to auto-rejoin:', res.message);
            localStorage.removeItem('activeRoomCode');
            setRoomCode('');
            setRoomInfo(null);
            showNotification('Could not rejoin the previous room.');
          }
        });
      }
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    return () => {
      socket.off('connect', handleConnect);
    };
  }, [socket, user, showNotification]);

  // ── Room actions ─────────────────────────────────────────────────────
  const confirmCreateRoom = () => {
    if (!socketRef.current) return;
    setModalLoading(true);
    socketRef.current.emit('room:create', { userName: user?.name }, (res) => {
      setModalLoading(false);
      if (res.success) {
        setCreatedCode(res.roomCode); setRoomCode(res.roomCode);
        setRoomInfo({ code: res.roomCode, userCount: 1 }); setModal(MODAL.CREATED);
        localStorage.setItem('activeRoomCode', res.roomCode);
      } else { setModal(MODAL.NONE); showNotification('Failed to create room.'); }
    });
  };

  const confirmJoinRoom = () => {
    const code = joinInput.trim().toUpperCase();
    if (!code || code.length !== 6) { setJoinError('Enter a valid 6-character code.'); return; }
    if (!socketRef.current) return;
    setModalLoading(true);
    socketRef.current.emit('room:join', { roomCode: code, userName: user?.name }, (res) => {
      setModalLoading(false);
      if (res.success) {
        setRoomCode(code); setRoomInfo({ code, userCount: res.userCount });
        setModal(MODAL.NONE); showNotification(`Joined room ${code}!`);
        localStorage.setItem('activeRoomCode', code);
      } else { setJoinError(res.message || 'Failed to join.'); }
    });
  };

  const handleLeaveRoom = () => {
    if (socketRef.current && roomCode) socketRef.current.emit('room:leave');
    setRoomCode(''); setRoomInfo(null); setSyncedAction(null); setSyncedVideoId(null);
    localStorage.removeItem('activeRoomCode');
    showNotification('Left the room.');
  };

  const closeModal = () => { setModal(MODAL.NONE); setJoinError(''); setJoinInput(''); };
  const copyRoomCode = () => navigator.clipboard.writeText(createdCode || roomCode)
    .then(() => showNotification('Room code copied!'));

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar
        roomInfo={roomInfo}
        onCreateRoom={() => setModal(MODAL.CREATE)}
        onJoinRoom={() => { setModal(MODAL.JOIN); setJoinInput(''); setJoinError(''); }}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up pointer-events-none">
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full flex-shrink-0"></span>
            {notification}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto space-y-4">

          {/* Player + Queue — side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4">
            {/* Single Player */}
            <PlayerPanel
              socket={socket}
              roomCode={roomCode}
              syncedVideoId={syncedVideoId}
              syncedAction={syncedAction}
              externalVideo={externalVideo}
              savedVideoIds={savedVideoIds}
              onSaveToggle={handleSaveToggle}
              onAddToQueue={addToQueue}
              onVideoEnded={handleVideoEnded}
            />

            {/* Queue */}
            <QueueList
              queue={queue}
              currentIdx={currentQueueIdx}
              onPlay={playFromQueue}
              onRemove={removeFromQueue}
              onClear={clearQueue}
            />
          </div>

          {/* Room sync info */}
          {roomInfo && (
            <div className="flex items-center justify-center gap-3 text-sm text-text-secondary">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse-slow"></span>
              <span>Synced room <strong className="text-accentLight">{roomInfo.code}</strong> — {roomInfo.userCount} user{roomInfo.userCount !== 1 ? 's' : ''} connected</span>
            </div>
          )}

          {/* My Library */}
          <SavedSongs
            onPlay={handlePlayFromLibrary}
            refreshTrigger={savedRefresh}
            savedVideoIds={savedVideoIds}
            onLibraryChange={setSavedVideoIds}
          />
        </div>
      </main>

      {/* ── Modals ── */}
      {modal === MODAL.CREATE && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Create Sync Room</h3>
            <p className="text-text-secondary text-sm mb-6">Share a 6-character code with a friend to sync playback in real-time.</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirmCreateRoom} className="btn-primary flex-1" disabled={modalLoading}>
                {modalLoading ? <><span className="spinner"></span>Creating...</> : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === MODAL.CREATED && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Room Created!</h3>
              <p className="text-text-secondary text-sm">Share this code with your friend</p>
            </div>
            <div className="bg-bg border-2 border-accent rounded-xl py-4 text-center cursor-pointer hover:bg-cardHover transition-colors mb-4" onClick={copyRoomCode}>
              <p className="text-4xl font-black gradient-text tracking-widest">{createdCode}</p>
              <p className="text-text-muted text-xs mt-1">Click to copy</p>
            </div>
            <button onClick={closeModal} className="btn-primary">Start Playing</button>
          </div>
        </div>
      )}

      {modal === MODAL.JOIN && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Join Sync Room</h3>
            <p className="text-text-secondary text-sm mb-4">Enter the 6-character room code.</p>
            <input
              type="text" value={joinInput}
              onChange={(e) => { setJoinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setJoinError(''); }}
              placeholder="XXXXXX" maxLength={6} autoFocus
              className={`form-input text-center text-2xl font-black tracking-widest uppercase mb-2 ${joinError ? 'border-error' : ''}`}
              onKeyDown={(e) => e.key === 'Enter' && confirmJoinRoom()}
            />
            {joinError && <p className="text-error text-xs mb-3 text-center">{joinError}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirmJoinRoom} className="btn-primary flex-1" disabled={modalLoading || joinInput.length !== 6}>
                {modalLoading ? <><span className="spinner"></span>Joining...</> : 'Join Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
