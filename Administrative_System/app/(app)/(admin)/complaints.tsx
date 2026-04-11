import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { COLLECTIONS, db, replyToTicket } from "@/services/firebase";
import { notifyComplaintReply } from "@/services/notifications";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";

const ACCENT = "#764ba2";

/** Matches `submitTicket` / `TicketPayload` in services/firebase.ts */
type FilterTab = "all" | "pending" | "resolved";

interface ComplaintRow {
  id: string;
  /** Display: `userEmail` from ticket (no separate displayName on ticket) */
  userName: string;
  /** `title` + `description` as written by submit-complaint */
  complaintText: string;
  createdAt: Timestamp | null;
  /** Exact Firestore values: "open" (submitTicket) or "replied" (replyToTicket) */
  status: string;
  adminReply?: string;
  raw: Record<string, unknown>;
}

function statusSortRank(status: string): number {
  if (status === "open") return 0;
  if (status === "replied") return 1;
  return 2;
}

function mapDoc(id: string, data: Record<string, unknown>): ComplaintRow {
  const userEmail =
    typeof data.userEmail === "string" && data.userEmail.trim()
      ? data.userEmail.trim()
      : "Unknown user";

  const title =
    typeof data.title === "string" ? data.title.trim() : "";
  const description =
    typeof data.description === "string" ? data.description.trim() : "";
  const complaintText =
    title && description
      ? `${title}\n\n${description}`
      : description || title || "—";

  let createdAt: Timestamp | null = null;
  const c = data.createdAt;
  if (c && typeof (c as Timestamp).toDate === "function") {
    createdAt = c as Timestamp;
  }

  const rawStatus = data.status;
  const status =
    typeof rawStatus === "string" && rawStatus.length > 0 ? rawStatus : "open";

  const adminReply =
    typeof data.adminReply === "string" ? data.adminReply : undefined;

  return {
    id,
    userName: userEmail,
    complaintText,
    createdAt,
    status,
    adminReply,
    raw: data,
  };
}

function formatDate(t: ComplaintRow["createdAt"]): string {
  if (!t || typeof t.toDate !== "function") return "—";
  const date = t.toDate();
  return (
    date.toLocaleDateString(undefined, { dateStyle: "medium" }) +
    " · " +
    date.toLocaleTimeString(undefined, { timeStyle: "short" })
  );
}

