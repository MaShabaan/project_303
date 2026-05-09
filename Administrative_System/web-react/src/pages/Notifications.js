// web-react/src/pages/Notifications.jsx

import { collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import './Notifications.css';

export default function Notifications({ user, onBack }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      loadNotifications();
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      console.log('Loading notifications for user:', user.uid);
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      console.log('Found notifications:', snapshot.size);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('Notifications list:', list);
      setNotifications(list);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
      setNotifications(prev => prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'complaint_reply': return '📝';
      case 'enrollment_edited': return '📚';
      case 'account_banned': return '🚫';
      case 'account_unbanned': return '✅';
      case 'admin_message': return '💬';
      case 'ticket_status_changed': return '🔄';
      default: return '🔔';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <div className="notifications-loading">Loading notifications...</div>;
  }

  return (
    <div className="notifications-container">
      <div className="notifications-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>🔔 Notifications</h1>
        {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
      </div>

      {notifications.length === 0 ? (
        <div className="notifications-empty">
          <div className="empty-icon">🔔</div>
          <div className="empty-title">No notifications</div>
          <div className="empty-text">You're all caught up!</div>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notif => (
            <div 
              key={notif.id} 
              className={`notification-item ${!notif.read ? 'unread' : ''}`}
              onClick={() => !notif.read && markAsRead(notif.id)}
            >
              <div className="notification-icon">{getIcon(notif.type)}</div>
              <div className="notification-content">
                <div className="notification-title">{notif.title}</div>
                <div className="notification-body">{notif.body}</div>
                <div className="notification-time">{formatDate(notif.createdAt)}</div>
              </div>
              {!notif.read && <div className="unread-dot"></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}