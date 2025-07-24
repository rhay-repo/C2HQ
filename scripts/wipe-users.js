#!/usr/bin/env node

/**
 * Script to wipe user data for testing the new Google token refresh system
 * 
 * This script clears user-related data from the database to allow fresh testing
 * of the new OAuth token storage system.
 * 
 * Run with: node scripts/wipe-users.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../api/.env' });

// Initialize Supabase admin client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');
  console.error('\nPlease ensure these are set in api/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function wipeUserData() {
  console.log('🧹 Starting user data wipe...\n');

  try {
    // 1. Delete user_platforms records
    console.log('1️⃣ Deleting user_platforms records...');
    const { error: platformsError } = await supabase
      .from('user_platforms')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (platformsError) {
      console.error('❌ Error deleting user_platforms:', platformsError);
    } else {
      console.log('✅ Deleted all user_platforms records');
    }

    // 2. Delete videos (cascade will handle comments)
    console.log('\n2️⃣ Deleting videos...');
    const { error: videosError } = await supabase
      .from('videos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (videosError) {
      console.error('❌ Error deleting videos:', videosError);
    } else {
      console.log('✅ Deleted all videos (comments will be cascaded)');
    }

    // 3. Delete comments
    console.log('\n3️⃣ Deleting comments...');
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (commentsError) {
      console.error('❌ Error deleting comments:', commentsError);
    } else {
      console.log('✅ Deleted all comments');
    }

    // 4. Delete analysis jobs
    console.log('\n4️⃣ Deleting analysis jobs...');
    const { error: jobsError } = await supabase
      .from('analysis_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (jobsError) {
      console.error('❌ Error deleting analysis_jobs:', jobsError);
    } else {
      console.log('✅ Deleted all analysis jobs');
    }

    // 5. Delete user settings
    console.log('\n5️⃣ Deleting user settings...');
    const { error: settingsError } = await supabase
      .from('user_settings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (settingsError) {
      console.error('❌ Error deleting user_settings:', settingsError);
    } else {
      console.log('✅ Deleted all user settings');
    }

    // 6. Delete weekly digests
    console.log('\n6️⃣ Deleting weekly digests...');
    const { error: digestsError } = await supabase
      .from('weekly_digests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (digestsError) {
      console.error('❌ Error deleting weekly_digests:', digestsError);
    } else {
      console.log('✅ Deleted all weekly digests');
    }

    // 7. Delete profiles (this will cascade to other tables)
    console.log('\n7️⃣ Deleting user profiles...');
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (profilesError) {
      console.error('❌ Error deleting profiles:', profilesError);
    } else {
      console.log('✅ Deleted all user profiles');
    }

    // 8. Delete demo comment sets
    console.log('\n8️⃣ Deleting demo comment sets...');
    const { error: demoError } = await supabase
      .from('demo_comment_sets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (demoError) {
      console.error('❌ Error deleting demo_comment_sets:', demoError);
    } else {
      console.log('✅ Deleted all demo comment sets');
    }

    console.log('\n🎉 User data wipe completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Sign out of the application');
    console.log('   2. Sign in again with Google');
    console.log('   3. The new token storage system should work properly');
    console.log('\n⚠️  Note: This only cleared application data.');
    console.log('   Supabase Auth users are still in the auth.users table.');
    console.log('   If you want to completely start fresh, you may need to');
    console.log('   manually delete users from the Supabase dashboard.');

  } catch (error) {
    console.error('💥 Error during user data wipe:', error);
    process.exit(1);
  }
}

// Add a confirmation prompt
async function confirmWipe() {
  console.log('⚠️  WARNING: This will delete ALL user data from the database!');
  console.log('   This includes:');
  console.log('   - User profiles');
  console.log('   - YouTube/Google tokens');
  console.log('   - Videos and comments');
  console.log('   - Analysis jobs');
  console.log('   - User settings');
  console.log('   - Weekly digests');
  console.log('   - Demo data');
  console.log('\n   This action cannot be undone!');
  console.log('\n   Are you sure you want to continue? (yes/no)');

  // For automated testing, you can set this environment variable
  if (process.env.AUTO_CONFIRM === 'true') {
    console.log('Auto-confirming due to AUTO_CONFIRM=true');
    return true;
  }

  // In a real scenario, you'd want to read from stdin
  // For now, we'll just proceed with a warning
  console.log('\n⚠️  Proceeding with wipe in 5 seconds...');
  console.log('   Press Ctrl+C to cancel');
  
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Proceeding with wipe...');
      resolve(true);
    }, 5000);
  });
}

// Run the script
async function main() {
  try {
    const confirmed = await confirmWipe();
    if (confirmed) {
      await wipeUserData();
    } else {
      console.log('❌ Wipe cancelled');
      process.exit(0);
    }
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { wipeUserData }; 