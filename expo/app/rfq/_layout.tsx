import { Stack } from 'expo-router';

export default function RfqLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[rfqId]" />
    </Stack>
  );
}
