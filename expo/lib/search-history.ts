import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SearchHistoryItem {
  query: string;
  timestamp: string;
  resultCount?: number;
}

const STORAGE_KEY = 'dreambiz_search_history';
const MAX_HISTORY_ITEMS = 20;

export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading search history:', error);
    return [];
  }
}

export async function addSearchHistory(query: string, resultCount?: number): Promise<void> {
  try {
    if (!query || query.trim().length < 2) return;
    
    const history = await getSearchHistory();
    const trimmedQuery = query.trim().toLowerCase();
    
    // Remove existing entry with same query
    const filtered = history.filter(item => item.query.toLowerCase() !== trimmedQuery);
    
    // Add new entry at the beginning
    const newItem: SearchHistoryItem = {
      query: trimmedQuery,
      timestamp: new Date().toISOString(),
      resultCount,
    };
    
    filtered.unshift(newItem);
    
    // Keep only last MAX_HISTORY_ITEMS
    const limited = filtered.slice(0, MAX_HISTORY_ITEMS);
    
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(limited));
  } catch (error) {
    console.error('Error saving search history:', error);
  }
}

export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing search history:', error);
  }
}

export async function removeSearchHistoryItem(query: string): Promise<void> {
  try {
    const history = await getSearchHistory();
    const filtered = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing search history item:', error);
  }
}

