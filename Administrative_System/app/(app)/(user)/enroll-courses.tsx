import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
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
    setTimeout(() => setRefreshing(false), 1000);
  };

  const markRead = async (id: string) => {
    try {
      await updateDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id), { read: true });
    } catch (e) {
      console.error(e);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = rows.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) {
      Alert.alert("All read", "You have no unread notifications.");
      return;
    }
    
    Alert.alert(
      "Mark all as read",
      `Mark ${unreadIds.length} notification${unreadIds.length > 1 ? 's' : ''} as read?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark all",
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              unreadIds.forEach(id => {
                const ref = doc(db, COLLECTIONS.NOTIFICATIONS, id);
                batch.update(ref, { read: true });
              });
              await batch.commit();
              Alert.alert("Done", "All notifications marked as read.");
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to mark all as read.");
            }
          },
        },
      ]
    );
  };

  const deleteNotification = async (id: string, title: string) => {
    Alert.alert(
      "Delete notification",
      `Delete "${title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, id));
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Failed to delete notification.");
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp?.toMillis) return "";
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const handlePress = (item: Row) => {
    if (!item.read) markRead(item.id);
    
    // Optional: navigate based on notification type
    switch (item.type) {
      case "complaint_reply":
        router.push("/(app)/(user)/my-complaints");
        break;
      case "enrollment_edited":
        router.push("/(app)/(user)/enroll-courses");
        break;
      default:
        // Just mark as read, no navigation
        break;
    }
  };

  const iconFor = (type: string) => {
    switch (type) {
      case "complaint_reply":
        return "chatbubble-ellipses";
      case "enrollment_edited":
        return "school";
      case "account_banned":
        return "ban";
      case "account_unbanned":
        return "checkmark-circle";
      default:
        return "notifications";
    }
  };

  const unreadCount = rows.filter(n => !n.read).length;

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
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0 ? `${unreadCount} unread` : `${rows.length} total`}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all</Text>
          </TouchableOpacity>
        )}
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
            <Ionicons name="notifications-off-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySub}>You're all caught up!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            activeOpacity={0.7}
            onPress={() => handlePress(item)}
          >
            <View style={[styles.iconCircle, !item.read && styles.iconCircleActive]}>
              <Ionicons name={iconFor(item.type) as any} size={22} color={ACCENT} />
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.body} numberOfLines={2}>
                {item.body}
              </Text>
              <Text style={styles.time}>{formatDate(item.createdAt)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => deleteNotification(item.id, item.title)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-outline" size={18} color="#94a3b8" />
            </TouchableOpacity>
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
  markAllBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  markAllText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  list: { padding: 16, paddingBottom: 32 },
  empty: { padding: 48, alignItems: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#64748b", marginTop: 12 },
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
    gap: 10,
  },
  cardUnread: {
    backgroundColor: "#faf8ff",
    borderColor: "#c4b5fd",
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
  title: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 4 },
  titleUnread: { color: "#1e1b4b", fontWeight: "700" },
  body: { fontSize: 13, color: "#475569", lineHeight: 18, marginBottom: 4 },
  time: { fontSize: 11, color: "#94a3b8" },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginTop: 4,
  },
  deleteBtn: {
    padding: 4,
  },
});