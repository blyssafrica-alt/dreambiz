import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function PaymentsLayout() {
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
        name="add" 
        options={{ 
          title: 'Record Payment',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="pending" 
        options={{ 
          title: 'Pending Payments',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="overdue" 
        options={{ 
          title: 'Overdue Payments',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}

