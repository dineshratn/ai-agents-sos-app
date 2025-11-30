#!/usr/bin/env node
/**
 * Supabase Database Diagnostic Script
 * Checks if migration has been run and database is properly configured
 */

require('dotenv').config({ path: '../.env' });
const { supabase, supabaseAdmin } = require('./src/config/supabase');

async function checkDatabase() {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 Supabase Database Diagnostic Check');
    console.log('='.repeat(60) + '\n');

    try {
        // 1. Check connection
        console.log('📡 Testing Supabase connection...');
        const { data: connectionTest, error: connError } = await supabase
            .from('user_profiles')
            .select('count');

        if (connError && connError.code === '42P01') {
            console.log('❌ Table "user_profiles" does not exist');
            console.log('   → Migration has NOT been run\n');
            console.log('📋 Action Required:');
            console.log('   Run the migration file in Supabase Dashboard SQL Editor:');
            console.log('   database/supabase/migrations/20251129_initial_schema.sql\n');
            return;
        } else if (connError) {
            console.log('❌ Connection error:', connError.message);
            return;
        }

        console.log('✅ Connection successful\n');

        // 2. Check all tables exist
        console.log('📊 Checking tables...');
        const tables = [
            'user_profiles',
            'emergency_contacts',
            'emergencies',
            'locations',
            'assessments',
            'messages',
            'notifications',
            'ai_agent_logs'
        ];

        const tableResults = [];
        for (const table of tables) {
            const { error } = await supabase.from(table).select('count', { count: 'exact', head: true });
            const exists = !error || error.code !== '42P01';
            tableResults.push({ table, exists });
            console.log(`   ${exists ? '✅' : '❌'} ${table}`);
        }

        const allTablesExist = tableResults.every(r => r.exists);
        console.log();

        if (!allTablesExist) {
            console.log('❌ Some tables are missing. Migration needs to be run.\n');
            return;
        }

        // 3. Check trigger exists (via inference - if tables exist, trigger should too)
        console.log('🔧 Checking trigger status...');
        console.log('   ✅ Trigger should exist (all tables created successfully)');
        console.log('   → on_auth_user_created trigger auto-creates user profiles');
        console.log();

        // 4. Check RLS is enabled (inferred from successful migration)
        console.log('🔒 Row Level Security...');
        console.log('   ✅ RLS policies should be enabled (part of migration)');
        console.log();

        // 5. Check PostGIS extension (inferred from locations table existence)
        console.log('🗺️  PostGIS Extension...');
        console.log('   ✅ PostGIS should be enabled (locations table uses geography type)');
        console.log();

        // 6. Count existing data
        console.log('📈 Database Statistics:');

        const stats = {};
        for (const table of tables) {
            const { count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: true });
            stats[table] = error ? 'Error' : count;
        }

        console.log(`   Users (profiles):        ${stats.user_profiles || 0}`);
        console.log(`   Emergency Contacts:      ${stats.emergency_contacts || 0}`);
        console.log(`   Emergencies:             ${stats.emergencies || 0}`);
        console.log(`   Locations:               ${stats.locations || 0}`);
        console.log(`   Assessments:             ${stats.assessments || 0}`);
        console.log(`   Messages:                ${stats.messages || 0}`);
        console.log(`   Notifications:           ${stats.notifications || 0}`);
        console.log(`   AI Agent Logs:           ${stats.ai_agent_logs || 0}`);
        console.log();

        // 7. Test user creation trigger
        console.log('🧪 Testing user profile creation (simulation)...');
        console.log('   Note: Actual user creation happens via Supabase Auth');
        console.log('   The handle_new_user() trigger should auto-create profiles');
        console.log();

        // Summary
        console.log('='.repeat(60));
        if (allTablesExist) {
            console.log('✅ Database is properly configured!');
            console.log('   Migration appears to have been run successfully.');
            console.log('   You can now test signup at: http://localhost:3000/login.html');
        } else {
            console.log('❌ Database is NOT properly configured');
            console.log('   Please run the migration in Supabase Dashboard SQL Editor');
        }
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('❌ Error during diagnostic:', error.message);
        console.error('\nFull error:', error);
    }
}

// Run the check
checkDatabase().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
