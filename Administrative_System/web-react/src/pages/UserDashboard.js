// web-react/src/pages/UserDashboard.jsx

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import './UserDashboard.css';

export default function UserDashboard({ user, onNavigate }) {
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [avgRating, setAvgRating] = useState('—');
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user?.uid) return;
    setStatsLoading(true);
    try {
      // جلب عدد الشكاوى
      const ticketsQ = query(collection(db, 'tickets'), where('userId', '==', user.uid));
      const ticketsSnap = await getDocs(ticketsQ);
      setComplaintsCount(ticketsSnap.size);

      // جلب عدد التقييمات
      const feedbackQ = query(collection(db, 'feedback'), where('userId', '==', user.uid));
      const feedbackSnap = await getDocs(feedbackQ);
      setRatingsCount(feedbackSnap.size);

      // حساب متوسط التقييم
      if (feedbackSnap.size > 0) {
        let total = 0;
        feedbackSnap.docs.forEach(doc => {
          const data = doc.data();
          const courseR = data.courseRating ?? data.rating ?? 0;
          const instrR = data.instructorRating ?? data.rating ?? 0;
          total += (courseR + instrR) / 2;
        });
        setAvgRating((total / feedbackSnap.size).toFixed(1));
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const displayName = user?.email?.split('@')[0] || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const actions = [
    { icon: '📝', title: 'Submit Complaint', sub: 'Share your concerns', route: 'submit-ticket' },
    { icon: '📚', title: 'Course enrollment', sub: 'Select your courses', route: 'enroll-courses' },
    { icon: '⭐', title: 'Rate Courses', sub: 'Evaluate courses', route: 'rate-course' },
    { icon: '📋', title: 'My Complaints', sub: 'Track status', route: 'my-tickets' },
    { icon: '📊', title: 'My Ratings', sub: 'View ratings', route: 'my-ratings' },
  ];

  const stats = [
    { num: statsLoading ? '...' : String(complaintsCount), label: 'MY COMPLAINTS' },
    { num: statsLoading ? '...' : String(ratingsCount), label: 'COURSES RATED' },
    { num: statsLoading ? '...' : avgRating, label: 'AVG RATING' },
  ];

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          <div className="avatar">{avatarLetter}</div>
          <div>
            <div className="welcome-text">Welcome back, {displayName} 👋</div>
            <div className="role-text">Regular User</div>
          </div>
        </div>
        <button className="logout-btn" onClick={() => onNavigate('logout')}>Logout</button>
      </div>

      <div className="stats-row">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-num">{stat.num}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="actions-section">
        <div className="section-title">QUICK ACTIONS</div>
        <div className="actions-grid">
          {actions.map((action, i) => (
            <button key={i} className="action-card" onClick={() => onNavigate(action.route)}>
              <div className="action-icon">{action.icon}</div>
              <div className="action-title">{action.title}</div>
              <div className="action-sub">{action.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}