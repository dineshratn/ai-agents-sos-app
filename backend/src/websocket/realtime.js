/**
 * Supabase Realtime Integration
 *
 * Subscribes to database changes and broadcasts them via Socket.IO.
 */

const { supabase } = require('../config/supabase');
const { broadcastEmergencyEvent } = require('./events/emergency');
const { broadcastLocationUpdate } = require('./events/location');
const { broadcastMessage } = require('./events/messages');

/**
 * Initialize Supabase Realtime subscriptions
 *
 * @param {Object} io - Socket.IO server instance
 */
function initializeRealtimeSubscriptions(io) {
  console.log('🔄 Initializing Supabase Realtime subscriptions...');

  // Subscribe to emergencies table changes
  const emergenciesChannel = supabase
    .channel('db-emergencies')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'emergencies'
    }, (payload) => {
      console.log('📥 New emergency inserted:', payload.new.id);
      broadcastEmergencyEvent(io, 'triggered', payload.new);
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'emergencies'
    }, (payload) => {
      console.log('📝 Emergency updated:', payload.new.id);

      // Determine event type based on status change
      let eventType = 'updated';
      if (payload.new.status === 'resolved' && payload.old.status !== 'resolved') {
        eventType = 'resolved';
      } else if (payload.new.status === 'cancelled' && payload.old.status !== 'cancelled') {
        eventType = 'cancelled';
      }

      broadcastEmergencyEvent(io, eventType, payload.new);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to emergencies changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to emergencies');
      }
    });

  // Subscribe to locations table changes
  const locationsChannel = supabase
    .channel('db-locations')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'locations'
    }, (payload) => {
      console.log('📥 New location inserted for emergency:', payload.new.emergency_id);
      broadcastLocationUpdate(io, payload.new);
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to locations changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to locations');
      }
    });

  // Subscribe to messages table changes
  const messagesChannel = supabase
    .channel('db-messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages'
    }, (payload) => {
      console.log('📥 New message inserted for emergency:', payload.new.emergency_id);

      // Only broadcast system messages (user messages are broadcast via socket event)
      if (payload.new.sender_type === 'system') {
        broadcastMessage(io, payload.new, {
          type: 'system'
        });
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to messages changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to messages');
      }
    });

  // Subscribe to notifications table changes
  const notificationsChannel = supabase
    .channel('db-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications'
    }, (payload) => {
      console.log('📥 New notification for user:', payload.new.user_id);

      // Broadcast to user's personal room
      const userRoom = `user:${payload.new.user_id}`;
      io.to(userRoom).emit('notification:new', {
        notification: payload.new,
        timestamp: new Date().toISOString()
      });
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Subscribed to notifications changes');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to notifications');
      }
    });

  // Return channels for cleanup on shutdown
  return {
    emergenciesChannel,
    locationsChannel,
    messagesChannel,
    notificationsChannel
  };
}

/**
 * Cleanup Supabase Realtime subscriptions
 *
 * @param {Object} channels - Object containing all channel instances
 */
async function cleanupRealtimeSubscriptions(channels) {
  console.log('🧹 Cleaning up Supabase Realtime subscriptions...');

  try {
    if (channels.emergenciesChannel) {
      await supabase.removeChannel(channels.emergenciesChannel);
    }
    if (channels.locationsChannel) {
      await supabase.removeChannel(channels.locationsChannel);
    }
    if (channels.messagesChannel) {
      await supabase.removeChannel(channels.messagesChannel);
    }
    if (channels.notificationsChannel) {
      await supabase.removeChannel(channels.notificationsChannel);
    }

    console.log('✅ Realtime subscriptions cleaned up');
  } catch (error) {
    console.error('Error cleaning up subscriptions:', error);
  }
}

module.exports = {
  initializeRealtimeSubscriptions,
  cleanupRealtimeSubscriptions
};
