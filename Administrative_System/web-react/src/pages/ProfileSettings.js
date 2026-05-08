// web-react/src/pages/ProfileSettings.jsx

import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import './ProfileSettings.css';
import { useTheme } from './ThemeContext';

export default function ProfileSettings({ user, onBack }) {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState(null);
  const [userData, setUserData] = useState(null);

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
      setPhotoURL(data.photoURL || null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const resizeImage = (file, maxWidth, maxHeight, callback) => {
    const img = new Image();
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target.result;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        callback(dataUrl);
      };
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    setUploading(true);
    try {
      resizeImage(file, 150, 150, (resizedBase64) => {
        setPhotoURL(resizedBase64);
        alert('Profile picture updated! Click Save to apply.');
        setUploading(false);
      });
    } catch (error) {
      console.error(error);
      alert('Failed to process image');
      setUploading(false);
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
        updatedAt: new Date(),
      };
      
      if (photoURL) {
        updateData.photoURL = photoURL;
      }
      
      await updateDoc(doc(db, 'users', user.uid), updateData);
      alert('Profile saved successfully!');
      onBack();
    } catch (error) {
      console.error(error);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const getAvatarColor = (email) => {
    const colors = ['#7c3aed', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  const getDivisionLabel = (division) => {
    if (division === 'computer_science') return 'Computer Science 💻';
    if (division === 'special_mathematics') return 'Special Mathematics 📐';
    return '—';
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
      <div className="profile-topbar">
        <button className="profile-back-btn" onClick={onBack}>← Back</button>
        <span className="profile-topbar-title">⚙️ Profile Settings</span>
      </div>

      <div className="profile-body">
        <div className="profile-card">
          <div className="profile-avatar-section">
            <div className="profile-avatar" style={{ backgroundColor: getAvatarColor(user?.email) }}>
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="profile-avatar-image" />
              ) : (
                <div className="profile-avatar-placeholder">
                  {displayName?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            <label className="profile-upload-btn">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              📷 Change Photo
            </label>
            {uploading && <div className="profile-uploading">Processing image...</div>}
            <div className="profile-avatar-note">
              ✨ Image is resized to 150x150 and stored in Firestore
            </div>
          </div>

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

            {userData?.role === 'user' && userData?.academicCode && (
              <div className="field-group">
                <label>Academic Code</label>
                <input type="text" value={userData.academicCode} disabled />
              </div>
            )}

            {userData?.role === 'user' && (
              <div className="field-group">
                <label>Division</label>
                <input type="text" value={getDivisionLabel(userData?.division)} disabled />
              </div>
            )}

            {userData?.role === 'user' && userData?.academicYear && (
              <div className="field-group">
                <label>Academic Year</label>
                <input type="text" value={`Year ${userData.academicYear}`} disabled />
              </div>
            )}

            {userData?.role === 'user' && userData?.currentTerm && (
              <div className="field-group">
                <label>Current Term</label>
                <input type="text" value={`Term ${userData.currentTerm}`} disabled />
              </div>
            )}

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