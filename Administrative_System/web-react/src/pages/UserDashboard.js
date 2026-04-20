

import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './UserDashboard.css';

export default function UserDashboard({ user, onNavigate }) {
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [avgRating, setAvgRating] = useState('—');
  const [statsLoading, setStatsLoading] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    if (user?.uid) {
      loadStats();
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const data = userDoc.data();
      setDisplayName(data.displayName || data.fullName || user.email.split('@')[0]);
      setPhotoURL(data.photoURL || null);
    } catch (error) {
      console.error(error);
    }
  };

  const loadStats = async () => {
    if (!user?.uid) return;
    setStatsLoading(true);
    try {
      const ticketsQ = query(collection(db, 'tickets'), where('userId', '==', user.uid));
      const ticketsSnap = await getDocs(ticketsQ);
      setComplaintsCount(ticketsSnap.size);

      const feedbackQ = query(collection(db, 'feedback'), where('userId', '==', user.uid));
      const feedbackSnap = await getDocs(feedbackQ);
      setRatingsCount(feedbackSnap.size);

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

      // Recent Activity - آخر 3 شكاوى
      const recentTickets = ticketsSnap.docs
        .sort((a, b) => {
          const tA = a.data().createdAt?.toDate?.()?.getTime() ?? 0;
          const tB = b.data().createdAt?.toDate?.()?.getTime() ?? 0;
          return tB - tA;
        })
        .slice(0, 3);

      const activity = recentTickets.map(doc => {
        const d = doc.data();
        const status = d.status ?? 'open';
        return {
          icon: '📝',
          title: d.title ?? 'Complaint',
          sub: d.description?.slice(0, 50) ?? '',
          badge: status === 'open' ? 'Pending' : status === 'replied' ? 'Replied' : 'Closed',
          badgeBg: status === 'open' ? '#fef3c7' : status === 'replied' ? '#d1fae5' : '#fee2e2',
          badgeColor: status === 'open' ? '#d97706' : status === 'replied' ? '#059669' : '#dc2626',
          iconBg: '#f5f3ff',
        };
      });
      setRecentActivity(activity);
    } catch (error) {
      console.error(error);
    } finally {
      setStatsLoading(false);
    }
  };

  const avatarLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="user-dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          {photoURL ? (
            <img src={photoURL} alt="Profile" className="avatar" />
          ) : (
            <div className="avatar">{avatarLetter}</div>
          )}
          <div>
            <div className="welcome-text">Welcome back, {displayName} 👋</div>
            <div className="role-text">Regular User</div>
          </div>
        </div>
        <div className="header-actions">
          <button className="settings-btn" onClick={() => onNavigate('profile')}>
            ⚙️
          </button>
          <button className="logout-btn" onClick={() => onNavigate('logout')}>Logout</button>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{statsLoading ? '...' : complaintsCount}</div>
          <div className="stat-label">MY COMPLAINTS</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{statsLoading ? '...' : ratingsCount}</div>
          <div className="stat-label">COURSES RATED</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{statsLoading ? '...' : avgRating}</div>
          <div className="stat-label">AVG RATING</div>
        </div>
      </div>

      <div className="actions-section">
        <div className="section-title">QUICK ACTIONS</div>
        <div className="actions-grid">
          <button className="action-card" onClick={() => onNavigate('submit-ticket')}>
            <div className="action-icon">📝</div>
            <div className="action-title">Submit Complaint</div>
            <div className="action-sub">Share your concerns</div>
          </button>
          <button className="action-card" onClick={() => onNavigate('enroll-courses')}>
            <div className="action-icon">📚</div>
            <div className="action-title">Course enrollment</div>
            <div className="action-sub">Select your courses</div>
          </button>
          <button className="action-card" onClick={() => onNavigate('rate-course')}>
            <div className="action-icon">⭐</div>
            <div className="action-title">Rate Courses</div>
            <div className="action-sub">Evaluate courses</div>
          </button>
          <button className="action-card" onClick={() => onNavigate('my-tickets')}>
            <div className="action-icon">📋</div>
            <div className="action-title">My Complaints</div>
            <div className="action-sub">Track status</div>
          </button>
          <button className="action-card" onClick={() => onNavigate('my-ratings')}>
            <div className="action-icon">📊</div>
            <div className="action-title">My Ratings</div>
            <div className="action-sub">View ratings</div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="activity-section">
        <div className="section-title">RECENT ACTIVITY</div>
        {recentActivity.length === 0 ? (
          <div className="empty-activity">
            <div className="empty-text">No recent activity — submit a complaint or rate a course!</div>
          </div>
        ) : (
          <div className="activity-list">
            {recentActivity.map((activity, i) => (
              <div key={i} className="activity-item">
                <div className="activity-icon" style={{ backgroundColor: activity.iconBg }}>
                  <span>{activity.icon}</span>
                </div>
                <div className="activity-content">
                  <div className="activity-title">{activity.title}</div>
                  <div className="activity-sub">{activity.sub}</div>
                </div>
                <div className="activity-badge" style={{ backgroundColor: activity.badgeBg }}>
                  <span style={{ color: activity.badgeColor }}>{activity.badge}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}