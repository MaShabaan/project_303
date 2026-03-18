import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import { useLocalSearchParams, router } from "expo-router";
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";

export default function EditCourse() {
  const params = useLocalSearchParams();
  const [courseName, setCourseName] = useState(String(params.name));
  const [instructor, setInstructor] = useState(String(params.instructor));

  const handleSave = async () => {
    if (!courseName || !instructor) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
  
      const courseRef = doc(db, "courses", String(params.id));
      await updateDoc(courseRef, {
        name: courseName,
        instructor,
      });

      Alert.alert("Success", "Course updated successfully!");

      router.replace("./courses");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to update course");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Course</Text>

      <TextInput
        style={styles.input}
        value={courseName}
        onChangeText={setCourseName}
        placeholder="Course Name"
      />
      <TextInput
        style={styles.input}
        value={instructor}
        onChangeText={setInstructor}
        placeholder="Instructor Name"
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  title: { fontSize: 26, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, marginBottom: 15 },
  saveButton: { backgroundColor: "#667eea", padding: 12, borderRadius: 8, alignItems: "center" },
  saveText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});