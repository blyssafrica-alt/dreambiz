// Provider Context - Manages backend provider selection
import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState } from 'react';
import { providerManager, type ProviderType } from '@/lib/providers';

export const [ProviderContext, useProvider] = createContextHook(() => {
  const [currentProvider, setCurrentProvider] = useState<ProviderType>('supabase');
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<ProviderType[]>(['supabase']);

  useEffect(() => {
    const init = async () => {
      try {
        await providerManager.initialize();
        setCurrentProvider(providerManager.getCurrentProviderType());
        setAvailableProviders(providerManager.getAvailableProviders());
        setIsInitialized(true);

        // Listen for provider changes
        providerManager.onProviderChange((provider) => {
          setCurrentProvider(provider.type);
        });
      } catch (error) {
        console.error('Failed to initialize provider manager:', error);
      }
    };

    init();
  }, []);

  const switchProvider = async (type: ProviderType) => {
    try {
      await providerManager.setProvider(type);
      setCurrentProvider(type);
    } catch (error) {
      console.error('Failed to switch provider:', error);
      throw error;
    }
  };

  const getProvider = () => {
    return providerManager.getProvider();
  };

  return {
    currentProvider,
    availableProviders,
    isInitialized,
    switchProvider,
    getProvider,
  };
});

