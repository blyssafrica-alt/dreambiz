import { Stack } from 'expo-router';

export default function SuppliersMarketplaceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="my-stores" />
      <Stack.Screen name="my-application" />
      <Stack.Screen name="my-messages" />
      <Stack.Screen name="become-a-supplier" />
      <Stack.Screen name="[supplierId]" />
      <Stack.Screen name="conversation/[supplierId]" />
      <Stack.Screen name="product/[productId]" />
      <Stack.Screen name="compare" />
    </Stack>
  );
}
