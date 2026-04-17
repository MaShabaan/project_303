import React, { useEffect, useState } from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { db, COLLECTIONS } from "@/services/firebase";

const ACCENT = "#764ba2";

type Props = {
  /** Relative path from current stack, e.g. "./notifications" */
  href?: string;
};

export function NotificationBellButton({ href = "./notifications" }: Props) {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setUnread(0);
      return;
    }
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where("userId", "==", user.uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        let n = 0;
        snap.forEach((d) => {
          const data = d.data();
          if (data.read !== true) n += 1;
        });
        setUnread(n);
      },
      () => setUnread(0),
    );
    return unsub;
  }, [user?.uid]);

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={() => router.push(href as any)}
      activeOpacity={0.75}
      accessibilityLabel="Notifications"
    >
      <Ionicons name="notifications-outline" size={22} color="#333" />
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 99 ? "99+" : String(unread)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginRight: 12,
    padding: 6,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});
