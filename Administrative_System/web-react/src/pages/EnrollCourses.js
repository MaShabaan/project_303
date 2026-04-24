import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, Timestamp, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
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
  const [submitting, setSubmitting] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [allCourses, setAllCourses] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [warning, setWarning] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintText, setComplaintText] = useState('');
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      loadEnrollment();
      loadAllCourses();
    }
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;
    loadAvailableCourses();
  }, [division, currentYear, currentTerm, user?.uid, enrollment]);

  const loadEnrollment = async () => {
    try {
      const enrollmentRef = doc(db, 'enrollments', user.uid);
      const enrollmentSnap = await getDoc(enrollmentRef);
      if (enrollmentSnap.exists()) {
        const data = enrollmentSnap.data();
        setEnrollment(data);
        setSelected(new Set(data.courseIds || []));
      }
    } catch (error) {
      console.error('Error loading enrollment:', error);
    }
  };

  const loadAllCourses = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        courseName: doc.data().courseName || doc.data().name || 'Course',
        courseCode: doc.data().courseCode || '',
        year: doc.data().year,
        term: doc.data().term,
        division: doc.data().division
      }));
      setAllCourses(list);
    } catch (error) {
      console.error('Error loading all courses:', error);
    }
  };

  const loadAvailableCourses = async () => {
    try {
      // جلب المواد: نفس الترم + سنوات أقل من أو تساوي السنة الحالية
      let yearsToFetch = [];
      if (currentYear === 2) {
        yearsToFetch = [2];
      } else if (currentYear === 3) {
        yearsToFetch = [2, 3];
      } else if (currentYear === 4) {
        yearsToFetch = [2, 3, 4];
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
        courseName: doc.data().courseName || doc.data().name || 'Course',
        courseCode: doc.data().courseCode || '',
        year: doc.data().year,
        term: doc.data().term,
        division: doc.data().division
      }));
      list.sort((a, b) => a.year - b.year);
      setAllCourses(prev => {
        const otherCourses = prev.filter(c => !list.find(lc => lc.id === c.id));
        return [...list, ...otherCourses];
      });
    } catch (error) {
      console.error('Error loading available courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitted = enrollment?.submitted === true;
  const canEdit = !submitted;

  const toggleCourse = (course) => {
    if (!canEdit) return;
    
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(course.id)) {
        next.delete(course.id);
      } else {
        if (next.size >= MAX_STUDENT_ENROLLMENT_COURSES) {
          setWarning(`⚠️ You can enroll in at most ${MAX_STUDENT_ENROLLMENT_COURSES} courses.`);
          setTimeout(() => setWarning(null), 3000);
          return prev;
        }
        next.add(course.id);
        setSuccess(`✅ "${course.courseName}" added to your selection.`);
        setTimeout(() => setSuccess(null), 2000);
      }
      return next;
    });
  };

  const submitFinal = async () => {
    if (!user?.uid || !profile) return;
    if (selected.size === 0) {
      setWarning('⚠️ Please select at least one course before submitting.');
      setTimeout(() => setWarning(null), 3000);
      return;
    }
    if (selected.size > MAX_STUDENT_ENROLLMENT_COURSES) {
      setWarning(`⚠️ Maximum ${MAX_STUDENT_ENROLLMENT_COURSES} courses allowed.`);
      setTimeout(() => setWarning(null), 3000);
      return;
    }
    
    setSubmitting(true);
    try {
      const enrollmentRef = doc(db, 'enrollments', user.uid);
      const enrollmentSnap = await getDoc(enrollmentRef);
      const now = Timestamp.now();
      const enrollmentData = {
        userId: user.uid,
        userEmail: profile.email || null,
        courseIds: Array.from(selected),
        division,
        academicYear: currentYear,
        term: currentTerm,
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
      
      setSuccess('✅ Your enrollment has been submitted successfully!');
      setTimeout(() => {
        onBack();
      }, 1500);
    } catch (error) {
      console.error(error);
      setWarning('❌ Could not submit enrollment. Try again.');
      setTimeout(() => setWarning(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  const submitComplaint = async () => {
    if (!complaintText.trim()) {
      alert('Please enter your reason');
      return;
    }
    
    setSubmittingComplaint(true);
    try {
      await addDoc(collection(db, 'enrollmentRequests'), {
        userId: user.uid,
        userEmail: user.email,
        userName: profile?.displayName || profile?.fullName || user.email.split('@')[0],
        academicYear: currentYear,
        term: currentTerm,
        division: division,
        currentCourses: enrollment?.courseIds || [],
        reason: complaintText.trim(),
        status: 'pending',
        createdAt: Timestamp.now(),
      });
      alert('Your request has been sent to the administrator.');
      setComplaintModal(false);
      setComplaintText('');
    } catch (error) {
      console.error(error);
      alert('Failed to send request. Please try again.');
    } finally {
      setSubmittingComplaint(false);
    }
  };


  const adminCourses = enrollment?.courseIds?.map(id => allCourses.find(c => c.id === id)).filter(c => c) || [];
  

  const availableToEnroll = allCourses.filter(c => 
    !enrollment?.courseIds?.includes(c.id) && 
    c.division === division && 
    c.term === currentTerm &&
    c.year <= currentYear
  );


  const coursesByYear = {
    2: availableToEnroll.filter(c => c.year === 2),
    3: availableToEnroll.filter(c => c.year === 3),
    4: availableToEnroll.filter(c => c.year === 4),
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
      {/* Top Bar */}
      <div className="enroll-courses-topbar">
        <button className="enroll-courses-back-btn" onClick={onBack}>← Back</button>
        <span className="enroll-courses-title">📚 Course Enrollment</span>
        <span className="enroll-courses-subtitle">Term {currentTerm} · Year {currentYear}</span>
      </div>

      {/* Body */}
      <div className="enroll-courses-body">
        <div className="enroll-courses-card">
          <div className="enroll-courses-info">
            <div className="info-label">YOUR CONTEXT</div>
            <div className="info-text">{departmentLabel}</div>
            <div className="info-sub">
              Division: {division === 'computer_science' ? '💻 Computer Science' : '📐 Special Mathematics'} · Year {currentYear} · Term {currentTerm}
            </div>
            <div className="info-hint">
              {currentYear === 2 ? (
                "You can only select courses from Year 2 (your current level)."
              ) : (
                `You can select courses from Year 2 up to Year ${currentYear} (your current level). Max ${MAX_STUDENT_ENROLLMENT_COURSES} courses total.`
              )}
            </div>
          </div>

          {/* Warning & Success Messages */}
          {warning && <div className="warning-message">{warning}</div>}
          {success && <div className="success-message">{success}</div>}

          {adminCourses.length > 0 && (
            <div className="admin-courses-section">
              <div className="section-title">📌 Courses Assigned by Admin</div>
              <div className="admin-courses-list">
                {adminCourses.map(course => {
                  let levelText = '';
                  if (course.year > currentYear) levelText = '📈 Higher Level';
                  else if (course.year < currentYear) levelText = '📉 Lower Level';
                  else levelText = '📊 Your Level';
                  
                  const isOtherDivision = course.division !== division;
                  
                  return (
                    <div key={course.id} className={`admin-course-item ${isOtherDivision ? 'other-division' : ''}`}>
                      <div className="admin-course-icon">🔒</div>
                      <div className="admin-course-info">
                        <div className="admin-course-name">{course.courseName}</div>
                        <div className="admin-course-meta">
                          {course.courseCode && <span className="meta-tag">{course.courseCode}</span>}
                          <span className="meta-tag">Year {course.year}</span>
                          <span className="meta-tag">Term {course.term}</span>
                          <span className={`level-tag ${course.year > currentYear ? 'higher' : course.year < currentYear ? 'lower' : 'current'}`}>
                            {levelText}
                          </span>
                          {isOtherDivision && (
                            <span className="other-division-tag"> Other Division ({course.division === 'computer_science' ? 'CS' : 'Math'})</span>
                          )}
                          {!isOtherDivision && course.division && (
                            <span className="same-division-tag">✓ {course.division === 'computer_science' ? 'CS' : 'Math'}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Enrollment Status */}
          {submitted ? (
            <div className="locked-card">
              <div className="locked-icon">🔒</div>
              <h3>Enrollment Locked</h3>
              <p>Your enrollment has been submitted and locked.</p>
              <button className="request-btn" onClick={() => setComplaintModal(true)}>
                📢 Request Change
              </button>
            </div>
          ) : (
            <>
              {/* Available Courses by Year */}
              <div className="section-header">
                <h3>📖 Available Courses (Term {currentTerm})</h3>
                <span className="selected-count">{selected.size} / {MAX_STUDENT_ENROLLMENT_COURSES} selected</span>
              </div>

              {/* Year 2 Courses */}
              {currentYear >= 2 && coursesByYear[2]?.length > 0 && (
                <div className="year-section">
                  <div className="year-title">📘 Year 2 Courses {currentYear === 2 ? '(Your Level)' : '(Lower Level)'}</div>
                  <div className="courses-list">
                    {coursesByYear[2].map(course => {
                      const isSelected = selected.has(course.id);
                      const isFull = selected.size >= MAX_STUDENT_ENROLLMENT_COURSES && !isSelected;
                      return (
                        <button
                          key={course.id}
                          className={`course-btn ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                          onClick={() => toggleCourse(course)}
                          disabled={isFull}
                        >
                          <div className="course-check">{isSelected ? '✓' : '○'}</div>
                          <div className="course-details">
                            <div className="course-title">{course.courseName}</div>
                            <div className="course-meta-row">
                              {course.courseCode && <span className="course-badge">{course.courseCode}</span>}
                              <span className="course-badge">Year {course.year}</span>
                              <span className="level-badge lower">📉 Lower Level</span>
                              <span className="division-badge">✓ {course.division === 'computer_science' ? 'CS' : 'Math'}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Year 3 Courses */}
              {currentYear >= 3 && coursesByYear[3]?.length > 0 && (
                <div className="year-section">
                  <div className="year-title">📗 Year 3 Courses {currentYear === 3 ? '(Your Level)' : '(Lower Level)'}</div>
                  <div className="courses-list">
                    {coursesByYear[3].map(course => {
                      const isSelected = selected.has(course.id);
                      const isFull = selected.size >= MAX_STUDENT_ENROLLMENT_COURSES && !isSelected;
                      return (
                        <button
                          key={course.id}
                          className={`course-btn ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                          onClick={() => toggleCourse(course)}
                          disabled={isFull}
                        >
                          <div className="course-check">{isSelected ? '✓' : '○'}</div>
                          <div className="course-details">
                            <div className="course-title">{course.courseName}</div>
                            <div className="course-meta-row">
                              {course.courseCode && <span className="course-badge">{course.courseCode}</span>}
                              <span className="course-badge">Year {course.year}</span>
                              <span className="level-badge lower">📉 Lower Level</span>
                              <span className="division-badge">✓ {course.division === 'computer_science' ? 'CS' : 'Math'}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Year 4 Courses */}
              {currentYear >= 4 && coursesByYear[4]?.length > 0 && (
                <div className="year-section">
                  <div className="year-title">📙 Year 4 Courses {currentYear === 4 ? '(Your Level)' : '(Higher Level)'}</div>
                  <div className="courses-list">
                    {coursesByYear[4].map(course => {
                      const isSelected = selected.has(course.id);
                      const isFull = selected.size >= MAX_STUDENT_ENROLLMENT_COURSES && !isSelected;
                      return (
                        <button
                          key={course.id}
                          className={`course-btn ${isSelected ? 'selected' : ''} ${isFull ? 'disabled' : ''}`}
                          onClick={() => toggleCourse(course)}
                          disabled={isFull}
                        >
                          <div className="course-check">{isSelected ? '✓' : '○'}</div>
                          <div className="course-details">
                            <div className="course-title">{course.courseName}</div>
                            <div className="course-meta-row">
                              {course.courseCode && <span className="course-badge">{course.courseCode}</span>}
                              <span className="course-badge">Year {course.year}</span>
                              <span className="level-badge higher">📈 Higher Level</span>
                              <span className="division-badge">✓ {course.division === 'computer_science' ? 'CS' : 'Math'}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {availableToEnroll.length === 0 && (
                <div className="empty-courses">No courses available for your selection.</div>
              )}

              <button className="submit-enroll-btn" onClick={submitFinal} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Enrollment'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Request Change Modal */}
      {complaintModal && (
        <div className="modal-overlay" onClick={() => setComplaintModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📢 Request Enrollment Change</h3>
              <button className="modal-close" onClick={() => setComplaintModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Please explain why you need to change your course enrollment:</p>
              <textarea
                className="complaint-textarea"
                placeholder="e.g., I need to drop a course, add a different course, or fix a scheduling conflict..."
                value={complaintText}
                onChange={(e) => setComplaintText(e.target.value)}
                rows={5}
              />
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setComplaintModal(false)}>Cancel</button>
                <button className="submit-complaint-btn" onClick={submitComplaint} disabled={submittingComplaint}>
                  {submittingComplaint ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}