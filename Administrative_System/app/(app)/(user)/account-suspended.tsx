import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "@/contexts/AuthContext";

export default function AccountSuspendedScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Account suspended</Text>
      <Text style={styles.body}>
        Your access to this application has been suspended. If you think this is a mistake, contact the
        administration.
      </Text>
      <TouchableOpacity style={styles.btn} onPress={() => signOut()} activeOpacity={0.85}>
        <Text style={styles.btnText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f6f5ff",
    padding: 24,
    justifyContent: "center",
  },
  title: { fontSize: 22, fontWeight: "800", color: "#1e1b4b", marginBottom: 12, textAlign: "center" },
  body: { fontSize: 15, color: "#64748b", lineHeight: 22, textAlign: "center", marginBottom: 28 },
  btn: {
    backgroundColor: "#764ba2",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
