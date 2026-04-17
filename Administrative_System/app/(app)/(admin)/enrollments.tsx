import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import {
  db,
  COLLECTIONS,
  getEnrollmentDocRef,
  type EnrollmentRecord,
  type UserProfile,
} from "@/services/firebase";
import { notifyEnrollmentEdited } from "@/services/notifications";
import { Ionicons } from "@expo/vector-icons";

const ACCENT = "#764ba2";

type UserRow = {
  id: string;
  email: string;
  displayName?: string | null;
  role: string;
};

type CourseRow = { id: string; name: string; code: string };

export default function AdminEnrollmentsScreen() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [enrollmentSnap, setEnrollmentSnap] = useState<EnrollmentRecord | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, COLLECTIONS.USERS));
        const u: UserRow[] = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as object) } as UserRow))
          .filter((x) => x.role === "user");
        u.sort((a, b) => a.email.localeCompare(b.email));
        setUsers(u);

        const cs = await getDocs(collection(db, COLLECTIONS.COURSES));
        const cl: CourseRow[] = cs.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          const name =
            (typeof x.courseName === "string" && x.courseName) ||
            (typeof x.name === "string" && x.name) ||
            "Course";
          const code = typeof x.courseCode === "string" ? x.courseCode : "";
          return { id: d.id, name, code };
        });
        cl.sort((a, b) => a.name.localeCompare(b.name));
        setCourses(cl);
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedUserId) {
      setEnrollmentSnap(null);
      setSelectedIds(new Set());
      return;
    }
    const ref = getEnrollmentDocRef(selectedUserId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setEnrollmentSnap(null);
        setSelectedIds(new Set());
        return;
      }
      const data = snap.data() as EnrollmentRecord;
      setEnrollmentSnap(data);
      setSelectedIds(new Set(data.courseIds ?? []));
    });
    return unsub;
  }, [selectedUserId]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.email.toLowerCase().includes(q) ||
        (u.displayName || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const toggleCourse = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveForUser = async () => {
    if (!selectedUserId) return;
    const u = users.find((x) => x.id === selectedUserId);
    setSaving(true);
    try {
      const ref = getEnrollmentDocRef(selectedUserId);
      const snap = await getDoc(ref);
      const userSnap = await getDoc(doc(db, COLLECTIONS.USERS, selectedUserId));
      const ud = userSnap.exists() ? (userSnap.data() as UserProfile) : null;
      const now = Timestamp.now();
      const division = enrollmentSnap?.division ?? ud?.division ?? "computer_science";
      const academicYear = enrollmentSnap?.academicYear ?? ud?.academicYear ?? 2;
      const term = enrollmentSnap?.term ?? ud?.currentTerm ?? 1;

      const next: EnrollmentRecord = {
        userId: selectedUserId,
        userEmail: u?.email ?? null,
        courseIds: Array.from(selectedIds),
        division,
        academicYear,
        term,
        submitted: true,
        submittedAt: enrollmentSnap?.submittedAt ?? now,
        createdAt: snap.exists()
          ? (snap.data() as EnrollmentRecord).createdAt ?? now
          : now,
        updatedAt: now,
      };

      if (!snap.exists()) {
        await setDoc(ref, next);
      } else {
        await updateDoc(ref, { ...next });
      }
      await notifyEnrollmentEdited(selectedUserId);
      Alert.alert("Saved", "Enrollment updated. The student was notified.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not save enrollment.");
    } finally {
      setSaving(false);
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
      <Text style={styles.lead}>
        Select a student and assign courses. There is no course limit for administrators.
      </Text>
      <TextInput
        style={styles.search}
        placeholder="Search students by email or name..."
        placeholderTextColor="#94a3b8"
        value={search}
        onChangeText={setSearch}
      />
      <FlatList
        style={styles.userList}
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.userRow, selectedUserId === item.id && styles.userRowOn]}
            onPress={() => setSelectedUserId(item.id)}
          >
            <Ionicons
              name="person-circle-outline"
              size={22}
              color={selectedUserId === item.id ? ACCENT : "#94a3b8"}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.userEmail}>{item.email}</Text>
              {item.displayName ? (
                <Text style={styles.userName}>{item.displayName}</Text>
              ) : null}
            </View>
            {selectedUserId === item.id ? (
              <Ionicons name="chevron-forward" size={18} color={ACCENT} />
            ) : null}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No students found.</Text>}
      />

      {selectedUserId ? (
        <ScrollView style={styles.editor} contentContainerStyle={{ paddingBottom: 24 }}>
          <Text style={styles.editorTitle}>Courses for this student ({selectedIds.size})</Text>
          {courses.map((c) => {
            const on = selectedIds.has(c.id);
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.courseRow, on && styles.courseRowOn]}
                onPress={() => toggleCourse(c.id)}
                activeOpacity={0.85}
              >
                {on ? (
                  <Ionicons name="checkbox" size={22} color={ACCENT} />
                ) : (
                  <Ionicons name="square-outline" size={22} color="#94a3b8" />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.cn}>{c.name}</Text>
                  {c.code ? <Text style={styles.cc}>{c.code}</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={saveForUser}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save & notify student</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  lead: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userList: { flexGrow: 0, maxHeight: 220, paddingHorizontal: 8 },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginBottom: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  userRowOn: { borderColor: ACCENT, backgroundColor: "#faf8ff" },
  userEmail: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  userName: { fontSize: 12, color: "#64748b", marginTop: 2 },
  muted: { textAlign: "center", color: "#94a3b8", padding: 24 },
  editor: { flex: 1, paddingHorizontal: 16 },
  editorTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a", marginBottom: 10, marginTop: 8 },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  courseRowOn: { borderColor: ACCENT, backgroundColor: "#faf8ff" },
  cn: { fontSize: 15, fontWeight: "600", color: "#0f172a" },
  cc: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  saveBtn: {
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
