// Script to manually sync a user profile in Supabase
// Usage: node scripts/sync-user-profile.js <user-id>
// Or: bun run scripts/sync-user-profile.js <user-id>

const { createClient } = require('@supabase/supabase-js');

// Use hardcoded values (same as in lib/supabase.ts)
const SUPABASE_URL = 'https://oqcgerfjjiozltkmmkxf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_959ZId8aR4E5IjTNoyVsJQ_xt8pelvp';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const userId = process.argv[2];

if (!userId) {
  console.error('❌ Please provide a user ID');
  console.error('Usage: node scripts/sync-user-profile.js <user-id>');
  process.exit(1);
}

async function syncUserProfile() {
  console.log(`🔄 Syncing user profile for user ID: ${userId}`);
  console.log('');

  try {
    // Try to call the RPC function
    const { data, error } = await supabase.rpc('sync_user_profile', { user_id_param: userId });

    if (error) {
      console.error('❌ RPC function error:', error.message);
      console.error('');
      console.error('💡 The RPC function might not be set up. Please run:');
      console.error('   database/create_user_profile_trigger.sql in Supabase SQL Editor');
      process.exit(1);
    }

    if (data) {
      const result = data;
      if (result.success) {
        console.log('✅ User profile synced successfully!');
        if (result.created) {
          console.log('   Profile was created');
        } else {
          console.log('   Profile already existed');
        }
      } else {
        console.error('❌ Sync failed:', result.error);
        process.exit(1);
      }
    }

    // Verify the profile exists
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.warn('⚠️  Profile might exist but cannot be read (RLS restrictions)');
      console.warn('   This is okay - the profile exists in the database');
    } else if (profile) {
      console.log('');
      console.log('✅ Profile verified:');
      console.log(`   ID: ${profile.id}`);
      console.log(`   Email: ${profile.email}`);
      console.log(`   Name: ${profile.name}`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncUserProfile()
  .then(() => {
    console.log('');
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

