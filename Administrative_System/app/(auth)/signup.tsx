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
import { useAuth } from "@/contexts/AuthContext";
import { checkAcademicCodeExists } from "@/services/firebase";

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
  const [academicCode, setAcademicCode] = useState("");
  const [division, setDivision] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState(2);
  const [currentTerm, setCurrentTerm] = useState(1);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);

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

  const validateAcademicCode = (code: string) => {
    if (code.length !== 7) return false;
    if (code[2] !== "2") return false;
    if (code[3] !== "7") return false;
    return true;
  };

  const handleSignUp = async () => {
    clearError();

    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name.");
      return;
    }

    if (!academicCode.trim()) {
      Alert.alert("Error", "Please enter your academic code.");
      return;
    }

    if (!validateAcademicCode(academicCode.trim())) {
      Alert.alert("Error", "Academic code must be 7 digits (3rd digit = 2, 4th digit = 7).");
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

    if (!division) {
      Alert.alert("Required", "Please select your division.");
      return;
    }

    setCheckingCode(true);
    try {
      const codeExists = await checkAcademicCodeExists(academicCode.trim());
      if (codeExists) {
        Alert.alert(
          "Academic Code Already Used",
          "This academic code is already registered. Please contact support if you think this is an error."
        );
        setCheckingCode(false);
        return;
      }
    } catch (e) {
      console.error("Code check error:", e);
    } finally {
      setCheckingCode(false);
    }

    try {
      await signUp(email.trim(), password, "user", {
        displayName: fullName.trim(),
        department: "Mathematics Department",
        division: division ?? undefined,
        academicCode: academicCode.trim(),
        academicYear,
        currentTerm,
      });

      Alert.alert("Success", "Registration successful. Please log in.", [
        { text: "OK", onPress: () => router.replace("/(auth)/login") },
      ]);

      try {
        await signOut();
      } catch (logoutErr) {
        console.warn("Sign out after signup failed", logoutErr);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      Alert.alert("Error", message);
    }
  };

  const isFocused = (field: string) => focusedField === field;
  const isSubmitting = isLoading || checkingCode;

  return (
    <View style={styles.container}>
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
                transform: [
                  {
                    translateY: cardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.logoZone}>
              <Image
                source={require("@/assets/images/logo.png")}
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

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("name") && styles.labelFocused]}>FULL NAME</Text>
                <TextInput
                  style={[styles.input, isFocused("name") && styles.inputFocused]}
                  placeholder="Enter your full name"
                  placeholderTextColor="#aaa"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField("name")}
                  onBlur={() => setFocusedField(null)}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("academic") && styles.labelFocused]}>ACADEMIC CODE</Text>
                <TextInput
                  style={[styles.input, isFocused("academic") && styles.inputFocused]}
                  placeholder="7 digits (format: xx27xxx)"
                  placeholderTextColor="#aaa"
                  value={academicCode}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9]/g, "");
                    if (filtered.length <= 7) setAcademicCode(filtered);
                  }}
                  onFocus={() => setFocusedField("academic")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="numeric"
                  maxLength={7}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("email") && styles.labelFocused]}>EMAIL</Text>
                <TextInput
                  style={[styles.input, isFocused("email") && styles.inputFocused]}
                  placeholder="you@example.com"
                  placeholderTextColor="#aaa"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("pass") && styles.labelFocused]}>PASSWORD</Text>
                <TextInput
                  style={[styles.input, isFocused("pass") && styles.inputFocused]}
                  placeholder="Min 6 characters"
                  placeholderTextColor="#aaa"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("pass")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, isFocused("confirm") && styles.labelFocused]}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={[styles.input, isFocused("confirm") && styles.inputFocused]}
                  placeholder="Repeat your password"
                  placeholderTextColor="#aaa"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField("confirm")}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!isSubmitting}
                />
              </View>

              <View>
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

                <Text style={[styles.label, { marginTop: 12, marginBottom: 8 }]}>SELECT DIVISION</Text>
                <View style={styles.divisionContainer}>
                  {DIVISIONS.map((d) => (
                    <TouchableOpacity
                      key={d.value}
                      style={[styles.divisionOption, division === d.value && styles.divisionOptionSelected]}
                      onPress={() => setDivision(d.value)}
                      disabled={isSubmitting}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.divisionIcon}>{d.icon}</Text>
                      <Text style={[styles.divisionLabel, division === d.value && styles.divisionLabelSelected]}>
                        {d.label}
                      </Text>
                      {division === d.value && <View style={styles.divisionDot} />}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 18, marginBottom: 10 }]}>ACADEMIC YEAR</Text>
                <View style={styles.divisionContainer}>
                  {[2, 3, 4].map((y) => (
                    <TouchableOpacity
                      key={y}
                      style={[
                        styles.divisionOption,
                        academicYear === y && styles.divisionOptionSelected,
                      ]}
                      onPress={() => setAcademicYear(y)}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.divisionLabel,
                          academicYear === y && styles.divisionLabelSelected,
                        ]}
                      >
                        Year {y}
                      </Text>
                      {academicYear === y && <View style={styles.divisionDot} />}
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.label, { marginTop: 18, marginBottom: 10 }]}>CURRENT SEMESTER</Text>
                <View style={styles.divisionContainer}>
                  {[1, 2].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.divisionOption,
                        currentTerm === t && styles.divisionOptionSelected,
                      ]}
                      onPress={() => setCurrentTerm(t)}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.divisionLabel,
                          currentTerm === t && styles.divisionLabelSelected,
                        ]}
                      >
                        Term {t}
                      </Text>
                      {currentTerm === t && <View style={styles.divisionDot} />}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formLinks}>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>Already have an account? Login</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <TouchableOpacity
                onPress={handleSignUp}
                disabled={isSubmitting}
                activeOpacity={0.85}
                style={[styles.actionButton, isSubmitting && styles.actionButtonDisabled]}
              >
                <Text style={styles.buttonText}>
                  {checkingCode ? "Checking code..." : isLoading ? "Creating account..." : "SIGN UP"}
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
  container: { flex: 1, backgroundColor: "#fff" },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 20, justifyContent: "center", alignItems: "center" },
  contentWrapper: { width: "100%", maxWidth: 500 },
  logoZone: { alignItems: "center", marginBottom: 24 },
  logo: { width: 100, height: 100, marginBottom: 8 },
  boxTitle: { color: "#2e7d32", fontSize: 24, fontWeight: "700", marginBottom: 2 },
  boxSubTitle: { color: "#a52a2a", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 28, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, borderWidth: 1, borderColor: "#e0e0e0" },
  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "600", color: "#555", marginBottom: 6, letterSpacing: 0.5 },
  labelFocused: { color: "#2e7d32" },
  input: { height: 44, borderWidth: 1, borderColor: "#ddd", borderRadius: 10, paddingHorizontal: 14, fontSize: 14, color: "#333", backgroundColor: "#fff" },
  inputFocused: { borderWidth: 1.5, borderColor: "#2e7d32", backgroundColor: "#fff" },
  departmentBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#f8f9fa", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#eee" },
  departmentIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: "#e8f5e9", alignItems: "center", justifyContent: "center" },
  departmentIconText: { fontSize: 18 },
  departmentLabel: { fontSize: 10, color: "#888", fontWeight: "600", letterSpacing: 1 },
  departmentName: { fontSize: 13, fontWeight: "700", color: "#2e7d32", marginTop: 2 },
  departmentCheck: { width: 22, height: 22, borderRadius: 11, backgroundColor: "#2e7d32", alignItems: "center", justifyContent: "center" },
  departmentCheckText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  divisionContainer: { flexDirection: "row", gap: 12, marginBottom: 8 },
  divisionOption: { flex: 1, backgroundColor: "#f8f9fa", borderWidth: 1, borderColor: "#ddd", borderRadius: 10, padding: 12, alignItems: "center", position: "relative" },
  divisionOptionSelected: { borderColor: "#2e7d32", backgroundColor: "#e8f5e9" },
  divisionIcon: { fontSize: 22, marginBottom: 6 },
  divisionLabel: { fontSize: 11, fontWeight: "600", color: "#666", textAlign: "center" },
  divisionLabelSelected: { color: "#2e7d32" },
  divisionDot: { position: "absolute", top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: "#2e7d32" },
  formLinks: { marginBottom: 20, alignItems: "center" },
  link: { color: "#a52a2a", fontSize: 13, fontWeight: "700" },
  actionButton: { height: 48, backgroundColor: "#2e7d32", borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 8 },
  actionButtonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 1 },
  errorBanner: { backgroundColor: "#ffebee", borderWidth: 1, borderColor: "#ffcdd2", padding: 12, borderRadius: 10, marginBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  errorText: { color: "#c62828", flex: 1, fontSize: 12, fontWeight: "600" },
  dismissText: { color: "#c62828", fontSize: 14, fontWeight: "700", paddingLeft: 10 },
});