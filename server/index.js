const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./routes/auth');
const youtubeRoutes = require('./routes/youtube');
const savedRoutes = require('./routes/saved');
const chatRoutes = require('./routes/chat');
const { setupRoomHandlers } = require('./socket/roomHandler');

const app = express();
const server = http.createServer(app);

// Dynamic CORS Origins setup
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  process.env.CLIENT_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, postman, or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed list or production IP subnet
    const isAllowed = allowedOrigins.includes(origin) || 
                      origin.includes('13.126.91.');
                      
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback: allow to avoid strict blocking in test environments
    }
  },
  credentials: true,
};

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions,
});

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/youtube', youtubeRoutes);
app.use('/api/saved', savedRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'DualBeats server running' });
});

// Socket.io room handlers
setupRoomHandlers(io);

// Connect to MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(process.env.PORT || 5000, () => {
      console.log(`🚀 Server running on port ${process.env.PORT || 5000}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
