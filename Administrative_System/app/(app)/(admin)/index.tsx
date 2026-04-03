import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { router } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import { db, COLLECTIONS } from "@/services/firebase";
import { Ionicons } from "@expo/vector-icons";

const ACCENT = "#764ba2";
const ACCENT_LIGHT = "#667eea";

type StatKey = "users" | "admins" | "complaints" | "courses";

export default function AdminDashboardScreen() {
  const { user, profile, signOut } = useAuth();
  const [stats, setStats] = useState<Record<StatKey, number>>({
    users: 0,
    admins: 0,
    complaints: 0,
    courses: 0,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const statsReady = useRef(0);

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const displayName =
    profile?.displayName || user?.email?.split("@")[0] || "Admin";

  const SUPER_ADMINS = ["mshabaan295@gmail.com", "hoda17753@gmail.com"];
  const isSuperAdmin = SUPER_ADMINS.includes(profile?.email || "");

  useEffect(() => {
    statsReady.current = 0;
    setStatsLoading(true);

    const markReady = () => {
      statsReady.current += 1;
      if (statsReady.current >= 3) setStatsLoading(false);
    };

    const unsubUsers = onSnapshot(
      collection(db, COLLECTIONS.USERS),
      (snap) => {
        let regular = 0;
        let admins = 0;
        snap.forEach((d) => {
          const role = d.data()?.role;
          if (role === "admin") admins += 1;
          else regular += 1;
        });
        setStats((s) => ({ ...s, users: regular, admins }));
        markReady();
      },
      () => markReady(),
    );

    const unsubComplaints = onSnapshot(
      collection(db, COLLECTIONS.TICKETS),
      (snap) => {
        setStats((s) => ({ ...s, complaints: snap.size }));
        markReady();
      },
      () => markReady(),
    );

    const unsubCourses = onSnapshot(
      collection(db, COLLECTIONS.COURSES),
      (snap) => {
        setStats((s) => ({ ...s, courses: snap.size }));
        markReady();
      },
      () => markReady(),
    );

    return () => {
      unsubUsers();
      unsubComplaints();
      unsubCourses();
    };
  }, []);

  const handleApprovalsPress = () => {
    router.push("./approvals");
  };

  const actionCards = [
    {
      icon: "chatbubbles-outline" as const,
      title: "Manage Complaints",
      subtitle: "Review and respond to user complaints",
      onPress: () => router.push("./complaints"),
    },
    {
      icon: "library-outline" as const,
      title: "Manage Courses",
      subtitle: "Add, edit, and organize courses",
      onPress: () =>
        Alert.alert(
          "Coming Soon",
          "Course management will be available in a future update.",
        ),
    },
    {
      icon: "people-outline" as const,
      title: "Manage Users",
      subtitle: "View and manage user accounts",
      onPress: () => router.push("./users"),
    },
    {
      icon: "star-outline" as const,
      title: "Course Ratings",
      subtitle: "Browse feedback and course ratings",
      onPress: () => router.push("./feedback"),
    },
  ];

  const statItems: { key: StatKey; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string }[] = [
    { key: "users", label: "Users", icon: "person-outline", tint: "#3b82f6" },
    { key: "admins", label: "Admins", icon: "shield-checkmark-outline", tint: ACCENT },
    { key: "complaints", label: "Complaints", icon: "document-text-outline", tint: "#f59e0b" },
    { key: "courses", label: "Courses", icon: "school-outline", tint: "#10b981" },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardCard}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.title}>Welcome, {displayName}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>ADMIN</Text>
            </View>
            {isSuperAdmin && (
              <View style={styles.superAdminBadge}>
                <Text style={styles.superAdminText}>SUPER ADMIN</Text>
              </View>
            )}
          </View>

          <View style={styles.statsSection}>
            <Text style={styles.sectionLabel}>Overview</Text>
            {statsLoading ? (
              <View style={styles.statsLoading}>
                <ActivityIndicator size="small" color={ACCENT} />
                <Text style={styles.statsLoadingText}>Loading stats…</Text>
              </View>
            ) : (
              <View style={styles.statsRow}>
                {statItems.map((item) => (
                  <View key={item.key} style={styles.statCard}>
                    <View style={[styles.statIconWrap, { backgroundColor: `${item.tint}18` }]}>
                      <Ionicons name={item.icon} size={22} color={item.tint} />
                    </View>
                    <Text style={styles.statValue}>{stats[item.key]}</Text>
                    <Text style={styles.statLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.approvalsCard}
              onPress={handleApprovalsPress}
              activeOpacity={0.85}
            >
              <View style={styles.approvalsCardContent}>
                <View style={styles.approvalsIconContainer}>
                  <Ionicons name="hourglass-outline" size={26} color="#fff" />
                </View>
                <View style={styles.approvalsTextContainer}>
                  <Text style={styles.approvalsTitle}>Pending Admin Approvals</Text>
                  <Text style={styles.approvalsSubtitle}>
                    Approve or reject new admin registrations
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={22} color={ACCENT} />
              </View>
            </TouchableOpacity>
          )}

          <Text style={[styles.sectionLabel, { marginTop: 8 }]}>Quick actions</Text>
          <View style={styles.cardsGrid}>
            {actionCards.map((item) => (
              <TouchableOpacity
                key={item.title}
                style={styles.actionCard}
                activeOpacity={0.88}
                onPress={item.onPress}
              >
                <View style={styles.actionIconCircle}>
                  <Ionicons name={item.icon} size={26} color={ACCENT} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>
              <Text style={styles.bold}>Email:</Text> {user?.email ?? "—"}
            </Text>
            <Text style={styles.userInfoText}>
              <Text style={styles.bold}>Account Type:</Text>{" "}
              {isSuperAdmin ? "Super Administrator" : "Administrator"}
            </Text>
          </View>

          <View style={styles.logoutWrapper}>
            <Button
              title="LOGOUT"
              onPress={handleLogout}
              style={styles.logoutButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ACCENT_LIGHT,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
    alignItems: "center",
  },
  dashboardCard: {
    width: "100%",
    maxWidth: 800,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 28,
    elevation: 10,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: ACCENT,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 8,
  },
  roleText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  superAdminBadge: {
    backgroundColor: "#fbbf24",
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  superAdminText: {
    color: "#1f2937",
    fontSize: 13,
    fontWeight: "700",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  statsSection: {
    marginBottom: 20,
  },
  statsLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  statsLoadingText: {
    fontSize: 14,
    color: "#64748b",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  statCard: {
    width: "47%",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 2,
  },
  approvalsCard: {
    backgroundColor: "#eef2ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: "#c7d2fe",
  },
  approvalsCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  approvalsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: ACCENT,
    justifyContent: "center",
    alignItems: "center",
  },
  approvalsTextContainer: {
    flex: 1,
  },
  approvalsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  approvalsSubtitle: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 18,
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 24,
    justifyContent: "space-between",
  },
  actionCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fafafa",
    borderRadius: 16,
    padding: 18,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 17,
  },
  userInfo: {
    backgroundColor: "#f0f4ff",
    padding: 16,
    borderRadius: 14,
    marginTop: 4,
  },
  userInfoText: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 6,
  },
  bold: {
    fontWeight: "700",
  },
  logoutButton: {
    backgroundColor: ACCENT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutWrapper: {
    marginTop: 24,
    alignSelf: "center",
    width: "auto",
  },
});
