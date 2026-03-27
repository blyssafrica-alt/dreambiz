import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export default function AdminLayout() {
  const { isSuperAdmin, isAdmin, isModerator, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { theme } = useTheme();

  useEffect(() => {
    if (isLoading) return;

    const currentPath = segments.join('/');
    const inAdmin = currentPath.includes('admin');
    const isEmployeeRoles = currentPath.includes('employee-roles');
    const canAccessAdmin = isSuperAdmin || isAdmin || isModerator;

    // Allow business owners to access employee-roles (for managing their employees)
    // Redirect non-super-admins away from admin (except employee-roles)
    if (!canAccessAdmin && inAdmin && !isEmployeeRoles) {
      router.replace('/(tabs)' as any);
      return;
    }

    // Redirect super admins to admin dashboard if they're in admin section
    if (canAccessAdmin && inAdmin && currentPath === 'admin') {
      router.replace('/admin/dashboard' as any);
    }
  }, [isAdmin, isModerator, isSuperAdmin, isLoading, segments, router]);

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
  const canAccessAdmin = isSuperAdmin || isAdmin || isModerator;

  if (!canAccessAdmin && !isEmployeeRoles) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background.primary }]}>
        <Text style={[styles.errorText, { color: theme.accent.danger }]}>
          Access Denied
        </Text>
        <Text style={[styles.errorSubtext, { color: theme.text.secondary }]}>
          Admin access required
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
        name="event-check-in" 
        options={{ 
          title: 'Event Check-in',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          title: 'Admin Settings',
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
        name="ad-settings" 
        options={{ 
          title: 'Ad Settings',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ad-packages" 
        options={{ 
          title: 'Ad Packages',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ad-campaigns" 
        options={{ 
          title: 'Ad Campaigns',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ad-sets" 
        options={{ 
          title: 'Ad Sets',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="ad-analytics" 
        options={{ 
          title: 'Ad Analytics',
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
        name="budget-templates" 
        options={{ 
          title: 'Budget Templates',
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
        name="store-metadata" 
        options={{ 
          title: 'Store Metadata',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="legal-pages" 
        options={{ 
          title: 'Legal Pages',
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
      <Stack.Screen 
        name="businesses" 
        options={{ 
          title: 'Business Management',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="business/[id]" 
        options={{ 
          title: 'Business Details',
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="suppliers/index" 
        options={{ title: 'Supplier Applications', headerShown: false }} 
      />
      <Stack.Screen 
        name="suppliers/[id]" 
        options={{ title: 'Supplier Detail', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-applications/index" 
        options={{ title: 'Applications (new)', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-applications/[id]" 
        options={{ title: 'Application Detail', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-categories" 
        options={{ title: 'Supplier Categories', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-subcategory-governance" 
        options={{ title: 'Subcategory governance', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-products" 
        options={{ title: 'Supplier Products', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-reviews" 
        options={{ title: 'Supplier Reviews', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-complaints" 
        options={{ title: 'Supplier Complaints', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-rfqs" 
        options={{ title: 'Supplier RFQs', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-purchase-orders" 
        options={{ title: 'Purchase orders', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-sponsored-placements" 
        options={{ title: 'Sponsored placements', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-placement-tiers" 
        options={{ title: 'Placement tiers', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-subscription-plans" 
        options={{ title: 'Supplier Plans', headerShown: false }} 
      />
      <Stack.Screen 
        name="subscription-promotions" 
        options={{ title: 'Subscription Promotions', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-subscriptions" 
        options={{ title: 'Supplier Subscriptions', headerShown: false }} 
      />
      <Stack.Screen 
        name="supplier-performance" 
        options={{ title: 'Supplier Performance', headerShown: false }} 
      />
      <Stack.Screen 
        name="mailing/index" 
        options={{ title: 'Mailing', headerShown: false }} 
      />
      <Stack.Screen 
        name="mailing/new" 
        options={{ title: 'New Campaign', headerShown: false }} 
      />
      <Stack.Screen 
        name="mailing/campaign/[id]" 
        options={{ title: 'Campaign Detail', headerShown: false }} 
      />
      <Stack.Screen 
        name="mailing/templates/index" 
        options={{ title: 'Templates', headerShown: false }} 
      />
      <Stack.Screen 
        name="mailing/templates/[id]" 
        options={{ title: 'Template', headerShown: false }} 
      />
      <Stack.Screen 
        name="mailing/templates/new" 
        options={{ title: 'New Template', headerShown: false }} 
      />
      <Stack.Screen 
        name="mailing/segments/index" 
        options={{ title: 'Segments', headerShown: false }} 
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

