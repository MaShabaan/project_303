

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './ThemeContext';
import './RateCourse.css';

const NPS_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const getNpsColor = (n) => {
  if (n <= 3) return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', activeBg: '#ef4444' };
  if (n <= 6) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', activeBg: '#f59e0b' };
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', activeBg: '#10b981' };
};

const getNpsLabel = (n) => {
  if (n === null) return '';
  if (n <= 3) return '😞 Not satisfied';
  if (n <= 6) return '😐 Average';
  if (n <= 8) return '😊 Good experience!';
  return '🤩 Excellent!';
};

const getInstructorLabel = (n) => {
  if (n === null) return '';
  if (n <= 3) return '😞 Needs improvement';
  if (n <= 6) return '😐 Average';
  if (n <= 8) return '😊 Good';
  return '🤩 Excellent!';
};

export default function RateCourse({ onBack }) {
  const { user, profile } = useAuth();

  const division = profile?.division ?? 'computer_science';
  const academicYear = profile?.academicYear ?? 2;
  const currentTerm = profile?.currentTerm ?? 1;
  const divisionLabel = division === 'computer_science' ? 'Computer Science' : 'Special Mathematics';
  const divisionIcon = division === 'computer_science' ? '💻' : '📐';

  const [step, setStep] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [instructor, setInstructor] = useState('');
  const [courseRating, setCourseRating] = useState(null);
  const [instructorRating, setInstructorRating] = useState(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [ratedCourses, setRatedCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (user?.uid) loadRatedCourses();
  }, [user]);

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const q = query(
          collection(db, 'courses'),
          where('division', '==', division),
          where('year', '==', academicYear),
          where('term', '==', currentTerm)
        );
        const snapshot = await getDocs(q);
        const courses = snapshot.docs.map(doc => doc.data().courseName);
        setAvailableCourses(courses);
      } catch (error) {
        console.error('Error fetching courses:', error);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [division, academicYear, currentTerm]);

  const loadRatedCourses = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, 'feedback'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const courses = snapshot.docs.map(d => d.data().courseName);
      setRatedCourses(courses);
    } catch (error) {
      console.error('Error loading rated courses:', error);
    }
  };

  const isAlreadyRated = (courseName) => ratedCourses.includes(courseName);

  const goNext = async () => {
    if (step === 1) {
      if (!selectedCourse) {
        alert('Please select a course.');
        return;
      }
      if (!instructor.trim()) {
        alert('Please enter the instructor name.');
        return;
      }

      setCheckingDuplicate(true);
      try {
        const q = query(
          collection(db, 'feedback'),
          where('userId', '==', user?.uid),
          where('courseName', '==', selectedCourse)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          alert(`You have already rated "${selectedCourse}" before.\n\nYou can only rate each course once.`);
          setCheckingDuplicate(false);
          return;
        }
      } catch (error) {
        console.error('Duplicate check error:', error);
      } finally {
        setCheckingDuplicate(false);
      }
    }
    if (step === 2 && courseRating === null) {
      alert('Please select a course rating.');
      return;
    }
    if (step === 3 && instructorRating === null) {
      alert('Please select an instructor rating.');
      return;
    }
    setStep(s => s + 1);
  };

  const goBack = () => {
    if (step > 1) setStep(s => s - 1);
    else onBack();
  };

  const handleSubmit = async () => {
    if (!user?.uid || !user?.email) {
      alert('You must be signed in.');
      return;
    }
    setLoading(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: user.uid,
        userEmail: user.email,
        courseName: selectedCourse,
        instructor: instructor.trim(),
        courseRating: courseRating,
        instructorRating: instructorRating,
        comments: comments,
        year: academicYear,
        term: currentTerm,
        division: division,
        createdAt: Timestamp.now(),
      });
      alert('Thank you! 🎉 Your feedback has been submitted successfully.');
      onBack();
    } catch (error) {
      console.error(error);
      alert('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="rate-course-container">
      <div className="rate-course-header">
        <button className="back-button" onClick={goBack}>← Back</button>
        <div className="header-center">
          <h1 className="header-title">⭐ Rate a Course</h1>
          <p className="header-sub">Step {step} of {totalSteps}</p>
        </div>
        <div className="progress-circle">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#ede9fe" strokeWidth="3" />
            <circle
              cx="24"
              cy="24"
              r="20"
              fill="none"
              stroke={step === totalSteps ? '#10b981' : '#7c3aed'}
              strokeWidth="3"
              strokeDasharray="125.6"
              strokeDashoffset={125.6 - (progress / 100) * 125.6}
              strokeLinecap="round"
              transform="rotate(-90 24 24)"
            />
          </svg>
          <div className="progress-inner">
            {step === totalSteps ? '✓' : step}
          </div>
        </div>
      </div>

      <div className="division-banner">
        <div className="division-icon">{divisionIcon}</div>
        <div>
          <div className="division-label">YOUR DIVISION</div>
          <div className="division-name">{divisionLabel}</div>
        </div>
      </div>

      <div className="steps-row">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="step-item">
            <div className={`step-dot ${step >= s ? 'active' : ''}`}>
              <span>{step > s ? '✓' : s}</span>
            </div>
            {s < 4 && <div className={`step-line ${step > s ? 'active' : ''}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div>
          <div className="card">
            <div className="info-row">
              <span className="info-label">Year {academicYear} — Term {currentTerm}</span>
            </div>
          </div>

          <div className="card">
            <label className="section-label">SELECT COURSE</label>
            {loadingCourses ? (
              <div className="loading-state">Loading courses for Term {currentTerm}...</div>
            ) : availableCourses.length === 0 ? (
              <div className="empty-state-small">No courses for Term {currentTerm}</div>
            ) : (
              <div className="course-list">
                {availableCourses.map((course, i) => {
                  const alreadyRated = isAlreadyRated(course);
                  const isSelected = selectedCourse === course;
                  return (
                    <button
                      key={i}
                      className={`course-item ${isSelected ? 'selected' : ''} ${alreadyRated ? 'rated' : ''}`}
                      onClick={() => {
                        if (alreadyRated) {
                          alert(`You've already rated "${course}".`);
                          return;
                        }
                        setSelectedCourse(course);
                      }}
                    >
                      <div className={`course-num ${isSelected ? 'selected' : ''} ${alreadyRated ? 'rated' : ''}`}>
                        {alreadyRated ? '✓' : i + 1}
                      </div>
                      <span className="course-name">{course}</span>
                      {alreadyRated && <span className="rated-badge">Rated</span>}
                      {isSelected && !alreadyRated && <span className="course-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <label className="section-label">INSTRUCTOR NAME</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Dr. Ahmed Hassan"
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3 className="step-title">Course Rating</h3>
          <p className="step-desc">How satisfied are you with <strong>"{selectedCourse}"</strong>?</p>
          <div className="nps-grid">
            {NPS_SCALE.map(n => {
              const colors = getNpsColor(n);
              const isSelected = courseRating === n;
              return (
                <button
                  key={n}
                  className={`nps-btn ${isSelected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: isSelected ? colors.activeBg : colors.bg,
                    borderColor: colors.border
                  }}
                  onClick={() => setCourseRating(n)}
                >
                  <span style={{ color: isSelected ? '#fff' : colors.text }}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="nps-labels">
            <span>Not satisfied</span>
            <span>Very satisfied</span>
          </div>
          {courseRating !== null && (
            <div className="nps-result">
              <span>{getNpsLabel(courseRating)}</span>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="card">
          <h3 className="step-title">Instructor Rating</h3>
          <p className="step-desc">How would you rate <strong>"{instructor}"</strong>?</p>
          <div className="nps-grid">
            {NPS_SCALE.map(n => {
              const colors = getNpsColor(n);
              const isSelected = instructorRating === n;
              return (
                <button
                  key={n}
                  className={`nps-btn ${isSelected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: isSelected ? colors.activeBg : colors.bg,
                    borderColor: colors.border
                  }}
                  onClick={() => setInstructorRating(n)}
                >
                  <span style={{ color: isSelected ? '#fff' : colors.text }}>{n}</span>
                </button>
              );
            })}
          </div>
          <div className="nps-labels">
            <span>Needs improvement</span>
            <span>Excellent</span>
          </div>
          {instructorRating !== null && (
            <div className="nps-result">
              <span>{getInstructorLabel(instructorRating)}</span>
            </div>
          )}
        </div>
      )}

      {step === 4 && (
        <div>
          <div className="summary-card">
            <div className="summary-title">SUMMARY</div>
            <div className="summary-row">
              <span className="summary-label">Course</span>
              <span className="summary-value">{selectedCourse}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Instructor</span>
              <span className="summary-value">{instructor}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Year / Term</span>
              <span className="summary-value">Year {academicYear} — Term {currentTerm}</span>
            </div>
            <div className="summary-row">
              <span className="summary-label">Division</span>
              <span className="summary-value">{divisionLabel}</span>
            </div>
            <div className="summary-scores">
              <div className="score-box">
                <div className="score-num">{courseRating}</div>
                <div className="score-label">Course</div>
              </div>
              <div className="score-divider" />
              <div className="score-box">
                <div className="score-num">{instructorRating}</div>
                <div className="score-label">Instructor</div>
              </div>
              <div className="score-divider" />
              <div className="score-box">
                <div className="score-num score-avg">
                  {((courseRating + instructorRating) / 2).toFixed(1)}
                </div>
                <div className="score-label">Average</div>
              </div>
            </div>
          </div>
          <div className="card">
            <h3 className="step-title">Any additional feedback?</h3>
            <p className="step-desc">Optional — but very helpful!</p>
            <textarea
              className="form-textarea"
              placeholder="What could be improved? What did you love?"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows={5}
            />
          </div>
        </div>
      )}

      <div className="nav-row">
        {step < totalSteps ? (
          <button className="next-btn" onClick={goNext} disabled={checkingDuplicate}>
            {checkingDuplicate ? 'Checking...' : 'Next →'}
          </button>
        ) : (
          <button className="next-btn" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit Rating 🎉'}
          </button>
        )}
      </div>
    </div>
  );
}