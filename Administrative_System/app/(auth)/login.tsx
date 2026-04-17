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

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, passwordFocused && styles.labelFocused]}>PASSWORD</Text>
                <TextInput
                  style={[styles.input, passwordFocused && styles.inputFocused]}
                  placeholder="Your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setValidationError(''); }}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  secureTextEntry
                  autoComplete="password"
                  editable={!isLoading}
                />
              </View>

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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  contentWrapper: { width: '100%', maxWidth: 480 },
  logoZone: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 140, height: 140, marginBottom: 16 },
  boxTitle: { color: '#2e7d32', fontSize: 28, fontWeight: '700', marginBottom: 4 },
  boxSubTitle: { color: '#a52a2a', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  card: { backgroundColor: '#fff', borderRadius: 8, padding: 40, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  labelFocused: { color: '#2e7d32' },
  input: { height: 45, borderWidth: 1, borderColor: '#ced4da', borderRadius: 6, paddingHorizontal: 15, fontSize: 15, color: '#333', backgroundColor: '#fff' },
  inputFocused: { borderWidth: 2, borderColor: '#2e7d32' },
  formLinks: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 8 },
  link: { color: '#a52a2a', fontSize: 15, fontWeight: '700' },
  actionButton: { height: 50, backgroundColor: '#2e7d32', borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  actionButtonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  errorBanner: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ffcdd2', padding: 12, borderRadius: 8, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { color: '#c62828', flex: 1, fontSize: 13, fontWeight: '600' },
  dismissText: { color: '#c62828', fontSize: 16, fontWeight: '700', paddingLeft: 10 },
});