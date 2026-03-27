// Script to create super admin account in Supabase Auth
// Run this with: node scripts/create-super-admin.js
// Or: bun run scripts/create-super-admin.js

const { createClient } = require('@supabase/supabase-js');

// Use hardcoded values (same as in lib/supabase.ts)
const SUPABASE_URL = 'https://oqcgerfjjiozltkmmkxf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_959ZId8aR4E5IjTNoyVsJQ_xt8pelvp';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SUPER_ADMIN_EMAIL = 'nashiezw@gmail.com';
const SUPER_ADMIN_PASSWORD = '@12345678';
const SUPER_ADMIN_NAME = 'Super Admin';

async function createSuperAdmin() {
  console.log('🔐 Creating super admin account...');
  console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
  console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
  console.log('');

  try {
    // Step 1: Sign up the user in Supabase Auth
    console.log('Step 1: Creating user in Supabase Auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      options: {
        data: {
          name: SUPER_ADMIN_NAME,
        },
      },
    });

    let userId;

    if (authError) {
      // If user already exists, try to sign in to get the user ID
      if (authError.message.includes('already registered') || authError.message.includes('User already registered')) {
        console.log('⚠️  User already exists in Auth, signing in to get user ID...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: SUPER_ADMIN_EMAIL,
          password: SUPER_ADMIN_PASSWORD,
        });

        if (signInError) {
          console.error('❌ Failed to sign in:', signInError.message);
          console.error('');
          console.error('💡 Solutions:');
          console.error('1. The password might be different. Reset it in Supabase dashboard:');
          console.error('   - Go to Supabase Dashboard > Authentication > Users');
          console.error('   - Find the user and click "Reset Password"');
          console.error('2. Or create the user manually in Supabase Dashboard');
          console.error('3. Or delete the existing user and run this script again');
          return;
        }

        if (signInData.user) {
          console.log('✅ User found in Auth');
          userId = signInData.user.id;
        }
      } else {
        throw authError;
      }
    } else {
      if (!authData.user) {
        throw new Error('No user returned from sign up');
      }
      console.log('✅ User created in Supabase Auth');
      console.log(`User ID: ${authData.user.id}`);
      userId = authData.user.id;
    }

    // Step 2: Create/update user profile in users table
    console.log('');
    console.log('Step 2: Creating/updating user profile in users table...');

    // Check if profile already exists
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    // Sign in as the user to bypass RLS
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
    });

    if (signInError) {
      console.log('⚠️  Could not sign in, but user exists in Auth');
      console.log('💡 You will need to manually update the users table:');
      console.log(`   User ID: ${userId}`);
      console.log('   Go to Supabase Dashboard > Table Editor > users');
      console.log('   Insert or update the row with the user ID above');
      return;
    }

    if (existingProfile) {
      console.log('⚠️  User profile already exists, updating to super admin...');
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: SUPER_ADMIN_EMAIL,
          name: SUPER_ADMIN_NAME,
          is_super_admin: true,
        })
        .eq('id', userId);

      if (updateError) {
        console.error('⚠️  Could not update via RLS, but user exists in Auth');
        console.log('💡 Manual step required:');
        console.log(`   User ID: ${userId}`);
        console.log('   Go to Supabase Dashboard > Table Editor > users');
        console.log('   Update the row to set is_super_admin = true');
        throw updateError;
      }
      console.log('✅ User profile updated to super admin');
    } else {
      const { error: insertError } = await supabase.from('users').insert({
        id: userId,
        email: SUPER_ADMIN_EMAIL,
        name: SUPER_ADMIN_NAME,
        password_hash: '', // Not needed for Supabase Auth
        is_super_admin: true,
      });

      if (insertError) {
        console.error('⚠️  Could not insert via RLS, but user exists in Auth');
        console.log('💡 Manual step required:');
        console.log(`   User ID: ${userId}`);
        console.log('   Go to Supabase Dashboard > Table Editor > users');
        console.log('   Insert a new row with:');
        console.log(`   - id: ${userId}`);
        console.log(`   - email: ${SUPER_ADMIN_EMAIL}`);
        console.log(`   - name: ${SUPER_ADMIN_NAME}`);
        console.log(`   - password_hash: ''`);
        console.log(`   - is_super_admin: true`);
        throw insertError;
      }
      console.log('✅ User profile created');
    }

    console.log('');
    console.log('✅ Super admin account created successfully!');
    console.log('');
    console.log('You can now sign in with:');
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('1. Make sure Supabase is properly configured');
    console.error('2. Check that email authentication is enabled in Supabase');
    console.error('3. If user exists, you may need to reset the password in Supabase dashboard');
    console.error('4. Go to Supabase Dashboard > Authentication > Users to manage users');
    console.error('5. Make sure RLS policies allow inserting into users table');
  }
}

// Run the script
createSuperAdmin()
  .then(() => {
    console.log('');
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

