import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ roomInfo, onCreateRoom, onJoinRoom, onLeaveRoom }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="glass border-b border-border sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎵</span>
          <span className="text-xl font-black gradient-text hidden sm:block">DualBeats</span>
        </div>

        {/* Room controls */}
        <div className="flex items-center gap-2">
          {roomInfo ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-accent bg-opacity-20 border border-accent border-opacity-40 rounded-lg px-3 py-1.5">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse-slow"></span>
                <span className="text-accentLight text-xs font-semibold tracking-widest">{roomInfo.code}</span>
              </div>
              <span className="text-text-muted text-xs hidden sm:block">
                {roomInfo.userCount} user{roomInfo.userCount !== 1 ? 's' : ''}
              </span>
              <button
                id="leave-room-btn"
                onClick={onLeaveRoom}
                className="btn-secondary text-xs py-1.5 px-3 text-error border-error border-opacity-30 hover:bg-error hover:bg-opacity-10"
              >
                Leave Room
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="create-room-btn"
                onClick={onCreateRoom}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Create a sync room"
              >
                <span>🎮</span>
                <span className="hidden sm:inline">Create Room</span>
              </button>
              <button
                id="join-room-btn"
                onClick={onJoinRoom}
                className="btn-secondary text-xs py-1.5 px-3"
                title="Join a sync room"
              >
                <span>🔗</span>
                <span className="hidden sm:inline">Join Room</span>
              </button>
            </div>
          )}
        </div>

        {/* User info + logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center text-white font-bold text-sm">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span className="text-text-primary text-sm font-medium hidden md:block">
              {user?.name}
            </span>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="btn-secondary text-xs py-1.5 px-3 text-error border-error border-opacity-30 hover:bg-error hover:bg-opacity-10"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
