/**
 * Supabase Client Configuration
 *
 * This module initializes and exports the Supabase client for use throughout the backend.
 *
 * Two clients are provided:
 * 1. supabase - Uses anon key, respects RLS policies (for user-scoped operations)
 * 2. supabaseAdmin - Uses service role key, bypasses RLS (for admin operations)
 */

const { createClient } = require('@supabase/supabase-js');

// Validate environment variables
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required Supabase environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env file and ensure all Supabase credentials are set.');
  process.exit(1);
}

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Standard Supabase client (anon key)
 * - Respects Row Level Security (RLS) policies
 * - Use for user-scoped operations
 * - Safe to use in routes with authenticated users
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Backend doesn't need to persist sessions
    detectSessionInUrl: false
  }
});

/**
 * Admin Supabase client (service role key)
 * - Bypasses Row Level Security (RLS) policies
 * - Use for admin/system operations only
 * - NEVER expose this client to frontend
 * - Only use when you explicitly need to bypass RLS
 */
let supabaseAdmin = null;

if (supabaseServiceRoleKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
  console.log('✅ Supabase Admin client initialized (service role)');
} else {
  console.warn('⚠️  Supabase service role key not found. Admin operations will not be available.');
}

/**
 * Test database connection
 */
async function testConnection() {
  try {
    // Test basic query (should work with anon key and RLS)
    const { error } = await supabase.from('emergencies').select('count').limit(0);

    if (error && error.message !== 'JWT expired') {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }

    console.log('✅ Supabase connection successful');
    console.log(`   URL: ${supabaseUrl}`);
    console.log(`   Using anon key: ${supabaseAnonKey.substring(0, 20)}...`);
    return true;
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    return false;
  }
}

/**
 * Get authenticated user from JWT token
 *
 * @param {string} token - JWT token from Authorization header
 * @returns {Promise<{user: object | null, error: object | null}>}
 */
async function getUserFromToken(token) {
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error) {
      return { user: null, error };
    }

    return { user, error: null };
  } catch (error) {
    return { user: null, error };
  }
}

/**
 * Create a Supabase client with a specific user's auth token
 * This allows operations to be performed as that user (respecting RLS)
 *
 * @param {string} accessToken - User's access token
 * @returns {SupabaseClient}
 */
function createAuthenticatedClient(accessToken) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    },
    auth: {
      persistSession: false,
      detectSessionInUrl: false
    }
  });
}

module.exports = {
  supabase,
  supabaseAdmin,
  testConnection,
  getUserFromToken,
  createAuthenticatedClient
};
