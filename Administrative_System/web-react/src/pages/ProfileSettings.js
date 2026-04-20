// web-react/src/pages/ProfileSettings.jsx

import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import './ProfileSettings.css';

export default function ProfileSettings({ user, onBack }) {
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const data = userDoc.data();
      setDisplayName(data.displayName || data.fullName || user.email.split('@')[0]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert('Please enter a display name');
      return;
    }
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: displayName.trim(),
        updatedAt: new Date(),
      });
      
      alert('Profile updated successfully!');
      onBack();
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarColor = (email) => {
    const colors = ['#7c3aed', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>⚙️ Profile Settings</h1>
        <div></div>
      </div>

      <div className="profile-content">
        <div className="avatar-section">
          <div className="avatar-preview" style={{ backgroundColor: getAvatarColor(user?.email) }}>
            <div className="avatar-placeholder">
              {displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>
 
        </div>

        <div className="info-section">
          <div className="field-group">
            <label>Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="field-group">
            <label>Email</label>
            <input type="email" value={user?.email} disabled />
          </div>

          <div className="field-group">
            <label>User ID</label>
            <input type="text" value={user?.uid} disabled />
          </div>

          {/* ✅ زر الدارك مود */}
          <div className="theme-section">
            <div className="theme-info">
              <span className="theme-icon">{isDark ? '🌙' : '☀️'}</span>
              <span className="theme-label">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
            </div>
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {isDark ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <button className="save-btn" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : '💾 Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}