import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function StoreLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.background.card,
        },
        headerTintColor: theme.text.primary,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="[id]" 
        options={{ 
          title: 'Product Details',
          headerShown: false,
        }} 
      />
    </Stack>
  );
}

