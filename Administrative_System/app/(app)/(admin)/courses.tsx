import React, { useEffect, useState, useRef } from "react";
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
  Animated,
  Dimensions,
} from "react-native";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/services/firebase";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const DIVISIONS = [
  { id: "computer_science", label: "Computer Science", icon: "💻", color: "#6366f1" },
  { id: "special_mathematics", label: "Special Mathematics", icon: "📐", color: "#10b981" },
];
const YEARS = [2, 3, 4];
const TERMS = [1, 2];

const FilterChip = ({ label, isActive, onPress, icon }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
    <LinearGradient
      colors={isActive ? ["#667eea", "#764ba2"] : ["#f1f5f9", "#f1f5f9"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientChip, isActive && styles.gradientChipActive]}
    >
      {icon && <Text style={[styles.chipIcon, isActive && styles.chipIconActive]}>{icon}</Text>}
      <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>{label}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

export default function ManageCoursesScreen() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [year, setYear] = useState(2);
  const [term, setTerm] = useState(1);
  const [division, setDivision] = useState("computer_science");

  const [filterDivision, setFilterDivision] = useState("all");
  const [filterYear, setFilterYear] = useState<number | null>(null);
  const [filterTerm, setFilterTerm] = useState<number | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
    loadCourses();
  }, []);

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

  const getStats = () => {
    const csCount = courses.filter(c => c.division === "computer_science").length;
    const mathCount = courses.filter(c => c.division === "special_mathematics").length;
    return { csCount, mathCount, total: courses.length };
  };

  const stats = getStats();

  const filteredCourses = courses.filter((course) => {
    if (filterDivision !== "all" && course.division !== filterDivision) return false;
    if (filterYear && course.year !== filterYear) return false;
    if (filterTerm && course.term !== filterTerm) return false;
    const searchLower = searchQuery.toLowerCase();
    const courseNameMatch = (course.courseName || course.name || "").toLowerCase().includes(searchLower);
    const courseCodeMatch = (course.courseCode || "").toLowerCase().includes(searchLower);
    if (searchQuery && !courseNameMatch && !courseCodeMatch) return false;
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

  const StatCard = ({ title, count, icon, color, gradientColors }: any) => (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.statCard, { shadowColor: color }]}
    >
      <View style={styles.statIconContainer}>
        <Text style={styles.statIcon}>{icon}</Text>
      </View>
      <Text style={styles.statCount}>{count}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </LinearGradient>
  );

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
          <Text style={styles.headerTitle}>📊 Course Dashboard</Text>
          <Text style={styles.headerSubtitle}>Manage your courses</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <StatCard
              title="Computer Science"
              count={stats.csCount}
              icon="💻"
              color="#6366f1"
              gradientColors={["#6366f1", "#818cf8"]}
            />
            <StatCard
              title="Special Math"
              count={stats.mathCount}
              icon="📐"
              color="#10b981"
              gradientColors={["#10b981", "#34d399"]}
            />
            <StatCard
              title="Total Courses"
              count={stats.total}
              icon="📚"
              color="#f59e0b"
              gradientColors={["#f59e0b", "#fbbf24"]}
            />
          </View>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by course name or code..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Gradient Filters */}
          <View style={styles.filtersCard}>
            <Text style={styles.filtersTitle}>✨ FILTERS</Text>
            
            {/* Division Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Division</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <FilterChip 
                  label="All" 
                  isActive={filterDivision === "all"} 
                  onPress={() => setFilterDivision("all")}
                />
                <FilterChip 
                  label="CS" 
                  icon="💻"
                  isActive={filterDivision === "computer_science"} 
                  onPress={() => setFilterDivision("computer_science")}
                />
                <FilterChip 
                  label="Math" 
                  icon="📐"
                  isActive={filterDivision === "special_mathematics"} 
                  onPress={() => setFilterDivision("special_mathematics")}
                />
              </ScrollView>
            </View>

            {/* Year Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Year</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <FilterChip 
                  label="All" 
                  isActive={filterYear === null} 
                  onPress={() => setFilterYear(null)}
                />
                {YEARS.map(y => (
                  <FilterChip 
                    key={y}
                    label={`Year ${y}`} 
                    isActive={filterYear === y} 
                    onPress={() => setFilterYear(y)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* Term Filters */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>Term</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
                <FilterChip 
                  label="All" 
                  isActive={filterTerm === null} 
                  onPress={() => setFilterTerm(null)}
                />
                {TERMS.map(t => (
                  <FilterChip 
                    key={t}
                    label={`Term ${t}`} 
                    isActive={filterTerm === t} 
                    onPress={() => setFilterTerm(t)}
                  />
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Courses List Header */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>📖 All Courses</Text>
            <Text style={styles.listCount}>{filteredCourses.length} items</Text>
          </View>

          {/* Courses List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#764ba2" />
              <Text style={styles.loadingText}>Loading courses...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCourses}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyText}>No courses found</Text>
                  <Text style={styles.emptySubtext}>Tap + to add your first course</Text>
                </View>
              }
              renderItem={({ item }) => {
                const divisionColor = item.division === "computer_science" ? "#6366f1" : "#10b981";
                const divisionIcon = item.division === "computer_science" ? "💻" : "📐";
                return (
                  <View style={[styles.courseCard, { borderLeftColor: divisionColor, borderLeftWidth: 4 }]}>
                    <View style={styles.courseIcon}>
                      <Text style={styles.courseIconText}>{divisionIcon}</Text>
                    </View>
                    <View style={styles.courseContent}>
                      <Text style={styles.courseName}>{item.courseName || item.name}</Text>
                      {item.courseCode ? <Text style={styles.courseCode}>{item.courseCode}</Text> : null}
                      <View style={styles.courseMeta}>
                        <Text style={[styles.metaText, { color: divisionColor }]}>{divisionIcon} {item.division === "computer_science" ? "CS" : "Math"}</Text>
                        <Text style={styles.metaText}>📅 Year {item.year}</Text>
                        <Text style={styles.metaText}>📖 Term {item.term}</Text>
                      </View>
                    </View>
                    <View style={styles.courseActions}>
                      <TouchableOpacity style={styles.actionEdit} onPress={() => openEditModal(item)}>
                        <Text style={styles.actionEditText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionDelete} onPress={() => handleDelete(item.id, item.courseName || item.name)}>
                        <Text style={styles.actionDeleteText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
            />
          )}
        </Animated.View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setModalVisible(true); }} activeOpacity={0.8}>
        <LinearGradient
          colors={["#667eea", "#764ba2"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Text style={styles.fabText}>+</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Course Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>➕ Add New Course</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                    <Text style={[styles.modalChipText, division === d.id && styles.modalChipTextActive]}>{d.icon} {d.label}</Text>
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

              <TouchableOpacity style={styles.submitButton} onPress={handleAddCourse} disabled={submitting}>
                <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitGradient}>
                  <Text style={styles.submitText}>{submitting ? "Adding..." : "Add Course"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Course Modal */}
      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Course</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                    <Text style={[styles.modalChipText, division === d.id && styles.modalChipTextActive]}>{d.icon} {d.label}</Text>
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

              <TouchableOpacity style={styles.submitButton} onPress={handleUpdateCourse} disabled={submitting}>
                <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitGradient}>
                  <Text style={styles.submitText}>{submitting ? "Updating..." : "Update Course"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f3ff",
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 30,
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
    fontSize: 24,
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
    paddingHorizontal: 16,
    marginTop: -20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 20,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statIcon: {
    fontSize: 20,
  },
  statCount: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  statTitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    textAlign: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: "#1e1b4b",
  },
  filtersCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filtersTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 1,
    marginBottom: 16,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 10,
  },
  filterScroll: {
    flexDirection: "row",
  },
  gradientChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 30,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  gradientChipActive: {
    borderColor: "rgba(255,255,255,0.3)",
    shadowColor: "#764ba2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipIcon: {
    fontSize: 14,
    marginRight: 6,
    color: "#64748b",
  },
  chipIconActive: {
    color: "#fff",
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  chipLabelActive: {
    color: "#fff",
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e1b4b",
  },
  listCount: {
    fontSize: 12,
    color: "#94a3b8",
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#94a3b8",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 40,
    alignItems: "center",
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#64748b",
  },
  emptySubtext: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 8,
  },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  courseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f3e8ff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  courseIconText: {
    fontSize: 24,
  },
  courseContent: {
    flex: 1,
  },
  courseName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e1b4b",
  },
  courseCode: {
    fontSize: 12,
    color: "#7c3aed",
    marginTop: 2,
  },
  courseMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: "#94a3b8",
  },
  courseActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionEdit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0e7ff",
    alignItems: "center",
    justifyContent: "center",
  },
  actionEditText: {
    fontSize: 16,
  },
  actionDelete: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  actionDeleteText: {
    fontSize: 16,
  },
  fab: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: "#764ba2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  fabText: {
    fontSize: 28,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: width - 40,
    maxHeight: "85%",
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  modalClose: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f8f7ff",
    borderWidth: 1.5,
    borderColor: "#ede9fe",
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#1e1b4b",
  },
  modalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 8,
  },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalChipActive: {
    backgroundColor: "#7c3aed",
    borderColor: "#7c3aed",
  },
  modalChipText: {
    fontWeight: "600",
    color: "#64748b",
  },
  modalChipTextActive: {
    color: "#fff",
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 20,
  },
  submitGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: {
    fontWeight: "700",
    color: "#fff",
    fontSize: 16,
  },
});