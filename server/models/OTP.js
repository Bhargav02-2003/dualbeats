const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // TTL index: auto-delete after 10 minutes
  },
  // Store pending user data until OTP is verified
  pendingUser: {
    name: String,
    password: String, // will be hashed before storing
  },
});

// Hash the OTP before saving
otpSchema.pre('save', async function (next) {
  if (!this.isModified('otp')) return next();
  const salt = await bcrypt.genSalt(10);
  this.otp = await bcrypt.hash(this.otp, salt);
  next();
});

// Verify OTP method
otpSchema.methods.verifyOtp = async function (candidateOtp) {
  return bcrypt.compare(candidateOtp, this.otp);
};

// Check if OTP is expired
otpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

module.exports = mongoose.model('OTP', otpSchema);
