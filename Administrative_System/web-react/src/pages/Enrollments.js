

import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, getDoc,
  updateDoc, setDoc, Timestamp, query, where,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import './Enrollments.css';

const DIVISION_LABEL = {
  computer_science:    { label: 'Computer Science',    icon: '💻', color: '#4f46e5' },
  special_mathematics: { label: 'Special Mathematics', icon: '📐', color: '#10b981' },
};

export default function Enrollments({ user, onBack }) {
  const [students, setStudents]             = useState([]);
  const [courses, setCourses]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedId, setSelectedId]         = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedCourses, setSelectedCourses] = useState(new Set());
  const [saving, setSaving]                 = useState(false);
  const [search, setSearch]                 = useState('');
  
  // Requests state
  const [requests, setRequests]             = useState([]);
  const [showRequests, setShowRequests]     = useState(false);
  const [processingRequest, setProcessingRequest] = useState(false);

  // Warning modal state
  const [warnModal, setWarnModal]           = useState(false);
  const [warnedCourse, setWarnedCourse]     = useState(null);

  useEffect(() => { 
    loadData(); 
    loadRequests();
  }, []);

  useEffect(() => {
    if (selectedId) loadEnrollment(selectedId);
  }, [selectedId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersSnap, coursesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'courses')),
      ]);
      setStudents(
        usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.role === 'user')
      );
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadRequests = async () => {
    try {
      const q = query(collection(db, 'enrollmentRequests'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRequests(list);
    } catch (error) {
      console.error('Error loading requests:', error);
    }
  };

  const loadEnrollment = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    setSelectedStudent(student);
    try {
      const snap = await getDoc(doc(db, 'enrollments', studentId));
      setSelectedCourses(new Set(snap.exists() ? snap.data().courseIds || [] : []));
    } catch { setSelectedCourses(new Set()); }
  };

  const toggleCourse = (course) => {
    if (selectedCourses.has(course.id)) {
      setSelectedCourses(prev => {
        const next = new Set(prev);
        next.delete(course.id);
        return next;
      });
      return;
    }

    const studentDivision = selectedStudent?.division;

    if (
      studentDivision &&
      course.division &&
      course.division !== studentDivision
    ) {
      setWarnedCourse(course);
      setWarnModal(true);
      return;
    }

    setSelectedCourses(prev => {
      const next = new Set(prev);
      next.add(course.id);
      return next;
    });
  };

  const forceEnroll = () => {
    if (!warnedCourse) return;
    setSelectedCourses(prev => {
      const next = new Set(prev);
      next.add(warnedCourse.id);
      return next;
    });
    setWarnModal(false);
    setWarnedCourse(null);
  };

  const saveEnrollment = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const now = Timestamp.now();
      const ref = doc(db, 'enrollments', selectedId);
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

  const handleRequest = async (requestId, studentId, requestedCourses, action) => {
    setProcessingRequest(true);
    const now = Timestamp.now();
    try {
      if (action === 'approve') {
        const enrollmentRef = doc(db, 'enrollments', studentId);
        const enrollmentSnap = await getDoc(enrollmentRef);
        const currentCourses = enrollmentSnap.exists() ? enrollmentSnap.data().courseIds || [] : [];
        const newCourses = [...new Set([...currentCourses, ...requestedCourses])];
        
        const data = {
          userId: studentId,
          userEmail: selectedStudent?.email || null,
          courseIds: newCourses,
          division: selectedStudent?.division || 'computer_science',
          academicYear: selectedStudent?.academicYear || 2,
          term: selectedStudent?.currentTerm || 1,
          submitted: true,
          submittedAt: now,
          updatedAt: now,
        };
        
        if (!enrollmentSnap.exists()) {
          data.createdAt = now;
          await setDoc(enrollmentRef, data);
        } else {
          await updateDoc(enrollmentRef, data);
        }
        
        await updateDoc(doc(db, 'enrollmentRequests', requestId), {
          status: 'approved',
          processedAt: now,
          processedBy: user?.email,
        });
        
        alert('Request approved and enrollment updated!');
        
        if (selectedId === studentId) {
          await loadEnrollment(studentId);
        }
        await loadRequests();
        
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'enrollmentRequests', requestId), {
          status: 'rejected',
          processedAt: now,
          processedBy: user?.email,
        });
        alert('Request rejected');
        await loadRequests();
      }
    } catch (error) {
      console.error('Error processing request:', error);
      alert('Failed to process request');
    } finally {
      setProcessingRequest(false);
    }
  };

  const filtered = students.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.displayName || s.fullName || '').toLowerCase().includes(search.toLowerCase())
  );

  const studentLabel = selectedStudent
    ? (selectedStudent.displayName || selectedStudent.fullName || selectedStudent.email?.split('@')[0])
    : '';

  const studentDiv = selectedStudent?.division;
  const studentDivInfo = studentDiv ? DIVISION_LABEL[studentDiv] : null;
  const studentYear = selectedStudent?.academicYear || 2;
  const studentTerm = selectedStudent?.currentTerm || 1;

  const matchingCourses = courses.filter(c => !studentDiv || c.division === studentDiv);
  const otherCourses    = courses.filter(c => studentDiv && c.division !== studentDiv);

  return (
    <div className="enroll-page">

      {/* Top Bar */}
      <div className="enroll-topbar">
        <button className="enroll-back-btn" onClick={onBack}>← Back</button>
        <span className="enroll-topbar-title">📝 Course Enrollment Management</span>
        {requests.length > 0 && (
          <button className="requests-badge" onClick={() => setShowRequests(true)}>
            📢 {requests.length} Pending Request{requests.length > 1 ? 's' : ''}
          </button>
        )}
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
            ) : filtered.map(s => {
              const divInfo = s.division ? DIVISION_LABEL[s.division] : null;
              return (
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
                    <div className="student-info-row">
                      {divInfo && (
                        <span className="student-div-tag" style={{ color: divInfo.color }}>
                          {divInfo.icon} {divInfo.label}
                        </span>
                      )}
                      <span className="student-year-term">
                        📅 Year {s.academicYear || 2} · Term {s.currentTerm || 1}
                      </span>
                    </div>
                  </div>
                  {selectedId === s.id && <span className="student-check">✓</span>}
                </div>
              );
            })}
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
                <div className="student-info-banner">
                  <span className="student-badge">
                    {studentDivInfo?.icon} {studentDivInfo?.label}
                  </span>
                  <span className="student-badge">
                    📅 Year {studentYear} · Term {studentTerm}
                  </span>
                </div>
                {studentDivInfo && (
                  <div className="student-div-banner" style={{ '--div-color': studentDivInfo.color }}>
                    <span>{studentDivInfo.icon} {studentDivInfo.label}</span>
                    <span className="div-banner-note">Courses from other divisions will show a warning</span>
                  </div>
                )}
              </div>

              <div className="courses-scroll">

                {/* Matching division courses */}
                {matchingCourses.length > 0 && (
                  <>
                    {studentDiv && (
                      <div className="courses-section-label">
                        {studentDivInfo?.icon} {studentDivInfo?.label} Courses
                      </div>
                    )}
                    {matchingCourses.map(course => {
                      const sel = selectedCourses.has(course.id);
                      return (
                        <div
                          key={course.id}
                          className={`course-row ${sel ? 'is-selected' : ''}`}
                          onClick={() => toggleCourse(course)}
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
                  </>
                )}

                {/* Other division courses */}
                {otherCourses.length > 0 && (
                  <>
                    <div className="courses-section-label courses-section-other">
                      ⚠️ Other Division Courses
                    </div>
                    {otherCourses.map(course => {
                      const sel = selectedCourses.has(course.id);
                      const otherDivInfo = DIVISION_LABEL[course.division];
                      return (
                        <div
                          key={course.id}
                          className={`course-row course-row-other ${sel ? 'is-selected' : ''}`}
                          onClick={() => toggleCourse(course)}
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
                              {otherDivInfo && (
                                <span className="course-tag course-tag-other">
                                  {otherDivInfo.icon} {otherDivInfo.label}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="course-warn-icon" title="Different division">⚠️</div>
                        </div>
                      );
                    })}
                  </>
                )}

                {courses.length === 0 && (
                  <div className="panel-empty">
                    <div className="panel-empty-icon">📭</div>
                    <div className="panel-empty-text">No courses available</div>
                  </div>
                )}
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

      {/* Requests Modal */}
      {showRequests && (
        <div className="requests-overlay" onClick={() => setShowRequests(false)}>
          <div className="requests-modal" onClick={e => e.stopPropagation()}>
            <div className="requests-modal-header">
              <h3>📢 Enrollment Change Requests</h3>
              <button className="requests-modal-close" onClick={() => setShowRequests(false)}>✕</button>
            </div>
            <div className="requests-modal-body">
              {requests.length === 0 ? (
                <div className="no-requests">No pending requests</div>
              ) : (
                requests.map(req => {
                  const student = students.find(s => s.id === req.userId);
                  const requestedCourseNames = req.currentCourses?.map(id => {
                    const course = courses.find(c => c.id === id);
                    return course?.courseName || id;
                  }) || [];
                  
                  return (
                    <div key={req.id} className="request-card">
                      <div className="request-header">
                        <div className="request-student">
                          <strong>{req.userName || student?.displayName || student?.fullName || 'Student'}</strong>
                          <span className="request-email">{req.userEmail}</span>
                        </div>
                        <div className="request-date">
                          {req.createdAt?.toDate().toLocaleDateString()}
                        </div>
                      </div>
                      <div className="request-details">
                        <div className="request-info">
                          <span>Year {req.academicYear} · Term {req.term}</span>
                          <span>{req.division === 'computer_science' ? '💻 CS' : '📐 Math'}</span>
                        </div>
                        <div className="request-reason">
                          <strong>Reason:</strong> {req.reason}
                        </div>
                        {requestedCourseNames.length > 0 && (
                          <div className="request-courses">
                            <strong>Requested changes for:</strong>
                            <div className="request-courses-list">
                              {requestedCourseNames.map((name, idx) => (
                                <span key={idx} className="request-course-tag">{name}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="request-actions">
                        <button 
                          className="request-reject-btn" 
                          onClick={() => handleRequest(req.id, req.userId, req.currentCourses, 'reject')}
                          disabled={processingRequest}
                        >
                          Reject
                        </button>
                        <button 
                          className="request-approve-btn" 
                          onClick={() => handleRequest(req.id, req.userId, req.currentCourses, 'approve')}
                          disabled={processingRequest}
                        >
                          Approve & Enroll
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Division Warning Modal */}
      {warnModal && warnedCourse && (
        <div className="warn-overlay" onClick={() => { setWarnModal(false); setWarnedCourse(null); }}>
          <div className="warn-modal" onClick={e => e.stopPropagation()}>
            <div className="warn-icon-wrap">
              <div className="warn-icon-circle">⚠️</div>
            </div>
            <h3 className="warn-title">Division Mismatch</h3>
            <p className="warn-desc">
              This course belongs to a different division than the student's.
            </p>
            <div className="warn-info-grid">
              <div className="warn-info-card warn-info-student">
                <div className="warn-info-label">STUDENT DIVISION</div>
                <div className="warn-info-value">
                  {studentDivInfo?.icon} {studentDivInfo?.label || '—'}
                </div>
              </div>
              <div className="warn-info-arrow">→</div>
              <div className="warn-info-card warn-info-course">
                <div className="warn-info-label">COURSE DIVISION</div>
                <div className="warn-info-value">
                  {DIVISION_LABEL[warnedCourse.division]?.icon} {DIVISION_LABEL[warnedCourse.division]?.label || '—'}
                </div>
              </div>
            </div>
            <div className="warn-course-box">
              <div className="warn-course-name">{warnedCourse.courseName}</div>
              {warnedCourse.courseCode && (
                <div className="warn-course-meta">{warnedCourse.courseCode} · Year {warnedCourse.year} · Term {warnedCourse.term}</div>
              )}
            </div>
            <p className="warn-question">Do you still want to enroll this student in this course?</p>
            <div className="warn-actions">
              <button className="warn-cancel-btn" onClick={() => { setWarnModal(false); setWarnedCourse(null); }}>
                Cancel
              </button>
              <button className="warn-confirm-btn" onClick={forceEnroll}>Enroll Anyway</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}