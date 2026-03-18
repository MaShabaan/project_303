import { useLocalSearchParams, router } from "expo-router";
import { useEffect, useState } from "react";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";

export default function ManageCourses() {
  const params = useLocalSearchParams();
  const [courses, setCourses] = useState<any[]>([]);
  const [addedCoursesIds, setAddedCoursesIds] = useState<string[]>([]);

  // إضافة كورسات جديدة من أي صفحة مرة واحدة فقط
  useEffect(() => {
    if (params.edited === "true") return;

    if (params.name && params.instructor) {
      const tempId = String(params.name) + String(params.instructor);
      if (!addedCoursesIds.includes(tempId)) {
        const newCourse = {
          id: tempId,
          name: String(params.name),
          instructor: String(params.instructor),
        };
        setCourses((prev) => [...prev, newCourse]);
        setAddedCoursesIds((prev) => [...prev, tempId]);
      }
    }
  }, [params]);

  // تعديل كورس موجود بعد التعديل
  useEffect(() => {
    if (params.edited === "true" && params.id) {
      setCourses((prev) =>
        prev.map((c) =>
          c.id === String(params.id)
            ? { ...c, name: String(params.name), instructor: String(params.instructor) }
            : c
        )
      );
    }
  }, [params]);

  // حذف كورس نهائي
  const deleteCourse = (id: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
    setAddedCoursesIds((prev) => prev.filter((courseId) => courseId !== id));
    Alert.alert("Deleted", "The course has been deleted successfully.");
  };

  // render لكل كورس
  const renderCourse = ({ item }: any) => (
    <View style={styles.courseCard}>
      <Text style={styles.courseTitle}>{item.name}</Text>
      <Text style={styles.courseInstructor}>Instructor: {item.instructor}</Text>

      <View style={{ flexDirection: "row", gap: 10 }}>
        {/* زر Edit */}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() =>
            router.push({
              pathname: "./edit-course",
              params: {
                id: item.id,
                name: item.name,
                instructor: item.instructor,
              },
            })
          }
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>

        {/* زر Delete */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteCourse(item.id)}
        >
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Manage Courses</Text>

      {/* زر فتح صفحة Add Course */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("./add-course")}
      >
        <Text style={styles.addText}>+ Add Course</Text>
      </TouchableOpacity>

      {/* قائمة الكورسات */}
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourse}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20 },
  addButton: { backgroundColor: "#667eea", padding: 12, borderRadius: 8, alignItems: "center", marginBottom: 20 },
  addText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  courseCard: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 10 },
  courseTitle: { fontSize: 18, fontWeight: "bold" },
  courseInstructor: { color: "#666", marginBottom: 10 },
  deleteButton: { backgroundColor: "#ff4444", padding: 8, borderRadius: 6, alignItems: "center" },
  deleteText: { color: "#fff" },
  editButton: { backgroundColor: "#ffc107", padding: 8, borderRadius: 6, alignItems: "center" },
  editText: { color: "#000", fontWeight: "bold" },
});