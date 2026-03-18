import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";

export default function ManageCourses() {
  const [courses, setCourses] = useState<any[]>([]);

  // جلب كل الكورسات من Firebase عند فتح الصفحة
  const fetchCourses = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "courses"));
      const list: any[] = [];
      querySnapshot.forEach((docItem) => {
        list.push({
          id: docItem.id,
          ...docItem.data(),
        });
      });
      setCourses(list);
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to fetch courses");
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // حذف كورس
  const deleteCourse = async (id: string) => {
    try {
      await deleteDoc(doc(db, "courses", id));
      // إعادة تحميل الكورسات بعد الحذف
      fetchCourses();
      Alert.alert("Deleted", "The course has been deleted successfully.");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to delete course");
    }
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
  addButton: {
    backgroundColor: "#667eea",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  addText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  courseCard: { backgroundColor: "#fff", padding: 15, borderRadius: 10, marginBottom: 10 },
  courseTitle: { fontSize: 18, fontWeight: "bold" },
  courseInstructor: { color: "#666", marginBottom: 10 },
  deleteButton: { backgroundColor: "#ff4444", padding: 8, borderRadius: 6, alignItems: "center" },
  deleteText: { color: "#fff" },
  editButton: { backgroundColor: "#ffc107", padding: 8, borderRadius: 6, alignItems: "center" },
  editText: { color: "#000", fontWeight: "bold" },
});