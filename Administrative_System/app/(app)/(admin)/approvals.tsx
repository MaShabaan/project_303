import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { isSuperAdminEmail, type UserProfile } from "@/services/firebase";

type Row = UserProfile & { id: string };

export default function AdminApprovalsScreen() {
  const { profile, approveAdmin, rejectAdmin, getPendingAdmins } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const canAccess = isSuperAdminEmail(profile?.email);

  const load = useCallback(async () => {
    if (!canAccess) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const list = await getPendingAdmins();
      setRows(list);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load pending admins");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [canAccess, getPendingAdmins]);

  useEffect(() => {
    load();
  }, [load]);

  const onApprove = (row: Row) => {
    Alert.alert("Approve admin", `Approve ${row.email}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Approve",
        onPress: async () => {
          setBusyId(row.id);
          try {
            await approveAdmin(row.id);
            await load();
            Alert.alert("Done", "Admin approved.");
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to approve";
            Alert.alert("Error", msg);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  const onReject = (row: Row) => {
    Alert.alert("Reject", `Remove pending admin ${row.email}? This deletes their user document.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setBusyId(row.id);
          try {
            await rejectAdmin(row.id);
            await load();
            Alert.alert("Done", "Request rejected.");
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to reject";
            Alert.alert("Error", msg);
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  if (!canAccess) {
    return (
      <View style={styles.centered}>
        <Text style={styles.deniedTitle}>Restricted</Text>
        <Text style={styles.deniedSub}>Only super admins can approve pending administrators.</Text>
        <TouchableOpacity style={styles.backWide} onPress={() => router.back()}>
          <Text style={styles.backWideText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#1e1b4b" />
        </TouchableOpacity>
        <Text style={styles.title}>Pending admin approvals</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="checkmark-done-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptySub}>New admin sign-ups will appear here.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.meta}>
                {item.displayName || item.fullName || "—"}
              </Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.btn, styles.approve]}
                onPress={() => onApprove(item)}
                disabled={busyId === item.id}
              >
                <Text style={styles.btnApproveText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.reject]}
                onPress={() => onReject(item)}
                disabled={busyId === item.id}
              >
                <Text style={styles.btnRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f5ff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: "#f6f5ff" },
  deniedTitle: { fontSize: 20, fontWeight: "800", color: "#1e1b4b", marginBottom: 8 },
  deniedSub: { fontSize: 14, color: "#64748b", textAlign: "center", lineHeight: 20 },
  backWide: { marginTop: 20, backgroundColor: "#1e1b4b", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  backWideText: { color: "#fff", fontWeight: "700" },
  topbar: {
    paddingTop: 52,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ede9fe",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", color: "#1e1b4b", flex: 1, textAlign: "center" },
  list: { padding: 16, paddingBottom: 32 },
  empty: { padding: 48, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#64748b", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#94a3b8", marginTop: 6, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ede9fe",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  email: { fontSize: 15, fontWeight: "700", color: "#1e1b4b" },
  meta: { fontSize: 13, color: "#64748b", marginTop: 4 },
  actions: { flexDirection: "column", gap: 8 },
  btn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, minWidth: 84, alignItems: "center" },
  approve: { backgroundColor: "#d1fae5" },
  reject: { backgroundColor: "#fee2e2" },
  btnApproveText: { color: "#059669", fontWeight: "800", fontSize: 12 },
  btnRejectText: { color: "#dc2626", fontWeight: "800", fontSize: 12 },
});
