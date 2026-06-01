import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import PlayerPanel from '../components/PlayerPanel';

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Room modal types
const MODAL = {
  NONE: 'none',
  CREATE: 'create',
  JOIN: 'join',
  CREATED: 'created', // Show newly created room code
};

const Home = () => {
  const { user } = useAuth();

  // Socket state
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [roomInfo, setRoomInfo] = useState(null); // { code, userCount }
  const [modal, setModal] = useState(MODAL.NONE);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [modalLoading, setModalLoading] = useState(false);
  const [notification, setNotification] = useState('');

  // Sync state for rooms
  const [syncedAction1, setSyncedAction1] = useState(null);
  const [syncedAction2, setSyncedAction2] = useState(null);
  const [syncedVideoId1, setSyncedVideoId1] = useState(null);
  const [syncedVideoId2, setSyncedVideoId2] = useState(null);

  const socketRef = useRef(null);

  // Show temporary notification
  const showNotification = useCallback((msg) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  }, []);

  // Initialize socket
  useEffect(() => {
    const s = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => console.log('Socket connected:', s.id));
    s.on('disconnect', () => console.log('Socket disconnected'));

    // Room events
    s.on('room:user-joined', ({ userName, userCount }) => {
      setRoomInfo((prev) => prev ? { ...prev, userCount } : prev);
      showNotification(`${userName} joined the room!`);
    });

    s.on('room:user-left', ({ userCount }) => {
      setRoomInfo((prev) => prev ? { ...prev, userCount } : prev);
      showNotification('A user left the room.');
    });

    // Sync events — apply to Player 1 (or whichever is synced)
    s.on('room:play', ({ videoId, currentTime }) => {
      setSyncedAction1({ type: 'play', currentTime, ts: Date.now() });
    });

    s.on('room:pause', ({ currentTime }) => {
      setSyncedAction1({ type: 'pause', currentTime, ts: Date.now() });
    });

    s.on('room:seek', ({ currentTime }) => {
      setSyncedAction1({ type: 'seek', currentTime, ts: Date.now() });
    });

    s.on('room:video-change', ({ videoId, title }) => {
      setSyncedVideoId1(videoId);
      if (title) showNotification(`Now syncing: ${title}`);
    });

    socketRef.current = s;
    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, [showNotification]);

  const handleCreateRoom = () => {
    setModal(MODAL.CREATE);
  };

  const confirmCreateRoom = () => {
    if (!socketRef.current) return;
    setModalLoading(true);

    socketRef.current.emit('room:create', { userName: user?.name }, (res) => {
      setModalLoading(false);
      if (res.success) {
        setCreatedCode(res.roomCode);
        setRoomCode(res.roomCode);
        setRoomInfo({ code: res.roomCode, userCount: 1 });
        setModal(MODAL.CREATED);
      } else {
        setModal(MODAL.NONE);
        showNotification('Failed to create room. Try again.');
      }
    });
  };

  const handleJoinRoom = () => {
    setModal(MODAL.JOIN);
    setJoinInput('');
    setJoinError('');
  };

  const confirmJoinRoom = () => {
    const code = joinInput.trim().toUpperCase();
    if (!code || code.length !== 6) {
      setJoinError('Please enter a valid 6-character room code.');
      return;
    }

    if (!socketRef.current) return;
    setModalLoading(true);

    socketRef.current.emit('room:join', { roomCode: code, userName: user?.name }, (res) => {
      setModalLoading(false);
      if (res.success) {
        setRoomCode(code);
        setRoomInfo({ code, userCount: res.userCount });
        setModal(MODAL.NONE);
        showNotification(`Joined room ${code}! ${res.userCount} user(s) connected.`);
      } else {
        setJoinError(res.message || 'Failed to join room.');
      }
    });
  };

  const handleLeaveRoom = () => {
    if (socketRef.current && roomCode) {
      socketRef.current.emit('room:leave');
    }
    setRoomCode('');
    setRoomInfo(null);
    setSyncedAction1(null);
    setSyncedVideoId1(null);
    showNotification('Left the room.');
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(createdCode || roomCode).then(() => {
      showNotification('Room code copied to clipboard!');
    });
  };

  const closeModal = () => {
    setModal(MODAL.NONE);
    setJoinError('');
    setJoinInput('');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <Navbar
        roomInfo={roomInfo}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
        onLeaveRoom={handleLeaveRoom}
      />

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-card border border-border rounded-xl px-4 py-2.5 text-text-primary text-sm shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            {notification}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 lg:p-6">
        <div className="max-w-[1400px] mx-auto">
          {/* Dual player layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <PlayerPanel
              playerId="player1"
              title="Player 1"
              accentColor="#6c5ce7"
              socket={socket}
              roomCode={roomCode}
              syncedVideoId={syncedVideoId1}
              syncedAction={syncedAction1}
            />
            <PlayerPanel
              playerId="player2"
              title="Player 2"
              accentColor="#00b894"
              socket={socket}
              roomCode={roomCode}
              syncedVideoId={syncedVideoId2}
              syncedAction={syncedAction2}
            />
          </div>

          {/* Room sync info banner */}
          {roomInfo && (
            <div className="mt-4 flex items-center justify-center gap-3 text-sm text-text-secondary">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse-slow"></span>
              <span>Synced room <strong className="text-accentLight">{roomInfo.code}</strong> — {roomInfo.userCount} user{roomInfo.userCount !== 1 ? 's' : ''} connected</span>
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ─────────────────────────────────────── */}

      {/* Create Room confirmation modal */}
      {modal === MODAL.CREATE && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Create Sync Room</h3>
            <p className="text-text-secondary text-sm mb-6">
              A room lets you and a friend sync music playback in real-time. You'll get a 6-character code to share.
            </p>
            <div className="flex gap-3">
              <button id="cancel-create-room-btn" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button id="confirm-create-room-btn" onClick={confirmCreateRoom} className="btn-primary flex-1" disabled={modalLoading}>
                {modalLoading ? <><span className="spinner"></span>Creating...</> : 'Create Room'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Created Room — show code */}
      {modal === MODAL.CREATED && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h3 className="text-lg font-bold text-text-primary mb-1">Room Created!</h3>
              <p className="text-text-secondary text-sm">Share this code with your friend</p>
            </div>
            <div
              className="bg-bg border-2 border-accent rounded-xl py-4 text-center cursor-pointer hover:bg-cardHover transition-colors mb-4"
              onClick={copyRoomCode}
              title="Click to copy"
            >
              <p className="text-4xl font-black gradient-text tracking-widest">{createdCode}</p>
              <p className="text-text-muted text-xs mt-1">Click to copy</p>
            </div>
            <button id="close-created-room-btn" onClick={closeModal} className="btn-primary">
              Start Playing
            </button>
          </div>
        </div>
      )}

      {/* Join Room modal */}
      {modal === MODAL.JOIN && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="auth-card max-w-sm w-full animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text-primary mb-2">Join Sync Room</h3>
            <p className="text-text-secondary text-sm mb-4">Enter the 6-character room code shared by your friend.</p>

            <input
              id="join-room-input"
              type="text"
              value={joinInput}
              onChange={(e) => {
                setJoinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
                setJoinError('');
              }}
              placeholder="XXXXXX"
              maxLength={6}
              className={`form-input text-center text-2xl font-black tracking-widest uppercase mb-2 ${joinError ? 'border-error' : ''}`}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && confirmJoinRoom()}
            />

            {joinError && (
              <p className="text-error text-xs mb-3 text-center">{joinError}</p>
            )}

            <div className="flex gap-3 mt-2">
              <button id="cancel-join-room-btn" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
              <button id="confirm-join-room-btn" onClick={confirmJoinRoom} className="btn-primary flex-1" disabled={modalLoading || joinInput.length !== 6}>
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
