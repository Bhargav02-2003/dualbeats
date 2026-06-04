// Active rooms stored in memory: Map<roomCode, { users: Set<socketId>, hostId: string }>
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
    socket.on('room:create', ({ userName }, callback) => {
      let roomCode;
      // Ensure unique code
      do {
        roomCode = generateRoomCode();
      } while (activeRooms.has(roomCode));

      activeRooms.set(roomCode, {
        users: new Set([socket.id]),
        hostId: socket.id,
        hostName: userName || 'Host',
      });

      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      socket.data.userName = userName;

      console.log(`🏠 Room created: ${roomCode} by ${socket.id}`);

      if (callback) callback({ success: true, roomCode });
    });

    // ─── Join Room ─────────────────────────────────────────────────
    socket.on('room:join', ({ roomCode, userName }, callback) => {
      const room = activeRooms.get(roomCode);

      if (!room) {
        if (callback) callback({ success: false, message: 'Room not found. Check the code and try again.' });
        return;
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

      console.log(`👤 ${socket.id} joined room: ${roomCode}`);

      if (callback) {
        callback({
          success: true,
          roomCode,
          userCount: room.users.size,
          hostName: room.hostName,
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
      socket.to(roomCode).emit('room:play', { videoId, currentTime, serverTs: Date.now() });
    });

    // ─── Pause Event ───────────────────────────────────────────────
    socket.on('room:pause', ({ roomCode, currentTime }) => {
      socket.to(roomCode).emit('room:pause', { currentTime, serverTs: Date.now() });
    });

    // ─── Seek Event ────────────────────────────────────────────────
    socket.on('room:seek', ({ roomCode, currentTime }) => {
      socket.to(roomCode).emit('room:seek', { currentTime, serverTs: Date.now() });
    });

    // ─── Video Change Event ────────────────────────────────────────
    socket.on('room:video-change', ({ roomCode, videoId, title }) => {
      socket.to(roomCode).emit('room:video-change', { videoId, title });
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
    // Delete empty room
    activeRooms.delete(roomCode);
    console.log(`🗑️ Room ${roomCode} deleted (empty)`);
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
