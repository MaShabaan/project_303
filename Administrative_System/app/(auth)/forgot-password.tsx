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
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const { sendPasswordReset, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch {
      // Error is set in context
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.contentWrapper}>
            <View style={styles.fieldContainer}>
              <Text style={styles.formTitle}>Check Your Email</Text>
              <Text style={styles.infoText}>
                We've sent a password reset link to {email}
              </Text>
              <View style={styles.buttonWrapper}>
                <Link href="/(auth)/login" asChild>
                  <Button title="Back to Sign In" style={styles.actionButton} />
                </Link>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

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

              <Text style={styles.formTitle}>RESET PASSWORD</Text>
              <Text style={styles.infoText}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

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

              <View style={styles.formLinks}>
             <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Back to Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <View style={styles.buttonWrapper}>
                <Button
                  title="SEND RESET LINK"
                  onPress={handleReset}
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
  infoText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 25,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 12,
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
