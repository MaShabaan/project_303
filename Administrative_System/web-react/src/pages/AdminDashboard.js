

import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { db } from '../services/firebase';
import './AdminDashboard.css';

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

export default function AdminDashboard({ user, onNavigate }) {
  const [usersCount, setUsersCount] = useState(0);
  const [coursesCount, setCoursesCount] = useState(0);
  const [complaintsCount, setComplaintsCount] = useState(0);
  const [pendingComplaints, setPendingComplaints] = useState(0);
  const [ratingsCount, setRatingsCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState(null);

  const isSuperAdmin = SUPER_ADMINS.includes(user?.email);

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

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      setUsersCount(usersSnap.size);

      const coursesSnap = await getDocs(collection(db, 'courses'));
      setCoursesCount(coursesSnap.size);

      const ticketsSnap = await getDocs(collection(db, 'tickets'));
      setComplaintsCount(ticketsSnap.size);
      
      const pending = ticketsSnap.docs.filter(d => {
        const status = d.data().status;
        return status === 'open' || status === 'in-progress';
      }).length;
      setPendingComplaints(pending);

      const ratingsSnap = await getDocs(collection(db, 'feedback'));
      setRatingsCount(ratingsSnap.size);

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
          sub: `From: ${d.userEmail?.split('@')[0] || 'User'}`,
          badge: status === 'open' ? 'Pending' : status === 'replied' ? 'Replied' : 'Closed',
          badgeBg: status === 'open' ? '#fef3c7' : status === 'replied' ? '#d1fae5' : '#fee2e2',
          badgeColor: status === 'open' ? '#d97706' : status === 'replied' ? '#059669' : '#dc2626',
          iconBg: '#f5f3ff',
        };
      });
      setRecentActivity(activity);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const avatarLetter = displayName.charAt(0).toUpperCase();
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Administrator';

  const stats = [
    { num: statsLoading ? '...' : String(usersCount), label: 'TOTAL USERS', change: `${usersCount} registered`, color: '#7c3aed', bg: '#f5f3ff' },
    { num: statsLoading ? '...' : String(coursesCount), label: 'COURSES', change: `${coursesCount} available`, color: '#f59e0b', bg: '#fffbeb' },
    { num: statsLoading ? '...' : String(complaintsCount), label: 'COMPLAINTS', change: `${pendingComplaints} pending`, color: '#10b981', bg: '#f0fdf4' },
    { num: statsLoading ? '...' : String(ratingsCount), label: 'RATINGS', change: `total feedback`, color: '#06b6d4', bg: '#ecfeff' },
  ];

  const actions = [
    { icon: '📋', title: 'Complaints', sub: 'View & reply', route: 'complaints' },
    { icon: '👥', title: 'Manage Users', sub: 'Promote or block', route: 'users' },
    { icon: '📚', title: 'Courses', sub: 'Add or edit courses', route: 'manage-courses' },
    { icon: '📝', title: 'Enrollments', sub: 'Assign courses', route: 'enrollments' },
    { icon: '⭐', title: 'Feedback', sub: 'View ratings', route: 'feedback' },
    { icon: '📊', title: 'Statistics', sub: 'View analytics', route: 'statistics' }, 
  ];

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          {photoURL ? (
            <img src={photoURL} alt="Profile" className="avatar" />
          ) : (
            <div className="avatar">{avatarLetter}</div>
          )}
          <div>
            <div className="welcome-text">Welcome back, {displayName} 👋</div>
            <div className="role-text">{roleLabel}</div>
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
        {stats.map((stat, i) => (
          <div key={i} className="stat-card" style={{ backgroundColor: stat.bg }}>
            <div className="stat-accent" style={{ backgroundColor: stat.color }}></div>
            <div className="stat-num">{stat.num}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-change" style={{ color: stat.color }}>{stat.change}</div>
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

      <div className="activity-section">
        <div className="section-title">RECENT ACTIVITY</div>
        {recentActivity.length === 0 ? (
          <div className="empty-activity">
            <div className="empty-text">No recent activity — wait for user submissions.</div>
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

      <div className="tips-section">
        <div className="tips-title">💡 ADMIN TIPS</div>
        <div className="tips-text">• Reply to complaints promptly to keep users informed.</div>
        <div className="tips-text">• Use the Enrollments panel to assign courses to students.</div>
        <div className="tips-text">• Block users who violate policies.</div>
      </div>
    </div>
  );
}