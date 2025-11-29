/**
 * Emergency WebSocket Event Handlers
 *
 * Handles real-time emergency events via Socket.IO.
 */

const { createAuthenticatedClient } = require('../../config/supabase');

/**
 * Register emergency event handlers for a socket
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket.IO socket instance
 */
function registerEmergencyEvents(io, socket) {
  /**
   * Join an emergency room for real-time updates
   * Event: 'emergency:join'
   */
  socket.on('emergency:join', async (data, callback) => {
    try {
      const { emergencyId } = data;

      if (!emergencyId) {
        return callback({ error: 'Emergency ID required' });
      }

      // Verify user has access to this emergency
      const userClient = createAuthenticatedClient(socket.handshake.auth.token);
      const { data: emergency, error } = await userClient
        .from('emergencies')
        .select('id, status')
        .eq('id', emergencyId)
        .single();

      if (error || !emergency) {
        return callback({ error: 'Emergency not found or access denied' });
      }

      // Join the emergency room
      const roomName = `emergency:${emergencyId}`;
      socket.join(roomName);

      console.log(`👤 ${socket.user.email} joined ${roomName}`);

      callback({
        success: true,
        message: `Joined emergency ${emergencyId}`,
        emergency
      });

      // Notify others in the room
      socket.to(roomName).emit('emergency:user_joined', {
        userId: socket.userId,
        email: socket.user.email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error joining emergency:', error);
      callback({ error: 'Failed to join emergency' });
    }
  });

  /**
   * Leave an emergency room
   * Event: 'emergency:leave'
   */
  socket.on('emergency:leave', async (data, callback) => {
    try {
      const { emergencyId } = data;

      if (!emergencyId) {
        return callback({ error: 'Emergency ID required' });
      }

      const roomName = `emergency:${emergencyId}`;
      socket.leave(roomName);

      console.log(`👋 ${socket.user.email} left ${roomName}`);

      callback({
        success: true,
        message: `Left emergency ${emergencyId}`
      });

      // Notify others in the room
      socket.to(roomName).emit('emergency:user_left', {
        userId: socket.userId,
        email: socket.user.email,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error leaving emergency:', error);
      callback({ error: 'Failed to leave emergency' });
    }
  });

  /**
   * Subscribe to all user's active emergencies
   * Event: 'emergency:subscribe_all'
   */
  socket.on('emergency:subscribe_all', async (callback) => {
    try {
      // Join user's personal room
      const userRoom = `user:${socket.userId}`;
      socket.join(userRoom);

      console.log(`📡 ${socket.user.email} subscribed to all emergencies`);

      callback({
        success: true,
        message: 'Subscribed to all emergencies',
        room: userRoom
      });
    } catch (error) {
      console.error('Error subscribing to emergencies:', error);
      callback({ error: 'Failed to subscribe' });
    }
  });

  /**
   * Request emergency status update
   * Event: 'emergency:get_status'
   */
  socket.on('emergency:get_status', async (data, callback) => {
    try {
      const { emergencyId } = data;

      if (!emergencyId) {
        return callback({ error: 'Emergency ID required' });
      }

      const userClient = createAuthenticatedClient(socket.handshake.auth.token);
      const { data: emergency, error } = await userClient
        .from('emergencies')
        .select(`
          *,
          locations(*),
          ai_assessments(*),
          messages(*)
        `)
        .eq('id', emergencyId)
        .single();

      if (error || !emergency) {
        return callback({ error: 'Emergency not found' });
      }

      callback({
        success: true,
        emergency
      });
    } catch (error) {
      console.error('Error getting emergency status:', error);
      callback({ error: 'Failed to get status' });
    }
  });
}

/**
 * Broadcast emergency event to relevant rooms
 *
 * @param {Object} io - Socket.IO server instance
 * @param {string} eventType - Type of event (triggered, updated, resolved, cancelled)
 * @param {Object} emergency - Emergency data
 */
function broadcastEmergencyEvent(io, eventType, emergency) {
  const roomName = `emergency:${emergency.id}`;
  const userRoom = `user:${emergency.user_id}`;

  const event = {
    type: eventType,
    emergency,
    timestamp: new Date().toISOString()
  };

  // Broadcast to emergency room
  io.to(roomName).emit('emergency:updated', event);

  // Broadcast to user's personal room
  io.to(userRoom).emit('emergency:updated', event);

  console.log(`📢 Broadcast ${eventType} for emergency ${emergency.id}`);
}

module.exports = {
  registerEmergencyEvents,
  broadcastEmergencyEvent
};
