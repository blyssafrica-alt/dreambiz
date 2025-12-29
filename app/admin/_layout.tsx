import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function AdminLayout() {
  const { user, isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const currentPath = segments.join('/');
    const inAdmin = currentPath.includes('admin');

    // Redirect non-super-admins away from admin
    if (!isSuperAdmin && inAdmin) {
      router.replace('/(tabs)' as any);
      return;
    }

    // Redirect super admins to admin dashboard if they're in admin section
    if (isSuperAdmin && inAdmin && currentPath === 'admin') {
      router.replace('/admin/dashboard' as any);
    }
  }, [isSuperAdmin, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <ActivityIndicator size="large" color={theme.accent.primary} />
        <Text style={[styles.loadingText, { color: theme.text.secondary }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!isSuperAdmin) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <Text style={[styles.errorText, { color: theme.accent.danger }]}>
          Access Denied
        </Text>
        <Text style={[styles.errorSubtext, { color: theme.text.secondary }]}>
          Super Admin access required
        </Text>
      </View>
    );
  }

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
        name="dashboard" 
        options={{ 
          title: 'Admin Dashboard',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="features" 
        options={{ 
          title: 'Feature Management',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="products" 
        options={{ 
          title: 'Product Management',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="ads" 
        options={{ 
          title: 'Advertisement Management',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="templates" 
        options={{ 
          title: 'Document Templates',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="alerts" 
        options={{ 
          title: 'Alert Rules',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="books" 
        options={{ 
          title: 'Book Management',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'User Management',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="premium" 
        options={{ 
          title: 'Premium Management',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="payment-methods" 
        options={{ 
          title: 'Payment Methods',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="help-content" 
        options={{ 
          title: 'Help Content',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
  },
});

