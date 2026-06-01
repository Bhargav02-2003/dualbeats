const express = require('express');
const router = express.Router();
const {
  register,
  verifyOTP,
  login,
  refresh,
  logout,
  getMe,
  resendOTP,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/verify-otp', verifyOTP);
router.post('/login', login);
router.post('/refresh', refresh);
router.post('/logout', logout);
router.post('/resend-otp', resendOTP);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;
