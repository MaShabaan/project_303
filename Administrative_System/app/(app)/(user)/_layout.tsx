import { TouchableOpacity, Image, StyleSheet, View } from "react-native";
import { Redirect, Stack, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBellButton } from "@/components/NotificationBellButton";

export default function UserLayout() {
  const { user, profile, isInitialized } = useAuth();

  if (!isInitialized) return null;

  if (!user || !profile) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile.role === "admin" || profile.role === "super_admin") {
    return <Redirect href="/(app)/(admin)" />;
  }

  if (profile.isBanned === true) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="account-suspended" />
      </Stack>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitle: "Home",
        headerStyle: { backgroundColor: "#FFFFFF" },
        headerTintColor: "#333333",
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Image
              source={require("@/assets/images/back-arrow.png")}
              style={styles.backArrow}
              resizeMode="contain"
            />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={styles.headerRight}>
            <NotificationBellButton href="./notifications" />
          </View>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ title: "Home" }} />
      <Stack.Screen name="rate-courses" options={{ title: "Rate Courses" }} />
      <Stack.Screen name="submit-complaint" options={{ title: "Submit Complaint" }} />
      <Stack.Screen name="my-complaints" options={{ title: "My Complaints" }} />
      <Stack.Screen name="my-ratings" options={{ title: "My Ratings" }} />
      <Stack.Screen name="enroll-courses" options={{ title: "Course enrollment" }} />
      <Stack.Screen name="notifications" options={{ title: "Notifications" }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  backButton: {
    padding: 12,
    marginLeft: 4,
  },
  backArrow: {
    width: 24,
    height: 24,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});
