import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../config/firebase";
import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";

export default function AddCourse() {
  const [courseName, setCourseName] = useState("");
  const [instructor, setInstructor] = useState("");

  const handleAdd = async () => {
    if (!courseName || !instructor) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    try {
      // إضافة الكورس مباشرة في Firestore
      await addDoc(collection(db, "courses"), {
        name: courseName,
        instructor,
      });

      Alert.alert("Success", "Course added successfully!");

      // إعادة التوجيه لصفحة Manage Courses
      router.replace("./courses");
    } catch (error) {
      console.log(error);
      Alert.alert("Error", "Failed to add course");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Add New Course</Text>

      <TextInput
        placeholder="Course Name"
        value={courseName}
        onChangeText={setCourseName}
        style={styles.input}
      />

      <TextInput
        placeholder="Instructor Name"
        value={instructor}
        onChangeText={setInstructor}
        style={styles.input}
      />

      <TouchableOpacity style={styles.button} onPress={handleAdd}>
        <Text style={styles.buttonText}>Add Course</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  button: {
    backgroundColor: "#667eea",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});