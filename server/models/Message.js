const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  text: { type: String, default: '' },
  emoji: { type: String, default: '' },
  reactions: [
    {
      emoji: String,
      userId: mongoose.Schema.Types.ObjectId,
      userName: String,
    },
  ],
  messageType: {
    type: String,
    enum: ['text', 'emoji', 'mixed'],
    default: 'text',
  },
  seen: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Auto-delete messages older than 24 hours
MessageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('Message', MessageSchema);
