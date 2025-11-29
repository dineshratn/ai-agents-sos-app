/**
 * User Profile Routes
 *
 * Handles user profile retrieval and updates.
 */

const express = require('express');
const { createAuthenticatedClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/user/profile
 * Get user profile (includes extended data from user_profiles table)
 */
router.get('/profile', requireAuth, async (req, res) => {
  try {
    const userClient = createAuthenticatedClient(req.token);

    // Get user profile from user_profiles table
    const { data: profile, error } = await userClient
      .from('user_profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Get profile error:', error);
      return res.status(500).json({
        error: 'Failed to fetch profile',
        message: error.message
      });
    }

    // Combine auth user data with profile data
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: profile?.full_name || req.user.user_metadata?.full_name || '',
        phone: profile?.phone || req.user.user_metadata?.phone || '',
        address: profile?.address || '',
        medical_info: profile?.medical_info || '',
        blood_type: profile?.blood_type || '',
        allergies: profile?.allergies || '',
        medications: profile?.medications || '',
        emergency_notes: profile?.emergency_notes || '',
        created_at: req.user.created_at,
        updated_at: profile?.updated_at || req.user.updated_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching profile'
    });
  }
});

/**
 * PUT /api/user/profile
 * Update user profile
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const {
      full_name,
      phone,
      address,
      medical_info,
      blood_type,
      allergies,
      medications,
      emergency_notes
    } = req.body;

    const userClient = createAuthenticatedClient(req.token);

    // Build update object with only provided fields
    const updateData = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address !== undefined) updateData.address = address;
    if (medical_info !== undefined) updateData.medical_info = medical_info;
    if (blood_type !== undefined) updateData.blood_type = blood_type;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (medications !== undefined) updateData.medications = medications;
    if (emergency_notes !== undefined) updateData.emergency_notes = emergency_notes;

    // Check if profile exists
    const { data: existingProfile } = await userClient
      .from('user_profiles')
      .select('id')
      .eq('id', req.user.id)
      .single();

    let profile;
    let error;

    if (existingProfile) {
      // Update existing profile
      const result = await userClient
        .from('user_profiles')
        .update(updateData)
        .eq('id', req.user.id)
        .select()
        .single();
      profile = result.data;
      error = result.error;
    } else {
      // Create new profile (shouldn't happen due to trigger, but handle it)
      const result = await userClient
        .from('user_profiles')
        .insert({
          id: req.user.id,
          ...updateData
        })
        .select()
        .single();
      profile = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Update profile error:', error);
      return res.status(500).json({
        error: 'Failed to update profile',
        message: error.message
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: profile.id,
        full_name: profile.full_name,
        phone: profile.phone,
        address: profile.address,
        medical_info: profile.medical_info,
        blood_type: profile.blood_type,
        allergies: profile.allergies,
        medications: profile.medications,
        emergency_notes: profile.emergency_notes,
        updated_at: profile.updated_at
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while updating profile'
    });
  }
});

/**
 * GET /api/user/stats
 * Get user statistics (emergency counts, etc.)
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const userClient = createAuthenticatedClient(req.token);

    // Get emergency counts by status
    const { data: emergencies, error: emergenciesError } = await userClient
      .from('emergencies')
      .select('status');

    if (emergenciesError) {
      console.error('Get stats error:', emergenciesError);
      return res.status(500).json({
        error: 'Failed to fetch stats',
        message: emergenciesError.message
      });
    }

    // Get emergency contacts count
    const { count: contactsCount, error: contactsError } = await userClient
      .from('emergency_contacts')
      .select('*', { count: 'exact', head: true });

    if (contactsError) {
      console.error('Get contacts count error:', contactsError);
    }

    // Calculate stats
    const stats = {
      total_emergencies: emergencies.length,
      active_emergencies: emergencies.filter(e => e.status === 'active').length,
      resolved_emergencies: emergencies.filter(e => e.status === 'resolved').length,
      cancelled_emergencies: emergencies.filter(e => e.status === 'cancelled').length,
      emergency_contacts: contactsCount || 0
    };

    res.json({
      stats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching statistics'
    });
  }
});

module.exports = router;
