# Verify User Profiles Were Created

## After Running `SELECT public.sync_existing_users();`

### Step 1: Check How Many Users Were Synced

Run this query to see all users in the `users` table:

```sql
SELECT id, email, name, is_super_admin, created_at 
FROM public.users 
ORDER BY created_at DESC;
```

This will show you:
- All user profiles that exist
- Their email addresses
- Whether they're super admins
- When they were created

### Step 2: Compare with Auth Users

To see if all auth users have profiles, run:

```sql
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  CASE WHEN u.id IS NOT NULL THEN '✅ Has Profile' ELSE '❌ Missing Profile' END as profile_status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
ORDER BY au.created_at DESC;
```

This will show:
- ✅ Users who have profiles (ready to use the app)
- ❌ Users who still need profiles (run sync again or manually create)

### Step 3: Check Specific User

If you want to check a specific user by email:

```sql
SELECT * FROM public.users WHERE email = 'user@example.com';
```

Or by ID:

```sql
SELECT * FROM public.users WHERE id = 'user-id-here'::UUID;
```

### Step 4: Manual Sync for Specific User

If a user still doesn't have a profile, sync them individually:

```sql
SELECT public.sync_user_profile('user-id-here'::UUID);
```

Replace `user-id-here` with the actual user ID from `auth.users`.

### Step 5: Verify Trigger is Working

To verify the trigger will work for new users:

```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

Should return 1 row showing the trigger exists.

### Step 6: Test with New User

1. Have a new user sign up
2. Check if their profile was created automatically:

```sql
SELECT * FROM public.users ORDER BY created_at DESC LIMIT 1;
```

The newest user should appear here automatically.

## Common Issues

### No Users Synced
If `sync_existing_users()` returned but no users were created:
- Check if users already exist (they might have been created by the trigger)
- Check RLS policies aren't blocking the view
- Try syncing individual users

### Some Users Still Missing
If some users still don't have profiles:
- They might have been created after you ran the sync
- Run `sync_existing_users()` again
- Or sync them individually using `sync_user_profile(user_id)`

### Error Messages
If you see errors:
- Make sure you selected "No limit" in SQL Editor
- Check that the trigger SQL was run successfully
- Verify the functions exist: `SELECT * FROM pg_proc WHERE proname IN ('sync_existing_users', 'sync_user_profile');`

## Success Indicators

✅ **Success means:**
- All users in `auth.users` have corresponding entries in `public.users`
- New users automatically get profiles when they sign up
- No more "Security restriction" errors during onboarding

## Next Steps

1. ✅ Verify all users have profiles (use queries above)
2. ✅ Test onboarding with a new user
3. ✅ Confirm no more errors appear
4. ✅ Monitor for any remaining issues

