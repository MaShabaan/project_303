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
  Animated,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Floating Orbs */}
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
              {(error || validationError) ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error || validationError}</Text>
                  <TouchableOpacity onPress={() => { clearError(); setValidationError(''); }}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.formTitle}>Welcome back</Text>

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
                  onChangeText={(t) => { setEmail(t); setValidationError(''); }}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              {/* Password Field */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, passwordFocused && styles.labelFocused]}>
                  PASSWORD
                </Text>
                <TextInput
                  style={[styles.input, passwordFocused && styles.inputFocused]}
                  placeholder="Your password"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setValidationError(''); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                  autoComplete="password"
                  editable={!isLoading}
                />
              </View>

              {/* Links */}
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

              {/* Login Button — no LinearGradient needed */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
                style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Signing in...' : 'LOGIN'}
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
  keyboardView: {
    flex: 1,
  },
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
    backgroundColor: '#4f46e5',
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
  },

  formTitle: {
    textAlign: 'center',
    color: '#fff',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 28,
    letterSpacing: 0.5,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 8,
  },
  link: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },

  // Button — solid color بدل LinearGradient
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
});
