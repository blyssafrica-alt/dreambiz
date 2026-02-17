import { Stack } from 'expo-router';

export default function FinancialToolsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="break-even" />
      <Stack.Screen name="pricing" />
      <Stack.Screen name="profit-margin" />
      <Stack.Screen name="markup" />
      <Stack.Screen name="roi" />
      <Stack.Screen name="pl-statement" />
      <Stack.Screen name="cashflow-statement" />
      <Stack.Screen name="balance-sheet" />
    </Stack>
  );
}

