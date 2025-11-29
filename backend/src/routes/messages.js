/**
 * Messages Routes
 *
 * Handles sending and retrieving messages for emergencies.
 */

const express = require('express');
const { createAuthenticatedClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/messages/emergency/:emergencyId
 * Get all messages for a specific emergency
 */
router.get('/emergency/:emergencyId', requireAuth, async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const userClient = createAuthenticatedClient(req.token);

    // First verify user has access to this emergency
    const { data: emergency, error: emergencyError } = await userClient
      .from('emergencies')
      .select('id')
      .eq('id', emergencyId)
      .single();

    if (emergencyError || !emergency) {
      return res.status(404).json({
        error: 'Emergency not found',
        message: 'The requested emergency does not exist or you do not have access'
      });
    }

    // Get messages for this emergency
    const { data: messages, error } = await userClient
      .from('messages')
      .select('*')
      .eq('emergency_id', emergencyId)
      .order('sent_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Get messages error:', error);
      return res.status(500).json({
        error: 'Failed to fetch messages',
        message: error.message
      });
    }

    res.json({
      messages,
      count: messages.length,
      emergency_id: emergencyId
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching messages'
    });
  }
});

/**
 * POST /api/messages/emergency/:emergencyId
 * Send a message to an emergency
 */
router.post('/emergency/:emergencyId', requireAuth, async (req, res) => {
  try {
    const { emergencyId } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Message content is required'
      });
    }

    // Limit message length
    if (content.length > 2000) {
      return res.status(400).json({
        error: 'Message too long',
        message: 'Message content must be 2000 characters or less'
      });
    }

    const userClient = createAuthenticatedClient(req.token);

    // First verify user has access to this emergency
    const { data: emergency, error: emergencyError } = await userClient
      .from('emergencies')
      .select('id, status')
      .eq('id', emergencyId)
      .single();

    if (emergencyError || !emergency) {
      return res.status(404).json({
        error: 'Emergency not found',
        message: 'The requested emergency does not exist or you do not have access'
      });
    }

    // Check if emergency is still active
    if (emergency.status !== 'active') {
      return res.status(400).json({
        error: 'Emergency not active',
        message: 'Cannot send messages to a resolved or cancelled emergency'
      });
    }

    // Create message
    const { data: message, error } = await userClient
      .from('messages')
      .insert({
        emergency_id: emergencyId,
        sender_type: 'user',
        content: content.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Create message error:', error);
      return res.status(500).json({
        error: 'Failed to send message',
        message: error.message
      });
    }

    res.status(201).json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while sending message'
    });
  }
});

/**
 * GET /api/messages/:id
 * Get a specific message by ID
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userClient = createAuthenticatedClient(req.token);

    const { data: message, error } = await userClient
      .from('messages')
      .select(`
        *,
        emergencies(id, user_id)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Message not found',
          message: 'The requested message does not exist or you do not have access'
        });
      }
      console.error('Get message error:', error);
      return res.status(500).json({
        error: 'Failed to fetch message',
        message: error.message
      });
    }

    res.json({
      message
    });
  } catch (error) {
    console.error('Get message error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching message'
    });
  }
});

/**
 * DELETE /api/messages/:id
 * Delete a message (only user messages, not system messages)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userClient = createAuthenticatedClient(req.token);

    // First get the message to check sender_type
    const { data: message, error: getError } = await userClient
      .from('messages')
      .select('sender_type, emergencies(user_id)')
      .eq('id', id)
      .single();

    if (getError || !message) {
      return res.status(404).json({
        error: 'Message not found',
        message: 'The requested message does not exist or you do not have access'
      });
    }

    // Don't allow deleting system messages
    if (message.sender_type === 'system') {
      return res.status(403).json({
        error: 'Cannot delete system message',
        message: 'System messages cannot be deleted'
      });
    }

    // Delete the message
    const { error } = await userClient
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete message error:', error);
      return res.status(500).json({
        error: 'Failed to delete message',
        message: error.message
      });
    }

    res.json({
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while deleting message'
    });
  }
});

module.exports = router;
