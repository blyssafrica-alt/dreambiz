// Provider abstraction types and interfaces

export type ProviderType = 'supabase' | 'firebase' | 'hybrid';

export interface AuthUser {
  id: string;
  email: string;
  emailVerified?: boolean;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isSuperAdmin?: boolean;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
}

export interface DatabaseQuery {
  table: string;
  filters?: Record<string, any>;
  orderBy?: { column: string; ascending: boolean };
  limit?: number;
  offset?: number;
}

export interface DatabaseResult<T> {
  data: T | null;
  error: Error | null;
}

export interface DatabaseListResult<T> {
  data: T[];
  error: Error | null;
}

// Provider interface - all providers must implement this
export interface IBackendProvider {
  // Provider info
  readonly type: ProviderType;
  readonly name: string;
  
  // Authentication methods
  getCurrentSession(): Promise<AuthSession | null>;
  signUp(email: string, password: string, metadata?: Record<string, any>): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  
  // User profile methods
  getUserProfile(userId: string): Promise<UserProfile | null>;
  createUserProfile(userId: string, profile: Omit<UserProfile, 'id' | 'createdAt'>): Promise<UserProfile>;
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile>;
  
  // Database methods
  query<T>(query: DatabaseQuery): Promise<DatabaseListResult<T>>;
  queryOne<T>(query: DatabaseQuery): Promise<DatabaseResult<T>>;
  insert<T>(query: { table: string; data: Omit<T, 'id' | 'created_at' | 'updated_at'> }): Promise<DatabaseResult<T>>;
  update<T>(query: { table: string; id: string; updates: Partial<T> }): Promise<DatabaseResult<T>>;
  delete(query: { table: string; id: string }): Promise<DatabaseResult<void>>;
  
  // Initialize/cleanup
  initialize(): Promise<void>;
  cleanup(): Promise<void>;
}

