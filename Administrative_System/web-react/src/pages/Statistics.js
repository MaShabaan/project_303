

import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Statistics.css';

const getRatingColor = (rating) => {
  if (rating <= 3) return '#dc2626';
  if (rating <= 6) return '#f59e0b';
  return '#10b981';
};


const SimplePieChart = ({ distribution, total }) => {
  const excellent = distribution?.excellent || 0;
  const good = distribution?.good || 0;
  const average = distribution?.average || 0;
  const poor = distribution?.poor || 0;
  
  const totalCount = excellent + good + average + poor;
  if (totalCount === 0) return <div className="pie-placeholder">No ratings yet</div>;
  
  return (
    <div className="simple-pie-container">
      <div className="simple-pie-bars">
        <div className="bar excellent" style={{ width: `${(excellent / totalCount) * 100}%` }} />
        <div className="bar good" style={{ width: `${(good / totalCount) * 100}%` }} />
        <div className="bar average" style={{ width: `${(average / totalCount) * 100}%` }} />
        <div className="bar poor" style={{ width: `${(poor / totalCount) * 100}%` }} />
      </div>
      <div className="simple-pie-legend">
        <span><span className="dot excellent" /> Excellent ({excellent})</span>
        <span><span className="dot good" /> Good ({good})</span>
        <span><span className="dot average" /> Average ({average})</span>
        <span><span className="dot poor" /> Poor ({poor})</span>
      </div>
    </div>
  );
};

