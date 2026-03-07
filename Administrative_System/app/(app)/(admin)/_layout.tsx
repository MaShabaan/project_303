/**
 * Admin Dashboard Layout
 *
 * Protected: Only users with role "admin" can access.
 * Regular users attempting to access will be redirected.
 */

import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Redirect, Tabs, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function AdminLayout() {
  const { user, profile, isInitialized, signOut } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleBackToLogin = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  if (!isInitialized) return null;

  if (!user || !profile) {
    return <Redirect href="/(auth)/login" />;
  }

  // Protect admin routes - redirect regular users
  if (profile.role !== 'admin') {
    return <Redirect href="/(app)/(user)" />;
  }

  const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com']; 
    const isSuperAdmin = SUPER_ADMINS.includes(profile.email || '');

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: true,
        headerTitle: 'Admin Dashboard',
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#333333',
        headerLeft: () => (
          <TouchableOpacity onPress={handleBackToLogin} style={styles.backButton}>
            <Image
              source={require('@/assets/images/back-arrow.png')}
              style={styles.backArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      
      {isSuperAdmin && (
        <Tabs.Screen
          name="approvals"
          options={{
            title: 'Approvals',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="person.badge.clock.fill" color={color} />
            ),
          }}
        />
      )}

\      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.2.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 12,
    marginLeft: 4,
  },
  backArrow: {
    width: 24,
    height: 24,
  },
});