/**
 * User Dashboard Layout
 *
 * Protected: Only authenticated users can access.
 * Admins are redirected to admin dashboard.
 */

import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Redirect, Stack, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function UserLayout() {
  const { user, profile, isInitialized, signOut } = useAuth();

  const handleBackToLogin = () => {
    signOut();
    router.replace('/(auth)/login');
  };

  if (!isInitialized) return null;

  if (!user || !profile) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile.role === 'admin') {
    return <Redirect href="/(app)/(admin)" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: 'Dashboard',
        headerStyle: { backgroundColor: '#FFFFFF' },
        headerTintColor: '#333333',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Home',
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
      />
      <Stack.Screen
        name="rate-courses"
        options={{ title: 'Rate Courses' }}
      />
      <Stack.Screen
        name="submit-complaint"
        options={{ title: 'Submit Complaint' }}
      />
      <Stack.Screen
        name="my-complaints"
        options={{ title: 'My Complaints' }}
      />
      <Stack.Screen
        name="my-ratings"
        options={{ title: 'My Ratings' }}
      />
    </Stack>
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
