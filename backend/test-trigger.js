#!/usr/bin/env node
/**
 * Test if the handle_new_user() trigger exists
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testTrigger() {
    console.log('\n🔍 Testing handle_new_user() Trigger\n');

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Query to check if trigger exists
    const triggerCheckSQL = `
        SELECT
            trigger_name,
            event_object_table,
            action_statement
        FROM information_schema.triggers
        WHERE trigger_schema = 'auth'
        AND trigger_name = 'on_auth_user_created';
    `;

    console.log('📋 Executing SQL query to check trigger...\n');
    console.log('SQL:', triggerCheckSQL);
    console.log();

    try {
        // Use raw query if possible
        const { data, error } = await supabase.rpc('exec_sql', {
            query: triggerCheckSQL
        });

        if (error) {
            console.log('⚠️  Direct RPC not available:', error.message);
            console.log('\n💡 Alternative: Check trigger via Supabase Dashboard');
            console.log('   1. Go to SQL Editor');
            console.log('   2. Run this query:');
            console.log('   ');
            console.log('   SELECT trigger_name, event_object_table');
            console.log('   FROM information_schema.triggers');
            console.log('   WHERE trigger_name = \'on_auth_user_created\';');
            console.log();
        } else {
            console.log('✅ Trigger query result:', data);
        }
    } catch (err) {
        console.log('❌ Error:', err.message);
    }

    // Alternative: Try to query the function itself
    console.log('\n📋 Checking if handle_new_user() function exists...\n');

    const functionCheckSQL = `
        SELECT
            routine_name,
            routine_type
        FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'handle_new_user';
    `;

    console.log('SQL:', functionCheckSQL);
    console.log();

    try {
        const { data, error } = await supabase.rpc('exec_sql', {
            query: functionCheckSQL
        });

        if (error) {
            console.log('⚠️  Cannot query functions directly');
        } else {
            console.log('Function result:', data);
        }
    } catch (err) {
        console.log('❌ Error:', err.message);
    }

    // Try to manually test the flow
    console.log('\n🧪 Recommended Manual Test:\n');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run this query to check trigger:');
    console.log('');
    console.log('   SELECT trigger_name, event_object_table, action_statement');
    console.log('   FROM information_schema.triggers');
    console.log('   WHERE trigger_name = \'on_auth_user_created\';');
    console.log('');
    console.log('3. If empty result → Trigger does NOT exist');
    console.log('4. If returns row → Trigger EXISTS');
    console.log('');
    console.log('5. To check the function:');
    console.log('');
    console.log('   SELECT routine_name FROM information_schema.routines');
    console.log('   WHERE routine_name = \'handle_new_user\';');
    console.log('');
    console.log('6. If trigger is missing, run this SQL:');
    console.log('');
    console.log('   CREATE OR REPLACE FUNCTION handle_new_user()');
    console.log('   RETURNS TRIGGER AS $$');
    console.log('   BEGIN');
    console.log('     INSERT INTO user_profiles (id, full_name, phone)');
    console.log('     VALUES (');
    console.log('       NEW.id,');
    console.log('       NEW.raw_user_meta_data->>\'full_name\',');
    console.log('       NEW.raw_user_meta_data->>\'phone\'');
    console.log('     );');
    console.log('     RETURN NEW;');
    console.log('   END;');
    console.log('   $$ LANGUAGE plpgsql SECURITY DEFINER;');
    console.log('');
    console.log('   CREATE TRIGGER on_auth_user_created');
    console.log('     AFTER INSERT ON auth.users');
    console.log('     FOR EACH ROW EXECUTE FUNCTION handle_new_user();');
    console.log('');
}

testTrigger().then(() => process.exit(0));
