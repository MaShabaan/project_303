import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";

const DIVISIONS = [
  { id: "computer_science", label: "Computer Science 💻" },
  { id: "special_mathematics", label: "Special Mathematics 📐" },
];
const YEARS = [2, 3, 4];
const TERMS = [1, 2];

export default function ManageCoursesScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [year, setYear] = useState(2);
  const [term, setTerm] = useState(1);
  const [division, setDivision] = useState("computer_science");

  const [filterDivision, setFilterDivision] = useState("all");
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterTerm, setFilterTerm] = useState<number | null>(null);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, "courses"));
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(data);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to load courses");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filteredCourses = courses.filter((course) => {
    if (filterDivision !== "all" && course.division !== filterDivision) return false;
    if (filterYear && course.year !== filterYear) return false;
    if (filterTerm && course.term !== filterTerm) return false;
    return true;
  });

  const resetForm = () => {
    setCourseName("");
    setCourseCode("");
    setYear(2);
    setTerm(1);
    setDivision("computer_science");
  };

  const handleAddCourse = async () => {
    if (!courseName.trim()) {
      Alert.alert("Error", "Please enter course name");
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "courses"), {
        courseName: courseName.trim(),
        courseCode: courseCode.trim() || "",
        year: Number(year),
        term: Number(term),
        division,
        createdAt: new Date(),
      });

      Alert.alert("Success", "Course added successfully ✅");
      
      resetForm();
      setModalVisible(false);
      loadCourses();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to add course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse || !courseName.trim()) {
      Alert.alert("Error", "Please enter course name");
      return;
    }

    setSubmitting(true);
    try {
      const courseRef = doc(db, "courses", editingCourse.id);
      await updateDoc(courseRef, {
        courseName: courseName.trim(),
        courseCode: courseCode.trim() || "",
        year: Number(year),
        term: Number(term),
        division,
        updatedAt: new Date(),
      });

      Alert.alert("Success", "Course updated successfully ✅");
      setEditModalVisible(false);
      setEditingCourse(null);
      resetForm();
      loadCourses();
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to update course");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (course: any) => {
    setEditingCourse(course);
    setCourseName(course.courseName || course.name);
    setCourseCode(course.courseCode || "");
    setYear(course.year);
    setTerm(course.term);
    setDivision(course.division);
    setEditModalVisible(true);
  };

  const handleDelete = (id: string, courseName: string) => {
    Alert.alert("Delete Course", `Delete "${courseName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "courses", id));
            loadCourses();
            Alert.alert("Success", "Course deleted ✅");
          } catch (e) {
            Alert.alert("Error", "Failed to delete course");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📚 Manage Courses</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => { resetForm(); setModalVisible(true); }}>
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filtersCard}>
        <Text style={styles.filtersTitle}>🔍 FILTERS</Text>
        
        <Text style={styles.filterLabel}>Division</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, filterDivision === "all" && styles.filterChipActive]} onPress={() => setFilterDivision("all")}>
            <Text style={[styles.filterChipText, filterDivision === "all" && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {DIVISIONS.map(d => (
            <TouchableOpacity key={d.id} style={[styles.filterChip, filterDivision === d.id && styles.filterChipActive]} onPress={() => setFilterDivision(d.id)}>
              <Text style={[styles.filterChipText, filterDivision === d.id && styles.filterChipTextActive]}>{d.label.split(" ")[0]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterLabel}>Year</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, !filterYear && styles.filterChipActive]} onPress={() => setFilterYear(null)}>
            <Text style={[styles.filterChipText, !filterYear && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {YEARS.map(y => (
            <TouchableOpacity key={y} style={[styles.filterChip, filterYear === y && styles.filterChipActive]} onPress={() => setFilterYear(y)}>
              <Text style={[styles.filterChipText, filterYear === y && styles.filterChipTextActive]}>Year {y}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterLabel}>Term</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterChip, !filterTerm && styles.filterChipActive]} onPress={() => setFilterTerm(null)}>
            <Text style={[styles.filterChipText, !filterTerm && styles.filterChipTextActive]}>All</Text>
          </TouchableOpacity>
          {TERMS.map(t => (
            <TouchableOpacity key={t} style={[styles.filterChip, filterTerm === t && styles.filterChipActive]} onPress={() => setFilterTerm(t)}>
              <Text style={[styles.filterChipText, filterTerm === t && styles.filterChipTextActive]}>Term {t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text style={styles.sectionTitle}>
        Courses ({filteredCourses.length})
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loadingText}>Loading courses...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCourses}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No courses found</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardContent}>
                <Text style={styles.courseName}>{item.courseName || item.name}</Text>
                {item.courseCode ? <Text style={styles.courseCode}>{item.courseCode}</Text> : null}
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>
                    {item.division === "computer_science" ? "💻 CS" : "📐 Math"} | 
                    Year {item.year} | Term {item.term}
                  </Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                  <Text style={styles.editBtnText}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id, item.courseName || item.name)}>
                  <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add Course Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>➕ Add New Course</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Course Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Linear Algebra 1"
                placeholderTextColor="#94a3b8"
                value={courseName}
                onChangeText={setCourseName}
              />

              <Text style={styles.inputLabel}>Course Code (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MATH201"
                placeholderTextColor="#94a3b8"
                value={courseCode}
                onChangeText={setCourseCode}
              />

              <Text style={styles.inputLabel}>Division</Text>
              <View style={styles.modalRow}>
                {DIVISIONS.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.modalChip, division === d.id && styles.modalChipActive]}
                    onPress={() => setDivision(d.id)}
                  >
                    <Text style={[styles.modalChipText, division === d.id && styles.modalChipTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Year</Text>
              <View style={styles.modalRow}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.modalChip, year === y && styles.modalChipActive]}
                    onPress={() => setYear(y)}
                  >
                    <Text style={[styles.modalChipText, year === y && styles.modalChipTextActive]}>Year {y}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Term</Text>
              <View style={styles.modalRow}>
                {TERMS.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.modalChip, term === t && styles.modalChipActive]}
                    onPress={() => setTerm(t)}
                  >
                    <Text style={[styles.modalChipText, term === t && styles.modalChipTextActive]}>Term {t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setModalVisible(false); resetForm(); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleAddCourse} disabled={submitting}>
                  <Text style={styles.modalSubmitText}>{submitting ? "Adding..." : "Add Course"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Course Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>✏️ Edit Course</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Course Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Linear Algebra 1"
                placeholderTextColor="#94a3b8"
                value={courseName}
                onChangeText={setCourseName}
              />

              <Text style={styles.inputLabel}>Course Code (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MATH201"
                placeholderTextColor="#94a3b8"
                value={courseCode}
                onChangeText={setCourseCode}
              />

              <Text style={styles.inputLabel}>Division</Text>
              <View style={styles.modalRow}>
                {DIVISIONS.map(d => (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.modalChip, division === d.id && styles.modalChipActive]}
                    onPress={() => setDivision(d.id)}
                  >
                    <Text style={[styles.modalChipText, division === d.id && styles.modalChipTextActive]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Year</Text>
              <View style={styles.modalRow}>
                {YEARS.map(y => (
                  <TouchableOpacity
                    key={y}
                    style={[styles.modalChip, year === y && styles.modalChipActive]}
                    onPress={() => setYear(y)}
                  >
                    <Text style={[styles.modalChipText, year === y && styles.modalChipTextActive]}>Year {y}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Term</Text>
              <View style={styles.modalRow}>
                {TERMS.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.modalChip, term === t && styles.modalChipActive]}
                    onPress={() => setTerm(t)}
                  >
                    <Text style={[styles.modalChipText, term === t && styles.modalChipTextActive]}>Term {t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => { setEditModalVisible(false); resetForm(); setEditingCourse(null); }}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleUpdateCourse} disabled={submitting}>
                  <Text style={styles.modalSubmitText}>{submitting ? "Updating..." : "Update Course"}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#f6f5ff" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "800", color: "#1e1b4b" },
  addButton: { backgroundColor: "#7c3aed", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  addButtonText: { color: "#fff", fontWeight: "700" },
  
  filtersCard: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: "#ede9fe" },
  filtersTitle: { fontSize: 11, fontWeight: "700", color: "#94a3b8", marginBottom: 10, letterSpacing: 1 },
  filterLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 6, marginTop: 8 },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  filterChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  filterChipTextActive: { color: "#fff" },
  
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1e1b4b", marginBottom: 12 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  loadingText: { marginTop: 12, color: "#94a3b8" },
  emptyCard: { backgroundColor: "#fff", borderRadius: 16, padding: 40, alignItems: "center" },
  emptyText: { color: "#94a3b8", fontSize: 14 },
  
  card: { backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#ede9fe" },
  cardContent: { flex: 1 },
  courseName: { fontSize: 16, fontWeight: "700", color: "#1e1b4b" },
  courseCode: { fontSize: 12, color: "#7c3aed", marginTop: 2 },
  metaRow: { marginTop: 6 },
  meta: { fontSize: 12, color: "#94a3b8" },
  cardActions: { flexDirection: "row", gap: 8 },
  editBtn: { backgroundColor: "#e0e7ff", padding: 8, borderRadius: 8 },
  editBtnText: { fontSize: 12, fontWeight: "600", color: "#4f46e5" },
  deleteBtn: { backgroundColor: "#fee2e2", padding: 8, borderRadius: 8 },
  deleteBtnText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
  
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "90%" },
  modalTitle: { fontSize: 20, fontWeight: "800", color: "#1e1b4b", marginBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 6, marginTop: 12 },
  input: { height: 48, borderRadius: 12, backgroundColor: "#f8f7ff", borderWidth: 1.5, borderColor: "#ede9fe", paddingHorizontal: 14, fontSize: 14 },
  modalRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  modalChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  modalChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  modalChipText: { fontWeight: "600", color: "#64748b" },
  modalChipTextActive: { color: "#fff" },
  modalButtons: { flexDirection: "row", gap: 12, marginTop: 24, marginBottom: 20 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#f1f5f9", alignItems: "center" },
  modalCancelText: { fontWeight: "700", color: "#64748b" },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: "#7c3aed", alignItems: "center" },
  modalSubmitText: { fontWeight: "700", color: "#fff" },
});