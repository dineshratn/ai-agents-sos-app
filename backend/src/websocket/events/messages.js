/**
 * Messages WebSocket Event Handlers
 *
 * Handles real-time messaging for emergencies.
 */

const { createAuthenticatedClient } = require('../../config/supabase');

/**
 * Register message event handlers for a socket
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket.IO socket instance
 */
function registerMessageEvents(io, socket) {
  /**
   * Send a message to an emergency
   * Event: 'message:send'
   */
  socket.on('message:send', async (data, callback) => {
    try {
      const { emergencyId, content } = data;

      // Validate required fields
      if (!emergencyId || !content) {
        return callback({ error: 'Emergency ID and content are required' });
      }

      // Validate content length
      if (content.trim().length === 0) {
        return callback({ error: 'Message content cannot be empty' });
      }

      if (content.length > 2000) {
        return callback({ error: 'Message content must be 2000 characters or less' });
      }

      // Verify user has access to this emergency
      const userClient = createAuthenticatedClient(socket.handshake.auth.token);
      const { data: emergency, error: emergencyError } = await userClient
        .from('emergencies')
        .select('id, status')
        .eq('id', emergencyId)
        .single();

      if (emergencyError || !emergency) {
        return callback({ error: 'Emergency not found or access denied' });
      }

      // Check if emergency is active
      if (emergency.status !== 'active') {
        return callback({ error: 'Cannot send messages to inactive emergency' });
      }

      // Insert message
      const { data: message, error: messageError } = await userClient
        .from('messages')
        .insert({
          emergency_id: emergencyId,
          sender_type: 'user',
          content: content.trim()
        })
        .select()
        .single();

      if (messageError) {
        console.error('Message insert error:', messageError);
        return callback({ error: 'Failed to send message' });
      }

      console.log(`💬 Message sent to emergency ${emergencyId} by ${socket.user.email}`);

      // Broadcast to emergency room (including sender)
      const roomName = `emergency:${emergencyId}`;
      io.to(roomName).emit('message:new', {
        emergencyId,
        message: {
          ...message,
          sender: {
            id: socket.userId,
            email: socket.user.email,
            full_name: socket.user.user_metadata?.full_name
          }
        },
        timestamp: new Date().toISOString()
      });

      callback({
        success: true,
        message: 'Message sent',
        data: message
      });
    } catch (error) {
      console.error('Error sending message:', error);
      callback({ error: 'Failed to send message' });
    }
  });

  /**
   * Mark message as read
   * Event: 'message:mark_read'
   */
  socket.on('message:mark_read', async (data, callback) => {
    try {
      const { messageId } = data;

      if (!messageId) {
        return callback({ error: 'Message ID required' });
      }

      // In a full implementation, you'd update a read_receipts table
      // For now, just acknowledge
      console.log(`✓ Message ${messageId} marked as read by ${socket.user.email}`);

      callback({
        success: true,
        message: 'Message marked as read'
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
      callback({ error: 'Failed to mark as read' });
    }
  });

  /**
   * Typing indicator
   * Event: 'message:typing'
   */
  socket.on('message:typing', async (data) => {
    try {
      const { emergencyId, isTyping } = data;

      if (!emergencyId) {
        return;
      }

      // Broadcast typing status to emergency room (except sender)
      const roomName = `emergency:${emergencyId}`;
      socket.to(roomName).emit('message:typing', {
        emergencyId,
        userId: socket.userId,
        email: socket.user.email,
        isTyping,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error broadcasting typing indicator:', error);
    }
  });

  /**
   * Get message history for an emergency
   * Event: 'message:get_history'
   */
  socket.on('message:get_history', async (data, callback) => {
    try {
      const { emergencyId, limit = 50, offset = 0 } = data;

      if (!emergencyId) {
        return callback({ error: 'Emergency ID required' });
      }

      const userClient = createAuthenticatedClient(socket.handshake.auth.token);
      const { data: messages, error } = await userClient
        .from('messages')
        .select('*')
        .eq('emergency_id', emergencyId)
        .order('sent_at', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Message history error:', error);
        return callback({ error: 'Failed to fetch message history' });
      }

      callback({
        success: true,
        messages,
        count: messages.length
      });
    } catch (error) {
      console.error('Error getting message history:', error);
      callback({ error: 'Failed to get history' });
    }
  });
}

/**
 * Broadcast new message to relevant rooms
 *
 * @param {Object} io - Socket.IO server instance
 * @param {Object} message - Message data
 * @param {Object} sender - Sender information (optional)
 */
function broadcastMessage(io, message, sender = null) {
  const roomName = `emergency:${message.emergency_id}`;

  io.to(roomName).emit('message:new', {
    emergencyId: message.emergency_id,
    message: {
      ...message,
      sender
    },
    timestamp: new Date().toISOString()
  });

  console.log(`💬 Broadcast message for emergency ${message.emergency_id}`);
}

module.exports = {
  registerMessageEvents,
  broadcastMessage
};
