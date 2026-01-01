import { useSettings } from '@/contexts/SettingsContext';
import { getTranslations, t, type Language, type Translations } from '@/lib/translations';

/**
 * Hook to get translations based on user's language preference
 * Usage: const { t, translations, language } = useTranslation();
 */
export function useTranslation() {
  const { settings } = useSettings();
  const language = (settings.language || 'en') as Language;
  const translations = getTranslations(language);

  // Helper function to translate a key
  const translate = (key: string): string => {
    return t(key, language);
  };

  return {
    t: translate,
    translations,
    language,
  };
}

