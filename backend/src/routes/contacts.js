/**
 * Emergency Contacts Routes
 *
 * Handles CRUD operations for user's emergency contacts.
 */

const express = require('express');
const { createAuthenticatedClient } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/contacts
 * Get all emergency contacts for the authenticated user
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userClient = createAuthenticatedClient(req.token);

    const { data: contacts, error } = await userClient
      .from('emergency_contacts')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Get contacts error:', error);
      return res.status(500).json({
        error: 'Failed to fetch contacts',
        message: error.message
      });
    }

    res.json({
      contacts,
      count: contacts.length
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching contacts'
    });
  }
});

/**
 * GET /api/contacts/:id
 * Get a specific emergency contact
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userClient = createAuthenticatedClient(req.token);

    const { data: contact, error } = await userClient
      .from('emergency_contacts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Contact not found',
          message: 'The requested contact does not exist or you do not have access'
        });
      }
      console.error('Get contact error:', error);
      return res.status(500).json({
        error: 'Failed to fetch contact',
        message: error.message
      });
    }

    res.json({
      contact
    });
  } catch (error) {
    console.error('Get contact error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching contact'
    });
  }
});

/**
 * POST /api/contacts
 * Create a new emergency contact
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, phone, email, relationship, priority } = req.body;

    // Validate required fields
    if (!name || !phone) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Name and phone are required'
      });
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error: 'Invalid phone format',
        message: 'Please provide a valid phone number'
      });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        });
      }
    }

    const userClient = createAuthenticatedClient(req.token);

    const { data: contact, error } = await userClient
      .from('emergency_contacts')
      .insert({
        user_id: req.user.id,
        name,
        phone,
        email: email || null,
        relationship: relationship || null,
        priority: priority || 1
      })
      .select()
      .single();

    if (error) {
      console.error('Create contact error:', error);
      return res.status(500).json({
        error: 'Failed to create contact',
        message: error.message
      });
    }

    res.status(201).json({
      message: 'Contact created successfully',
      contact
    });
  } catch (error) {
    console.error('Create contact error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while creating contact'
    });
  }
});

/**
 * PUT /api/contacts/:id
 * Update an emergency contact
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, email, relationship, priority } = req.body;

    // Validate phone format if provided
    if (phone) {
      const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          error: 'Invalid phone format',
          message: 'Please provide a valid phone number'
        });
      }
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        });
      }
    }

    const userClient = createAuthenticatedClient(req.token);

    // Build update object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (relationship !== undefined) updateData.relationship = relationship;
    if (priority !== undefined) updateData.priority = priority;

    const { data: contact, error } = await userClient
      .from('emergency_contacts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          error: 'Contact not found',
          message: 'The requested contact does not exist or you do not have access'
        });
      }
      console.error('Update contact error:', error);
      return res.status(500).json({
        error: 'Failed to update contact',
        message: error.message
      });
    }

    res.json({
      message: 'Contact updated successfully',
      contact
    });
  } catch (error) {
    console.error('Update contact error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while updating contact'
    });
  }
});

/**
 * DELETE /api/contacts/:id
 * Delete an emergency contact
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userClient = createAuthenticatedClient(req.token);

    const { error } = await userClient
      .from('emergency_contacts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete contact error:', error);
      return res.status(500).json({
        error: 'Failed to delete contact',
        message: error.message
      });
    }

    res.json({
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Delete contact error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while deleting contact'
    });
  }
});

module.exports = router;
