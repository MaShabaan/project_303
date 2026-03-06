import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Text,
  Image,
  TextInput,
  Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/services/firebase';

export default function SignUpScreen() {
  const { signUp, signOut, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password.');
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

    try {
      await signUp(email.trim(), password, role, {
        displayName: fullName.trim() || undefined,
      });
      await signOut();
      Alert.alert('Success', 'Registration successful. Please log in.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch {
      // Error is set in context
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentWrapper}>
            <View style={styles.imageContainer}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.feedbackText}>LETS SHARE FEEDBACK, RESOLVE ISSUES</Text>
            </View>

            <View style={styles.fieldContainer}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={clearError}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.formTitle}>CREATE ACCOUNT</Text>

              <Text style={styles.label}>FULL NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="ENTER YOUR FULL NAME"
                placeholderTextColor="#aaa"
                value={fullName}
                onChangeText={setFullName}
                editable={!isLoading}
              />

              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="ENTER YOUR EMAIL"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />

              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="ENTER YOUR PASSWORD (min 6 characters)"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                editable={!isLoading}
              />

              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="CONFIRM YOUR PASSWORD"
                placeholderTextColor="#aaa"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
                editable={!isLoading}
              />

              <Text style={styles.label}>SELECT ROLE</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'user' && styles.roleOptionSelected]}
                  onPress={() => setRole('user')}
                  disabled={isLoading}
                >
                  <Text style={[styles.roleLabel, role === 'user' && styles.roleLabelSelected]}>User</Text>
                  <Text style={styles.roleDesc}>Can submit complaints and rate courses</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'admin' && styles.roleOptionSelected]}
                  onPress={() => setRole('admin')}
                  disabled={isLoading}
                >
                  <Text style={[styles.roleLabel, role === 'admin' && styles.roleLabelSelected]}>Admin</Text>
                  <Text style={styles.roleDesc}>Can manage complaints, courses, and users</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.formLinks}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Already have an account? Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <View style={styles.buttonWrapper}>
                <Button
                  title="SIGN UP"
                  onPress={handleSignUp}
                  loading={isLoading}
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 48,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 550,
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 180,
    height: 180,
    marginBottom: 10,
  },
  feedbackText: {
    textAlign: 'center',
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  fieldContainer: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 35,
    elevation: 10,
  },
  formTitle: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 30,
    fontSize: 28,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    height: 50,
    marginBottom: 20,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: 'transparent',
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#333',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 25,
    flexWrap: 'wrap',
  },
  roleOption: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#e8f0fe',
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  roleLabelSelected: {
    color: '#667eea',
  },
  roleDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  formLinks: {
    marginBottom: 25,
  },
  link: {
    color: '#667eea',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonWrapper: {
    width: '100%',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#764ba2',
    height: 55,
    borderRadius: 12,
  },
  errorBanner: {
    backgroundColor: '#ff4444',
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
