import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import PlayerPanel from '../components/PlayerPanel';
import QueueList from '../components/QueueList';
import SavedSongs from '../components/SavedSongs';
import TrendingSection from '../components/TrendingSection';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
const MODAL = { NONE: 'none', CREATE: 'create', JOIN: 'join', CREATED: 'created' };

const Home = () => {
  const { user } = useAuth();

  // ── Socket ────────────────────────────────────────────────────────────
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

  // ── Active video (lifted from PlayerPanel for suggestions) ────────────
  const [activeVideo, setActiveVideo] = useState(null);

  // ── Queue ────────────────────────────────────────────────────────────
  const [queue, setQueue] = useState([]);
  const [currentQueueIdx, setCurrentQueueIdx] = useState(-1);

  // ── Saved songs ──────────────────────────────────────────────────────
  const [savedVideoIds, setSavedVideoIds] = useState(new Set());
  const [savedRefresh, setSavedRefresh] = useState(0);

  // ── External video (from library / queue / trending) ─────────────────
  const [externalVideo, setExternalVideo] = useState(null);

  // ── Sidebar / panel state ────────────────────────────────────────────
  const [showQueue, setShowQueue] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);

  // ── Notification ──────────────────────────────────────────────────────
  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  }, []);

  // ── Save / unsave ─────────────────────────────────────────────────────
  const handleSaveToggle = useCallback(async (video) => {
    const isSaved = savedVideoIds.has(video.videoId);
    if (isSaved) {
      try {
        await api.delete(`/api/saved/${video.videoId}`);
        setSavedVideoIds((prev) => { const n = new Set(prev); n.delete(video.videoId); return n; });
        showNotification('Removed from library');
        setSavedRefresh((r) => r + 1);
      } catch { showNotification('Failed to remove'); }
    } else {
      try {
        await api.post('/api/saved', {
          videoId: video.videoId, title: video.title,
          channelName: video.channelName, thumbnail: video.thumbnail, duration: video.duration,
        });
        setSavedVideoIds((prev) => new Set([...prev, video.videoId]));
        showNotification('❤️ Saved to library!');
        setSavedRefresh((r) => r + 1);
      } catch (err) {
        showNotification(err.response?.status === 409 ? 'Already saved' : 'Failed to save');
      }
    }
  }, [savedVideoIds, showNotification]);

  // ── Queue management ──────────────────────────────────────────────────
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

  const addToQueue = useCallback((video) => {
    setQueue((prev) => [...prev, video]);
    showNotification(`Added to queue: ${video.title.slice(0, 30)}…`);
  }, [showNotification]);

  const removeFromQueue = useCallback((idx) => {
    setQueue((prev) => {
      const next = prev.filter((_, i) => i !== idx);
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
    showNotification('Queue cleared');
  }, [showNotification]);

  const playFromQueue = useCallback((idx) => {
    setCurrentQueueIdx(idx);
    setExternalVideo({ ...queueRef.current[idx], _ts: Date.now() });
  }, []);

  // Called when song ends — auto-play next
  const handleVideoEnded = useCallback(() => {
    setCurrentQueueIdx((cur) => {
      const nextIdx = cur + 1;
      if (nextIdx < queueRef.current.length) {
        setExternalVideo({ ...queueRef.current[nextIdx], _ts: Date.now() });
        return nextIdx;
      }
      return -1;
    });
  }, []);

  // ── Play from library / trending ──────────────────────────────────────
  const handlePlayFromExternal = useCallback((song) => {
    setExternalVideo({ ...song, _ts: Date.now() });
    setCurrentQueueIdx(-1);
    showNotification(`▶ Playing: ${song.title.slice(0, 30)}…`);
  }, [showNotification]);

  // ── Play All from Library — replaces queue with all library songs ─────
  const handlePlayAllFromLibrary = useCallback((songs) => {
    if (!songs || songs.length === 0) return;
    setQueue(songs);
    setCurrentQueueIdx(0);
    setExternalVideo({ ...songs[0], _ts: Date.now() });
    showNotification(`▶ Playing ${songs.length} songs from library`);
  }, [showNotification]);

  // ── Play All from Queue — start from index 0 ───────────────────────────
  const handlePlayAllFromQueue = useCallback(() => {
    if (queueRef.current.length === 0) return;
    setCurrentQueueIdx(0);
    setExternalVideo({ ...queueRef.current[0], _ts: Date.now() });
    showNotification(`▶ Playing queue from beginning`);
  }, [showNotification]);

  // ── Socket init ───────────────────────────────────────────────────────
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

  // ── Auto-rejoin room ──────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !user) return;
    const handleConnect = () => {
      const storedCode = localStorage.getItem('activeRoomCode');
      if (storedCode) {
        socket.emit('room:join', { roomCode: storedCode, userName: user?.name }, (res) => {
          if (res.success) {
            setRoomCode(storedCode);
            setRoomInfo({ code: storedCode, userCount: res.userCount });
            showNotification(`Rejoined room ${storedCode}!`);
          } else {
            localStorage.removeItem('activeRoomCode');
            setRoomCode(''); setRoomInfo(null);
            showNotification('Could not rejoin the previous room.');
          }
        });
      }
    };
    if (socket.connected) handleConnect();
    socket.on('connect', handleConnect);
    return () => socket.off('connect', handleConnect);
  }, [socket, user, showNotification]);

  // ── Room actions ──────────────────────────────────────────────────────
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
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] animate-slide-down pointer-events-none">
          <div className="glass border border-border rounded-full px-4 py-2 text-white text-sm shadow-2xl flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-accent rounded-full flex-shrink-0" />
            {notification}
          </div>
        </div>
      )}

      {/* ── Main layout ── */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* ── Left sidebar — Player Panel (sticky on desktop) ── */}
        <aside className="lg:w-[380px] xl:w-[420px] flex-shrink-0 p-3 lg:h-[calc(100vh-56px)] lg:sticky lg:top-14 lg:overflow-y-auto">
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
            queue={queue}
            currentQueueIdx={currentQueueIdx}
            onPlayFromQueue={playFromQueue}
            activeVideo={activeVideo}
            onActiveVideoChange={setActiveVideo}
          />

          {/* Queue (desktop sidebar) */}
          <div className="mt-3 lg:block hidden">
            <QueueList
              queue={queue}
              currentIdx={currentQueueIdx}
              onPlay={playFromQueue}
              onPlayAll={handlePlayAllFromQueue}
              onRemove={removeFromQueue}
              onClear={clearQueue}
            />
          </div>
        </aside>

        {/* ── Right — main content ── */}
        <section className="flex-1 overflow-y-auto p-4 lg:pl-2 lg:pr-6 lg:pt-5">

          {/* Room sync info strip */}
          {roomInfo && (
            <div className="flex items-center gap-2 mb-5 text-sm text-text-secondary bg-accentMuted border border-accent border-opacity-20 rounded-full px-4 py-2 w-fit">
              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse-slow" />
              <span>Synced room <strong className="text-accent">{roomInfo.code}</strong> — {roomInfo.userCount} listening</span>
            </div>
          )}

          {/* Trending + Suggestions */}
          <TrendingSection
            onPlay={handlePlayFromExternal}
            onAddToQueue={addToQueue}
            onSaveToggle={handleSaveToggle}
            savedVideoIds={savedVideoIds}
            currentVideoId={activeVideo?.videoId}
            currentVideoTitle={activeVideo?.title}
          />

          {/* My Library */}
          <div className="mt-8">
            <SavedSongs
              onPlay={handlePlayFromExternal}
              onPlayAll={handlePlayAllFromLibrary}
              onAddToQueue={addToQueue}
              refreshTrigger={savedRefresh}
              savedVideoIds={savedVideoIds}
              onLibraryChange={setSavedVideoIds}
            />
          </div>
        </section>

        {/* ── Mobile bottom queue toggle ── */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
          <button
            onClick={() => setShowQueue((v) => !v)}
            className="w-full bg-card border-t border-border py-3 flex items-center justify-center gap-2 text-sm text-text-secondary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10" />
            </svg>
            Queue ({queue.length})
          </button>
          {showQueue && (
            <div className="bg-bg border-t border-border max-h-64 overflow-y-auto animate-slide-up">
              <QueueList
                queue={queue}
                currentIdx={currentQueueIdx}
                onPlay={playFromQueue}
                onPlayAll={handlePlayAllFromQueue}
                onRemove={removeFromQueue}
                onClear={clearQueue}
              />
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ── */}
      {modal === MODAL.CREATE && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-accentMuted flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-text-primary">Create Sync Room</h3>
                <p className="text-text-secondary text-xs">Listen together in real-time</p>
              </div>
            </div>
            <p className="text-text-secondary text-sm mb-6">Share a 6-character code with a friend to sync playback.</p>
            <div className="flex gap-3">
              <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirmCreateRoom} className="btn-primary flex-1" disabled={modalLoading}>
                {modalLoading ? <><span className="spinner" />Creating…</> : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === MODAL.CREATED && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accentMuted rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Room Created!</h3>
              <p className="text-text-secondary text-sm">Share this code with your friend</p>
            </div>
            <div
              className="bg-bg border-2 border-accent rounded-xl py-5 text-center cursor-pointer hover:bg-cardHover transition-colors mb-4"
              onClick={copyRoomCode}
            >
              <p className="text-4xl font-black text-accent tracking-widest">{createdCode}</p>
              <p className="text-text-muted text-xs mt-1">Tap to copy</p>
            </div>
            <button onClick={closeModal} className="btn-primary">Start Playing</button>
          </div>
        </div>
      )}

      {modal === MODAL.JOIN && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-1">Join Sync Room</h3>
            <p className="text-text-secondary text-sm mb-4">Enter the 6-character room code.</p>
            <input
              type="text"
              value={joinInput}
              onChange={(e) => { setJoinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)); setJoinError(''); }}
              placeholder="XXXXXX"
              maxLength={6}
              autoFocus
              className={`form-input text-center text-2xl font-black tracking-widest uppercase mb-2 ${joinError ? 'border-error' : ''}`}
              onKeyDown={(e) => e.key === 'Enter' && confirmJoinRoom()}
            />
            {joinError && <p className="text-error text-xs mb-3 text-center">{joinError}</p>}
            <div className="flex gap-3 mt-2">
              <button onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button onClick={confirmJoinRoom} className="btn-primary flex-1" disabled={modalLoading || joinInput.length !== 6}>
                {modalLoading ? <><span className="spinner" />Joining…</> : 'Join Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
