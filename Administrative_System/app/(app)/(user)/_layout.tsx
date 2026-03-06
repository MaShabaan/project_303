/**
 * User Dashboard Layout
 *
 * Protected: Only authenticated users can access.
 * Admins are redirected to admin dashboard.
 */

import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Redirect, Tabs, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function UserLayout() {
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

  // Admins should use admin dashboard
  if (profile.role === 'admin') {
    return <Redirect href="/(app)/(admin)" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: true,
        headerTitle: 'Dashboard',
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
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
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
