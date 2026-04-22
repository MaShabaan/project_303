
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from './ThemeContext';
import './ProfileSettings.css';

const DIVISIONS = [
  { value: 'computer_science', label: 'Computer Science', icon: '💻' },
  { value: 'special_mathematics', label: 'Special Mathematics', icon: '📐' },
];

const YEARS = [2, 3, 4];
const TERMS = [1, 2];

export default function ProfileSettings({ user, onBack }) {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [userData, setUserData] = useState(null);
  const [division, setDivision] = useState('');
  const [academicYear, setAcademicYear] = useState(2);
  const [currentTerm, setCurrentTerm] = useState(1);
  const [academicCode, setAcademicCode] = useState('');

  useEffect(() => {
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const data = userDoc.data();
      setUserData(data);
      setDisplayName(data.displayName || data.fullName || user.email.split('@')[0]);
      setDivision(data.division || 'computer_science');
      setAcademicYear(data.academicYear || 2);
      setCurrentTerm(data.currentTerm || 1);
      setAcademicCode(data.academicCode || '');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      alert('Please enter a display name');
      return;
    }
    
    setSaving(true);
    try {
      const updateData = {
        displayName: displayName.trim(),
        division: division,
        academicYear: academicYear,
        currentTerm: currentTerm,
        academicCode: academicCode.trim(),
        updatedAt: new Date(),
      };
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      alert('Profile updated successfully!');
      onBack();
    } catch (error) {
      console.error(error);
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const getAvatarColor = (email) => {
    const colors = ['#7c3aed', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const roleLabel = userData?.role === 'admin' ? 'Administrator' : userData?.role === 'super_admin' ? 'Super Admin' : 'Student';

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-topbar">
          <button className="profile-back-btn" onClick={onBack}>← Back</button>
          <span className="profile-topbar-title">⚙️ Profile Settings</span>
        </div>
        <div className="profile-loading">
          <div className="profile-spinner" />
          <div>Loading profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Top Bar */}
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={onBack}>← Back</button>
        <span className="profile-topbar-title">⚙️ Profile Settings</span>
      </div>

      {/* Body */}
      <div className="profile-body">
        <div className="profile-card">
          {/* Avatar Section */}
          <div className="profile-avatar-section">
            <div className="profile-avatar" style={{ backgroundColor: getAvatarColor(user?.email) }}>
              <div className="profile-avatar-placeholder">
                {displayName?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
           
          </div>

          {/* Info Section */}
          <div className="profile-info-section">
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
              <label>Role</label>
              <input type="text" value={roleLabel} disabled />
            </div>

            {/* Academic Code - for students */}
            {userData?.role === 'user' && (
              <div className="field-group">
                <label>Academic Code</label>
                <input
                  type="text"
                  value={academicCode}
                  onChange={(e) => setAcademicCode(e.target.value)}
                  placeholder="e.g. 2027123"
                  maxLength={7}
                />
                <div className="field-hint">7 digits (format: xx27xxx)</div>
              </div>
            )}

            {/* Division - for students */}
            {userData?.role === 'user' && (
              <div className="field-group">
                <label>Division</label>
                <div className="option-group">
                  {DIVISIONS.map(d => (
                    <button
                      key={d.value}
                      className={`option-btn ${division === d.value ? 'active' : ''}`}
                      onClick={() => setDivision(d.value)}
                    >
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Academic Year - for students */}
            {userData?.role === 'user' && (
              <div className="field-group">
                <label>Academic Year</label>
                <div className="option-group">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      className={`option-btn ${academicYear === y ? 'active' : ''}`}
                      onClick={() => setAcademicYear(y)}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Current Term - for students */}
            {userData?.role === 'user' && (
              <div className="field-group">
                <label>Current Term</label>
                <div className="option-group">
                  {TERMS.map(t => (
                    <button
                      key={t}
                      className={`option-btn ${currentTerm === t ? 'active' : ''}`}
                      onClick={() => setCurrentTerm(t)}
                    >
                      Term {t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dark Mode Toggle */}
            <div className="theme-section">
              <div className="theme-info">
                <span className="theme-icon">{isDark ? '🌙' : '☀️'}</span>
                <span className="theme-label">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
              </div>
              <button className="theme-toggle-btn" onClick={toggleTheme}>
                {isDark ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>

            <button className="save-btn" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}