import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FilterPreset {
  id: string;
  name: string;
  filters: Record<string, any>;
  createdAt: string;
}

const STORAGE_KEY = 'dreambiz_filter_presets';

export async function getFilterPresets(): Promise<FilterPreset[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading filter presets:', error);
    return [];
  }
}

export async function saveFilterPreset(preset: Omit<FilterPreset, 'id' | 'createdAt'>): Promise<FilterPreset> {
  try {
    const presets = await getFilterPresets();
    const newPreset: FilterPreset = {
      ...preset,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    presets.push(newPreset);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    return newPreset;
  } catch (error) {
    console.error('Error saving filter preset:', error);
    throw error;
  }
}

export async function deleteFilterPreset(id: string): Promise<void> {
  try {
    const presets = await getFilterPresets();
    const filtered = presets.filter(p => p.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting filter preset:', error);
    throw error;
  }
}

