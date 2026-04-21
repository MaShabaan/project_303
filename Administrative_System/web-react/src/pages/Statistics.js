// web-react/src/pages/Statistics.jsx

import { collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import './Statistics.css';

export default function Statistics({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
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
    if (selectedCourse) {
      loadCourseStats(selectedCourse);
    }
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedInstructor) {
      loadInstructorStats(selectedInstructor);
    }
  }, [selectedInstructor]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // Load courses list
      const coursesSnap = await getDocs(collection(db, 'courses'));
      const coursesList = coursesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCourses(coursesList);

      // Load instructors from feedback
      const feedbackSnap = await getDocs(collection(db, 'feedback'));
      const instructorsList = [...new Set(feedbackSnap.docs.map(doc => doc.data().instructor))];
      setInstructors(instructorsList.filter(i => i));

      // Users stats
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => d.data());
      const usersStats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        students: users.filter(u => u.role === 'user').length,
        blocked: users.filter(u => u.isBlocked === true).length,
      };

      // Complaints stats
      const ticketsSnap = await getDocs(collection(db, 'tickets'));
      const tickets = ticketsSnap.docs.map(d => d.data());
      const complaintsStats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in-progress').length,
        replied: tickets.filter(t => t.status === 'replied').length,
        closed: tickets.filter(t => t.status === 'closed').length,
      };

      // Courses stats
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

      // Feedback stats
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

      // Enrollments stats
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
      const feedbackSnap = await getDocs(collection(db, 'feedback'));
      const feedbacks = feedbackSnap.docs
        .map(d => d.data())
        .filter(fb => fb.courseName === courseId);
      
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
        name: courseId,
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

 // Pie chart component - updated version
