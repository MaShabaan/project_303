import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { db, COLLECTIONS, type InAppNotificationRecord } from "@/services/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const ACCENT = "#764ba2";

type Row = InAppNotificationRecord & { id: string };

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where("userId", "==", user.uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Row[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as InAppNotificationRecord),
        }));
        list.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() ?? 0;
          const tb = b.createdAt?.toMillis?.() ?? 0;
          return tb - ta;
        });
        setRows(list);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
        setRefreshing(false);
      },
    );
    return unsub;
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const iconFor = (type: string) => {
    switch (type) {
      case "complaint_reply":
        return "chatbubble-ellipses-outline";
      case "enrollment_edited":
        return "school-outline";
      case "account_banned":
        return "ban-outline";
      case "account_unbanned":
        return "checkmark-circle-outline";
      default:
        return "notifications-outline";
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🔔 Notifications</Text>
          <Text style={styles.headerSubtitle}>{rows.length} total</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ACCENT]} />
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>You are all caught up.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            activeOpacity={0.85}
            onPress={() => {
              if (!item.read) markRead(item.id);
            }}
          >
            <View style={[styles.iconCircle, !item.read && styles.iconCircleActive]}>
              <Ionicons name={iconFor(item.type) as any} size={22} color={ACCENT} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.body}>{item.body}</Text>
            </View>
            {!item.read ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f6f5ff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f6f5ff" },

  headerGradient: {
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },

  list: { padding: 16, paddingBottom: 32 },
  empty: { padding: 48, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#64748b", marginTop: 12 },
  emptySub: { fontSize: 14, color: "#94a3b8", marginTop: 6 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ede9fe",
    gap: 12,
  },
  cardUnread: {
    backgroundColor: "#faf8ff",
    borderColor: "#ddd6fe",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#f5f3ff",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircleActive: {
    backgroundColor: "#ede9fe",
  },
  cardBody: { flex: 1 },
  title: { fontSize: 15, fontWeight: "700", color: "#1e1b4b", marginBottom: 4 },
  body: { fontSize: 14, color: "#64748b", lineHeight: 20 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: ACCENT,
    marginTop: 4,
  },
});