// app/(app)/(user)/enroll-courses.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import {
  db,
  COLLECTIONS,
  getEnrollmentDocRef,
  MAX_STUDENT_ENROLLMENT_COURSES,
  type EnrollmentRecord,
  createInAppNotification,
} from "@/services/firebase";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const ACCENT = "#764ba2";

type CourseOption = {
  id: string;
  courseName: string;
  courseCode?: string;
};

export default function EnrollCoursesScreen() {
  const { user, profile } = useAuth();
  const division = profile?.division ?? "computer_science";
  const academicYear = profile?.academicYear ?? 2;
  const term = profile?.currentTerm ?? 1;
  const departmentLabel = profile?.department ?? "Mathematics Department";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrollment, setEnrollment] = useState<EnrollmentRecord | null>(null);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [courseNamesById, setCourseNamesById] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.uid) return;
    const ref = getEnrollmentDocRef(user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setEnrollment(null);
        } else {
          const data = snap.data() as EnrollmentRecord;
          setEnrollment(data);
          setSelected(new Set(data.courseIds ?? []));
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, COLLECTIONS.COURSES),
          where("division", "==", division),
          where("year", "==", academicYear),
          where("term", "==", term),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list: CourseOption[] = snap.docs.map((d) => {
          const x = d.data() as Record<string, unknown>;
          const name =
            (typeof x.courseName === "string" && x.courseName) ||
            (typeof x.name === "string" && x.name) ||
            "Course";
          const code = typeof x.courseCode === "string" ? x.courseCode : "";
          return { id: d.id, courseName: name, courseCode: code };
        });
        list.sort((a, b) => a.courseName.localeCompare(b.courseName));
        setCourses(list);
        const nm: Record<string, string> = {};
        list.forEach((c) => {
          nm[c.id] = c.courseName;
        });
        setCourseNamesById(nm);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [division, academicYear, term]);

  const submitted = enrollment?.submitted === true;
  const canEdit = !submitted;

  const toggle = (courseId: string) => {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        if (next.size >= MAX_STUDENT_ENROLLMENT_COURSES) {
          Alert.alert(
            "Limit reached",
            `You can enroll in at most ${MAX_STUDENT_ENROLLMENT_COURSES} courses.`,
          );
          return prev;
        }
        next.add(courseId);
      }
      return next;
    });
  };

  const submitFinal = async () => {
    if (!user?.uid || !profile) return;
    if (selected.size === 0) {
      Alert.alert("Select courses", "Choose at least one course before submitting.");
      return;
    }
    if (selected.size > MAX_STUDENT_ENROLLMENT_COURSES) {
      Alert.alert("Limit", `Maximum ${MAX_STUDENT_ENROLLMENT_COURSES} courses.`);
      return;
    }
    setSubmitting(true);
    try {
      const ref = getEnrollmentDocRef(user.uid);
      const snap = await getDoc(ref);
      const now = Timestamp.now();
      const base = {
        userId: user.uid,
        userEmail: profile.email ?? null,
        courseIds: Array.from(selected),
        division,
        academicYear,
        term,
        updatedAt: now,
      };
      const batch = writeBatch(db);
      let ops = 0;
      if (!snap.exists()) {
        batch.set(ref, {
          ...base,
          submitted: false,
          submittedAt: null,
          createdAt: now,
        });
        ops += 1;
        batch.update(ref, {
          ...base,
          submitted: true,
          submittedAt: now,
        });
        ops += 1;
      } else if (!(snap.data() as EnrollmentRecord).submitted) {
        batch.update(ref, {
          ...base,
          submitted: true,
          submittedAt: now,
        });
        ops += 1;
      }
      if (ops > 0) await batch.commit();

      await createInAppNotification({
        userId: user.uid,
        type: "enrollment_edited",
        title: "✅ Enrollment submitted",
        body: `You have successfully enrolled in ${selected.size} course(s) for Year ${academicYear} Term ${term}.`,
        read: false,
      });

      Alert.alert("Submitted", "Your enrollment is locked. Contact an administrator to make changes.");
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Could not submit enrollment. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!enrollment?.submitted || !enrollment.courseIds?.length) return;
    const ids = enrollment.courseIds;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          const snap = await getDoc(doc(db, COLLECTIONS.COURSES, id));
          if (!snap.exists()) return [id, id] as const;
          const x = snap.data() as Record<string, unknown>;
          const name =
            (typeof x.courseName === "string" && x.courseName) ||
            (typeof x.name === "string" && x.name) ||
            id;
          return [id, name] as const;
        }),
      );
      if (cancelled) return;
      setCourseNamesById((prev) => {
        const next = { ...prev };
        entries.forEach(([id, name]) => {
          if (next[id] !== name) next[id] = name;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enrollment?.submitted, enrollment?.courseIds?.join("|")]);

  const summary = useMemo(() => {
    if (!enrollment?.submitted) return null;
    const ids = enrollment.courseIds ?? [];
    return ids.map((id) => courseNamesById[id] || id);
  }, [enrollment, courseNamesById]);

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
          <Text style={styles.headerTitle}>📚 Course Enrollment</Text>
          <Text style={styles.headerSubtitle}>Term {term} · Year {academicYear}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Your context</Text>
          <Text style={styles.infoText}>{departmentLabel}</Text>
          <Text style={styles.infoSub}>
            Division: {division === "computer_science" ? "Computer Science" : "Special Mathematics"} · Year{" "}
            {academicYear} · Term {term}
          </Text>
          <Text style={styles.hint}>
            Showing only courses for Term {term}. You may enroll in up to{" "}
            {MAX_STUDENT_ENROLLMENT_COURSES} courses.
          </Text>
        </View>

        {submitted ? (
          <View style={styles.lockedCard}>
            <Ionicons name="lock-closed" size={22} color={ACCENT} />
            <Text style={styles.lockedTitle}>Enrollment submitted</Text>
            <Text style={styles.lockedBody}>
              Your choices are locked. Only an administrator can change them.
            </Text>
            {summary && summary.length > 0 ? (
              <View style={styles.readList}>
                {summary.map((name, i) => (
                  <Text key={i} style={styles.readItem}>
                    • {name}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.muted}>Loading course names…</Text>
            )}
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Select up to {MAX_STUDENT_ENROLLMENT_COURSES} courses ({selected.size} selected)
            </Text>
            {courses.length === 0 ? (
              <Text style={styles.muted}>No courses found for Term {term}. Check back later.</Text>
            ) : (
              courses.map((c) => {
                const on = selected.has(c.id);
                const atCap = selected.size >= MAX_STUDENT_ENROLLMENT_COURSES && !on;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.courseRow, on && styles.courseRowOn, atCap && !on && styles.courseRowDisabled]}
                    onPress={() => toggle(c.id)}
                    disabled={atCap}
                    activeOpacity={0.85}
                  >
                    <View style={styles.check}>
                      {on ? (
                        <Ionicons name="checkbox" size={24} color={ACCENT} />
                      ) : (
                        <Ionicons name="square-outline" size={24} color="#94a3b8" />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.courseName}>{c.courseName}</Text>
                      {c.courseCode ? <Text style={styles.courseCode}>{c.courseCode}</Text> : null}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, submitting && styles.btnDisabled]}
              onPress={submitFinal}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Submit enrollment</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
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
  
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ede9fe",
  },
  infoLabel: { fontSize: 11, fontWeight: "700", color: "#94a3b8", letterSpacing: 1 },
  infoText: { fontSize: 16, fontWeight: "700", color: "#1e1b4b", marginTop: 6 },
  infoSub: { fontSize: 14, color: "#64748b", marginTop: 4 },
  hint: { fontSize: 13, color: "#64748b", marginTop: 10, lineHeight: 18 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#1e1b4b", marginBottom: 10 },
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ede9fe",
    gap: 10,
  },
  courseRowOn: { borderColor: ACCENT, backgroundColor: "#faf8ff" },
  courseRowDisabled: { opacity: 0.45 },
  check: { width: 28, alignItems: "center" },
  courseName: { fontSize: 15, fontWeight: "600", color: "#1e1b4b" },
  courseCode: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  primaryBtn: {
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  lockedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#ede9fe",
    alignItems: "center",
  },
  lockedTitle: { fontSize: 17, fontWeight: "800", color: "#1e1b4b", marginTop: 8 },
  lockedBody: { fontSize: 14, color: "#64748b", textAlign: "center", marginTop: 6, lineHeight: 20 },
  readList: { alignSelf: "stretch", marginTop: 14 },
  readItem: { fontSize: 15, color: "#334155", marginBottom: 6 },
  muted: { fontSize: 14, color: "#94a3b8", marginTop: 8 },
});