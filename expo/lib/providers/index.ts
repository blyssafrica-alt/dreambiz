// Provider exports
export * from './types';
export * from './supabase-provider';
export * from './firebase-provider';
export * from './provider-manager';

// Convenience function to get the current provider
import { providerManager } from './provider-manager';

export const getProvider = () => {
  // Auto-initialize if needed
  return providerManager.getProvider();
};

