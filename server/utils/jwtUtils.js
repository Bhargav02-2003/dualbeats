const jwt = require('jsonwebtoken');

/**
 * Generate JWT access token (24 hours)
 */
const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '24h' });
};

/**
 * Generate JWT refresh token (7 days)
 */
const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

/**
 * Set both tokens in httpOnly cookies
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  // Use 'lax' for cross-origin EC2 setup (frontend & backend on different IPs)
  // 'strict' would block cookies entirely in cross-origin requests
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = isProduction ? 'lax' : 'lax';

  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: false, // Must be false for HTTP (no HTTPS on EC2 plain IP)
    sameSite,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: false, // Must be false for HTTP (no HTTPS on EC2 plain IP)
    sameSite,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

/**
 * Clear token cookies on logout
 */
const clearTokenCookies = (res) => {
  res.cookie('accessToken', '', { httpOnly: true, expires: new Date(0) });
  res.cookie('refreshToken', '', { httpOnly: true, expires: new Date(0) });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setTokenCookies,
  clearTokenCookies,
};
