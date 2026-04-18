/**
 * Admin area layout — mirrors main branch Stack + route guards, with banned-user redirect.
 */

import { Stack, useSegments, useRouter, Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { ActivityIndicator, View } from "react-native";
import { useEffect } from "react";
import { autoUnblockExpiredUsers } from "@/services/firebase";

export default function AdminLayout() {
  const { user, profile, isLoading, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    autoUnblockExpiredUsers();
  }, []);

  useEffect(() => {
    if (!isInitialized || isLoading) return;

    const isLoggedIn = !!user;
    const userRole = profile?.role;
    const userPermissions = profile?.permissions || {};
    const currentPath = segments.join("/");

    const hasPermission = (permission: string) => {
      if (userRole === "super_admin") return true;
      return userPermissions[permission as keyof typeof userPermissions] === true;
    };

    const isAdminRoute = currentPath.startsWith("admin");
    const isUserRoute = currentPath.startsWith("user");
    const isAuthRoute = currentPath.startsWith("login") || currentPath.startsWith("signup");

    const go = (path: string) => router.replace(path as any);

    if (isLoggedIn && isAuthRoute) {
      if (userRole === "admin" || userRole === "super_admin") {
        go("/(admin)");
        return;
      }
      go("/(user)");
      return;
    }

    if (!isLoggedIn && !isAuthRoute) {
      go("/(auth)/login");
      return;
    }

    if (isLoggedIn && isAdminRoute && userRole === "user") {
      go("/(user)");
      return;
    }

    if (isLoggedIn && isUserRoute && (userRole === "admin" || userRole === "super_admin")) {
      go("/(admin)");
      return;
    }

    if (isLoggedIn && isAdminRoute && userRole === "admin") {
      if (currentPath.includes("/admin/courses") && !hasPermission("manage_courses")) {
        go("/(admin)");
        return;
      }
      if (currentPath.includes("/admin/enrollments") && !hasPermission("manage_enrollments")) {
        go("/(admin)");
        return;
      }
      if (currentPath.includes("/admin/feedback") && !hasPermission("view_feedback")) {
        go("/(admin)");
        return;
      }
      if (currentPath.includes("/admin/complaints") && !hasPermission("manage_complaints")) {
        go("/(admin)");
        return;
      }
      if (currentPath.includes("/admin/users") && !hasPermission("view_users")) {
        go("/(admin)");
        return;
      }
    }

    if (isLoggedIn && userRole !== "super_admin") {
      if (currentPath.includes("/admin/approvals")) {
        go("/(admin)");
        return;
      }
    }
  }, [isInitialized, isLoading, user, profile, segments]);

  if (!isInitialized || isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f0c29" }}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  if (user && profile?.isBanned === true) {
    return <Redirect href={"/(app)/(user)/account-suspended" as any} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