export default function Statistics({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState(null);
  const [selectedInstructor, setSelectedInstructor] = useState(null);
  const [courseStats, setCourseStats] = useState(null);
  const [instructorStats, setInstructorStats] = useState(null);
  const [globalStats, setGlobalStats] = useState({
    users: { total: 0, admins: 0, students: 0, blocked: 0 },
    complaints: { total: 0, open: 0, inProgress: 0, replied: 0, closed: 0 },
    courses: { total: 0, cs: 0, math: 0, byYear: { 2: 0, 3: 0, 4: 0 } },
    feedback: { total: 0, avgCourse: 0, avgInstructor: 0, distribution: { excellent: 0, good: 0, average: 0, poor: 0 } },
    enrollments: { total: 0, avgPerStudent: 0 }
  });

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedCourseId) loadCourseStats(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedInstructor) loadInstructorStats(selectedInstructor);
  }, [selectedInstructor]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const coursesList = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesList);

      const feedbackSnap = await getDocs(collection(db, 'feedback'));
      const instructorsList = [...new Set(feedbackSnap.docs.map(doc => doc.data().instructor))];
      setInstructors(instructorsList.filter(i => i));

      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => d.data());
      const usersStats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        students: users.filter(u => u.role === 'user').length,
        blocked: users.filter(u => u.isBlocked === true).length,
      };

      const ticketsSnap = await getDocs(collection(db, 'tickets'));
      const tickets = ticketsSnap.docs.map(d => d.data());
      const complaintsStats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in-progress').length,
        replied: tickets.filter(t => t.status === 'replied').length,
        closed: tickets.filter(t => t.status === 'closed').length,
      };

      const coursesData = coursesSnap.docs.map(d => d.data());
      const coursesStats = {
        total: coursesData.length,
        cs: coursesData.filter(c => c.division === 'computer_science').length,
        math: coursesData.filter(c => c.division === 'special_mathematics').length,
        byYear: {
          2: coursesData.filter(c => c.year === 2).length,
          3: coursesData.filter(c => c.year === 3).length,
          4: coursesData.filter(c => c.year === 4).length,
        }
      };

      const feedbacks = feedbackSnap.docs.map(d => d.data());
      let totalCourse = 0;
      let totalInstructor = 0;
      let distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      
      feedbacks.forEach(fb => {
        const courseR = fb.courseRating ?? fb.rating ?? 0;
        const instrR = fb.instructorRating ?? fb.rating ?? 0;
        totalCourse += courseR;
        totalInstructor += instrR;
        const avg = (courseR + instrR) / 2;
        if (avg >= 8) distribution.excellent++;
        else if (avg >= 6) distribution.good++;
        else if (avg >= 4) distribution.average++;
        else distribution.poor++;
      });
      
      const feedbackStats = {
        total: feedbacks.length,
        avgCourse: feedbacks.length ? (totalCourse / feedbacks.length).toFixed(1) : 0,
        avgInstructor: feedbacks.length ? (totalInstructor / feedbacks.length).toFixed(1) : 0,
        distribution
      };

      const enrollmentsSnap = await getDocs(collection(db, 'enrollments'));
      const enrollments = enrollmentsSnap.docs.map(d => d.data());
      const totalEnrollments = enrollments.reduce((sum, e) => sum + (e.courseIds?.length || 0), 0);
      const enrollmentsStats = {
        total: enrollments.length,
        avgPerStudent: enrollments.length ? (totalEnrollments / enrollments.length).toFixed(1) : 0,
      };

      setGlobalStats({
        users: usersStats,
        complaints: complaintsStats,
        courses: coursesStats,
        feedback: feedbackStats,
        enrollments: enrollmentsStats,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCourseStats = async (courseId) => {
    try {
      const course = courses.find(c => c.id === courseId);
      if (!course) return;
      
      const feedbackSnap = await getDocs(collection(db, 'feedback'));
      const feedbacks = feedbackSnap.docs
        .map(d => d.data())
        .filter(fb => fb.courseName === course.courseName);
      
      if (feedbacks.length === 0) {
        setCourseStats(null);
        return;
      }
      
      let totalCourse = 0;
      let totalInstructor = 0;
      let distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      
      feedbacks.forEach(fb => {
        const courseR = fb.courseRating ?? fb.rating ?? 0;
        const instrR = fb.instructorRating ?? fb.rating ?? 0;
        totalCourse += courseR;
        totalInstructor += instrR;
        const avg = (courseR + instrR) / 2;
        if (avg >= 8) distribution.excellent++;
        else if (avg >= 6) distribution.good++;
        else if (avg >= 4) distribution.average++;
        else distribution.poor++;
      });
      
      setCourseStats({
        name: course.courseName,
        total: feedbacks.length,
        avgCourse: (totalCourse / feedbacks.length).toFixed(1),
        avgInstructor: (totalInstructor / feedbacks.length).toFixed(1),
        distribution
      });
    } catch (error) {
      console.error('Error loading course stats:', error);
    }
  };

  const loadInstructorStats = async (instructorName) => {
    try {
      const feedbackSnap = await getDocs(collection(db, 'feedback'));
      const feedbacks = feedbackSnap.docs
        .map(d => d.data())
        .filter(fb => fb.instructor === instructorName);
      
      if (feedbacks.length === 0) {
        setInstructorStats(null);
        return;
      }
      
      let totalCourse = 0;
      let totalInstructor = 0;
      let distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      
      feedbacks.forEach(fb => {
        const courseR = fb.courseRating ?? fb.rating ?? 0;
        const instrR = fb.instructorRating ?? fb.rating ?? 0;
        totalCourse += courseR;
        totalInstructor += instrR;
        const avg = (courseR + instrR) / 2;
        if (avg >= 8) distribution.excellent++;
        else if (avg >= 6) distribution.good++;
        else if (avg >= 4) distribution.average++;
        else distribution.poor++;
      });
      
      setInstructorStats({
        name: instructorName,
        total: feedbacks.length,
        avgCourse: (totalCourse / feedbacks.length).toFixed(1),
        avgInstructor: (totalInstructor / feedbacks.length).toFixed(1),
        distribution
      });
    } catch (error) {
      console.error('Error loading instructor stats:', error);
    }
  };

  const getPercent = (value, total) => total ? ((value / total) * 100).toFixed(0) : 0;

  if (loading) {
    return (
      <div className="stats-page">
        <div className="stats-topbar">
          <button className="stats-back-btn" onClick={onBack}>← Back</button>
          <span className="stats-topbar-title">📊 Statistics</span>
        </div>
        <div className="stats-loading">
          <div className="stats-spinner" />
          <div>Loading statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="stats-page">
      <div className="stats-topbar">
        <button className="stats-back-btn" onClick={onBack}>← Back</button>
        <span className="stats-topbar-title">📊 Statistics Dashboard</span>
      </div>

      <div className="stats-body">
        {/* Course Selector */}
        <div className="stats-card">
          <h3 className="stats-card-title">📚 Course Statistics</h3>
          <div className="stats-selector-wrapper">
            <select 
              className="stats-select"
              value={selectedCourseId || ''}
              onChange={(e) => setSelectedCourseId(e.target.value || null)}
            >
              <option value="">Select a course...</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.courseName} {course.courseCode ? `(${course.courseCode})` : ''}
                </option>
              ))}
            </select>
          </div>
          
          {selectedCourseId && courseStats ? (
            <div className="stats-detail">
              <div className="stats-detail-header">
                <h4>{courseStats.name}</h4>
                <span className="stats-detail-total">{courseStats.total} reviews</span>
              </div>
              <div className="stats-detail-grid">
                <div className="stats-detail-item">
                  <div className="stats-detail-value">{courseStats.avgCourse}</div>
                  <div className="stats-detail-label">Avg Course Rating</div>
                  <div className="stats-detail-max">/10</div>
                </div>
                <div className="stats-detail-item">
                  <div className="stats-detail-value">{courseStats.avgInstructor}</div>
                  <div className="stats-detail-label">Avg Instructor Rating</div>
                  <div className="stats-detail-max">/10</div>
                </div>
              </div>
              <div className="stats-chart-row">
                <SimplePieChart distribution={courseStats.distribution} total={courseStats.total} />
              </div>
            </div>
          ) : selectedCourseId && !courseStats ? (
            <div className="stats-detail-empty">No feedback available for this course yet.</div>
          ) : null}
        </div>

        {/* Instructor Selector */}
        <div className="stats-card">
          <h3 className="stats-card-title">👨‍🏫 Instructor Statistics</h3>
          <div className="stats-selector-wrapper">
            <select 
              className="stats-select"
              value={selectedInstructor || ''}
              onChange={(e) => setSelectedInstructor(e.target.value || null)}
            >
              <option value="">Select an instructor...</option>
              {instructors.map(instructor => (
                <option key={instructor} value={instructor}>{instructor}</option>
              ))}
            </select>
          </div>
          
          {selectedInstructor && instructorStats ? (
            <div className="stats-detail">
              <div className="stats-detail-header">
                <h4>{instructorStats.name}</h4>
                <span className="stats-detail-total">{instructorStats.total} reviews</span>
              </div>
              <div className="stats-detail-grid">
                <div className="stats-detail-item">
                  <div className="stats-detail-value">{instructorStats.avgCourse}</div>
                  <div className="stats-detail-label">Avg Course Rating</div>
                  <div className="stats-detail-max">/10</div>
                </div>
                <div className="stats-detail-item">
                  <div className="stats-detail-value">{instructorStats.avgInstructor}</div>
                  <div className="stats-detail-label">Avg Instructor Rating</div>
                  <div className="stats-detail-max">/10</div>
                </div>
              </div>
              <div className="stats-chart-row">
                <SimplePieChart distribution={instructorStats.distribution} total={instructorStats.total} />
              </div>
            </div>
          ) : selectedInstructor && !instructorStats ? (
            <div className="stats-detail-empty">No feedback available for this instructor yet.</div>
          ) : null}
        </div>

        {/* Users Overview */}
        <div className="stats-card-full">
          <div className="stats-card-header">
            <h2>👥 Users Overview</h2>
            <span className="stats-total">{globalStats.users.total} Total</span>
          </div>
          <div className="stats-grid-4">
            <div className="stats-item">
              <div className="stats-value">{globalStats.users.students}</div>
              <div className="stats-label">Students</div>
              <div className="stats-percent">{getPercent(globalStats.users.students, globalStats.users.total)}%</div>
            </div>
            <div className="stats-item">
              <div className="stats-value">{globalStats.users.admins}</div>
              <div className="stats-label">Admins</div>
              <div className="stats-percent">{getPercent(globalStats.users.admins, globalStats.users.total)}%</div>
            </div>
            <div className="stats-item">
              <div className="stats-value">{globalStats.users.blocked}</div>
              <div className="stats-label">Blocked</div>
              <div className="stats-percent">{getPercent(globalStats.users.blocked, globalStats.users.total)}%</div>
            </div>
          </div>
          <div className="stats-progress-bar">
            <div className="stats-progress students" style={{ width: `${getPercent(globalStats.users.students, globalStats.users.total)}%` }} />
            <div className="stats-progress admins" style={{ width: `${getPercent(globalStats.users.admins, globalStats.users.total)}%` }} />
            <div className="stats-progress blocked" style={{ width: `${getPercent(globalStats.users.blocked, globalStats.users.total)}%` }} />
          </div>
          <div className="stats-progress-legend">
            <span><span className="legend-dot students" /> Students</span>
            <span><span className="legend-dot admins" /> Admins</span>
            <span><span className="legend-dot blocked" /> Blocked</span>
          </div>
        </div>

        {/* Complaints Overview */}
        <div className="stats-card-full">
          <div className="stats-card-header">
            <h2>📋 Complaints Overview</h2>
            <span className="stats-total">{globalStats.complaints.total} Total</span>
          </div>
          <div className="stats-grid-4">
            <div className="stats-item">
              <div className="stats-value">{globalStats.complaints.open}</div>
              <div className="stats-label">Open</div>
              <div className="stats-percent">{getPercent(globalStats.complaints.open, globalStats.complaints.total)}%</div>
            </div>
            <div className="stats-item">
              <div className="stats-value">{globalStats.complaints.inProgress}</div>
              <div className="stats-label">In Progress</div>
              <div className="stats-percent">{getPercent(globalStats.complaints.inProgress, globalStats.complaints.total)}%</div>
            </div>
            <div className="stats-item">
              <div className="stats-value">{globalStats.complaints.replied}</div>
              <div className="stats-label">Replied</div>
              <div className="stats-percent">{getPercent(globalStats.complaints.replied, globalStats.complaints.total)}%</div>
            </div>
            <div className="stats-item">
              <div className="stats-value">{globalStats.complaints.closed}</div>
              <div className="stats-label">Closed</div>
              <div className="stats-percent">{getPercent(globalStats.complaints.closed, globalStats.complaints.total)}%</div>
            </div>
          </div>
          <div className="stats-progress-bar">
            <div className="stats-progress open" style={{ width: `${getPercent(globalStats.complaints.open, globalStats.complaints.total)}%` }} />
            <div className="stats-progress in-progress" style={{ width: `${getPercent(globalStats.complaints.inProgress, globalStats.complaints.total)}%` }} />
            <div className="stats-progress replied" style={{ width: `${getPercent(globalStats.complaints.replied, globalStats.complaints.total)}%` }} />
            <div className="stats-progress closed" style={{ width: `${getPercent(globalStats.complaints.closed, globalStats.complaints.total)}%` }} />
          </div>
          <div className="stats-progress-legend">
            <span><span className="legend-dot open" /> Open</span>
            <span><span className="legend-dot in-progress" /> In Progress</span>
            <span><span className="legend-dot replied" /> Replied</span>
            <span><span className="legend-dot closed" /> Closed</span>
          </div>
        </div>

        {/* Global Feedback */}
        <div className="stats-card-full">
          <div className="stats-card-header">
            <h2>⭐ Global Feedback Overview</h2>
            <span className="stats-total">{globalStats.feedback.total} Reviews</span>
          </div>
          <div className="stats-grid-2">
            <div className="stats-item">
              <div className="stats-value">{globalStats.feedback.avgCourse}</div>
              <div className="stats-label">Avg Course Rating</div>
              <div className="stats-max">/10</div>
            </div>
            <div className="stats-item">
              <div className="stats-value">{globalStats.feedback.avgInstructor}</div>
              <div className="stats-label">Avg Instructor Rating</div>
              <div className="stats-max">/10</div>
            </div>
          </div>
          <div className="stats-chart-row">
            <SimplePieChart distribution={globalStats.feedback.distribution} total={globalStats.feedback.total} />
          </div>
        </div>
      </div>
    </div>
  );
}