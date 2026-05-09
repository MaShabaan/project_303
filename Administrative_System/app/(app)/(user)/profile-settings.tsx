import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc, Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { useAppTheme } from "@/contexts/AppThemeContext";
import {
  db,
  COLLECTIONS,
  type UserProfile,
  uploadProfilePhoto,
} from "@/services/firebase";

function getAvatarColor(email: string | null | undefined): string {
  const colors = ["#7c3aed", "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#06b6d4"];
  if (!email) return colors[0];
  const hash = email.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

function getDivisionLabel(division: string | null | undefined): string {
  if (division === "computer_science") return "Computer Science 💻";
  if (division === "special_mathematics") return "Special Mathematics 📐";
  return "—";
}

function formatError(e: unknown): string {
  if (e && typeof e === "object" && "code" in e && "message" in e) {
    return String((e as { message?: string }).message);
  }
  if (e instanceof Error) return e.message;
  return String(e);
}

export default function ProfileSettingsScreen() {
  const { user, profile } = useAuth();
  const { isDark, toggleTheme, colors } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userData, setUserData] = useState<UserProfile | null>(null);
  /** Local preview only; uploaded on Save (same data flow as web: persist on explicit save). */
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);

  const loadUserData = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
      if (!userDoc.exists()) {
        Alert.alert("Error", "Profile document not found.");
        setUserData(null);
        return;
      }
      const data = userDoc.data() as UserProfile;
      setUserData(data);
      setDisplayName(
        data.displayName || data.fullName || user.email?.split("@")[0] || "",
      );
    } catch (e) {
      console.error("profile load:", e);
      Alert.alert("Error", `Could not load profile: ${formatError(e)}`);
    } finally {
      setLoading(false);
    }
  }, [user?.uid, user?.email]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to choose a profile picture.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;
    setPendingPhotoUri(result.assets[0].uri);
  };

  const clearPendingPhoto = () => setPendingPhotoUri(null);

  const handleSave = async () => {
    if (!user?.uid) return;
    if (!displayName.trim()) {
      Alert.alert("Validation", "Please enter a display name");
      return;
    }
    setSaving(true);
    try {
      let photoURL = userData?.photoURL ?? null;

      if (pendingPhotoUri) {
        photoURL = await uploadProfilePhoto(user.uid, pendingPhotoUri);
      }

      const payload: Record<string, unknown> = {
        displayName: displayName.trim(),
        updatedAt: Timestamp.now(),
      };
      if (photoURL) {
        payload.photoURL = photoURL;
      }

      await updateDoc(doc(db, COLLECTIONS.USERS, user.uid), payload);

      setPendingPhotoUri(null);
      await loadUserData();

      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error("profile save:", e);
      Alert.alert("Error", formatError(e) || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel =
    userData?.role === "admin"
      ? "Administrator"
      : userData?.role === "super_admin"
        ? "Super Admin"
        : "Student";

  const avatarLetter = (displayName || user?.email || "U").charAt(0).toUpperCase();
  const remotePhotoURL = userData?.photoURL ?? profile?.photoURL;
  const previewUri = pendingPhotoUri || remotePhotoURL;

  const themed = useMemo(
    () =>
      StyleSheet.create({
        page: { flex: 1, backgroundColor: colors.background },
        centered: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        },
        loadingText: { marginTop: 12, color: colors.textSecondary, fontSize: 14 },
        topbar: {
          paddingTop: 52,
          paddingBottom: 14,
          paddingHorizontal: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        backBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: colors.accentMuted,
          alignItems: "center",
          justifyContent: "center",
        },
        topbarTitle: { fontSize: 17, fontWeight: "800", color: colors.text },
        body: { padding: 16, paddingBottom: 40 },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: colors.border,
        },
        avatarRow: { alignItems: "center", marginBottom: 20 },
        avatarImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceMuted },
        avatarPlaceholder: {
          width: 96,
          height: 96,
          borderRadius: 48,
          alignItems: "center",
          justifyContent: "center",
        },
        avatarLetter: { fontSize: 40, fontWeight: "800", color: "#fff" },
        photoActions: { flexDirection: "row", gap: 10, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
        photoBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 14,
          borderRadius: 12,
          backgroundColor: colors.accentMuted,
          borderWidth: 1,
          borderColor: colors.border,
        },
        photoBtnText: { fontSize: 13, fontWeight: "700", color: colors.accent },
        pendingHint: { marginTop: 8, fontSize: 12, color: colors.accent, fontWeight: "600" },
        label: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.textSecondary,
          marginBottom: 6,
          marginTop: 12,
        },
        input: {
          borderWidth: 1,
          borderColor: colors.inputBorder,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: colors.text,
          backgroundColor: colors.inputBg,
        },
        inputDisabled: { backgroundColor: colors.surfaceMuted, color: colors.textSecondary },
        themeRow: {
          marginTop: 20,
          padding: 14,
          borderRadius: 14,
          backgroundColor: colors.surfaceMuted,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        },
        themeInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
        themeIcon: { fontSize: 18 },
        themeLabel: { fontSize: 14, fontWeight: "700", color: colors.text },
        themeToggle: {
          backgroundColor: colors.accent,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
        },
        themeToggleText: { color: "#fff", fontSize: 12, fontWeight: "700" },
        saveBtn: {
          marginTop: 22,
          backgroundColor: isDark ? colors.accent : "#1e1b4b",
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: "center",
        },
        saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "800" },
      }),
    [colors, isDark],
  );

  if (loading) {
    return (
      <View style={themed.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={themed.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={themed.page}>
      <View style={themed.topbar}>
        <TouchableOpacity style={themed.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={themed.topbarTitle}>⚙️ Profile Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={themed.body} keyboardShouldPersistTaps="handled">
        <View style={themed.card}>
          <View style={themed.avatarRow}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={themed.avatarImg} contentFit="cover" />
            ) : (
              <View style={[themed.avatarPlaceholder, { backgroundColor: getAvatarColor(user?.email) }]}>
                <Text style={themed.avatarLetter}>{avatarLetter}</Text>
              </View>
            )}
            <View style={themed.photoActions}>
              <TouchableOpacity style={themed.photoBtn} onPress={pickPhoto}>
                <Ionicons name="image-outline" size={18} color={colors.accent} />
                <Text style={themed.photoBtnText}>Choose photo</Text>
              </TouchableOpacity>
              {pendingPhotoUri ? (
                <TouchableOpacity style={themed.photoBtn} onPress={clearPendingPhoto}>
                  <Ionicons name="close-circle-outline" size={18} color={colors.accent} />
                  <Text style={themed.photoBtnText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            {pendingPhotoUri ? (
              <Text style={themed.pendingHint}>New photo — tap Save to upload</Text>
            ) : null}
          </View>

          <Text style={themed.label}>Display Name</Text>
          <TextInput
            style={themed.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            placeholderTextColor={colors.textSecondary}
          />

          <Text style={themed.label}>Email</Text>
          <TextInput
            style={[themed.input, themed.inputDisabled]}
            value={user?.email || ""}
            editable={false}
          />

          <Text style={themed.label}>Role</Text>
          <TextInput style={[themed.input, themed.inputDisabled]} value={roleLabel} editable={false} />

          {userData?.role === "user" && userData?.academicCode ? (
            <>
              <Text style={themed.label}>Academic Code</Text>
              <TextInput
                style={[themed.input, themed.inputDisabled]}
                value={String(userData.academicCode)}
                editable={false}
              />
            </>
          ) : null}

          {userData?.role === "user" ? (
            <>
              <Text style={themed.label}>Division</Text>
              <TextInput
                style={[themed.input, themed.inputDisabled]}
                value={getDivisionLabel(userData?.division)}
                editable={false}
              />
            </>
          ) : null}

          {userData?.role === "user" && userData?.academicYear != null ? (
            <>
              <Text style={themed.label}>Academic Year</Text>
              <TextInput
                style={[themed.input, themed.inputDisabled]}
                value={`Year ${userData.academicYear}`}
                editable={false}
              />
            </>
          ) : null}

          {userData?.role === "user" && userData?.currentTerm != null ? (
            <>
              <Text style={themed.label}>Current Term</Text>
              <TextInput
                style={[themed.input, themed.inputDisabled]}
                value={`Term ${userData.currentTerm}`}
                editable={false}
              />
            </>
          ) : null}

          <View style={themed.themeRow}>
            <View style={themed.themeInfo}>
              <Text style={themed.themeIcon}>{isDark ? "🌙" : "☀️"}</Text>
              <Text style={themed.themeLabel}>{isDark ? "Dark Mode" : "Light Mode"}</Text>
            </View>
            <TouchableOpacity style={themed.themeToggle} onPress={toggleTheme} activeOpacity={0.85}>
              <Text style={themed.themeToggleText}>{isDark ? "Switch to Light" : "Switch to Dark"}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={themed.saveBtn}
            onPress={() => {
              void handleSave();
            }}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={themed.saveBtnText}>💾 Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
