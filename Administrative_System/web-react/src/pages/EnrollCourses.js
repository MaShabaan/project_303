import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { db, getGroupsByCourse } from '../services/firebase';
import { useAuth } from './ThemeContext';
import './EnrollCourses.css';

const MAX_STUDENT_ENROLLMENT_COURSES = 5;

export default function EnrollCourses({ onBack }) {
  const { user, profile } = useAuth();
  
  const currentYear = profile?.academicYear || 2;
  const currentTerm = profile?.currentTerm || 1;
  const division = profile?.division || 'computer_science';
  const departmentLabel = profile?.department || 'Mathematics Department';

  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(null);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [userRequests, setUserRequests] = useState([]);
  
  const [problemModal, setProblemModal] = useState(false);
  const [selectedProblemCourse, setSelectedProblemCourse] = useState('');
  const [problemText, setProblemText] = useState('');
  const [submittingProblem, setSubmittingProblem] = useState(false);
  
 
  const [historyModal, setHistoryModal] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(null);

  useEffect(() => {
    if (user?.uid) {
      loadEnrollment();
      loadAvailableCourses();
      loadUserRequests();
    }
  }, [user]);

  const loadEnrollment = async () => {
    try {
      const enrollmentRef = doc(db, 'enrollments', user.uid);
      const enrollmentSnap = await getDoc(enrollmentRef);
      if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data();
        setEnrollment(data);
        if (data.courses && Array.isArray(data.courses)) {
          setSelectedCourses(data.courses);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadAvailableCourses = async () => {
    setLoading(true);
    try {
      let yearsToFetch = [];
      for (let i = 2; i <= currentYear; i++) {
        yearsToFetch.push(i);
      }
      
      const q = query(
        collection(db, 'courses'),
        where('division', '==', division),
        where('term', '==', currentTerm),
        where('year', 'in', yearsToFetch)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        courseName: doc.data().courseName || 'Course',
        courseCode: doc.data().courseCode || '',
        year: doc.data().year,
      }));
      setAvailableCourses(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRequests = async () => {
    try {
      const q = query(
        collection(db, 'enrollmentRequests'),
        where('userId', '==', user?.uid)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
      setUserRequests(list);
    } catch (error) {
      console.error('Error loading user requests:', error);
    }
  };

  const submitProblem = async () => {
    if (!selectedProblemCourse) {
      alert('Please select a course');
      return;
    }
    if (!problemText.trim()) {
      alert('Please describe your problem');
      return;
    }
    
    const course = availableCourses.find(c => c.id === selectedProblemCourse);
    if (!course) return;
    
    setSubmittingProblem(true);
    try {
      await addDoc(collection(db, 'enrollmentRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName || profile?.fullName || user.email.split('@')[0],
        academicYear: currentYear,
        term: currentTerm,
        division: division,
        courseId: course.id,
        courseName: course.courseName,
        courseCode: course.courseCode,
        courseYear: course.year,
        reason: problemText.trim(),
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      alert('✅ Your problem report has been sent to the administrator.');
      setProblemModal(false);
      setSelectedProblemCourse('');
      setProblemText('');
      await loadUserRequests();
    } catch (error) {
      console.error(error);
      alert('Failed to send report. Please try again.');
    } finally {
      setSubmittingProblem(false);
    }
  };

  const deleteRequest = async (requestId) => {
    try {
      await deleteDoc(doc(db, 'enrollmentRequests', requestId));
      alert('✅ Request cancelled successfully');
      await loadUserRequests();
      setDeletingRequest(null);
    } catch (error) {
      console.error(error);
      alert('Failed to cancel request');
    }
  };

  const isSubmitted = enrollment?.submitted === true;
  const pendingCount = userRequests.filter(r => r.status === 'pending').length;

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pending': return <span className="status-badge pending">⏳ Pending</span>;
      case 'approved': return <span className="status-badge approved">✅ Approved</span>;
      case 'rejected': return <span className="status-badge rejected">❌ Rejected</span>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="enroll-courses-page">
        <div className="enroll-courses-topbar">
          <button className="enroll-courses-back-btn" onClick={onBack}>← Back</button>
          <span className="enroll-courses-title">📚 Course Enrollment</span>
        </div>
        <div className="enroll-courses-loading">
          <div className="enroll-courses-spinner" />
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="enroll-courses-page">
      <div className="enroll-courses-topbar">
        <button className="enroll-courses-back-btn" onClick={onBack}>← Back</button>
        <span className="enroll-courses-title">📚 Course Enrollment</span>
        <span className="enroll-courses-subtitle">Term {currentTerm} · Year {currentYear}</span>
        
        {/* Yellow Badge with pending count - opens history modal */}
        {pendingCount > 0 && (
          <button className="pending-badge" onClick={() => setHistoryModal(true)}>
            📋 {pendingCount}
          </button>
        )}
        {pendingCount === 0 && userRequests.length > 0 && (
          <button className="history-badge" onClick={() => setHistoryModal(true)}>
            📋 History
          </button>
        )}
      </div>

      <div className="enroll-courses-body">
        <div className="enroll-courses-card">
          <div className="enroll-courses-info">
            <div className="info-label">YOUR ENROLLMENT</div>
            <div className="info-text">{departmentLabel}</div>
            <div className="info-sub">
              Division: {division === 'computer_science' ? '💻 Computer Science' : '📐 Special Mathematics'} · Year {currentYear} · Term {currentTerm}
            </div>
            <div className="info-hint">
              {isSubmitted ? 'Your enrollment is locked. You can report problems with your enrolled courses.' : 'You can select up to 5 courses.'}
            </div>
          </div>

          {/* Display Selected Courses */}
          {selectedCourses.length > 0 && (
            <div className="selected-courses-section">
              <div className="section-header">
                <h3>📋 Your Enrolled Courses ({selectedCourses.length}/{MAX_STUDENT_ENROLLMENT_COURSES})</h3>
              </div>
              <div className="selected-courses-list">
                {selectedCourses.map(course => (
                  <div key={course.courseId} className="selected-course-card">
                    <div className="selected-course-info">
                      <div className="selected-course-name">{course.courseName}</div>
                      <div className="selected-course-meta">
                
                        <span className="meta-badge group-badge">📅 {course.groupName}</span>
                        <span className="meta-badge time-badge">{course.day} · {course.time}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Enroll Problems Button */}
          {isSubmitted && (
            <button 
              className="problems-btn"
              onClick={() => setProblemModal(true)}
            >
              ⚠️ Enrollments obstacles
            </button>
          )}
        </div>
      </div>

    
      {problemModal && (
        <div className="modal-overlay" onClick={() => setProblemModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Report Enrollment Problem</h3>
              <button className="modal-close" onClick={() => setProblemModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>📖 Select Course:</label>
                <select 
                  className="form-select"
                  value={selectedProblemCourse}
                  onChange={(e) => setSelectedProblemCourse(e.target.value)}
                >
                  <option value="">-- Choose a course --</option>
                  {availableCourses.map(course => {
                    const isEnrolled = selectedCourses.some(c => c.courseId === course.id);
                    return (
                      <option key={course.id} value={course.id}>
                        [Year {course.year}] {course.courseName} {isEnrolled ? '✓ (Enrolled)' : ' (Available)'}
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div className="form-group">
                <label>📝 Describe the problem:</label>
                <textarea
                  className="problem-textarea"
                  placeholder="e.g., I am enrolled in this course but I have a schedule conflict, or I want to drop this course..."
                  value={problemText}
                  onChange={(e) => setProblemText(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => {
                  setProblemModal(false);
                  setSelectedProblemCourse('');
                  setProblemText('');
                }}>Cancel</button>
                <button className="submit-btn" onClick={submitProblem} disabled={submittingProblem}>
                  {submittingProblem ? 'Sending...' : 'Send Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    
      {historyModal && (
        <div className="modal-overlay" onClick={() => setHistoryModal(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 My Requests History</h3>
              <button className="modal-close" onClick={() => setHistoryModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {userRequests.length === 0 ? (
                <div className="no-requests-message">No requests sent yet.</div>
              ) : (
                <div className="requests-list">
                  {userRequests.map(req => (
                    <div key={req.id} className="request-card">
                      <div className="request-header">
                        <span className="request-course-name">📚 {req.courseName}</span>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="request-date">
                        {req.createdAt?.toDate().toLocaleDateString()} at {req.createdAt?.toDate().toLocaleTimeString()}
                      </div>
                      <div className="request-reason">
                        <strong>Problem:</strong> {req.reason}
                      </div>
                      {req.status !== 'pending' && (
                        <div className={`request-response ${req.status === 'approved' ? 'response-approved' : 'response-rejected'}`}>
                          {req.status === 'approved' ? '✅ Your request has been approved.' : '❌ Your request has been rejected.'}
                          {req.processedAt && ` (${req.processedAt?.toDate().toLocaleDateString()})`}
                        </div>
                      )}
                      {req.status === 'pending' && (
                        <div className="request-actions">
                          <button 
                            className="cancel-request-btn"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to cancel this request?')) {
                                deleteRequest(req.id);
                              }
                            }}
                          >
                            ✖ Cancel Request
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}