const PieChart = ({ data, size = 200 }) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];
  
  if (!data || data.length === 0) {
    return <div className="pie-placeholder">No data available</div>;
  }
  
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  if (total === 0) {
    return <div className="pie-placeholder">No ratings yet</div>;
  }
  
  let startAngle = -90;
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;
  
  const getPath = (value, index) => {
    if (value === 0) return null;
    
    const angle = (value / total) * 360;
    const endAngle = startAngle + angle;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const path = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
    startAngle = endAngle;
    
    return path;
  };
  
  // Reset start angle for each render
  startAngle = -90;
  
  // If only one segment (100%), draw a full circle
  if (data.length === 1) {
    return (
      <div className="pie-chart-container">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={centerX}
            cy={centerY}
            r={radius}
            fill={colors[0]}
            stroke="#fff"
            strokeWidth="2"
          />
        </svg>
        <div className="pie-legend">
          <div className="pie-legend-item">
            <div className="pie-legend-color" style={{ backgroundColor: colors[0] }}></div>
            
           
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="pie-chart-container">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {data.map((item, index) => {
          const path = getPath(item.value, index);
          if (!path) return null;
          const isHovered = hoveredIndex === index;
          return (
            <g key={index}>
              <path
                d={path}
                fill={colors[index % colors.length]}
                stroke="#fff"
                strokeWidth="2"
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                  transformOrigin: `${centerX}px ${centerY}px`
                }}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            </g>
          );
        })}
      </svg>
      <div className="pie-legend">
        {data.map((item, i) => (
          <div key={i} className="pie-legend-item">
            <div className="pie-legend-color" style={{ backgroundColor: colors[i % colors.length] }}></div>
            <span>{item.label}</span>
            <span className="pie-legend-percent">
              {total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

  const renderPieChart = (distribution, total) => {
    const data = [
      { label: 'Excellent', value: distribution.excellent, color: '#10b981' },
      { label: 'Good', value: distribution.good, color: '#3b82f6' },
      { label: 'Average', value: distribution.average, color: '#f59e0b' },
      { label: 'Poor', value: distribution.poor, color: '#ef4444' }
    ].filter(d => d.value > 0);
    
    return (
      <div className="pie-chart-container">
        <PieChart data={data} size={180} />
        <div className="pie-legend">
          {data.map((item, i) => (
            <div key={i} className="pie-legend-item">
              <div className="pie-legend-color" style={{ backgroundColor: item.color }}></div>
              <span>{item.label}</span>
              <span className="pie-legend-percent">{getPercent(item.value, total)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="statistics-container">
        <div className="statistics-header">
          <button className="back-button" onClick={onBack}>← Back</button>
          <h1>📊 Statistics</h1>
          <div></div>
        </div>
        <div className="loading">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="statistics-container">
      <div className="statistics-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>📊 Statistics Dashboard</h1>
        <div></div>
      </div>

      {/* Course Selector */}
      <div className="selector-card">
        <h3>📚 Course Statistics</h3>
        <div className="selector-wrapper">
          <select 
            className="selector-select"
            value={selectedCourse || ''}
            onChange={(e) => setSelectedCourse(e.target.value || null)}
          >
            <option value="">Select a course...</option>
            {courses.map(course => (
              <option key={course.id} value={course.courseName}>
                {course.courseName} ({course.courseCode || ''})
              </option>
            ))}
          </select>
        </div>
        
        {selectedCourse && courseStats ? (
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
              {renderPieChart(courseStats.distribution, courseStats.total)}
            </div>
          </div>
        ) : selectedCourse && !courseStats ? (
          <div className="stats-detail-empty">No feedback available for this course yet.</div>
        ) : null}
      </div>

      {/* Instructor Selector */}
      <div className="selector-card">
        <h3>👨‍🏫 Instructor Statistics</h3>
        <div className="selector-wrapper">
          <select 
            className="selector-select"
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
              {renderPieChart(instructorStats.distribution, instructorStats.total)}
            </div>
          </div>
        ) : selectedInstructor && !instructorStats ? (
          <div className="stats-detail-empty">No feedback available for this instructor yet.</div>
        ) : null}
      </div>

      {/* Global Statistics */}
      <div className="stat-card-full">
        <div className="stat-card-header">
          <h2>👥 Users Overview</h2>
          <span className="stat-total">{globalStats.users.total} Total</span>
        </div>
        <div className="stat-grid-4">
          <div className="stat-item">
            <div className="stat-value">{globalStats.users.students}</div>
            <div className="stat-label">Students</div>
            <div className="stat-percent">{getPercent(globalStats.users.students, globalStats.users.total)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{globalStats.users.admins}</div>
            <div className="stat-label">Admins</div>
            <div className="stat-percent">{getPercent(globalStats.users.admins, globalStats.users.total)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{globalStats.users.blocked}</div>
            <div className="stat-label">Blocked</div>
            <div className="stat-percent">{getPercent(globalStats.users.blocked, globalStats.users.total)}%</div>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-segment students" style={{ width: `${getPercent(globalStats.users.students, globalStats.users.total)}%` }}></div>
          <div className="progress-segment admins" style={{ width: `${getPercent(globalStats.users.admins, globalStats.users.total)}%` }}></div>
          <div className="progress-segment blocked" style={{ width: `${getPercent(globalStats.users.blocked, globalStats.users.total)}%` }}></div>
        </div>
        <div className="progress-legend">
          <span><span className="legend-dot students"></span> Students</span>
          <span><span className="legend-dot admins"></span> Admins</span>
          <span><span className="legend-dot blocked"></span> Blocked</span>
        </div>
      </div>

      {/* Complaints Statistics */}
      <div className="stat-card-full">
        <div className="stat-card-header">
          <h2>📋 Complaints Overview</h2>
          <span className="stat-total">{globalStats.complaints.total} Total</span>
        </div>
        <div className="stat-grid-4">
          <div className="stat-item">
            <div className="stat-value">{globalStats.complaints.open}</div>
            <div className="stat-label">Open</div>
            <div className="stat-percent">{getPercent(globalStats.complaints.open, globalStats.complaints.total)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{globalStats.complaints.inProgress}</div>
            <div className="stat-label">In Progress</div>
            <div className="stat-percent">{getPercent(globalStats.complaints.inProgress, globalStats.complaints.total)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{globalStats.complaints.replied}</div>
            <div className="stat-label">Replied</div>
            <div className="stat-percent">{getPercent(globalStats.complaints.replied, globalStats.complaints.total)}%</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{globalStats.complaints.closed}</div>
            <div className="stat-label">Closed</div>
            <div className="stat-percent">{getPercent(globalStats.complaints.closed, globalStats.complaints.total)}%</div>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-segment open" style={{ width: `${getPercent(globalStats.complaints.open, globalStats.complaints.total)}%` }}></div>
          <div className="progress-segment in-progress" style={{ width: `${getPercent(globalStats.complaints.inProgress, globalStats.complaints.total)}%` }}></div>
          <div className="progress-segment replied" style={{ width: `${getPercent(globalStats.complaints.replied, globalStats.complaints.total)}%` }}></div>
          <div className="progress-segment closed" style={{ width: `${getPercent(globalStats.complaints.closed, globalStats.complaints.total)}%` }}></div>
        </div>
        <div className="progress-legend">
          <span><span className="legend-dot open"></span> Open</span>
          <span><span className="legend-dot in-progress"></span> In Progress</span>
          <span><span className="legend-dot replied"></span> Replied</span>
          <span><span className="legend-dot closed"></span> Closed</span>
        </div>
      </div>

      {/* Global Feedback Statistics */}
      <div className="stat-card-full">
        <div className="stat-card-header">
          <h2>⭐ Global Feedback Overview</h2>
          <span className="stat-total">{globalStats.feedback.total} Reviews</span>
        </div>
        <div className="stat-grid-2">
          <div className="stat-item">
            <div className="stat-value">{globalStats.feedback.avgCourse}</div>
            <div className="stat-label">Avg Course Rating</div>
            <div className="stat-max">/10</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{globalStats.feedback.avgInstructor}</div>
            <div className="stat-label">Avg Instructor Rating</div>
            <div className="stat-max">/10</div>
          </div>
        </div>
        <div className="stats-chart-row">
          {renderPieChart(globalStats.feedback.distribution, globalStats.feedback.total)}
        </div>
      </div>
    </div>
  );
}