const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect routes — verifies JWT access token from cookie
 */
const protect = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      return res.status(401).json({ message: 'Not authenticated. Please log in.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired. Please refresh.' });
    }
    return res.status(401).json({ message: 'Invalid token. Please log in.' });
  }
};

module.exports = { protect };
