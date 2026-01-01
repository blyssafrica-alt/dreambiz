import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { getProvider, type AuthUser } from '@/lib/providers';
import type { UserProfile } from '@/lib/providers/types';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isSuperAdmin?: boolean;
}

export const [AuthContext, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);

  const loadUserProfile = async (userId: string, authUserData?: AuthUser) => {
    try {
      const provider = getProvider();
      let profile = await provider.getUserProfile(userId);

      if (!profile && authUserData) {
        // Profile doesn't exist - try to create it from auth user metadata
        // Only log once, not repeatedly
        try {
          profile = await provider.createUserProfile(userId, {
            email: authUserData.email,
            name: authUserData.metadata?.name || 'User',
            isSuperAdmin: false,
          });
          console.log('✅ User profile created automatically');
        } catch (createError: any) {
          const errorMessage = createError?.message || String(createError);
          // Only warn if it's not an RLS error (RLS errors are expected if trigger isn't set up)
          if (!errorMessage.includes('row-level security') && !errorMessage.includes('RLS')) {
            console.warn('Could not auto-create profile:', errorMessage);
          }
          // Profile will be created during onboarding or by database trigger
        }
      }

      if (profile) {
        setUser({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          createdAt: profile.createdAt,
          isSuperAdmin: profile.isSuperAdmin,
        });
      }
    } catch (error: any) {
      // Better error logging
      const errorMessage = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      const errorDetails = error?.details || error?.hint || '';
      const errorCode = error?.code || '';
      
      console.error('Failed to load user profile:', {
        userId,
        error: errorMessage,
        code: errorCode,
        details: errorDetails,
        raw: error,
      });
      
      // Don't throw - allow app to continue even if profile doesn't exist
      // The profile will be created during onboarding or sign-up
      // User can continue to app even if profile loading fails
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const provider = getProvider();
        const session = await provider.getCurrentSession();
        
        if (session?.user) {
          // Only set auth user if we have a valid session
          setAuthUser(session.user);
          await loadUserProfile(session.user.id, session.user);
        } else {
          // No session - clear auth state
          setAuthUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to load user:', error);
        // On error, clear auth state
        setAuthUser(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
    
    // Set up auth state listener
    const provider = getProvider();
    const unsubscribe = provider.onAuthStateChange(async (user) => {
      console.log('Auth state changed:', user ? 'signed in' : 'signed out');
      if (user) {
        setAuthUser(user);
        await loadUserProfile(user.id, user);
      } else {
        // User signed out - clear all state
        setUser(null);
        setAuthUser(null);
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const provider = getProvider();
      
      // Sign up with provider
      const authUser = await provider.signUp(email, password, { name });

      // Brief wait for auth user to be available (reduced from 2s to 500ms)
      await new Promise<void>(resolve => setTimeout(() => resolve(), 500));

      // Try to create user profile with faster retries
      let profile: UserProfile | null = null;
      
      // Reduced to 3 attempts with shorter delays
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          profile = await provider.createUserProfile(authUser.id, {
            email,
            name,
            isSuperAdmin: false,
          });
          console.log(`✅ User profile created successfully (attempt ${attempt + 1})`);
          break; // Success - exit retry loop
        } catch (error: any) {
          const errorMessage = error?.message || String(error);
          
          // If it's a "user not found" error, wait briefly and retry
          if (errorMessage.includes('User not found in auth.users') || 
              errorMessage.includes('not found in auth')) {
            if (attempt < 2) {
              console.log(`⚠️ User not found in auth.users yet (attempt ${attempt + 1}/3), waiting 500ms...`);
              await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
              continue;
            }
          }
          
          // For duplicate/already exists errors, profile might already exist - try to fetch it
          if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
            console.log(`⚠️ Profile might already exist (attempt ${attempt + 1}/3), checking...`);
            try {
              profile = await provider.getUserProfile(authUser.id);
              if (profile) {
                console.log('✅ User profile found (created by trigger)');
                break;
              }
            } catch {
              // If we can't fetch it and it's not the last attempt, wait briefly
              if (attempt < 2) {
                await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
                continue;
              }
            }
          }
          
          // For RLS errors, the trigger should create it - wait and check
          if (errorMessage.includes('RLS') || errorMessage.includes('row-level security')) {
            if (attempt < 2) {
              console.log(`⚠️ RLS error (attempt ${attempt + 1}/3), waiting 500ms for trigger...`);
              await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
              
              // Check if trigger created it
              try {
                profile = await provider.getUserProfile(authUser.id);
                if (profile) {
                  console.log('✅ User profile created by trigger');
                  break;
                }
              } catch {
                // Continue retrying
              }
              continue;
            }
          }
          
          // If it's the last attempt, don't throw - create temporary profile
          if (attempt === 2) {
            console.warn('⚠️ User profile creation failed after retries. Using temporary profile. Trigger should create it.');
            break;
          }
          
          // For other errors on non-final attempts, wait briefly and retry
          if (attempt < 2) {
            console.log(`⚠️ Profile creation error (attempt ${attempt + 1}/3): ${errorMessage}, retrying...`);
            await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
          }
        }
      }

      // If profile creation failed after all retries, create a temporary profile object
      // The trigger should create it eventually, and business profile creation will handle it
      if (!profile) {
        console.warn('⚠️ User profile creation failed after all retries. Using temporary profile. Trigger should create it.');
        profile = {
          id: authUser.id,
          email: email,
          name: name,
          createdAt: new Date().toISOString(),
          isSuperAdmin: false,
        };
      }

      const newUser: User = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        createdAt: profile.createdAt,
        isSuperAdmin: profile.isSuperAdmin,
      };
      
      setUser(newUser);
      setAuthUser(authUser);
      return newUser;
    } catch (error: any) {
      console.error('Sign up error:', error);
      throw new Error(error.message || 'Failed to sign up');
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const provider = getProvider();
      const authUser = await provider.signIn(email, password);

      setAuthUser(authUser);
      await loadUserProfile(authUser.id, authUser);
      
      return user;
    } catch (error: any) {
      console.error('Sign in error:', error);
      
      // Provide helpful error messages
      if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
        throw new Error('Please confirm your email address. Check your inbox for the confirmation email, or contact support if you need help.');
      }
      
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
        throw new Error('Invalid email or password. Please check your credentials and try again.');
      }
      
      throw new Error(error.message || 'Invalid credentials');
    }
  };

  const signOut = async () => {
    try {
      const provider = getProvider();
      await provider.signOut();
      
      setUser(null);
      setAuthUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  return {
    user,
    isLoading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!authUser || !!user, // Authenticated if we have authUser (even if profile not loaded yet)
    authUser, // Generic auth user (replaces supabaseUser)
    isSuperAdmin: user?.isSuperAdmin || false, // Expose isSuperAdmin as a convenience property
  };
});
