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
import { LinearGradient } from 'expo-linear-gradient';
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

  // ── Success Screen ──────────────────────────────────────────
  if (sent) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />

        <View style={styles.successWrapper}>
          <View style={styles.successIcon}>
            <Text style={styles.successEmoji}>✉</Text>
          </View>
          <Text style={styles.successTitle}>Check Your Email</Text>
          <Text style={styles.successText}>
            We&apos;ve sent a password reset link to{'\n'}
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

  // ── Main Screen ─────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

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
            {/* Logo Zone */}
            <View style={styles.logoZone}>
              <LinearGradient
                colors={['#7c3aed', '#06b6d4']}
                style={styles.logoCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require('@/assets/images/logo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </LinearGradient>
              <Text style={styles.tagline}>LETS SHARE FEEDBACK · RESOLVE ISSUES</Text>
            </View>

            {/* Glass Card */}
            <View style={styles.card}>

              {/* Error Banner */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={clearError}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.formTitle}>Reset Password</Text>

              <View style={styles.infoBanner}>
                <Text style={styles.infoText}>
                  Enter your email and we&apos;ll send you a link to reset your password.
                </Text>
              </View>

              {/* Email Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, emailFocused && styles.labelFocused]}>
                  EMAIL
                </Text>
                <TextInput
                  style={[styles.input, emailFocused && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
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

              {/* Back Link */}
              <View style={styles.formLinks}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>← Back to Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {/* Send Button */}
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
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 420,
  },

  // Orbs
  orb: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.18,
  },
  orb1: {
    width: 280,
    height: 280,
    backgroundColor: '#7c3aed',
    top: -80,
    left: -80,
  },
  orb2: {
    width: 220,
    height: 220,
    backgroundColor: '#06b6d4',
    bottom: 40,
    right: -60,
  },

  // Logo
  logoZone: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 12,
  },
  logo: {
    width: 48,
    height: 48,
  },
  tagline: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 2.5,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 24,
    padding: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 40,
  },

  formTitle: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },

  // Info banner
  infoBanner: {
    backgroundColor: 'rgba(167,139,250,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.2)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  infoText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },

  // Fields
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '700',
    letterSpacing: 2.5,
    marginBottom: 8,
  },
  labelFocused: {
    color: '#a78bfa',
  },
  input: {
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18,
    fontSize: 15,
    color: '#fff',
  },
  inputFocused: {
    borderColor: '#7c3aed',
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // Links
  formLinks: {
    marginBottom: 24,
  },
  link: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },

  // Button
  actionButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Error
  errorBanner: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#fca5a5',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  dismissText: {
    color: '#fca5a5',
    fontSize: 14,
    paddingLeft: 10,
  },

  // Success
  successWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 2,
    borderColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successEmoji: {
    fontSize: 32,
    color: '#a78bfa',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  successText: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
  },
  successEmail: {
    color: '#a78bfa',
    fontWeight: '700',
  },
});
