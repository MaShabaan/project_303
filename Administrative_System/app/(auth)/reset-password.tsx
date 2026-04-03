import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { auth } from '@/services/firebase';
import { confirmPasswordReset } from 'firebase/auth';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams<{ oobCode?: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const cardAnim = useRef(new Animated.Value(0)).current;
  const oobCode = params.oobCode;

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
      setError('Invalid or expired reset link. Please request a new password reset.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSuccess(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const isFocused = (field: string) => focusedField === field;

  // ── Success Screen ──────────────────────────────────────────
  if (success) {
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
            <Text style={styles.successEmoji}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Password Reset!</Text>
          <Text style={styles.successText}>
            Your password has been updated. You can now sign in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.replace('/(auth)/login')}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>SIGN IN</Text>
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
                <Text style={styles.logoIcon}>🔒</Text>
              </LinearGradient>
              <Text style={styles.tagline}>SECURE YOUR ACCOUNT</Text>
            </View>

            {/* Glass Card */}
            <View style={styles.card}>

              {/* Error Banner */}
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={() => setError(null)}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.formTitle}>Set New Password</Text>
              <Text style={styles.formSubtitle}>Enter your new password below</Text>

              {/* No oobCode warning */}
              {!oobCode ? (
                <View style={styles.hintBanner}>
                  <Text style={styles.hintText}>
                    The reset link may have expired. Please go back and request a new one.
                  </Text>
                </View>
              ) : null}

              {/* New Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused('pass') && styles.labelFocused]}>
                  NEW PASSWORD
                </Text>
                <TextInput
                  style={[styles.input, isFocused('pass') && styles.inputFocused]}
                  placeholder="Min 6 characters"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  editable={!isLoading && !!oobCode}
                />
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused('confirm') && styles.labelFocused]}>
                  CONFIRM PASSWORD
                </Text>
                <TextInput
                  style={[styles.input, isFocused('confirm') && styles.inputFocused]}
                  placeholder="Repeat your password"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  editable={!isLoading && !!oobCode}
                />
              </View>

              {/* Reset Button */}
              <TouchableOpacity
                onPress={handleReset}
                disabled={isLoading || !oobCode}
                activeOpacity={0.85}
                style={[
                  styles.actionButton,
                  (isLoading || !oobCode) && styles.actionButtonDisabled,
                ]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? 'Resetting...' : 'RESET PASSWORD'}
                </Text>
              </TouchableOpacity>

              {/* Back Link */}
              <TouchableOpacity
                style={styles.backLinkWrapper}
                onPress={() => router.replace('/(auth)/login')}
              >
                <Text style={styles.link}>← Back to Sign In</Text>
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
  logoIcon: {
    fontSize: 32,
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
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  formSubtitle: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    marginBottom: 28,
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

  // Hint
  hintBanner: {
    backgroundColor: 'rgba(251,191,36,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.25)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  hintText: {
    color: 'rgba(251,191,36,0.8)',
    fontSize: 13,
    lineHeight: 20,
  },

  // Button
  actionButton: {
    height: 54,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },
  actionButtonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Back link
  backLinkWrapper: {
    alignItems: 'center',
    marginTop: 20,
  },
  link: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
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
    lineHeight: 24,
    marginBottom: 40,
  },
});
