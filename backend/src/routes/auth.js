/**
 * Authentication Routes
 *
 * Handles user signup, login, logout, and profile retrieval using Supabase Auth.
 */

const express = require('express');
const { supabase } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name, phone } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        message: 'Please provide a valid email address'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Weak password',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Create user with Supabase Auth
    console.log('\n=== DEBUG: Starting signup process ===');
    console.log('Email:', email);
    console.log('Full Name:', full_name);
    console.log('Phone:', phone);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name || '',
          phone: phone || ''
        }
      }
    });

    console.log('=== DEBUG: Supabase Auth Response ===');
    console.log('Error:', error ? JSON.stringify(error, null, 2) : 'None');
    console.log('Data:', data ? JSON.stringify({
      user: data.user ? { id: data.user.id, email: data.user.email } : null,
      session: data.session ? 'Present' : 'Null'
    }, null, 2) : 'None');

    if (error) {
      console.error('\n=== FULL SIGNUP ERROR DETAILS ===');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error status:', error.status);
      console.error('Error code:', error.code);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error stack:', error.stack);
      console.error('===================================\n');

      return res.status(400).json({
        error: 'Signup failed',
        message: error.message,
        debug: {
          code: error.code,
          status: error.status,
          details: error
        }
      });
    }

    // User profile is automatically created via database trigger
    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
        phone: data.user.user_metadata?.phone
      },
      session: data.session
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during signup'
    });
  }
});

/**
 * POST /api/auth/login
 * Sign in an existing user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email and password are required'
      });
    }

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Login error:', error);
      return res.status(401).json({
        error: 'Login failed',
        message: 'Invalid email or password'
      });
    }

    res.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        full_name: data.user.user_metadata?.full_name,
        phone: data.user.user_metadata?.phone
      },
      session: data.session
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during login'
    });
  }
});

/**
 * POST /api/auth/logout
 * Sign out the current user (requires authentication)
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Logout error:', error);
      return res.status(500).json({
        error: 'Logout failed',
        message: error.message
      });
    }

    res.json({
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during logout'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile (requires authentication)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    // User is already attached to req by requireAuth middleware
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        full_name: req.user.user_metadata?.full_name,
        phone: req.user.user_metadata?.phone,
        created_at: req.user.created_at,
        updated_at: req.user.updated_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred while fetching user profile'
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Missing refresh token',
        message: 'Refresh token is required'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      console.error('Refresh token error:', error);
      return res.status(401).json({
        error: 'Token refresh failed',
        message: error.message
      });
    }

    res.json({
      message: 'Token refreshed successfully',
      session: data.session
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An error occurred during token refresh'
    });
  }
});

module.exports = router;
