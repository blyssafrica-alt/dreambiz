import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { lightTheme, darkTheme, type Theme } from '@/constants/theme';

const STORAGE_KEY = 'dreambig_theme_mode';

export type ThemeMode = 'light' | 'dark';

export const [ThemeContext, useTheme] = createContextHook(() => {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        setMode(saved);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    await AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  const setThemeMode = async (newMode: ThemeMode) => {
    setMode(newMode);
    await AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  const theme: Theme = mode === 'light' ? lightTheme : darkTheme;

  return {
    mode,
    theme,
    isLoading,
    toggleTheme,
    setThemeMode,
    isDark: mode === 'dark',
  };
});
