import React from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { router } from "expo-router";

export default function AdminDashboardScreen() {
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  const displayName =
    profile?.displayName || user?.email?.split("@")[0] || "Admin";

  const SUPER_ADMINS = ["mshabaan295@gmail.com", "hoda17753@gmail.com"];
  const isSuperAdmin = SUPER_ADMINS.includes(profile?.email || "");

  const handleApprovalsPress = () => {
    router.push("./approvals");
  };

  const cards = [
    {
      icon: "📋",
      title: "Manage Complaints",
      subtitle: "View and resolve user complaints",
      route: "/complaints",
    },
    {
      icon: "📚",
      title: "Manage Courses",
      subtitle: "Add, edit, and manage courses",
      route: "/courses",
    },
    {
      icon: "👥",
      title: "Manage Users",
      subtitle: "View and manage user accounts",
      route: "/users",
    },
    {
      icon: "📊",
      title: "View Reports",
      subtitle: "Activity logs and analytics",
      route: "/reports",
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardCard}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.title}>Welcome Mr. {displayName}!</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>ADMIN</Text>
            </View>
            {isSuperAdmin && (
              <View style={styles.superAdminBadge}>
                <Text style={styles.superAdminText}>SUPER ADMIN</Text>
              </View>
            )}
          </View>

          {isSuperAdmin && (
            <TouchableOpacity
              style={styles.approvalsCard}
              onPress={handleApprovalsPress}
              activeOpacity={0.8}
            >
              <View style={styles.approvalsCardContent}>
                <View style={styles.approvalsIconContainer}>
                  <Text style={styles.approvalsIcon}>⏳</Text>
                </View>
                <View style={styles.approvalsTextContainer}>
                  <Text style={styles.approvalsTitle}>
                    Pending Admin Approvals
                  </Text>
                  <Text style={styles.approvalsSubtitle}>
                    Approve or reject new admin registrations
                  </Text>
                </View>
                <View style={styles.approvalsArrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}

          <View style={styles.cardsGrid}>
            {cards.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                activeOpacity={0.8}
                onPress={() => {
                  if (item.route === "/users") {
                    router.push("./users");
                  } else {
                    Alert.alert(
                      "Coming Soon",
                      `${item.title} page coming soon!`,
                    );
                  }
                }}
              >
                <Text style={styles.cardIcon}>{item.icon}</Text>
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
    backgroundColor: "#667eea",
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
    padding: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 35,
    elevation: 10,
  },
  welcomeHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 10,
  },
  roleBadge: {
    backgroundColor: "#764ba2",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginBottom: 10,
  },
  roleText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  superAdminBadge: {
    backgroundColor: "#ffc107",
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  superAdminText: {
    color: "#000",
    fontSize: 14,
    fontWeight: "600",
  },
  approvalsCard: {
    backgroundColor: "#e8f0fe",
    borderRadius: 15,
    padding: 20,
    marginBottom: 30,
    borderWidth: 2,
    borderColor: "#764ba2",
    borderStyle: "dashed",
  },
  approvalsCardContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
  },
  approvalsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#764ba2",
    justifyContent: "center",
    alignItems: "center",
  },
  approvalsIcon: {
    fontSize: 24,
  },
  approvalsTextContainer: {
    flex: 1,
  },
  approvalsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  approvalsSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  approvalsArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#764ba2",
    justifyContent: "center",
    alignItems: "center",
  },
  arrowText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
    marginBottom: 30,
    justifyContent: "space-between",
  },
  card: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#f8f9fa",
    borderRadius: 15,
    padding: 25,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
    textAlign: "center",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  userInfo: {
    backgroundColor: "#f0f4ff",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  userInfoText: {
    fontSize: 14,
    color: "#333",
    marginBottom: 4,
  },
  bold: {
    fontWeight: "600",
  },
  logoutWrapper: {
    marginTop: 20,
    alignSelf: "center",
    width: 200,
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    height: 50,
    borderRadius: 12,
  },
});
