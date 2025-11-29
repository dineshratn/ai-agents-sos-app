/**
 * Emergency Routes
 *
 * Handles emergency triggers, retrieval, and resolution with AI assessment integration.
 */

const express = require('express');
const axios = require('axios');
const { createAuthenticatedClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const PYTHON_AI_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

/**
 * POST /api/emergency/trigger
 * Trigger a new emergency (requires authentication)
 */
router.post('/trigger', requireAuth, async (req, res) => {
  try {
    const { description, location, latitude, longitude } = req.body;

    // Validate required fields
    if (!description) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Emergency description is required'
      });
    }

    // Create authenticated Supabase client for this user
    const userClient = createAuthenticatedClient(req.token);

    // Step 1: Get AI assessment from Python service
    let aiAssessment = null;
    try {
      const aiResponse = await axios.post(`${PYTHON_AI_URL}/assess-multi`, {
        description,
        location: location || 'Unknown location'
      });
      aiAssessment = aiResponse.data;
    } catch (aiError) {
      console.error('AI assessment error:', aiError.message);
      // Continue without AI assessment if it fails
      aiAssessment = {
        emergency_type: 'unknown',
        severity: 3,
        recommended_response: 'Unable to assess. Please contact emergency services if needed.',
        confidence_score: 0
      };
    }

    // Step 2: Create emergency record
    const { data: emergency, error: emergencyError } = await userClient
      .from('emergencies')
      .insert({
        user_id: req.user.id,
        description,
        emergency_type: aiAssessment.emergency_type,
        severity: aiAssessment.severity,
        status: 'active'
      })
      .select()
      .single();

    if (emergencyError) {
      console.error('Emergency creation error:', emergencyError);
      return res.status(500).json({
        error: 'Failed to create emergency',
        message: emergencyError.message
      });
    }

    // Step 3: Create location record if coordinates provided
    if (latitude && longitude) {
      const { error: locationError } = await userClient
        .from('locations')
        .insert({
          emergency_id: emergency.id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accuracy: 0,
          location_method: 'manual'
        });

      if (locationError) {
        console.error('Location creation error:', locationError);
      }
    }

    // Step 4: Store AI assessment
    const { error: assessmentError } = await userClient
      .from('ai_assessments')
      .insert({
        emergency_id: emergency.id,
        situation_analysis: aiAssessment.situation_analysis || '',
        guidance_steps: aiAssessment.guidance_steps || '',
        resource_recommendations: aiAssessment.resource_recommendations || '',
        confidence_score: aiAssessment.confidence_score || 0,
        model_version: aiAssessment.model_version || 'langgraph-v3'
      });

    if (assessmentError) {
      console.error('AI assessment storage error:', assessmentError);
    }

    // Step 5: Create initial system message
    const { error: messageError } = await userClient
      .from('messages')
      .insert({
        emergency_id: emergency.id,
        sender_type: 'system',
        content: `Emergency triggered: ${aiAssessment.emergency_type} (Severity: ${aiAssessment.severity}/5)\n\n${aiAssessment.recommended_response}`
      });

    if (messageError) {
      console.error('Message creation error:', messageError);
    }

    // Return comprehensive emergency data
    res.status(201).json({
      message: 'Emergency triggered successfully',
      emergency: {
        id: emergency.id,
        description: emergency.description,
        emergency_type: emergency.emergency_type,
        severity: emergency.severity,
        status: emergency.status,
        triggered_at: emergency.triggered_at
      },
      assessment: {
        situation_analysis: aiAssessment.situation_analysis,
        guidance_steps: aiAssessment.guidance_steps,
        resource_recommendations: aiAssessment.resource_recommendations,
        recommended_response: aiAssessment.recommended_response,
        confidence_score: aiAssessment.confidence_score
      }
    });
  } catch (error) {
    console.error('Emergency trigger error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while triggering emergency'
    });
  }
});

/**
 * GET /api/emergency
 * Get all emergencies for the authenticated user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const userClient = createAuthenticatedClient(req.token);

    let query = userClient
      .from('emergencies')
      .select(`
        *,
        locations(*),
        ai_assessments(*),
        messages(*)
      `)
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: emergencies, error } = await query;

    if (error) {
      console.error('Get emergencies error:', error);
      return res.status(500).json({
        error: 'Failed to fetch emergencies',
        message: error.message
      });
    }

    res.json({
      emergencies,
      count: emergencies.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Get emergencies error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching emergencies'
    });
  }
});

/**
 * GET /api/emergency/:id
 * Get detailed information about a specific emergency
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const userClient = createAuthenticatedClient(req.token);

    const { data: emergency, error } = await userClient
      .from('emergencies')
      .select(`
        *,
        locations(*),
        ai_assessments(*),
        messages(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Emergency not found',
          message: 'The requested emergency does not exist or you do not have access'
        });
      }
      console.error('Get emergency error:', error);
      return res.status(500).json({
        error: 'Failed to fetch emergency',
        message: error.message
      });
    }

    res.json({
      emergency
    });
  } catch (error) {
    console.error('Get emergency error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching emergency details'
    });
  }
});

/**
 * PATCH /api/emergency/:id/resolve
 * Mark an emergency as resolved
 */
router.patch('/:id/resolve', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution_notes } = req.body;

    const userClient = createAuthenticatedClient(req.token);

    // Update emergency status
    const { data: emergency, error } = await userClient
      .from('emergencies')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Emergency not found',
          message: 'The requested emergency does not exist or you do not have access'
        });
      }
      console.error('Resolve emergency error:', error);
      return res.status(500).json({
        error: 'Failed to resolve emergency',
        message: error.message
      });
    }

    // Add resolution message
    if (resolution_notes) {
      await userClient
        .from('messages')
        .insert({
          emergency_id: id,
          sender_type: 'user',
          content: `Emergency resolved: ${resolution_notes}`
        });
    }

    res.json({
      message: 'Emergency resolved successfully',
      emergency
    });
  } catch (error) {
    console.error('Resolve emergency error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while resolving emergency'
    });
  }
});

/**
 * PATCH /api/emergency/:id/cancel
 * Cancel an emergency
 */
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { cancellation_reason } = req.body;

    const userClient = createAuthenticatedClient(req.token);

    const { data: emergency, error } = await userClient
      .from('emergencies')
      .update({
        status: 'cancelled',
        resolved_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Emergency not found',
          message: 'The requested emergency does not exist or you do not have access'
        });
      }
      console.error('Cancel emergency error:', error);
      return res.status(500).json({
        error: 'Failed to cancel emergency',
        message: error.message
      });
    }

    // Add cancellation message
    if (cancellation_reason) {
      await userClient
        .from('messages')
        .insert({
          emergency_id: id,
          sender_type: 'user',
          content: `Emergency cancelled: ${cancellation_reason}`
        });
    }

    res.json({
      message: 'Emergency cancelled successfully',
      emergency
    });
  } catch (error) {
    console.error('Cancel emergency error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while cancelling emergency'
    });
  }
});

module.exports = router;
