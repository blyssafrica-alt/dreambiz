// Script to create super admin account in Supabase Auth
// Run this script once to create the super admin account
// Usage: npx tsx scripts/create-super-admin.ts

import { supabase } from '../lib/supabase';

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
          console.error('💡 The password might be different. Please reset it in Supabase dashboard.');
          return;
        }

        if (signInData.user) {
          console.log('✅ User found in Auth');
          await createUserProfile(signInData.user.id);
          return;
        }
      } else {
        throw authError;
      }
    }

    if (!authData.user) {
      throw new Error('No user returned from sign up');
    }

    console.log('✅ User created in Supabase Auth');
    console.log(`User ID: ${authData.user.id}`);

    // Step 2: Create user profile in users table
    await createUserProfile(authData.user.id);

    console.log('');
    console.log('✅ Super admin account created successfully!');
    console.log('');
    console.log('You can now sign in with:');
    console.log(`Email: ${SUPER_ADMIN_EMAIL}`);
    console.log(`Password: ${SUPER_ADMIN_PASSWORD}`);
  } catch (error: any) {
    console.error('❌ Error creating super admin:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('1. Make sure Supabase is properly configured');
    console.error('2. Check that email authentication is enabled in Supabase');
    console.error('3. If user exists, you may need to reset the password in Supabase dashboard');
    console.error('4. Go to Supabase Dashboard > Authentication > Users to manage users');
  }
}

async function createUserProfile(userId: string) {
  console.log('Step 2: Creating user profile in users table...');

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

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
      throw insertError;
    }
    console.log('✅ User profile created');
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

