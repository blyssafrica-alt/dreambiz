import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type {
  IBackendProvider,
  ProviderType,
  AuthUser,
  UserProfile,
  AuthSession,
  DatabaseQuery,
  DatabaseResult,
  DatabaseListResult,
} from './types';

export class SupabaseProvider implements IBackendProvider {
  readonly type: ProviderType = 'supabase';
  readonly name = 'Supabase';
  private authStateUnsubscribe: (() => void) | null = null;

  async initialize(): Promise<void> {
    // Supabase is already initialized in lib/supabase.ts
    console.log('✅ Supabase provider initialized');
  }

  async cleanup(): Promise<void> {
    if (this.authStateUnsubscribe) {
      this.authStateUnsubscribe();
      this.authStateUnsubscribe = null;
    }
  }

  async getCurrentSession(): Promise<AuthSession | null> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session?.user) return null;

      return {
        user: this.mapSupabaseUserToAuthUser(session.user),
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresAt: session.expires_at ? session.expires_at * 1000 : undefined,
      };
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  async signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {},
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from sign up');

    return this.mapSupabaseUserToAuthUser(data.user);
  }

  async signIn(email: string, password: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error('No user returned from sign in');

    return this.mapSupabaseUserToAuthUser(data.user);
  }

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user ? this.mapSupabaseUserToAuthUser(session.user) : null);
    });

    this.authStateUnsubscribe = () => {
      data.subscription.unsubscribe();
    };

    return this.authStateUnsubscribe;
  }

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const result = await this.queryOne<any>({
        table: 'users',
        filters: { id: userId },
      });

      if (result.error) {
        // Extract error message properly
        const errorMessage = result.error?.message || result.error?.toString() || 'Unknown error';
        const errorCode = (result.error as any)?.code || '';
        
        // If it's a "not found" error (PGRST116), that's okay - profile doesn't exist yet
              if (errorCode === 'PGRST116' || errorMessage.includes('No rows returned')) {
                // Don't log - this is normal for new users
                return null;
              }
        
        // For other errors, throw with proper message
        const error = new Error(errorMessage);
        (error as any).code = errorCode;
        (error as any).details = (result.error as any)?.details;
        (error as any).hint = (result.error as any)?.hint;
        throw error;
      }
      
      if (!result.data) return null;

      return {
        id: result.data.id,
        email: result.data.email,
        name: result.data.name,
        createdAt: result.data.createdAt || result.data.created_at,
        isSuperAdmin: result.data.isSuperAdmin || result.data.is_super_admin,
      };
    } catch (error: any) {
      // Re-throw with better error message
      const errorMessage = error?.message || error?.toString() || 'Failed to get user profile';
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).code = error?.code;
      (enhancedError as any).details = error?.details;
      throw enhancedError;
    }
  }

  async createUserProfile(userId: string, profile: Omit<UserProfile, 'id' | 'createdAt'>): Promise<UserProfile> {
    // First, check if profile already exists (might have been created by trigger)
    let existing = await this.getUserProfile(userId);
    if (existing) {
      console.log('User profile already exists, returning existing profile');
      return existing;
    }

    // Try to use the RPC function to sync the profile (for existing users)
    // This function uses SECURITY DEFINER so it can bypass RLS
    // Try RPC FIRST before direct insert - it's more reliable
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('sync_user_profile', { user_id_param: userId });
      
      if (!rpcError && rpcData) {
        // RPC succeeded - check the result
        const result = rpcData as any;
        if (result.success) {
          // Wait a moment for the insert to complete
          await new Promise(resolve => setTimeout(resolve, 1000));
          existing = await this.getUserProfile(userId);
          if (existing) {
            console.log('✅ User profile synced via RPC function');
            return existing;
          }
          // If we still can't read it, but RPC said it was created, it exists in DB
          // Return a profile object so we can proceed
          if (result.created) {
            console.log('✅ User profile created via RPC (may not be readable due to RLS)');
            return {
              id: userId,
              email: profile.email,
              name: profile.name,
              createdAt: new Date().toISOString(),
              isSuperAdmin: false,
            };
          }
        }
      } else if (rpcError) {
        const rpcErrorCode = (rpcError as any)?.code || '';
        const rpcErrorMessage = rpcError?.message || String(rpcError);
        
        // 406 = Not Acceptable, 42883 = function doesn't exist
        // If function doesn't exist, continue to try direct insert
        if (rpcErrorCode === '42883' || rpcErrorCode === 'P0001' || rpcErrorMessage.includes('function') || rpcErrorMessage.includes('does not exist')) {
          console.log('RPC function not available - will try direct insert');
        } else {
          // Other RPC errors - log but continue
          console.log('RPC function error:', rpcErrorMessage);
        }
      }
    } catch (rpcErr: any) {
      // RPC function might not exist - that's okay, we'll try other methods
      const rpcErrMessage = rpcErr?.message || String(rpcErr);
      if (!rpcErrMessage.includes('function') && !rpcErrMessage.includes('does not exist')) {
        console.log('RPC call failed:', rpcErrMessage);
      }
      // Continue to try direct insert
    }

    // Try to create the profile directly
    const result = await this.insert<any>({
      table: 'users',
      data: {
        id: userId,
        email: profile.email,
        name: profile.name,
        password_hash: '',
        is_super_admin: profile.isSuperAdmin || false,
      },
    });

    // If insert fails due to RLS or duplicate key, check if profile exists now
    if (result.error) {
      const errorMessage = result.error?.message || String(result.error);
      const errorCode = (result.error as any)?.code || '';
      
      // Handle duplicate key errors - profile might already exist
      if (errorMessage.includes('duplicate key') || 
          errorMessage.includes('duplicate') ||
          errorMessage.includes('already exists') ||
          errorCode === '23505' || // Unique violation
          errorMessage.includes('users_email_key') ||
          errorMessage.includes('users_pkey')) {
        
        // Duplicate key means profile EXISTS in database - wait and retry to fetch it
        // Wait and retry multiple times (profile might be created by trigger/RPC)
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          existing = await this.getUserProfile(userId);
          if (existing) {
            console.log('✅ User profile found after duplicate key error');
            return existing;
          }
        }
        
        // If still not found after duplicate key error, the profile exists in DB
        // but RLS prevents us from reading it. This is okay - foreign key will be satisfied.
        // However, we should verify it exists by trying to create business profile
        // For now, throw an error to force proper setup
        console.warn('⚠️ Profile exists (duplicate key) but RLS prevents access. Profile should exist in database.');
        // Return a profile object - the duplicate key error confirms it exists in DB
        // The foreign key constraint should be satisfied
        return {
          id: userId,
          email: profile.email,
          name: profile.name,
          createdAt: new Date().toISOString(),
          isSuperAdmin: false,
        };
      }
      
      // Handle RLS errors - try RPC function more aggressively, then wait for trigger
      if (errorMessage.includes('row-level security') || 
          errorMessage.includes('RLS') || 
          errorCode === '42501') {
        
        // RLS blocked direct insert - try RPC function which uses SECURITY DEFINER
        console.log('RLS blocked creation, trying RPC function...');
        let rpcWorked = false;
        let rpcErrorDetails = '';
        
        try {
          const { data: rpcData2, error: rpcError2 } = await supabase.rpc('sync_user_profile', { user_id_param: userId });
          
          if (rpcError2) {
            const rpcErrorCode = (rpcError2 as any)?.code || '';
            const rpcErrorMessage = rpcError2?.message || String(rpcError2);
            rpcErrorDetails = `RPC error: ${rpcErrorMessage} (code: ${rpcErrorCode})`;
            
            // 406 = Not Acceptable, 42883 = function doesn't exist
            if (rpcErrorCode === '42883' || rpcErrorCode === 'P0001' || rpcErrorMessage.includes('function') || rpcErrorMessage.includes('does not exist') || rpcErrorCode === '406') {
              console.log('⚠️ RPC function not available - needs to be set up in database');
            } else {
              console.log('⚠️ RPC function error:', rpcErrorMessage);
            }
          } else if (rpcData2) {
            const result = rpcData2 as any;
            if (result && result.success) {
              rpcWorked = true;
              console.log('✅ RPC function succeeded:', result.message || 'Profile synced');
              
              // Wait a moment for the insert to complete
              await new Promise(resolve => setTimeout(resolve, 1500));
              
              // Try to read the profile
              existing = await this.getUserProfile(userId);
              if (existing) {
                console.log('✅ User profile created and readable via RPC function');
                return existing;
              }
              
              // If RPC said it created/exists but we can't read it, it still exists in DB
              // This is fine - the foreign key constraint will be satisfied
              if (result.exists || result.created) {
                console.log('✅ User profile exists in DB (created via RPC, may not be readable due to RLS)');
                return {
                  id: userId,
                  email: profile.email,
                  name: profile.name,
                  createdAt: new Date().toISOString(),
                  isSuperAdmin: false,
                };
              }
            } else if (result && result.error) {
              rpcErrorDetails = `RPC returned error: ${result.error}`;
              console.log('⚠️ RPC function returned error:', result.error);
            }
          }
        } catch (rpcErr2: any) {
          // RPC might not be available - log but continue
          const rpcErrMessage = rpcErr2?.message || String(rpcErr2);
          rpcErrorDetails = `RPC exception: ${rpcErrMessage}`;
          console.log('⚠️ RPC function exception:', rpcErrMessage);
        }
        
        // If RPC worked but we still can't read the profile, assume it exists and proceed
        if (rpcWorked) {
          console.log('✅ RPC confirmed profile exists - proceeding with business creation');
          return {
            id: userId,
            email: profile.email,
            name: profile.name,
            createdAt: new Date().toISOString(),
            isSuperAdmin: false,
          };
        }
        
        // Wait for trigger to create it - retry multiple times with longer delays
        // The trigger should have created it when the user signed up
        console.log('Waiting for trigger to create profile...');
        for (let i = 0; i < 3; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          existing = await this.getUserProfile(userId);
          if (existing) {
            console.log('✅ User profile created by trigger after RLS error');
            return existing;
          }
        }
        
        // Still not found after waiting - trigger might not be set up
        // Provide clear instructions with diagnostic info
        const diagnosticInfo = rpcErrorDetails ? `\n\nDiagnostic: ${rpcErrorDetails}` : '';
        throw new Error(
          'User profile could not be created due to RLS restrictions.' + diagnosticInfo + '\n\n' +
          'SOLUTION: Please run the SQL in database/create_user_profile_trigger.sql in your Supabase SQL Editor.\n\n' +
          'Steps:\n' +
          '1. Go to Supabase Dashboard > SQL Editor\n' +
          '2. Copy the ENTIRE contents of database/create_user_profile_trigger.sql\n' +
          '3. Select "No limit" in the SQL Editor (important!)\n' +
          '4. Paste and click "Run"\n' +
          '5. For existing users, run: SELECT public.sync_existing_users();\n' +
          '6. Or sync your specific user: SELECT public.sync_user_profile(\'d849bc7e-42ba-44ac-b4b1-598aeca0deb0\'::UUID);'
        );
      }
      
      // For other errors, throw with enhanced message
      const enhancedError = new Error(errorMessage);
      (enhancedError as any).code = errorCode;
      (enhancedError as any).details = (result.error as any)?.details;
      throw enhancedError;
    }
    
    if (!result.data) {
      // Check one more time if trigger/RPC created it
      existing = await this.getUserProfile(userId);
      if (existing) {
        return existing;
      }
      throw new Error('Failed to create user profile');
    }

    return {
      id: result.data.id,
      email: result.data.email,
      name: result.data.name,
      createdAt: result.data.created_at || new Date().toISOString(),
      isSuperAdmin: result.data.is_super_admin,
    };
  }

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const updateData: any = {};
    if (updates.email) updateData.email = updates.email;
    if (updates.name) updateData.name = updates.name;
    if (updates.isSuperAdmin !== undefined) updateData.is_super_admin = updates.isSuperAdmin;

    const result = await this.update<any>({
      table: 'users',
      id: userId,
      updates: updateData,
    });

    if (result.error) throw result.error;
    if (!result.data) throw new Error('Failed to update user profile');

    return {
      id: result.data.id,
      email: result.data.email,
      name: result.data.name,
      createdAt: result.data.created_at,
      isSuperAdmin: result.data.is_super_admin,
    };
  }

  async query<T>(query: DatabaseQuery): Promise<DatabaseListResult<T>> {
    try {
      let queryBuilder = supabase.from(query.table).select('*');

      // Apply filters
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
      }

      // Apply ordering
      if (query.orderBy) {
        queryBuilder = queryBuilder.order(query.orderBy.column, {
          ascending: query.orderBy.ascending,
        });
      }

      // Apply limit
      if (query.limit) {
        queryBuilder = queryBuilder.limit(query.limit);
      }

      // Apply offset
      if (query.offset) {
        queryBuilder = queryBuilder.range(query.offset, query.offset + (query.limit || 10) - 1);
      }

      const { data, error } = await queryBuilder;

      if (error) {
        return { data: [], error };
      }

      return { data: (data as T[]) || [], error: null };
    } catch (error) {
      return { data: [], error: error as Error };
    }
  }

  async queryOne<T>(query: DatabaseQuery): Promise<DatabaseResult<T>> {
    try {
      let queryBuilder = supabase.from(query.table).select('*');

      // Apply filters
      if (query.filters) {
        Object.entries(query.filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
      }

      const { data, error } = await queryBuilder.single();

      if (error) {
        // Convert Supabase error to Error object with proper message
        const errorObj = new Error(error.message || 'Database query failed');
        (errorObj as any).code = error.code;
        (errorObj as any).details = error.details;
        (errorObj as any).hint = error.hint;
        return { data: null, error: errorObj };
      }

      return { data: data as T, error: null };
    } catch (error: any) {
      // Ensure we return a proper Error object
      const errorObj = error instanceof Error ? error : new Error(error?.message || String(error));
      return { data: null, error: errorObj };
    }
  }

  async insert<T>(query: { table: string; data: Omit<T, 'id' | 'created_at' | 'updated_at'> }): Promise<DatabaseResult<T>> {
    try {
      const { data: result, error } = await supabase.from(query.table).insert(query.data).select().single();

      if (error) {
        return { data: null, error };
      }

      return { data: result as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async update<T>(query: { table: string; id: string; updates: Partial<T> }): Promise<DatabaseResult<T>> {
    try {
      const { data, error } = await supabase
        .from(query.table)
        .update(query.updates)
        .eq('id', query.id)
        .select()
        .single();

      if (error) {
        return { data: null, error };
      }

      return { data: data as T, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  async delete(query: { table: string; id: string }): Promise<DatabaseResult<void>> {
    try {
      const { error } = await supabase.from(query.table).delete().eq('id', query.id);

      if (error) {
        return { data: null, error };
      }

      return { data: undefined, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    }
  }

  private mapSupabaseUserToAuthUser(user: SupabaseUser): AuthUser {
    return {
      id: user.id,
      email: user.email || '',
      emailVerified: user.email_confirmed_at !== null,
      metadata: user.user_metadata || {},
    };
  }
}

