import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function AdminLayout() {
  const { user, isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const currentPath = segments.join('/');
    const inAdmin = currentPath.includes('admin');
    const isEmployeeRoles = currentPath.includes('employee-roles');

    // Allow business owners to access employee-roles (for managing their employees)
    // Redirect non-super-admins away from admin (except employee-roles)
    if (!isSuperAdmin && inAdmin && !isEmployeeRoles) {
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

  // Allow business owners to access employee-roles
  const currentPath = segments.join('/');
  const isEmployeeRoles = currentPath.includes('employee-roles');

  if (!isSuperAdmin && !isEmployeeRoles) {
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
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="features" 
        options={{ 
          title: 'Feature Management',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="products" 
        options={{ 
          title: 'Product Management',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ads" 
        options={{ 
          title: 'Advertisement Management',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="templates" 
        options={{ 
          title: 'Document Templates',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="alerts" 
        options={{ 
          title: 'Alert Rules',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="books" 
        options={{ 
          title: 'Book Management',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="users" 
        options={{ 
          title: 'User Management',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="premium" 
        options={{ 
          title: 'Premium Management',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="payment-methods" 
        options={{ 
          title: 'Payment Methods',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="help-content" 
        options={{ 
          title: 'Help Content',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="payment-verification" 
        options={{ 
          title: 'Payment Verification',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="product-categories" 
        options={{ 
          title: 'Product Categories',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="employee-roles" 
        options={{ 
          title: 'Employee Roles',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="integrations" 
        options={{ 
          title: 'Integration Settings',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="monitoring" 
        options={{ 
          title: 'Monitoring & Analytics',
          headerShown: false,
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

