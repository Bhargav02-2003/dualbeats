const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { generateOTP } = require('../utils/generateOTP');
const { sendOTPEmail, sendResetPasswordEmail } = require('../utils/sendEmail');
const {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
} = require('../utils/jwtUtils');

/**
 * POST /api/auth/register
 * Step 1: Validate input, send OTP to email
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate inputs
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser && existingUser.isVerified) {
      return res.status(409).json({ message: 'An account with this email already exists.' });
    }

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Generate OTP
    const otp = generateOTP();

    // Hash password before storing in pending user data
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save OTP with pending user info
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      pendingUser: {
        name: name.trim(),
        password: hashedPassword,
      },
    });
    await otpDoc.save();

    // Send OTP email
    await sendOTPEmail(email, otp, name.trim());

    const responsePayload = {
      message: 'OTP sent to your email. Please verify within 10 minutes.',
      email: email.toLowerCase(),
    };

    // In development mode or with maildev enabled, return OTP in response for UI display
    if (process.env.USE_MAILDEV === 'true' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      responsePayload.otp = otp;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
};

/**
 * POST /api/auth/verify-otp
 * Step 2: Verify OTP, create user account, issue tokens
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    // Find OTP document
    const otpDoc = await OTP.findOne({ email: email.toLowerCase() });
    if (!otpDoc) {
      return res.status(400).json({ message: 'OTP not found or already used. Please request a new one.' });
    }

    // Check expiry
    if (otpDoc.isExpired()) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    const isValid = await otpDoc.verifyOtp(otp.toString().trim());
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid OTP. Please check and try again.' });
    }

    // Create user (or update existing unverified user)
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = new User({
        name: otpDoc.pendingUser.name,
        email: email.toLowerCase(),
        password: 'placeholder', // Will be replaced below
        isVerified: true,
      });
    }

    // Set hashed password directly (bypass pre-save hook)
    user.name = otpDoc.pendingUser.name;
    user.isVerified = true;
    // Use updateOne to bypass the pre-save hook for password re-hashing
    await User.updateOne(
      { email: email.toLowerCase() },
      {
        $set: {
          name: otpDoc.pendingUser.name,
          email: email.toLowerCase(),
          password: otpDoc.pendingUser.password,
          isVerified: true,
        },
      },
      { upsert: true }
    );

    // Delete the OTP document
    await OTP.deleteOne({ _id: otpDoc._id });

    // Fetch created user
    const createdUser = await User.findOne({ email: email.toLowerCase() });

    // Generate tokens
    const accessToken = generateAccessToken(createdUser._id);
    const refreshToken = generateRefreshToken(createdUser._id);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'Account created successfully! Welcome to DualBeats.',
      user: createdUser,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Verification failed. Please try again.' });
  }
};

/**
 * POST /api/auth/login
 * Login with email and password
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    // Find user with password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ message: 'Please verify your email before logging in.' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Set cookies
    setTokenCookies(res, accessToken, refreshToken);

    // Return user without password
    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      message: 'Login successful!',
      user: userObj,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token cookie
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token found. Please log in.' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    setTokenCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({ message: 'Token refreshed successfully.' });
  } catch (error) {
    console.error('Refresh error:', error);
    clearTokenCookies(res);
    res.status(401).json({ message: 'Invalid or expired refresh token. Please log in.' });
  }
};

/**
 * POST /api/auth/logout
 * Clear all auth cookies
 */
const logout = async (req, res) => {
  try {
    clearTokenCookies(res);
    res.status(200).json({ message: 'Logged out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Logout failed.' });
  }
};

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
const getMe = async (req, res) => {
  try {
    res.status(200).json({ user: req.user });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ message: 'Failed to retrieve user data.' });
  }
};

/**
 * POST /api/auth/resend-otp
 * Resend OTP to email
 */
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Check if there's pending OTP data
    const existingOTP = await OTP.findOne({ email: email.toLowerCase() });
    if (!existingOTP) {
      return res.status(400).json({ message: 'No pending registration found. Please register again.' });
    }

    const newOtp = generateOTP();
    existingOTP.otp = newOtp;
    existingOTP.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await existingOTP.save();

    await sendOTPEmail(email, newOtp, existingOTP.pendingUser.name);

    const responsePayload = { message: 'OTP resent successfully. Please check your email.' };

    // In development mode or with maildev enabled, return OTP in response for UI display
    if (process.env.USE_MAILDEV === 'true' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      responsePayload.otp = newOtp;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ message: 'Failed to resend OTP. Please try again.' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Step 1: Send password reset OTP
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'No account found with this email address.' });
    }

    // Delete any existing OTP for this email
    await OTP.deleteMany({ email: email.toLowerCase() });

    // Generate OTP
    const otp = generateOTP();

    // Save OTP
    const otpDoc = new OTP({
      email: email.toLowerCase(),
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });
    await otpDoc.save();

    // Send reset password email
    await sendResetPasswordEmail(email.toLowerCase(), otp, user.name);

    const responsePayload = {
      message: 'Password reset code sent to your email. Please check your inbox.',
      email: email.toLowerCase(),
    };

    // In development mode, return OTP in response for testing convenience
    if (process.env.USE_MAILDEV === 'true' || process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      responsePayload.otp = otp;
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Failed to send password reset code. Please try again.' });
  }
};

/**
 * POST /api/auth/reset-password
 * Step 2: Verify OTP and reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'All fields (email, otp, new password) are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Find OTP document
    const otpDoc = await OTP.findOne({ email: email.toLowerCase() });
    if (!otpDoc) {
      return res.status(400).json({ message: 'Reset code not found or expired. Please request a new one.' });
    }

    // Check expiry
    if (otpDoc.isExpired()) {
      await OTP.deleteOne({ _id: otpDoc._id });
      return res.status(400).json({ message: 'Reset code has expired. Please request a new one.' });
    }

    // Verify OTP
    const isValid = await otpDoc.verifyOtp(otp.toString().trim());
    if (!isValid) {
      return res.status(400).json({ message: 'Invalid reset code. Please check and try again.' });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Delete the OTP document
    await OTP.deleteOne({ _id: otpDoc._id });

    res.status(200).json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password. Please try again.' });
  }
};

module.exports = {
  register,
  verifyOTP,
  login,
  refresh,
  logout,
  getMe,
  resendOTP,
  forgotPassword,
  resetPassword,
};
