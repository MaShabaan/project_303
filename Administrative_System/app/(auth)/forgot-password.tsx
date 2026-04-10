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
  const [sent, setSent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);

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

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email.');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch {}
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.successWrapper}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.successLogo}
            resizeMode="contain"
          />
          <Text style={styles.boxTitle}>University</Text>
          <Text style={styles.boxSubTitle}>Faculty of Science</Text>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>📧</Text>
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successText}>
            We've sent a password reset link to{'\n'}
            <Text style={styles.successEmail}>{email}</Text>
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>BACK TO SIGN IN</Text>
          </TouchableOpacity>
        </View>
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
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={clearError}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.resetTitle}>Reset Password</Text>

              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                  Enter your email and we'll send you a link to reset your password.
                </Text>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, emailFocused && styles.labelFocused]}>EMAIL</Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
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
                    <Text style={styles.link}>← Back to Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <TouchableOpacity
                onPress={handleReset}
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
  boxTitle: { color: '#2e7d32', fontSize: 28, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  boxSubTitle: { color: '#a52a2a', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  resetTitle: { fontSize: 24, fontWeight: '700', color: '#2e7d32', textAlign: 'center', marginBottom: 12 },
  infoBanner: { backgroundColor: '#e8f5e9', borderRadius: 8, padding: 14, marginBottom: 24 },
  infoText: { color: '#2e7d32', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  labelFocused: { color: '#2e7d32' },
  input: { height: 45, borderWidth: 1, borderColor: '#ced4da', borderRadius: 6, paddingHorizontal: 15, fontSize: 15, color: '#333', backgroundColor: '#fff' },
  inputFocused: { borderWidth: 2, borderColor: '#2e7d32' },
  formLinks: { marginBottom: 24 },
  link: { color: '#a52a2a', fontSize: 15, fontWeight: '700' },
  actionButton: { height: 50, backgroundColor: '#2e7d32', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  actionButtonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  errorBanner: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ffcdd2', padding: 12, borderRadius: 8, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: '#c62828', flex: 1, fontSize: 13, fontWeight: '600' },
  dismissText: { color: '#c62828', fontSize: 16, fontWeight: '700', paddingLeft: 10 },
  successWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successLogo: { width: 100, height: 100, marginBottom: 16 },
  successIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#e8f5e9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  successEmoji: { fontSize: 32 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#2e7d32', marginBottom: 16, textAlign: 'center' },
  successText: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 26, marginBottom: 40 },
  successEmail: { color: '#2e7d32', fontWeight: '700' },
});