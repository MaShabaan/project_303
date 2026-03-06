import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Link, router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { auth } from '@/services/firebase';
import { confirmPasswordReset } from 'firebase/auth';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ oobCode?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const oobCode = params.oobCode;

  const handleReset = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in both password fields.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (!oobCode) {
      setError(
        'Invalid or expired reset link. Please request a new password reset from the login screen.'
      );
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.successContainer}>
          <ThemedText type="title" style={styles.successTitle}>
            Password Reset
          </ThemedText>
          <ThemedText style={styles.successText}>
            Your password has been reset. You can now sign in with your new
            password.
          </ThemedText>
          <Button
            title="Sign In"
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backButton}
          />
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Set New Password
            </ThemedText>
            <ThemedText type="subtitle" style={styles.subtitle}>
              Enter your new password below
            </ThemedText>
          </View>

          <View style={styles.form}>
            {error && (
              <View style={styles.errorBanner}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {!oobCode && (
              <ThemedText style={styles.hint}>
                If you arrived here from a password reset email, the link may
                have expired. Please go back and request a new reset link.
              </ThemedText>
            )}

            <Input
              label="New Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading && !!oobCode}
            />

            <Input
              label="Confirm New Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!isLoading && !!oobCode}
            />

            <Button
              title="Reset Password"
              onPress={handleReset}
              loading={isLoading}
              style={styles.button}
            />

            <Link href="/(auth)/login" style={styles.backLink}>
              <ThemedText type="link">Back to Sign In</ThemedText>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 80,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.8,
  },
  form: {
    flex: 1,
  },
  errorBanner: {
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#e74c3c',
  },
  hint: {
    marginBottom: 16,
    lineHeight: 22,
    opacity: 0.9,
  },
  button: {
    marginTop: 8,
  },
  backLink: {
    alignSelf: 'center',
    marginTop: 24,
  },
  successContainer: {
    flex: 1,
    padding: 24,
    paddingTop: 100,
  },
  successTitle: {
    marginBottom: 16,
  },
  successText: {
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    alignSelf: 'stretch',
  },
});
