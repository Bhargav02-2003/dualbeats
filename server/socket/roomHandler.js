// Active rooms stored in memory: Map<roomCode, { users: Set<socketId>, hostId, maxUsers, isPlaying, lastPosition, lastPositionUpdate, currentVideo }>
const activeRooms = new Map();

/**
 * Generate a random 6-character alphanumeric room code
 */
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Setup all Socket.io room event handlers
 * @param {import('socket.io').Server} io
 */
const setupRoomHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // ─── Create Room ───────────────────────────────────────────────
    socket.on('room:create', ({ userName, maxUsers }, callback) => {
      let roomCode;
      // Ensure unique code
      do {
        roomCode = generateRoomCode();
      } while (activeRooms.has(roomCode));

      // Validate maxUsers — only allow preset values, default to 5
      const limit = [1, 3, 5, 10].includes(Number(maxUsers)) ? Number(maxUsers) : 5;

      activeRooms.set(roomCode, {
        users: new Set([socket.id]),
        hostId: socket.id,
        hostName: userName || 'Host',
        maxUsers: limit,
        isPlaying: false,
        lastPosition: 0,
        lastPositionUpdate: 0,
        currentVideo: null,
      });

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userName = userName;

      console.log(`🏠 Room created: ${roomCode} by ${socket.id} (max: ${limit})`);

      if (callback) callback({ success: true, roomCode, maxUsers: limit });
    });

    // ─── Join Room ─────────────────────────────────────────────────
    socket.on('room:join', ({ roomCode, userName }, callback) => {
      const room = activeRooms.get(roomCode);

      if (!room) {
        if (callback) callback({ success: false, message: 'Room not found. Check the code and try again.' });
        return;
      }

      // ─ Capacity check (skip if socket already in room, e.g. reconnect)
      if (!room.users.has(socket.id) && room.maxUsers) {
        if (room.users.size >= room.maxUsers) {
          const msg = room.maxUsers === 1
            ? 'This is a private solo room — no one else can join.'
            : `This room is full (${room.maxUsers} people max). Try another room.`;
          if (callback) callback({ success: false, message: msg });
          return;
        }
      }

      if (room.deleteTimeout) {
        clearTimeout(room.deleteTimeout);
        room.deleteTimeout = null;
        console.log(`⏱️ Cancelled delete timeout for room ${roomCode}`);
      }

      // If the host is no longer in the room (or not set), reassign to this socket
      if (!room.hostId || !room.users.has(room.hostId)) {
        room.hostId = socket.id;
        room.hostName = userName || 'Host';
      }

      room.users.add(socket.id);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userName = userName;

      // Notify others in the room
      socket.to(roomCode).emit('room:user-joined', {
        userId: socket.id,
        userName: userName || 'Guest',
        userCount: room.users.size,
      });

      console.log(`👤 ${socket.id} joined room: ${roomCode} (${room.users.size}/${room.maxUsers || '∞'})`);

      // Calculate synchronized playback position for joining user
      let currentProgress = room.lastPosition || 0;
      if (room.isPlaying && room.lastPositionUpdate) {
        currentProgress += (Date.now() - room.lastPositionUpdate) / 1000;
      }

      if (callback) {
        callback({
          success: true,
          roomCode,
          userCount: room.users.size,
          maxUsers: room.maxUsers || null,
          hostName: room.hostName,
          currentVideo: room.currentVideo,
          isPlaying: room.isPlaying,
          currentTime: currentProgress,
        });
      }
    });

    // ─── Leave Room ────────────────────────────────────────────────
    socket.on('room:leave', () => {
      const roomCode = socket.data.roomCode;
      if (roomCode) {
        leaveRoom(io, socket, roomCode);
      }
    });

    // ─── Play Event ────────────────────────────────────────────────
    socket.on('room:play', ({ roomCode, videoId, currentTime }) => {
      const room = activeRooms.get(roomCode);
      if (room) {
        room.isPlaying = true;
        room.lastPosition = currentTime || 0;
        room.lastPositionUpdate = Date.now();
        if (videoId) {
          room.currentVideo = { videoId, title: room.currentVideo?.title || '' };
        }
      }
      socket.to(roomCode).emit('room:play', { videoId, currentTime, serverTs: Date.now() });
    });

    // ─── Pause Event ───────────────────────────────────────────────
    socket.on('room:pause', ({ roomCode, currentTime }) => {
      const room = activeRooms.get(roomCode);
      if (room) {
        room.isPlaying = false;
        room.lastPosition = currentTime || 0;
        room.lastPositionUpdate = Date.now();
      }
      socket.to(roomCode).emit('room:pause', { currentTime, serverTs: Date.now() });
    });

    // ─── Seek Event ────────────────────────────────────────────────
    socket.on('room:seek', ({ roomCode, currentTime }) => {
      const room = activeRooms.get(roomCode);
      if (room) {
        room.lastPosition = currentTime || 0;
        room.lastPositionUpdate = Date.now();
      }
      socket.to(roomCode).emit('room:seek', { currentTime, serverTs: Date.now() });
    });

    // ─── Video Change Event ────────────────────────────────────────
    socket.on('room:video-change', ({ roomCode, videoId, title, channelName, thumbnail }) => {
      const room = activeRooms.get(roomCode);
      if (room) {
        room.currentVideo = { videoId, title, channelName, thumbnail };
        room.isPlaying = true; // Auto-play on video change
        room.lastPosition = 0;
        room.lastPositionUpdate = Date.now();
      }
      socket.to(roomCode).emit('room:video-change', { videoId, title, channelName, thumbnail });
    });

    // ─── Disconnect ────────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
      const roomCode = socket.data.roomCode;
      if (roomCode) {
        leaveRoom(io, socket, roomCode);
      }
    });
  });
};

/**
 * Handle a user leaving a room — notify others and clean up empty rooms
 */
const leaveRoom = (io, socket, roomCode) => {
  const room = activeRooms.get(roomCode);
  if (!room) return;

  room.users.delete(socket.id);
  socket.leave(roomCode);
  socket.data.roomCode = null;

  if (room.users.size === 0) {
    // Delete empty room after a grace period of 10 seconds to allow for page reloads/reconnects
    if (room.deleteTimeout) {
      clearTimeout(room.deleteTimeout);
    }
    room.deleteTimeout = setTimeout(() => {
      activeRooms.delete(roomCode);
      console.log(`🗑️ Room ${roomCode} deleted (empty after grace period)`);
    }, 10000);
  } else {
    // Notify remaining users
    const newHostId = room.users.size > 0 ? [...room.users][0] : null;
    if (socket.id === room.hostId && newHostId) {
      room.hostId = newHostId;
    }
    io.to(roomCode).emit('room:user-left', {
      userId: socket.id,
      userCount: room.users.size,
    });
  }
};

module.exports = { setupRoomHandlers };
