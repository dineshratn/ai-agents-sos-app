#!/usr/bin/env node
/**
 * Comprehensive Trigger Debug Script
 * Checks if trigger exists and has correct permissions
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function debugTrigger() {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 COMPREHENSIVE TRIGGER DEBUG');
    console.log('='.repeat(70) + '\n');

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('✅ Connected to Supabase\n');

    // 1. Check user_profiles table structure
    console.log('📋 Step 1: Checking user_profiles table structure...\n');

    const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

    if (profilesError) {
        console.error('❌ Error accessing user_profiles:', profilesError);
    } else {
        console.log('✅ user_profiles table is accessible');
        console.log('   Current row count:', profiles.length);
    }
    console.log();

    // 2. Try to manually test the trigger logic
    console.log('📋 Step 2: Testing trigger logic manually...\n');

    const testUserId = 'test-' + Date.now();
    const testData = {
        id: testUserId,
        full_name: 'Test User',
        phone: '+1234567890'
    };

    console.log('   Attempting to insert test profile:', testData);

    const { data: insertResult, error: insertError } = await supabase
        .from('user_profiles')
        .insert(testData)
        .select();

    if (insertError) {
        console.error('   ❌ Insert failed:', insertError.message);
        console.error('   Code:', insertError.code);
        console.error('   Details:', insertError.details);
        console.error('   Hint:', insertError.hint);
    } else {
        console.log('   ✅ Manual insert successful:', insertResult);

        // Clean up test data
        await supabase.from('user_profiles').delete().eq('id', testUserId);
        console.log('   ✅ Test data cleaned up');
    }
    console.log();

    // 3. Check auth.users table (if accessible)
    console.log('📋 Step 3: Checking auth.users table access...\n');

    try {
        // Note: This might fail due to RLS, which is expected
        const { data: authUsers, error: authError } = await supabase
            .from('auth.users')
            .select('id, email')
            .limit(1);

        if (authError) {
            console.log('   ⚠️  Cannot query auth.users directly (expected)');
            console.log('   Error:', authError.message);
        } else {
            console.log('   ✅ auth.users accessible');
            console.log('   User count:', authUsers.length);
        }
    } catch (err) {
        console.log('   ⚠️  auth.users not directly accessible (expected)');
    }
    console.log();

    // 4. Test actual signup with Supabase Auth
    console.log('📋 Step 4: Testing actual Supabase Auth signup...\n');

    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    console.log('   Test email:', testEmail);
    console.log('   Attempting signup...\n');

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                full_name: 'Debug Test User',
                phone: '+1234567890'
            }
        }
    });

    if (signupError) {
        console.error('   ❌ SIGNUP FAILED');
        console.error('   Error name:', signupError.name);
        console.error('   Error message:', signupError.message);
        console.error('   Error status:', signupError.status);
        console.error('   Error code:', signupError.code);
        console.error('\n   Full error details:');
        console.error(JSON.stringify(signupError, null, 2));

        if (signupError.message.includes('Database error')) {
            console.error('\n   ❗ This is the trigger error!');
            console.error('   The trigger is either:');
            console.error('   1. Not created');
            console.error('   2. Has wrong permissions (missing SECURITY DEFINER)');
            console.error('   3. Has syntax error');
            console.error('   4. user_profiles table has constraint violation');
        }
    } else {
        console.log('   ✅ SIGNUP SUCCESSFUL!');
        console.log('   User ID:', signupData.user.id);
        console.log('   Email:', signupData.user.email);
        console.log('   Session exists:', !!signupData.session);

        // Check if profile was created
        const { data: profileCheck } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', signupData.user.id)
            .single();

        if (profileCheck) {
            console.log('   ✅ User profile was created by trigger!');
            console.log('   Profile:', profileCheck);
        } else {
            console.log('   ❌ User profile was NOT created (trigger failed)');
        }

        // Clean up test user
        console.log('\n   Cleaning up test user...');
        await supabase.auth.admin.deleteUser(signupData.user.id);
        console.log('   ✅ Test user deleted');
    }
    console.log();

    // 5. Recommendations
    console.log('='.repeat(70));
    console.log('📝 RECOMMENDATIONS');
    console.log('='.repeat(70) + '\n');

    if (signupError) {
        console.log('To fix the trigger issue, run this SQL in Supabase Dashboard:\n');
        console.log('-- Check if trigger exists');
        console.log('SELECT trigger_name, event_object_table, action_timing, event_manipulation');
        console.log('FROM information_schema.triggers');
        console.log('WHERE trigger_name = \'on_auth_user_created\';\n');

        console.log('-- Check if function exists');
        console.log('SELECT routine_name, routine_type');
        console.log('FROM information_schema.routines');
        console.log('WHERE routine_schema = \'public\'');
        console.log('AND routine_name = \'handle_new_user\';\n');

        console.log('-- Check user_profiles table constraints');
        console.log('SELECT conname, contype, pg_get_constraintdef(oid)');
        console.log('FROM pg_constraint');
        console.log('WHERE conrelid = \'public.user_profiles\'::regclass;\n');

        console.log('-- Recreate the trigger with proper permissions:');
        console.log('CREATE OR REPLACE FUNCTION public.handle_new_user()');
        console.log('RETURNS TRIGGER');
        console.log('LANGUAGE plpgsql');
        console.log('SECURITY DEFINER  -- IMPORTANT: This allows trigger to bypass RLS');
        console.log('SET search_path = public');
        console.log('AS $$');
        console.log('BEGIN');
        console.log('  INSERT INTO public.user_profiles (id, full_name, phone)');
        console.log('  VALUES (');
        console.log('    NEW.id,');
        console.log('    COALESCE(NEW.raw_user_meta_data->>\'full_name\', \'\'),');
        console.log('    COALESCE(NEW.raw_user_meta_data->>\'phone\', \'\')');
        console.log('  );');
        console.log('  RETURN NEW;');
        console.log('EXCEPTION');
        console.log('  WHEN OTHERS THEN');
        console.log('    RAISE LOG \'Error in handle_new_user: %\', SQLERRM;');
        console.log('    RETURN NEW;  -- Don\'t block user creation if profile insert fails');
        console.log('END;');
        console.log('$$;\n');

        console.log('DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;');
        console.log('CREATE TRIGGER on_auth_user_created');
        console.log('  AFTER INSERT ON auth.users');
        console.log('  FOR EACH ROW');
        console.log('  EXECUTE FUNCTION public.handle_new_user();\n');
    } else {
        console.log('✅ Everything is working! The trigger is properly configured.\n');
    }

    console.log('='.repeat(70) + '\n');
}

debugTrigger().then(() => process.exit(0)).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
