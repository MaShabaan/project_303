import React, { useState, useRef } from "react";
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
} from "react-native";
import { Link, router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/services/firebase";

const DIVISIONS = [
  { value: "computer_science", label: "Computer Science", icon: "💻" },
  { value: "special_mathematics", label: "Special Mathematics", icon: "📐" },
];

export default function SignUpScreen() {
  const { signUp, signOut, isLoading, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [division, setDivision] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

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

  const handleSignUp = async () => {
    clearError();

    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name.");
      return;
    }

    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (role === "user" && !division) {
      Alert.alert("Required", "Please select your division.");
      return;
    }

    try {
      await signUp(email.trim(), password, role, {
        displayName: fullName.trim(),
        department: role === "user" ? "Mathematics Department" : undefined,
        division: role === "user" ? division ?? undefined : undefined,
      });

      if (role === "admin") {
        Alert.alert(
          "Account Pending Approval",
          "Your admin account is pending approval. You will be notified once approved.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      } else {
        Alert.alert("Success", "Registration successful. Please log in.", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
      }

      try {
        await signOut();
      } catch (logoutErr) {
        console.warn("Sign out after signup failed", logoutErr);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed. Please try again.";
      Alert.alert("Error", message);
    }
  };

  const isFocused = (field: string) => focusedField === field;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#0f0c29", "#302b63", "#24243e"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
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
                transform: [{
                  translateY: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                }],
              },
            ]}
          >
            {/* Logo */}
            <View style={styles.logoZone}>
              <LinearGradient
                colors={["#7c3aed", "#06b6d4"]}
                style={styles.logoCircle}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image
                  source={require("@/assets/images/logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </LinearGradient>
              <Text style={styles.tagline}>LETS SHARE FEEDBACK · RESOLVE ISSUES</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              {error ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{error}</Text>
                  <TouchableOpacity onPress={clearError}>
                    <Text style={styles.dismissText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={styles.formTitle}>Create Account</Text>

              {/* Full Name */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("name") && styles.labelFocused]}>FULL NAME</Text>
                <TextInput
                  style={[styles.input, isFocused("name") && styles.inputFocused]}
                  placeholder="Enter your full name"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  editable={!isLoading}
                />
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("email") && styles.labelFocused]}>EMAIL</Text>
                <TextInput
                  style={[styles.input, isFocused("email") && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("pass") && styles.labelFocused]}>PASSWORD</Text>
                <TextInput
                  style={[styles.input, isFocused("pass") && styles.inputFocused]}
                  placeholder="Min 6 characters"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("pass")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!isLoading}
                />
              </View>

              {/* Confirm Password */}
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("confirm") && styles.labelFocused]}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={[styles.input, isFocused("confirm") && styles.inputFocused]}
                  placeholder="Repeat your password"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!isLoading}
                />
              </View>

              {/* Role */}
              <Text style={styles.label}>SELECT ROLE</Text>
              <View style={styles.roleContainer}>
                <TouchableOpacity
                  style={[styles.roleOption, role === "user" && styles.roleOptionSelected]}
                  onPress={() => setRole("user")}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleLabel, role === "user" && styles.roleLabelSelected]}>User</Text>
                  <Text style={styles.roleDesc}>Submit complaints & rate courses</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, role === "admin" && styles.roleOptionSelected]}
                  onPress={() => { setRole("admin"); setDivision(null); }}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.roleLabel, role === "admin" && styles.roleLabelSelected]}>Admin</Text>
                  <Text style={styles.roleDesc}>Manage complaints & users</Text>
                </TouchableOpacity>
              </View>

              {/* Department + Division — User only */}
              {role === "user" && (
                <View>
                  {/* Department — fixed */}
                  <View style={styles.departmentBanner}>
                    <View style={styles.departmentIcon}>
                      <Text style={styles.departmentIconText}>🎓</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.departmentLabel}>DEPARTMENT</Text>
                      <Text style={styles.departmentName}>Mathematics Department</Text>
                    </View>
                    <View style={styles.departmentCheck}>
                      <Text style={styles.departmentCheckText}>✓</Text>
                    </View>
                  </View>

                  {/* Division */}
                  <Text style={[styles.label, { marginTop: 18, marginBottom: 10 }]}>SELECT DIVISION</Text>
                  <View style={styles.divisionContainer}>
                    {DIVISIONS.map((d) => (
                      <TouchableOpacity
                        key={d.value}
                        style={[
                          styles.divisionOption,
                          division === d.value && styles.divisionOptionSelected,
                        ]}
                        onPress={() => setDivision(d.value)}
                        disabled={isLoading}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.divisionIcon}>{d.icon}</Text>
                        <Text style={[
                          styles.divisionLabel,
                          division === d.value && styles.divisionLabelSelected,
                        ]}>
                          {d.label}
                        </Text>
                        {division === d.value && (
                          <View style={styles.divisionDot} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Login Link */}
              <View style={styles.formLinks}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Already have an account? Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                onPress={handleSignUp}
                disabled={isLoading}
                activeOpacity={0.85}
                style={[styles.actionButton, isLoading && styles.actionButtonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {isLoading ? "Creating account..." : "SIGN UP"}
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
  container: { flex: 1, backgroundColor: "#0f0c29" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, paddingTop: 60, alignItems: "center" },
  contentWrapper: { width: "100%", maxWidth: 420 },

  orb: { position: "absolute", borderRadius: 999, opacity: 0.18 },
  orb1: { width: 280, height: 280, backgroundColor: "#7c3aed", top: -80, left: -80 },
  orb2: { width: 220, height: 220, backgroundColor: "#06b6d4", bottom: 40, right: -60 },

  logoZone: { alignItems: "center", marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 22,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
    shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5, shadowRadius: 20, elevation: 12,
  },
  logo: { width: 48, height: 48 },
  tagline: { fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 2.5, fontWeight: "600" },

  card: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 24, padding: 32,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    marginBottom: 40,
  },
  formTitle: {
    textAlign: "center", color: "#fff", fontSize: 26,
    fontWeight: "700", marginBottom: 28, letterSpacing: 0.5,
  },

  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: "700", letterSpacing: 2.5, marginBottom: 8 },
  labelFocused: { color: "#a78bfa" },
  input: {
    height: 52, borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 18, fontSize: 15, color: "#fff",
  },
  inputFocused: {
    borderColor: "#7c3aed", backgroundColor: "rgba(255,255,255,0.1)",
    shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },

  roleContainer: { flexDirection: "row", gap: 12, marginBottom: 24, marginTop: 8 },
  roleOption: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14, padding: 16, alignItems: "center",
  },
  roleOptionSelected: { borderColor: "#7c3aed", backgroundColor: "rgba(124,58,237,0.15)" },
  roleLabel: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.5)", marginBottom: 4 },
  roleLabelSelected: { color: "#a78bfa" },
  roleDesc: { fontSize: 11, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 16 },

  departmentBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: "rgba(124,58,237,0.12)",
    borderWidth: 1, borderColor: "rgba(124,58,237,0.3)",
    borderRadius: 14, padding: 14,
  },
  departmentIcon: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(124,58,237,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  departmentIconText: { fontSize: 18 },
  departmentLabel: { fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: "700", letterSpacing: 1.5 },
  departmentName: { fontSize: 14, fontWeight: "700", color: "#a78bfa", marginTop: 2 },
  departmentCheck: {
    width: 24, height: 24, borderRadius: 99,
    backgroundColor: "rgba(124,58,237,0.3)",
    alignItems: "center", justifyContent: "center",
  },
  departmentCheckText: { fontSize: 12, color: "#a78bfa", fontWeight: "700" },

  divisionContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
  divisionOption: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 14, padding: 16, alignItems: "center",
    position: "relative",
  },
  divisionOptionSelected: { borderColor: "#06b6d4", backgroundColor: "rgba(6,182,212,0.12)" },
  divisionIcon: { fontSize: 24, marginBottom: 8 },
  divisionLabel: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 16 },
  divisionLabelSelected: { color: "#67e8f9" },
  divisionDot: {
    position: "absolute", top: 10, right: 10,
    width: 8, height: 8, borderRadius: 99, backgroundColor: "#06b6d4",
  },

  formLinks: { marginBottom: 24 },
  link: { color: "#a78bfa", fontSize: 13, fontWeight: "600" },

  actionButton: {
    height: 54, borderRadius: 14, backgroundColor: "#7c3aed",
    alignItems: "center", justifyContent: "center",
    shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 8,
  },
  actionButtonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 2 },

  errorBanner: {
    backgroundColor: "rgba(239,68,68,0.15)",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.35)",
    padding: 14, borderRadius: 14, marginBottom: 20,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
  },
  errorText: { color: "#fca5a5", flex: 1, fontSize: 13, fontWeight: "600" },
  dismissText: { color: "#fca5a5", fontSize: 14, paddingLeft: 10 },
});