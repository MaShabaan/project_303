import React, { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import "./ManageCourses.css";

export default function ManageCourses({ onBack }) {
  const [courses, setCourses] = useState([]);
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [year, setYear] = useState(2);
  const [term, setTerm] = useState(1);
  const [division, setDivision] = useState("computer_science");
  const [editingCourse, setEditingCourse] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    const snapshot = await getDocs(collection(db, "courses"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setCourses(data);
  };

  const handleAddCourse = async () => {
    if (!courseName) return alert("Enter course name");

    await addDoc(collection(db, "courses"), {
      courseName,
      courseCode,
      year,
      term,
      division,
    });

    setCourseName("");
    setCourseCode("");
    loadCourses();
  };

  const handleDelete = async (id) => {
    await deleteDoc(doc(db, "courses", id));
    loadCourses();
  };

  const handleEdit = (course) => {
    setEditingCourse(course);
    setCourseName(course.courseName);
    setCourseCode(course.courseCode);
    setYear(course.year);
    setTerm(course.term);
    setDivision(course.division);
  };

  const handleUpdate = async () => {
    await updateDoc(doc(db, "courses", editingCourse.id), {
      courseName,
      courseCode,
      year,
      term,
      division,
    });

    setEditingCourse(null);
    setCourseName("");
    setCourseCode("");
    loadCourses();
  };

  return (
    <div className="container">

      {/* 🔥 زرار الرجوع */}
      <button className="back-btn" onClick={onBack}>
        ⬅ Back to Dashboard
      </button>

      <h1>📊 Manage Courses</h1>

      {/* FORM */}
      <div className="form">
        <input
          placeholder="Course Name"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
        />

        <input
          placeholder="Course Code"
          value={courseCode}
          onChange={(e) => setCourseCode(e.target.value)}
        />

        <select value={division} onChange={(e) => setDivision(e.target.value)}>
          <option value="computer_science">CS</option>
          <option value="special_mathematics">Math</option>
        </select>

        <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
          <option value={2}>Year 2</option>
          <option value={3}>Year 3</option>
          <option value={4}>Year 4</option>
        </select>

        <select value={term} onChange={(e) => setTerm(Number(e.target.value))}>
          <option value={1}>Term 1</option>
          <option value={2}>Term 2</option>
        </select>

        {editingCourse ? (
          <button onClick={handleUpdate}>Update</button>
        ) : (
          <button onClick={handleAddCourse}>Add</button>
        )}
      </div>

      {/* LIST */}
      <div className="list">
        {courses.map((course) => (
          <div className="card" key={course.id}>
            <h3>{course.courseName}</h3>
            <p>{course.courseCode}</p>
            <p>
              {course.division} | Year {course.year} | Term {course.term}
            </p>

            <button onClick={() => handleEdit(course)}>Edit</button>
            <button onClick={() => handleDelete(course.id)}>Delete</button>
          </div>
        ))}
      </div>

    </div>
  );
}