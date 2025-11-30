#!/usr/bin/env node
/**
 * Cleanup test users from database
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function cleanup() {
    console.log('\n🧹 Cleaning up test users...\n');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all users
    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*');

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${users.length} users:\n`);
    users.forEach((user, i) => {
        console.log(`${i + 1}. ${user.full_name} (${user.phone})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Created: ${user.created_at}\n`);
    });

    // Delete all users using admin API
    console.log('Deleting users from auth.users...\n');

    for (const user of users) {
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        if (error) {
            console.error(`❌ Failed to delete ${user.id}:`, error.message);
        } else {
            console.log(`✅ Deleted user: ${user.full_name}`);
        }
    }

    console.log('\n✅ Cleanup complete!\n');
}

cleanup().then(() => process.exit(0));
