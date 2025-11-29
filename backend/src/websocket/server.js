/**
 * WebSocket Server (Socket.IO)
 *
 * Real-time communication server for SOS Emergency App.
 * Integrates with Supabase Realtime for database change notifications.
 */

const { Server } = require('socket.io');
const { authenticateSocket } = require('./middleware/auth');
const { registerEmergencyEvents } = require('./events/emergency');
const { registerLocationEvents } = require('./events/location');
const { registerMessageEvents } = require('./events/messages');
const { initializeRealtimeSubscriptions, cleanupRealtimeSubscriptions } = require('./realtime');

/**
 * Initialize Socket.IO server
 *
 * @param {Object} httpServer - HTTP server instance
 * @param {Object} options - Socket.IO options
 * @returns {Object} Socket.IO server instance
 */
function initializeWebSocketServer(httpServer, options = {}) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST']
    },
    ...options
  });

  // Authentication middleware
  io.use(authenticateSocket);

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`\n🔌 New WebSocket connection: ${socket.id}`);
    console.log(`   User: ${socket.user.email}`);
    console.log(`   User ID: ${socket.userId}`);

    // Register event handlers
    registerEmergencyEvents(io, socket);
    registerLocationEvents(io, socket);
    registerMessageEvents(io, socket);

    // Join user's personal room for notifications
    const userRoom = `user:${socket.userId}`;
    socket.join(userRoom);
    console.log(`   Joined room: ${userRoom}`);

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`\n❌ WebSocket disconnected: ${socket.id}`);
      console.log(`   User: ${socket.user.email}`);
      console.log(`   Reason: ${reason}`);

      // Clean up any active location tracking
      if (socket.data.tracking) {
        console.log(`   Stopped location tracking for emergency ${socket.data.tracking.emergencyId}`);
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`⚠️  Socket error for ${socket.user.email}:`, error.message);
    });

    // Ping/Pong for connection health
    socket.on('ping', (callback) => {
      if (callback) {
        callback({
          timestamp: new Date().toISOString(),
          status: 'pong'
        });
      }
    });
  });

  // Initialize Supabase Realtime subscriptions
  const realtimeChannels = initializeRealtimeSubscriptions(io);

  // Store channels for cleanup
  io.realtimeChannels = realtimeChannels;

  console.log('\n' + '='.repeat(60));
  console.log('🔄 WebSocket Server Initialized');
  console.log('='.repeat(60));
  console.log('✅ Socket.IO ready for connections');
  console.log('✅ Supabase Realtime subscriptions active');
  console.log('');
  console.log('📡 Available Events:');
  console.log('');
  console.log('   Emergency:');
  console.log('   - emergency:join');
  console.log('   - emergency:leave');
  console.log('   - emergency:subscribe_all');
  console.log('   - emergency:get_status');
  console.log('');
  console.log('   Location:');
  console.log('   - location:update');
  console.log('   - location:start_tracking');
  console.log('   - location:stop_tracking');
  console.log('   - location:get_history');
  console.log('');
  console.log('   Messages:');
  console.log('   - message:send');
  console.log('   - message:mark_read');
  console.log('   - message:typing');
  console.log('   - message:get_history');
  console.log('');
  console.log('🎧 Server Events (from Supabase):');
  console.log('   - emergency:updated');
  console.log('   - location:updated');
  console.log('   - message:new');
  console.log('   - notification:new');
  console.log('='.repeat(60) + '\n');

  return io;
}

/**
 * Cleanup WebSocket server and subscriptions
 *
 * @param {Object} io - Socket.IO server instance
 */
async function cleanupWebSocketServer(io) {
  console.log('\n🛑 Shutting down WebSocket server...');

  // Disconnect all clients
  io.disconnectSockets();

  // Cleanup Supabase Realtime subscriptions
  if (io.realtimeChannels) {
    await cleanupRealtimeSubscriptions(io.realtimeChannels);
  }

  // Close Socket.IO server
  io.close();

  console.log('✅ WebSocket server shut down gracefully\n');
}

module.exports = {
  initializeWebSocketServer,
  cleanupWebSocketServer
};
