
import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, getDoc,
  updateDoc, setDoc, Timestamp,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import './Enrollments.css';

export default function Enrollments({ user, onBack }) {
  const [students, setStudents]           = useState([]);
  const [courses, setCourses]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [selectedId, setSelectedId]       = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [saving, setSaving]               = useState(false);
  const [search, setSearch]               = useState('');

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (selectedId) loadEnrollment(selectedId);
  }, [selectedId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const usersSnap   = await getDocs(collection(db, 'users'));
      const coursesSnap = await getDocs(collection(db, 'courses'));

      setStudents(
        usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.role === 'user')
      );
      setCourses(
        coursesSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      );
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadEnrollment = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    setSelectedStudent(student);
    try {
      const snap = await getDoc(doc(db, 'enrollments', studentId));
      setSelectedCourses(new Set(snap.exists() ? snap.data().courseIds || [] : []));
    } catch (e) { setSelectedCourses(new Set()); }
  };

  const toggleCourse = (id) => {
    setSelectedCourses(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveEnrollment = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const now  = Timestamp.now();
      const ref  = doc(db, 'enrollments', selectedId);
      const snap = await getDoc(ref);
      const data = {
        userId:      selectedId,
        userEmail:   selectedStudent?.email || null,
        courseIds:   Array.from(selectedCourses),
        division:    selectedStudent?.division || 'computer_science',
        academicYear: selectedStudent?.academicYear || 2,
        term:        selectedStudent?.currentTerm || 1,
        submitted:   true,
        submittedAt: now,
        updatedAt:   now,
      };
      snap.exists()
        ? await updateDoc(ref, data)
        : await setDoc(ref, { ...data, createdAt: now });
      alert('Enrollment saved successfully!');
    } catch (e) {
      console.error(e);
      alert('Failed to save enrollment');
    } finally { setSaving(false); }
  };

  const filtered = students.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.displayName || s.fullName || '').toLowerCase().includes(search.toLowerCase())
  );

  const studentLabel = selectedStudent
    ? (selectedStudent.displayName || selectedStudent.fullName || selectedStudent.email?.split('@')[0])
    : '';

  return (
    <div className="enroll-page">

      {/* Top Bar */}
      <div className="enroll-topbar">
        <button className="enroll-back-btn" onClick={onBack}>← Back</button>
        <span className="enroll-topbar-title">📝 Course Enrollment Management</span>
      </div>

      {/* Body */}
      <div className="enroll-body">

        {/* ── Students Panel ── */}
        <div className="panel panel-students">
          <div className="panel-head">
            <div className="panel-head-row">
              <span className="panel-head-title">👨‍🎓 Students</span>
              <span className="panel-count">{filtered.length}</span>
            </div>
            <input
              className="panel-search"
              type="text"
              placeholder="Search students..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="students-scroll">
            {loading ? (
              <div className="panel-empty">
                <div className="spinner" />
                <div className="panel-empty-text">Loading...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div className="panel-empty">
                <div className="panel-empty-icon">🔍</div>
                <div className="panel-empty-text">No students found</div>
              </div>
            ) : filtered.map(s => (
              <div
                key={s.id}
                className={`student-row ${selectedId === s.id ? 'is-selected' : ''}`}
                onClick={() => setSelectedId(s.id)}
              >
                <div className="student-avatar">
                  {(s.displayName || s.fullName || s.email).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="student-name">{s.displayName || s.fullName || 'No Name'}</div>
                  <div className="student-email">{s.email}</div>
                </div>
                {selectedId === s.id && <span className="student-check">✓</span>}
              </div>
            ))}
          </div>
        </div>

        {/* ── Courses Panel ── */}
        <div className="panel panel-courses">
          {!selectedId ? (
            <div className="panel-empty">
              <div className="panel-empty-icon">👈</div>
              <div className="panel-empty-text">
                Select a student from the left panel<br />to manage their course enrollment
              </div>
            </div>
          ) : (
            <>
              <div className="panel-head">
                <div className="panel-head-row">
                  <span className="panel-head-title">📚 Courses for {studentLabel}</span>
                  <span className="panel-count">{selectedCourses.size} selected</span>
                </div>
              </div>

              <div className="courses-scroll">
                {courses.length === 0 ? (
                  <div className="panel-empty">
                    <div className="panel-empty-icon">📭</div>
                    <div className="panel-empty-text">No courses available</div>
                  </div>
                ) : courses.map(course => {
                  const sel = selectedCourses.has(course.id);
                  return (
                    <div
                      key={course.id}
                      className={`course-row ${sel ? 'is-selected' : ''}`}
                      onClick={() => toggleCourse(course.id)}
                    >
                      <div className="course-checkbox">
                        <span className="course-checkbox-tick">✓</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="course-name">{course.courseName || course.name}</div>
                        <div className="course-meta">
                          {course.courseCode && <span className="course-tag">{course.courseCode}</span>}
                          <span>Year {course.year}</span>
                          <span>Term {course.term}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="save-bar">
                <button className="save-btn" onClick={saveEnrollment} disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save Enrollment'}
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
