/**
 * WebSocket Authentication Middleware
 *
 * Verifies JWT tokens for Socket.IO connections.
 */

const { getUserFromToken } = require('../../config/supabase');

/**
 * Socket.IO authentication middleware
 * Verifies JWT token from handshake auth
 *
 * @param {Object} socket - Socket.IO socket instance
 * @param {Function} next - Callback to continue connection
 */
async function authenticateSocket(socket, next) {
  try {
    // Get token from handshake auth or query
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      return next(new Error('Authentication token required'));
    }

    // Verify token with Supabase
    const { user, error } = await getUserFromToken(token);

    if (error || !user) {
      return next(new Error('Invalid or expired token'));
    }

    // Attach user to socket for use in event handlers
    socket.user = user;
    socket.userId = user.id;

    console.log(`✅ Socket authenticated: ${user.email} (${socket.id})`);

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
}

module.exports = {
  authenticateSocket
};