export default function ComplaintsScreen() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [replyModalId, setReplyModalId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replySaving, setReplySaving] = useState(false);
  const [markBusyId, setMarkBusyId] = useState<string | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = onSnapshot(
        collection(db, COLLECTIONS.TICKETS),
        (snapshot) => {
          const list: ComplaintRow[] = snapshot.docs.map((d) =>
            mapDoc(d.id, d.data() as Record<string, unknown>),
          );
          list.sort((a, b) => {
            const ra = statusSortRank(a.status);
            const rb = statusSortRank(b.status);
            if (ra !== rb) return ra - rb;
            const ta =
              a.createdAt && typeof a.createdAt.toDate === "function"
                ? a.createdAt.toDate().getTime()
                : 0;
            const tb =
              b.createdAt && typeof b.createdAt.toDate === "function"
                ? b.createdAt.toDate().getTime()
                : 0;
            return tb - ta;
          });
          setRows(list);
          setLoading(false);
          setRefreshing(false);
        },
        (err) => {
          console.error(err);
          Alert.alert(
            "Error",
            "Could not load complaints. Check your connection and Firestore rules.",
          );
          setLoading(false);
          setRefreshing(false);
        },
      );
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
    return () => {
      unsub?.();
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 400);
  };

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    /** "Pending" tab = tickets still `open` (submitTicket default) */
    if (filter === "pending") return rows.filter((r) => r.status === "open");
    /** "Resolved" tab = `replied` (replyToTicket in firebase.ts) */
    return rows.filter((r) => r.status === "replied");
  }, [rows, filter]);

  const openReply = (item: ComplaintRow) => {
    setReplyModalId(item.id);
    setReplyDraft(item.adminReply ?? "");
  };

  const closeReply = () => {
    if (replySaving) return;
    setReplyModalId(null);
    setReplyDraft("");
  };

  /** In progress: keep `status: "open"` but store `adminReply`. Resolved: `replyToTicket` → `status: "replied"`. */
  const saveReply = async (mode: "in_progress" | "resolved") => {
    const text = replyDraft.trim();
    if (!text) {
      Alert.alert("Reply required", "Please enter a reply message.");
      return;
    }
    if (!replyModalId) return;
    const adminEmail = profile?.email;
    if (mode === "resolved" && !adminEmail) {
      Alert.alert("Error", "You must be logged in to send a reply.");
      return;
    }
    setReplySaving(true);
    try {
      const ticketRow = rows.find((r) => r.id === replyModalId);
      const ticketUserId =
        ticketRow && typeof ticketRow.raw.userId === "string"
          ? ticketRow.raw.userId
          : null;
      const ticketTitle =
        ticketRow && typeof ticketRow.raw.title === "string"
          ? ticketRow.raw.title
          : ticketRow?.complaintText ?? "";

      if (mode === "resolved") {
        await replyToTicket(replyModalId, adminEmail, text);
      } else {
        await updateDoc(doc(db, COLLECTIONS.TICKETS, replyModalId), {
          adminReply: text,
          status: "open",
        });
      }
      if (ticketUserId) {
        try {
          await notifyComplaintReply(ticketUserId, replyModalId, ticketTitle);
        } catch (notifyErr) {
          console.error(notifyErr);
        }
      }
      closeReply();
      Alert.alert("Saved", "Reply has been saved.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to save reply. Try again.");
    } finally {
      setReplySaving(false);
    }
  };

  const markResolved = async (id: string) => {
    setMarkBusyId(id);
    try {
      await updateDoc(doc(db, COLLECTIONS.TICKETS, id), {
        status: "replied",
      });
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not update status.");
    } finally {
      setMarkBusyId(null);
    }
  };

  const filters: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "resolved", label: "Resolved" },
  ];

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
        <Text style={styles.loadingText}>Loading complaints…</Text>
      </View>
    );
  }

  const modalItem = replyModalId ? rows.find((r) => r.id === replyModalId) : null;

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[ACCENT]} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No complaints</Text>
            <Text style={styles.emptyText}>
              {filter === "all"
                ? "There are no complaints in this collection yet."
                : "Nothing matches this filter."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={20} color={ACCENT} />
              </View>
              <View style={styles.cardHeadText}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item.userName}
                </Text>
                <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
              </View>
              <View
                style={[
                  styles.statusPill,
                  item.status === "open" && styles.pillPending,
                  item.status === "replied" && styles.pillResolved,
                  item.status !== "open" && item.status !== "replied" && styles.pillProgress,
                ]}
              >
                <Text style={styles.statusPillText}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.complaintLabel}>Complaint</Text>
            <Text style={styles.complaintBody}>{item.complaintText}</Text>
            {item.adminReply ? (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Reply</Text>
                <Text style={styles.replyBody}>{item.adminReply}</Text>
              </View>
            ) : null}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => openReply(item)}
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color={ACCENT} />
                <Text style={styles.btnSecondaryText}>Reply</Text>
              </TouchableOpacity>
              {item.status !== "replied" && (
                <TouchableOpacity
                  style={[styles.btnPrimary, markBusyId === item.id && styles.btnDisabled]}
                  onPress={() => markResolved(item.id)}
                  disabled={markBusyId === item.id}
                  activeOpacity={0.85}
                >
                  {markBusyId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                      <Text style={styles.btnPrimaryText}>Mark resolved</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      />

      <Modal
        visible={replyModalId !== null}
        animationType="slide"
        transparent
        onRequestClose={closeReply}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalWrap}>
            <Pressable style={styles.modalBackdrop} onPress={closeReply} />
            <View style={styles.modalSheet}>
            <View style={styles.modalGrab} />
            <Text style={styles.modalTitle}>Reply to complaint</Text>
            {modalItem && (
              <Text style={styles.modalSub} numberOfLines={2}>
                {modalItem.userName} · {modalItem.complaintText.slice(0, 80)}
                {modalItem.complaintText.length > 80 ? "…" : ""}
              </Text>
            )}
            <TextInput
              style={styles.modalInput}
              placeholder="Write your reply…"
              placeholderTextColor="#94a3b8"
              value={replyDraft}
              onChangeText={setReplyDraft}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              editable={!replySaving}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={closeReply}
                disabled={replySaving}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalGhost, replySaving && styles.btnDisabled]}
                onPress={() => saveReply("in_progress")}
                disabled={replySaving}
              >
                {replySaving ? (
                  <ActivityIndicator size="small" color={ACCENT} />
                ) : (
                  <Text style={styles.modalGhostText}>In progress</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirm, replySaving && styles.btnDisabled]}
                onPress={() => saveReply("resolved")}
                disabled={replySaving}
              >
                {replySaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Resolved</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  loadingText: { marginTop: 12, fontSize: 16, color: "#64748b" },
  filterBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
  },
  filterChipActive: {
    backgroundColor: ACCENT,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  listContent: { padding: 16, paddingBottom: 32 },
  empty: { padding: 48, alignItems: "center" },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: "#64748b", marginTop: 12 },
  emptyText: { fontSize: 14, color: "#94a3b8", textAlign: "center", marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  cardHeadText: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  dateText: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillPending: { backgroundColor: "#fef3c7" },
  pillProgress: { backgroundColor: "#dbeafe" },
  pillResolved: { backgroundColor: "#d1fae5" },
  statusPillText: { fontSize: 11, fontWeight: "700", color: "#334155" },
  complaintLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  complaintBody: { fontSize: 15, color: "#334155", lineHeight: 22 },
  replyBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  replyLabel: { fontSize: 11, fontWeight: "700", color: ACCENT, marginBottom: 4 },
  replyBody: { fontSize: 14, color: "#475569", lineHeight: 20 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
  btnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT,
    backgroundColor: "#fff",
  },
  btnSecondaryText: { fontSize: 14, fontWeight: "700", color: ACCENT },
  btnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#059669",
    minWidth: 120,
    justifyContent: "center",
  },
  btnPrimaryText: { fontSize: 14, fontWeight: "700", color: "#fff" },
  btnDisabled: { opacity: 0.55 },
  modalOverlay: {
    flex: 1,
  },
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.45)",
  },
  modalSheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
  },
  modalGrab: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e2e8f0",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  modalSub: { fontSize: 13, color: "#64748b", marginTop: 6, marginBottom: 14 },
  modalInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: "#0f172a",
    minHeight: 120,
    backgroundColor: "#f8fafc",
  },
  modalActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  modalCancelText: { fontSize: 15, fontWeight: "600", color: "#64748b" },
  modalGhost: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT,
    minWidth: 100,
    alignItems: "center",
  },
  modalGhostText: { fontSize: 14, fontWeight: "700", color: ACCENT },
  modalConfirm: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: ACCENT,
    minWidth: 100,
    alignItems: "center",
  },
  modalConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
