/**
 * Authentication Middleware
 *
 * Verifies JWT tokens from Authorization header and attaches user to request.
 * Uses Supabase Auth for token verification.
 */

const { getUserFromToken } = require('../config/supabase');

/**
 * Middleware to verify JWT token and attach user to request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Authorization header required',
        message: 'Please provide a valid access token'
      });
    }

    // Check format: "Bearer <token>"
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization header format',
        message: 'Expected format: "Bearer <token>"'
      });
    }

    const token = parts[1];

    // Verify token with Supabase
    const { user, error } = await getUserFromToken(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        message: 'Please sign in again',
        details: error?.message
      });
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      message: 'An error occurred while verifying your credentials'
    });
  }
}

/**
 * Optional auth middleware - doesn't fail if no token provided
 * Attaches user to request if valid token exists
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];
    const { user } = await getUserFromToken(token);

    if (user) {
      req.user = user;
      req.token = token;
    }

    next();
  } catch (error) {
    // Continue without user if optional auth fails
    next();
  }
}

module.exports = {
  requireAuth,
  optionalAuth
};
