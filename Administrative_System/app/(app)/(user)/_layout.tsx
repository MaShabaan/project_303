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
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="rate-courses" />
      <Stack.Screen name="submit-complaint" />
      <Stack.Screen name="my-complaints" />
      <Stack.Screen name="my-ratings" />
      <Stack.Screen name="enroll-courses" />
      <Stack.Screen name="notifications" />
      <Stack.Screen
        name="../ai-assistant"
        options={{ title: "AI Assistant" }}
      />
    </Stack>
  );
}
