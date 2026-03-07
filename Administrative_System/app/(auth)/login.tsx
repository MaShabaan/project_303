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
} from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      clearError();
      setValidationError('Please fill in all fields.');
      return;
    }
    setValidationError('');
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)');
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
              {(error || validationError) ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error || validationError}</Text>
                  <TouchableOpacity onPress={() => { clearError(); setValidationError(''); }}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.formTitle}>LOGIN</Text>

              <Text style={styles.label}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="ENTER YOUR EMAIL"
                placeholderTextColor="#aaa"
                value={email}
                onChangeText={(t) => { setEmail(t); setValidationError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!isLoading}
              />

              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={styles.input}
                placeholder="ENTER YOUR PASSWORD"
                placeholderTextColor="#aaa"
                value={password}
                onChangeText={(t) => { setPassword(t); setValidationError(''); }}
                secureTextEntry
                autoComplete="password"
                editable={!isLoading}
              />

              <View style={styles.formLinks}>
                <Link href="/(auth)/signup" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Create New Account</Text>
                  </TouchableOpacity>
                </Link>
                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Forgot Password?</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <View style={styles.buttonWrapper}>
                <Button
                  title="LOGIN"
                  onPress={handleLogin}
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
    backgroundColor: '#ffffffe6',
  },
  keyboardView: {
    flex: 1,
  },
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
    color: '#080808',
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
  formLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
    flexWrap: 'wrap',
    gap: 8,
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
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
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
