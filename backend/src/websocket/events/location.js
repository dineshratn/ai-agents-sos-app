/**
 * Location WebSocket Event Handlers
 *
 * Handles real-time location tracking for emergencies.
 */

const { createAuthenticatedClient } = require('../../config/supabase');

/**
 * Register location event handlers for a socket
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket.IO socket instance
 */
function registerLocationEvents(io, socket) {
  /**
   * Update location for an emergency
   * Event: 'location:update'
   */
  socket.on('location:update', async (data, callback) => {
    try {
      const { emergencyId, latitude, longitude, accuracy, heading, speed } = data;

      // Validate required fields
      if (!emergencyId || latitude === undefined || longitude === undefined) {
        return callback({
          error: 'Emergency ID, latitude, and longitude are required'
        });
      }

      // Validate coordinates
      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return callback({ error: 'Invalid coordinates' });
      }

      // Verify user has access to this emergency
      const userClient = createAuthenticatedClient(socket.handshake.auth.token);
      const { data: emergency, error: emergencyError } = await userClient
        .from('emergencies')
        .select('id, status, user_id')
        .eq('id', emergencyId)
        .single();

      if (emergencyError || !emergency) {
        return callback({ error: 'Emergency not found or access denied' });
      }

      // Only allow location updates for active emergencies
      if (emergency.status !== 'active') {
        return callback({ error: 'Cannot update location for inactive emergency' });
      }

      // Insert location record
      const { data: location, error: locationError } = await userClient
        .from('locations')
        .insert({
          emergency_id: emergencyId,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: accuracy ? parseFloat(accuracy) : 0,
          heading: heading ? parseFloat(heading) : null,
          speed: speed ? parseFloat(speed) : null,
          location_method: 'realtime_update'
        })
        .select()
        .single();

      if (locationError) {
        console.error('Location insert error:', locationError);
        return callback({ error: 'Failed to save location' });
      }

      console.log(`📍 Location updated for emergency ${emergencyId}: ${latitude}, ${longitude}`);

      // Broadcast to emergency room
      const roomName = `emergency:${emergencyId}`;
      io.to(roomName).emit('location:updated', {
        emergencyId,
        location,
        timestamp: new Date().toISOString()
      });

      callback({
        success: true,
        message: 'Location updated',
        location
      });
    } catch (error) {
      console.error('Error updating location:', error);
      callback({ error: 'Failed to update location' });
    }
  });

  /**
   * Start location tracking for an emergency
   * Event: 'location:start_tracking'
   */
  socket.on('location:start_tracking', async (data, callback) => {
    try {
      const { emergencyId, interval = 30000 } = data; // Default: 30 seconds

      if (!emergencyId) {
        return callback({ error: 'Emergency ID required' });
      }

      // Store tracking info in socket data
      socket.data.tracking = {
        emergencyId,
        interval,
        startedAt: new Date().toISOString()
      };

      console.log(`🎯 Location tracking started for emergency ${emergencyId} (interval: ${interval}ms)`);

      callback({
        success: true,
        message: 'Location tracking started',
        interval
      });
    } catch (error) {
      console.error('Error starting location tracking:', error);
      callback({ error: 'Failed to start tracking' });
    }
  });

  /**
   * Stop location tracking
   * Event: 'location:stop_tracking'
   */
  socket.on('location:stop_tracking', async (callback) => {
    try {
      if (socket.data.tracking) {
        const { emergencyId } = socket.data.tracking;
        delete socket.data.tracking;

        console.log(`🛑 Location tracking stopped for emergency ${emergencyId}`);

        callback({
          success: true,
          message: 'Location tracking stopped'
        });
      } else {
        callback({
          success: false,
          message: 'No active tracking session'
        });
      }
    } catch (error) {
      console.error('Error stopping location tracking:', error);
      callback({ error: 'Failed to stop tracking' });
    }
  });

  /**
   * Get location history for an emergency
   * Event: 'location:get_history'
   */
  socket.on('location:get_history', async (data, callback) => {
    try {
      const { emergencyId, limit = 50 } = data;

      if (!emergencyId) {
        return callback({ error: 'Emergency ID required' });
      }

      const userClient = createAuthenticatedClient(socket.handshake.auth.token);
      const { data: locations, error } = await userClient
        .from('locations')
        .select('*')
        .eq('emergency_id', emergencyId)
        .order('recorded_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Location history error:', error);
        return callback({ error: 'Failed to fetch location history' });
      }

      callback({
        success: true,
        locations,
        count: locations.length
      });
    } catch (error) {
      console.error('Error getting location history:', error);
      callback({ error: 'Failed to get history' });
    }
  });
}

/**
 * Broadcast location update to relevant rooms
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} location - Location data
 */
function broadcastLocationUpdate(io, location) {
  const roomName = `emergency:${location.emergency_id}`;

  io.to(roomName).emit('location:updated', {
    emergencyId: location.emergency_id,
    location,
    timestamp: new Date().toISOString()
  });

  console.log(`📍 Broadcast location update for emergency ${location.emergency_id}`);
}

module.exports = {
  registerLocationEvents,
  broadcastLocationUpdate
};
