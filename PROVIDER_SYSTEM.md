# 🔄 Backend Provider System

This app supports multiple backend providers (Supabase, Firebase, and Hybrid mode), allowing users to switch between them seamlessly.

## Architecture Overview

### Provider Abstraction Layer

The system uses an abstraction layer (`IBackendProvider` interface) that defines common operations:

- **Authentication**: `signUp`, `signIn`, `signOut`, `getCurrentSession`, `onAuthStateChange`
- **User Profiles**: `getUserProfile`, `createUserProfile`, `updateUserProfile`
- **Database Operations**: `query`, `queryOne`, `insert`, `update`, `delete`

### Available Providers

1. **Supabase Provider** (`lib/providers/supabase-provider.ts`)
   - Fully implemented
   - Uses PostgreSQL database
   - Real-time subscriptions support

2. **Firebase Provider** (`lib/providers/firebase-provider.ts`)
   - Skeleton implementation
   - Requires Firebase packages installation
   - To implement: Install `@react-native-firebase/app`, `@react-native-firebase/auth`, `@react-native-firebase/firestore`

3. **Hybrid Mode** (Future)
   - Use both providers simultaneously
   - Example: Auth from Firebase, Database from Supabase

## Usage

### Switching Providers

Users can switch providers from the Settings screen:

```typescript
import { useProvider } from '@/contexts/ProviderContext';

const { switchProvider, currentProvider } = useProvider();

// Switch to Firebase
await switchProvider('firebase');

// Switch to Supabase
await switchProvider('supabase');
```

### Using the Provider in Code

```typescript
import { getProvider } from '@/lib/providers';

const provider = getProvider();

// Sign up
const authUser = await provider.signUp(email, password, { name });

// Query database
const result = await provider.query({
  table: 'business_profiles',
  filters: { user_id: userId },
  orderBy: { column: 'created_at', ascending: false },
});
```

### Provider Context

The `ProviderContext` manages the current provider and provides:

- `currentProvider`: Current provider type
- `availableProviders`: List of available providers
- `switchProvider(type)`: Switch to a different provider
- `getProvider()`: Get the current provider instance

## Implementation Status

✅ **Completed:**
- Provider abstraction interface
- Supabase provider implementation
- Provider manager
- Provider context
- AuthContext updated to use providers
- Settings screen for switching providers

⏳ **In Progress:**
- BusinessContext migration to use providers
- Firebase provider full implementation

📋 **Future:**
- Hybrid mode implementation
- Data migration between providers
- Provider-specific feature detection

## Adding a New Provider

1. Create a new provider class implementing `IBackendProvider`:

```typescript
export class MyNewProvider implements IBackendProvider {
  readonly type: ProviderType = 'myprovider';
  readonly name = 'My Provider';
  
  // Implement all interface methods
  async signUp(email: string, password: string): Promise<AuthUser> {
    // Implementation
  }
  // ... other methods
}
```

2. Register it in `provider-manager.ts`:

```typescript
this.providers.set('myprovider', new MyNewProvider());
```

3. Update `ProviderType` in `types.ts`:

```typescript
export type ProviderType = 'supabase' | 'firebase' | 'hybrid' | 'myprovider';
```

## Configuration

Provider preferences are stored in AsyncStorage under the key `dreambiz_backend_provider`.

The system automatically:
- Loads the saved provider on app start
- Persists provider changes
- Handles provider initialization and cleanup

## Notes

- Users must sign out before switching providers
- Data structure should be compatible across providers
- Some provider-specific features may not be available in all providers

