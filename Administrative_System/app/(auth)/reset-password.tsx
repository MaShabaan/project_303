import React, { useState, useRef } from 'react';
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
  Animated,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordScreen() {
  const { sendPasswordReset, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const cardAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(cardAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
      delay: 100,
    }).start();
  }, []);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      clearError();
      setValidationError('Please enter your email address.');
      return;
    }
    setValidationError('');
    try {
      await sendPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email. Please try again.';
      Alert.alert('Error', message);
    }
  };

  if (submitted) {
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
            <Animated.View style={[styles.contentWrapper, { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
              <View style={styles.logoZone}>
                <Image source={require('@/assets/images/logo.png')} style={styles.logo} resizeMode="contain" />
                <Text style={styles.boxTitle}>University</Text>
                <Text style={styles.boxSubTitle}>Faculty of Science</Text>
              </View>
              <View style={styles.card}>
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>📧</Text>
                  <Text style={styles.successTitle}>Check Your Email</Text>
                  <Text style={styles.successMessage}>
                    We've sent a password reset link to{'\n'}{email}
                  </Text>
                  <Text style={styles.successSubMessage}>
                    Click the link in the email to reset your password.
                  </Text>
                </View>
                <View style={styles.formLinks}>
                  <Link href="/(auth)/login" asChild>
                    <TouchableOpacity>
                      <Text style={styles.link}>Back to Login</Text>
                    </TouchableOpacity>
                  </Link>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
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
          <Animated.View
            style={[
              styles.contentWrapper,
              {
                opacity: cardAnim,
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [40, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoZone}>
              <Image
                source={require('@/assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.boxTitle}>University</Text>
              <Text style={styles.boxSubTitle}>Faculty of Science</Text>
            </View>

            <View style={styles.card}>
              {(error || validationError) ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error || validationError}</Text>
                  <TouchableOpacity onPress={() => { clearError(); setValidationError(''); }}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.resetTitle}>Reset Password</Text>
              <Text style={styles.resetSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, emailFocused && styles.labelFocused]}>EMAIL</Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setValidationError(''); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.formLinks}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Back to Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <TouchableOpacity
                onPress={handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.85}
                style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Sending...' : 'SEND RESET LINK'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  contentWrapper: { width: '100%', maxWidth: 480 },
  logoZone: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 140, height: 140, marginBottom: 16 },
  boxTitle: { color: '#2e7d32', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  boxSubTitle: { color: '#a52a2a', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  resetTitle: { fontSize: 24, fontWeight: '700', color: '#2e7d32', textAlign: 'center', marginBottom: 12 },
  resetSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  labelFocused: { color: '#2e7d32' },
  input: { height: 45, borderWidth: 1, borderColor: '#ced4da', borderRadius: 6, paddingHorizontal: 15, fontSize: 15, color: '#333', backgroundColor: '#fff' },
  inputFocused: { borderWidth: 2, borderColor: '#2e7d32' },
  formLinks: { alignItems: 'center', marginBottom: 24 },
  link: { color: '#a52a2a', fontSize: 15, fontWeight: '700' },
  actionButton: { height: 50, backgroundColor: '#2e7d32', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  actionButtonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  errorBanner: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ffcdd2', padding: 12, borderRadius: 8, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: '#c62828', flex: 1, fontSize: 13, fontWeight: '600' },
  dismissText: { color: '#c62828', fontSize: 16, fontWeight: '700', paddingLeft: 10 },
  successContainer: { alignItems: 'center', marginBottom: 24 },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#2e7d32', marginBottom: 12, textAlign: 'center' },
  successMessage: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 8, lineHeight: 24 },
  successSubMessage: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
});