import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ roomInfo, onCreateRoom, onJoinRoom, onLeaveRoom }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="glass border-b border-border sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 h-14 flex items-center justify-between gap-3">

        {/* Logo — YouTube Music style */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* YTM-style logo mark */}
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <div className="hidden sm:flex flex-col leading-none">
            <span className="text-white font-black text-base tracking-tight">DualBeats</span>
            <span className="text-text-muted text-[10px] font-medium tracking-widest uppercase">Music</span>
          </div>
        </div>

        {/* Center — room sync badge */}
        <div className="flex-1 flex items-center justify-center">
          {roomInfo && (
            <div className="flex items-center gap-2 bg-accentMuted border border-accent border-opacity-40 rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse-slow flex-shrink-0" />
              <span className="text-accent text-xs font-bold tracking-widest">{roomInfo.code}</span>
              <span className="text-text-muted text-xs hidden sm:block">· {roomInfo.userCount} listening</span>
            </div>
          )}
        </div>

        {/* Right — controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {roomInfo ? (
            <button
              id="leave-room-btn"
              onClick={onLeaveRoom}
              className="btn-secondary text-xs py-1.5 px-3 text-error border-error border-opacity-30 hover:bg-error hover:bg-opacity-10"
            >
              Leave
            </button>
          ) : (
            <>
              <button
                id="create-room-btn"
                onClick={onCreateRoom}
                className="btn-secondary text-xs py-1.5 px-3 gap-1.5"
                title="Create a sync room"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="hidden sm:inline">Create Room</span>
              </button>
              <button
                id="join-room-btn"
                onClick={onJoinRoom}
                className="btn-secondary text-xs py-1.5 px-3 gap-1.5"
                title="Join a sync room"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="hidden sm:inline">Join Room</span>
              </button>
            </>
          )}

          {/* User avatar + menu */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="w-8 h-8 bg-gradient-to-br from-accent to-red-800 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 hover:opacity-90 transition-opacity"
              title={user?.name}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-10 w-44 bg-card border border-border rounded-xl shadow-2xl z-50 py-1 animate-slide-down"
                onMouseLeave={() => setMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-text-primary text-sm font-semibold truncate">{user?.name}</p>
                  <p className="text-text-muted text-xs truncate">{user?.email}</p>
                </div>
                <button
                  id="logout-btn"
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-error hover:bg-error hover:bg-opacity-10 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
