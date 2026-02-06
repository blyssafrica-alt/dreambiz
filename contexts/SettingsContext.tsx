import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Currency } from '@/types/business';

const LANGUAGE_STORAGE_KEY = '@dreambiz:language';
const REMOVE_PROOF_CONFIRM_KEY = '@dreambiz:confirmRemoveProof';

interface AppSettings {
  notificationsEnabled: boolean;
  language: string;
  currencyPreference: Currency;
  smsEnabled: boolean;
  emailEnabled: boolean;
  whatsappEnabled: boolean;
  confirmRemoveProofEnabled: boolean;
}

export const [SettingsContext, useSettings] = createContextHook(() => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<AppSettings>({
    notificationsEnabled: true,
    language: 'en',
    currencyPreference: 'USD',
    smsEnabled: false,
    emailEnabled: true,
    whatsappEnabled: false,
    confirmRemoveProofEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load language and local preferences from AsyncStorage on mount (works for unauthenticated users)
  useEffect(() => {
    const loadLocalPreferences = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sn' || savedLanguage === 'nd')) {
          setSettings(prev => ({ ...prev, language: savedLanguage }));
        }
        const removeProofConfirm = await AsyncStorage.getItem(REMOVE_PROOF_CONFIRM_KEY);
        if (removeProofConfirm === 'true' || removeProofConfirm === 'false') {
          setSettings(prev => ({ ...prev, confirmRemoveProofEnabled: removeProofConfirm === 'true' }));
        }
      } catch (error) {
        console.error('Error loading local preferences from storage:', error);
      }
    };
    loadLocalPreferences();
  }, []);

  const loadSettings = useCallback(async () => {
    // Load language and local preferences from AsyncStorage first (works for unauthenticated users)
    let removeProofConfirmEnabled = true;
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sn' || savedLanguage === 'nd')) {
        setSettings(prev => ({ ...prev, language: savedLanguage }));
      }
      const removeProofConfirm = await AsyncStorage.getItem(REMOVE_PROOF_CONFIRM_KEY);
      if (removeProofConfirm === 'true' || removeProofConfirm === 'false') {
        removeProofConfirmEnabled = removeProofConfirm === 'true';
        setSettings(prev => ({ ...prev, confirmRemoveProofEnabled: removeProofConfirmEnabled }));
      }
    } catch (error) {
      console.error('Error loading local preferences from storage:', error);
    }

    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Load app_settings
      const { data: appSettings } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      // Load user integration preferences
      const { data: integrationPrefs } = await supabase
        .from('user_integration_preferences')
        .select('integration_id, is_enabled')
        .eq('user_id', user.id);

      // Load integration configs to check if they're configured by admin
      const { data: integrationConfigs } = await supabase
        .from('integration_configs')
        .select('id, is_active, config')
        .in('id', ['sms', 'email', 'whatsapp']);

      // Build settings object
      const integrationPrefsMap = new Map(
        integrationPrefs?.map((p: any) => [p.integration_id, p.is_enabled]) || []
      );

      const integrationConfigsMap = new Map(
        integrationConfigs?.map((c: any) => [c.id, { isActive: c.is_active, hasConfig: !!c.config }]) || []
      );

      // Check AsyncStorage for language preference (prefer over database for immediate updates)
      let languagePreference = appSettings?.language || 'en';
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'sn' || savedLanguage === 'nd')) {
          languagePreference = savedLanguage;
        }
      } catch (error) {
        console.error('Error reading language from storage:', error);
      }

      setSettings({
        notificationsEnabled: appSettings?.notifications_enabled ?? true,
        language: languagePreference,
        currencyPreference: (appSettings?.currency_preference as Currency) || 'USD',
        smsEnabled: integrationPrefsMap.get('sms') ?? false,
        emailEnabled: integrationPrefsMap.get('email') ?? true,
        whatsappEnabled: integrationPrefsMap.get('whatsapp') ?? false,
        confirmRemoveProofEnabled: removeProofConfirmEnabled,
      });
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const updateNotificationPreference = useCallback(async (enabled: boolean) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          user_id: user.id,
          notifications_enabled: enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, notificationsEnabled: enabled }));
    } catch (error) {
      console.error('Error updating notification preference:', error);
      throw error;
    }
  }, [user]);

  const updateLanguage = useCallback(async (language: string) => {
    try {
      // Always save to AsyncStorage first (works for unauthenticated users)
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      
      // Update local state immediately
      setSettings(prev => ({ ...prev, language }));

      // If user is authenticated, also save to database
      if (user) {
        const { error } = await supabase
          .from('app_settings')
          .upsert({
            user_id: user.id,
            language,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'user_id',
          });

        if (error) throw error;
      }
    } catch (error) {
      console.error('Error updating language:', error);
      throw error;
    }
  }, [user]);

  const updateCurrencyPreference = useCallback(async (currency: Currency) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          user_id: user.id,
          currency_preference: currency,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id',
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, currencyPreference: currency }));
    } catch (error) {
      console.error('Error updating currency preference:', error);
      throw error;
    }
  }, [user]);

  const updateIntegrationPreference = useCallback(async (integrationId: string, enabled: boolean) => {
    if (!user) return;

    try {
      // First check if the integration is configured by admin
      const { data: config } = await supabase
        .from('integration_configs')
        .select('id, config')
        .eq('id', integrationId)
        .single();

      // For SMS and WhatsApp, require admin configuration
      if ((integrationId === 'sms' || integrationId === 'whatsapp') && enabled && (!config || !config.config)) {
        throw new Error(`${integrationId.toUpperCase()} service needs to be configured by an administrator first.`);
      }

      // Save user preference
      const { error } = await supabase
        .from('user_integration_preferences')
        .upsert({
          user_id: user.id,
          integration_id: integrationId,
          is_enabled: enabled,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,integration_id',
        });

      if (error) throw error;

      setSettings(prev => ({
        ...prev,
        smsEnabled: integrationId === 'sms' ? enabled : prev.smsEnabled,
        emailEnabled: integrationId === 'email' ? enabled : prev.emailEnabled,
        whatsappEnabled: integrationId === 'whatsapp' ? enabled : prev.whatsappEnabled,
      }));
    } catch (error: any) {
      console.error('Error updating integration preference:', error);
      throw error;
    }
  }, [user]);

  const updateRemoveProofConfirmPreference = useCallback(async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(REMOVE_PROOF_CONFIRM_KEY, enabled ? 'true' : 'false');
      setSettings(prev => ({ ...prev, confirmRemoveProofEnabled: enabled }));
    } catch (error) {
      console.error('Error updating remove proof confirmation preference:', error);
      throw error;
    }
  }, []);

  return {
    settings,
    isLoading,
    updateNotificationPreference,
    updateLanguage,
    updateCurrencyPreference,
    updateIntegrationPreference,
    updateRemoveProofConfirmPreference,
    refreshSettings: loadSettings,
    language: settings.language,
  };
});

