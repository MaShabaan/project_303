// EnrollCourses.js - Complete with Group Capacity Check
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, setDoc, Timestamp, addDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
  const [groupCounts, setGroupCounts] = useState({});
  
  // Form states for adding courses
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [availableGroups, setAvailableGroups] = useState([]);
  const [groupsCache, setGroupsCache] = useState({});
  const [loadingGroups, setLoadingGroups] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
  const [problemModal, setProblemModal] = useState(false);
  const [selectedProblemCourse, setSelectedProblemCourse] = useState('');
  const [problemText, setProblemText] = useState('');
  const [submittingProblem, setSubmittingProblem] = useState(false);
  
  const [historyModal, setHistoryModal] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState(null);


  useEffect(() => {
    if (user?.uid) {
      loadAvailableCourses();
      loadGroupCounts();
    }
  }, [user, currentYear, currentTerm, division]);

  
  useEffect(() => {
    if (!user?.uid) return;
    
    setLoading(true);
    const enrollmentRef = doc(db, 'enrollments', user.uid);
    const unsubscribe = onSnapshot(enrollmentRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setEnrollment(data);
        if (data.courses && Array.isArray(data.courses)) {
          setSelectedCourses(data.courses);
        } else {
          setSelectedCourses([]);
        }
      } else {
        setEnrollment(null);
        setSelectedCourses([]);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error in enrollment listener:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    
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
    
    loadUserRequests();
    
    const q = query(collection(db, 'enrollmentRequests'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      list.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0));
      setUserRequests(list);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);


  useEffect(() => {
    if (selectedCourseId) {
      loadGroupsForCourse(selectedCourseId);
    } else {
      setAvailableGroups([]);
      setSelectedGroupId('');
    }
  }, [selectedCourseId]);

  const loadGroupCounts = async () => {
    try {
      const enrollmentsSnapshot = await getDocs(collection(db, 'enrollments'));
      const counts = {};
      
      for (const docSnap of enrollmentsSnapshot.docs) {
        const userCourses = docSnap.data().courses || [];
        for (const course of userCourses) {
          if (course.groupId) {
            counts[course.groupId] = (counts[course.groupId] || 0) + 1;
          }
        }
      }
      
      setGroupCounts(counts);
    } catch (error) {
      console.error('Error loading group counts:', error);
    }
  };

  const loadAvailableCourses = async () => {
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
        division: doc.data().division,
      }));
      setAvailableCourses(list);
    } catch (error) {
      console.error('Error loading available courses:', error);
    }
  };

  const loadGroupsForCourse = async (courseId) => {
    if (groupsCache[courseId]) {
      setAvailableGroups(groupsCache[courseId]);
      return;
    }
    
    setLoadingGroups(prev => ({ ...prev, [courseId]: true }));
    try {
      const groupsList = await getGroupsByCourse(courseId);
      setGroupsCache(prev => ({ ...prev, [courseId]: groupsList }));
      setAvailableGroups(groupsList);
    } catch (error) {
      console.error('Error loading groups:', error);
      setAvailableGroups([]);
    } finally {
      setLoadingGroups(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const checkScheduleConflict = (newGroup) => {
    for (const enrolled of selectedCourses) {
      if (enrolled.groupId && enrolled.day && enrolled.time) {
        if (enrolled.day === newGroup.day && enrolled.time === newGroup.time) {
          return {
            conflict: true,
            withCourse: enrolled.courseName,
            day: enrolled.day,
            time: enrolled.time
          };
        }
      }
    }
    return { conflict: false };
  };

  const checkGroupCapacity = (groupId, maxStudents) => {
    const currentCount = groupCounts[groupId] || 0;
    return {
      isFull: currentCount >= maxStudents,
      currentCount: currentCount,
      maxStudents: maxStudents
    };
  };

  const addCourse = async () => {
    if (!selectedCourseId) {
      alert('Please select a course');
      return;
    }
    
    if (!selectedGroupId) {
      alert('Please select a group for this course');
      return;
    }
    
    if (selectedCourses.some(c => c.courseId === selectedCourseId)) {
      alert('You have already selected this course');
      return;
    }
    
    if (selectedCourses.length >= MAX_STUDENT_ENROLLMENT_COURSES) {
      alert(`You can enroll in at most ${MAX_STUDENT_ENROLLMENT_COURSES} courses.`);
      return;
    }
    
    const course = availableCourses.find(c => c.id === selectedCourseId);
    const group = availableGroups.find(g => g.id === selectedGroupId);
    
    if (!course || !group) return;
    
   
    const capacity = checkGroupCapacity(group.id, group.maxStudents);
    if (capacity.isFull) {
      alert(`❌ Group "${group.groupName}" is full! (${capacity.currentCount}/${capacity.maxStudents} students)`);
      return;
    }
    
    
    const conflict = checkScheduleConflict(group);
    if (conflict.conflict) {
      alert(`⚠️ Schedule conflict! "${course.courseName}" (${group.day} ${group.time}) conflicts with "${conflict.withCourse}"`);
      return;
    }
    
    setSubmitting(true);
    try {
      const enrollmentRef = doc(db, 'enrollments', user.uid);
      const now = Timestamp.now();
      
      const newCourse = {
        courseId: course.id,
        courseName: course.courseName,
        courseCode: course.courseCode || '',
        year: course.year,
        groupId: group.id,
        groupName: group.groupName,
        day: group.day,
        time: group.time,
        room: group.room,
        enrolledAt: now,
      };
      
      const updatedCourses = [...selectedCourses, newCourse];
      
      await setDoc(enrollmentRef, {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName || profile?.fullName || user.email.split('@')[0],
        courses: updatedCourses,
        division,
        academicYear: currentYear,
        term: currentTerm,
        submitted: false,
        updatedAt: now,
      }, { merge: true });
      
      alert(`✅ "${course.courseName}" added to your selection`);
      setSelectedCourseId('');
      setSelectedGroupId('');
      setAvailableGroups([]);
      
   
      await loadGroupCounts();
      
    } catch (error) {
      console.error(error);
      alert('Failed to add course');
    } finally {
      setSubmitting(false);
    }
  };

  const removeCourse = async (courseId) => {
    const course = selectedCourses.find(c => c.courseId === courseId);
    if (!course) return;
    
    try {
      const enrollmentRef = doc(db, 'enrollments', user.uid);
      const updatedCourses = selectedCourses.filter(c => c.courseId !== courseId);
      
      await setDoc(enrollmentRef, {
        courses: updatedCourses,
        updatedAt: Timestamp.now(),
      }, { merge: true });
      
      alert(`❌ "${course.courseName}" removed from your selection`);
      
    
      await loadGroupCounts();
      
    } catch (error) {
      console.error(error);
      alert('Failed to remove course');
    }
  };

  const submitFinal = async () => {
    if (selectedCourses.length === 0) {
      alert('Please select at least one course before submitting.');
      return;
    }
    
    setSubmitting(true);
    try {
      const enrollmentRef = doc(db, 'enrollments', user.uid);
      const now = Timestamp.now();
      
      await setDoc(enrollmentRef, {
        submitted: true,
        submittedAt: now,
        updatedAt: now,
      }, { merge: true });
      
      alert('✅ Your enrollment has been submitted successfully!');
      onBack();
    } catch (error) {
      console.error(error);
      alert('❌ Could not submit enrollment. Try again.');
    } finally {
      setSubmitting(false);
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

  const availableToSelect = availableCourses.filter(
    course => !selectedCourses.some(c => c.courseId === course.id)
  );

  if (loading && selectedCourses.length === 0) {
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
              {isSubmitted ? 'Your enrollment is locked. You can report problems with your enrolled courses.' : `You can select up to ${MAX_STUDENT_ENROLLMENT_COURSES} courses.`}
            </div>
          </div>

          {!isSubmitted && (
            <div className="add-course-section">
              <div className="section-header">
                <h3>➕ Register for Courses</h3>
                <span className="selected-count">{selectedCourses.length} / {MAX_STUDENT_ENROLLMENT_COURSES}</span>
              </div>
              
              <div className="add-course-form">
                <div className="form-group">
                  <label>📖 Select Course:</label>
                  <select 
                    className="form-select"
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                  >
                    <option value="">-- Choose a course --</option>
                    {availableToSelect.map(course => (
                      <option key={course.id} value={course.id}>
                        [Year {course.year}] {course.courseName}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedCourseId && (
                  <div className="form-group">
                    <label>📅 Select Group & Schedule:</label>
                    <select 
                      className="form-select"
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      disabled={loadingGroups[selectedCourseId]}
                    >
                      <option value="">-- Choose a group --</option>
                      {availableGroups.map(group => {
                        const capacity = checkGroupCapacity(group.id, group.maxStudents);
                        return (
                          <option key={group.id} value={group.id} disabled={capacity.isFull}>
                            {group.groupName} · {group.day} · {group.time} · Room {group.room} · 👥 {capacity.currentCount}/{group.maxStudents} {capacity.isFull ? '(FULL)' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {loadingGroups[selectedCourseId] && <div className="loading-groups">Loading groups...</div>}
                    {availableGroups.length === 0 && !loadingGroups[selectedCourseId] && selectedCourseId && (
                      <div className="no-groups-warning">⚠️ No groups available for this course</div>
                    )}
                  </div>
                )}
                
                <button 
                  className="add-course-btn"
                  onClick={addCourse}
                  disabled={!selectedCourseId || !selectedGroupId || submitting}
                >
                  {submitting ? 'Adding...' : '+ Add Course'}
                </button>
              </div>
            </div>
          )}

     
          {selectedCourses.length > 0 && (
            <div className="selected-courses-section">
              <div className="section-header">
                <h3>📋 Your Selected Courses ({selectedCourses.length}/{MAX_STUDENT_ENROLLMENT_COURSES})</h3>
              </div>
              <div className="selected-courses-list">
                {selectedCourses.map(course => (
                  <div key={course.courseId} className="selected-course-card">
                    <div className="selected-course-info">
                      <div className="selected-course-name">{course.courseName}</div>
                      <div className="selected-course-meta">
                        <span className="meta-badge group-badge">📅 {course.groupName}</span>
                        <span className="meta-badge time-badge">{course.day} · {course.time}</span>
                        <span className="meta-badge room-badge">🏠 {course.room}</span>
                      </div>
                    </div>
                    {!isSubmitted && (
                      <button 
                        className="remove-course-btn"
                        onClick={() => removeCourse(course.courseId)}
                      >
                        ✖ Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

    
          {!isSubmitted && selectedCourses.length > 0 && (
            <button 
              className="submit-enroll-btn" 
              onClick={submitFinal} 
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : '📝 Submit Enrollment'}
            </button>
          )}

          {/* Enroll Problems Button (only after locked) */}
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
                  placeholder="e.g., Schedule conflict, want to drop this course, or other issue..."
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