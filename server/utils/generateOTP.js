const crypto = require('crypto');

/**
 * Generate a 6-digit numeric OTP
 * Uses crypto.randomInt for cryptographic security
 */
const generateOTP = () => {
  return String(crypto.randomInt(100000, 999999));
};

module.exports = { generateOTP };
