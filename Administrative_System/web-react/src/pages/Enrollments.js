

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Enrollments.css';

export default function Enrollments({ user, onBack }) {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourseIds, setSelectedCourseIds] = useState(new Set());
  const [enrollmentData, setEnrollmentData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedStudentId) {
      loadEnrollment(selectedStudentId);
    }
  }, [selectedStudentId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // جلب الطلاب
      const usersSnap = await getDocs(collection(db, 'users'));
      const studentsList = usersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === 'user');
      setStudents(studentsList);

      // جلب المواد
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const coursesList = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(coursesList);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollment = async (studentId) => {
    try {
      const student = students.find(s => s.id === studentId);
      setSelectedStudent(student);
      
      const enrollmentRef = doc(db, 'enrollments', studentId);
      const enrollmentSnap = await getDoc(enrollmentRef);
      
      if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data();
        setEnrollmentData(data);
        setSelectedCourseIds(new Set(data.courseIds || []));
      } else {
        setEnrollmentData(null);
        setSelectedCourseIds(new Set());
      }
    } catch (error) {
      console.error('Error loading enrollment:', error);
    }
  };

  const toggleCourse = (courseId) => {
    setSelectedCourseIds(prev => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const saveEnrollment = async () => {
    if (!selectedStudentId) return;
    
    setSaving(true);
    try {
      const now = Timestamp.now();
      const enrollmentRef = doc(db, 'enrollments', selectedStudentId);
      const enrollmentSnap = await getDoc(enrollmentRef);
      
      const enrollmentData = {
        userId: selectedStudentId,
        userEmail: selectedStudent?.email || null,
        courseIds: Array.from(selectedCourseIds),
        division: selectedStudent?.division || 'computer_science',
        academicYear: selectedStudent?.academicYear || 2,
        term: selectedStudent?.currentTerm || 1,
        submitted: true,
        submittedAt: now,
        updatedAt: now,
      };
      
      if (!enrollmentSnap.exists()) {
        enrollmentData.createdAt = now;
        await setDoc(enrollmentRef, enrollmentData);
      } else {
        await updateDoc(enrollmentRef, enrollmentData);
      }
      
      alert('Enrollment saved successfully!');
      await loadEnrollment(selectedStudentId);
    } catch (error) {
      console.error('Error saving enrollment:', error);
      alert('Failed to save enrollment');
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.displayName || student.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="enrollments-container">
      <div className="enrollments-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>📝 Course Enrollment Management</h1>
        <div></div>
      </div>

      <div className="enrollments-content">
        <div className="students-panel">
          <div className="panel-header">
            <h3>👨‍🎓 Students</h3>
            <input
              type="text"
              className="search-input"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="students-list">
            {filteredStudents.length === 0 ? (
              <div className="empty-students">No students found</div>
            ) : (
              filteredStudents.map(student => (
                <div
                  key={student.id}
                  className={`student-item ${selectedStudentId === student.id ? 'selected' : ''}`}
                  onClick={() => setSelectedStudentId(student.id)}
                >
                  <div className="student-avatar">
                    {(student.displayName || student.fullName || student.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="student-info">
                    <div className="student-name">{student.displayName || student.fullName || 'No Name'}</div>
                    <div className="student-email">{student.email}</div>
                  </div>
                  {selectedStudentId === student.id && (
                    <div className="selected-indicator">✓</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="courses-panel">
          {selectedStudentId ? (
            <>
              <div className="panel-header">
                <h3>📚 Courses for {selectedStudent?.displayName || selectedStudent?.fullName || selectedStudent?.email?.split('@')[0]}</h3>
                <div className="selected-count">{selectedCourseIds.size} selected</div>
              </div>
              <div className="courses-list">
                {courses.length === 0 ? (
                  <div className="empty-courses">No courses available</div>
                ) : (
                  courses.map(course => {
                    const isSelected = selectedCourseIds.has(course.id);
                    return (
                      <div
                        key={course.id}
                        className={`course-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleCourse(course.id)}
                      >
                        <div className="course-checkbox">
                          {isSelected ? '☑️' : '⬜'}
                        </div>
                        <div className="course-info">
                          <div className="course-name">{course.courseName || course.name}</div>
                          <div className="course-meta">
                            {course.courseCode && <span>Code: {course.courseCode} · </span>}
                            Year {course.year} · Term {course.term}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <button 
                className="save-btn" 
                onClick={saveEnrollment} 
                disabled={saving}
              >
                {saving ? 'Saving...' : '💾 Save Enrollment'}
              </button>
            </>
          ) : (
            <div className="no-selection">
              <div className="no-selection-icon">👈</div>
              <div className="no-selection-text">Select a student from the left panel to manage their enrollment</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}