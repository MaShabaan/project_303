/**
 * Root Index - Initial Route
 *
 * Redirects based on auth state:
 * - Not authenticated -> Login
 * - Authenticated -> App (role-based redirect happens in (app)/_layout)
 */

import { Redirect } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { user, profile, isInitialized } = useAuth();

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </View>
    );
  }

  if (!user || !profile) {
    return <Redirect href="/(auth)/login" />;
  }

  // Authenticated - go to app (role redirect happens in (app) layout)
  return <Redirect href="/(app)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
