/**
 * App Index - Redirects to role-specific dashboard
 * The actual redirect logic is in _layout.tsx
 */

import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function AppIndex() {
  const { profile } = useAuth();

  if (!profile) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile.role === 'admin') {
    return <Redirect href="/(app)/(admin)" />;
  }

  return <Redirect href="/(app)/(user)" />;
}
