

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Users.css';

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

const autoUnblockExpiredUsers = async () => {
  try {
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);
    const now = Timestamp.now();
    let unblockedCount = 0;
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      if (userData.isBlocked === true && userData.blockDetails?.expiresAt) {
        const expiresAt = userData.blockDetails.expiresAt;
        if (expiresAt.toDate() < now.toDate()) {
          await updateDoc(doc(db, 'users', userDoc.id), {
            isBlocked: false,
            blockDetails: null,
            updatedAt: now,
          });
          unblockedCount++;
        }
      }
    }
    if (unblockedCount > 0) {
      console.log(`Auto-unblocked ${unblockedCount} users`);
    }
    return unblockedCount;
  } catch (error) {
    console.error('Error auto unblocking users:', error);
    return 0;
  }
};

export default function Users({ user, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  
  // Modal states
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState('2days');

  const isSuperAdmin = SUPER_ADMINS.includes(user?.email);

  useEffect(() => {
    loadUsers();
    autoUnblockExpiredUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(list.filter(u => !SUPER_ADMINS.includes(u.email)));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDurationLabel = (duration) => {
    switch (duration) {
      case '2days': return '2 days';
      case '1week': return '1 week';
      case '1month': return '1 month';
      case 'permanent': return 'Permanent';
      default: return duration;
    }
  };

  const getRemainingTime = (expiresAt) => {
    if (!expiresAt) return 'Never';
    try {
      const now = new Date();
      const expiry = expiresAt.toDate();
      if (expiry < now) return 'Expired';
      const diff = expiry.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days > 0) return `${days} days left`;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours > 0) return `${hours} hours left`;
      return 'Less than an hour';
    } catch (e) {
      return 'Unknown';
    }
  };

  const handlePromote = async (userId) => {
    if (!isSuperAdmin) {
      alert('Only super admins can promote users');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'admin' });
      await loadUsers();
      alert('User promoted to admin');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDemote = async (userId) => {
    if (!isSuperAdmin) {
      alert('Only super admins can demote users');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'user' });
      await loadUsers();
      alert('Admin role removed');
    } catch (error) {
      alert(error.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!isSuperAdmin) {
      alert('Only super admins can delete users');
      return;
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        await loadUsers();
        alert('User deleted');
      } catch (error) {
        alert(error.message);
      }
    }
  };

  const openBlockModal = (user) => {
    if (!isSuperAdmin) {
      alert('Only super admins can block users');
      return;
    }
    setSelectedUser(user);
    setBlockReason('');
    setBlockDuration('2days');
    setBlockModalVisible(true);
  };

  const handleBlock = async () => {
    if (!selectedUser) return;
    if (!blockReason.trim()) {
      alert('Please enter a reason for blocking');
      return;
    }
    
    try {
      const now = Timestamp.now();
      let expiresAt = null;
      
      switch (blockDuration) {
        case '2days':
          expiresAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 2 * 24 * 60 * 60 * 1000));
          break;
        case '1week':
          expiresAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 7 * 24 * 60 * 60 * 1000));
          break;
        case '1month':
          expiresAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 30 * 24 * 60 * 60 * 1000));
          break;
        case 'permanent':
          expiresAt = null;
          break;
        default:
          expiresAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 2 * 24 * 60 * 60 * 1000));
      }
      
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, {
        isBlocked: true,
        blockDetails: {
          reason: blockReason.trim(),
          duration: blockDuration,
          blockedBy: user?.email || 'admin',
          blockedByRole: user?.role || 'admin',
          blockedAt: now,
          expiresAt: expiresAt,
        },
        updatedAt: now,
      });
      
      setBlockModalVisible(false);
      setSelectedUser(null);
      setBlockReason('');
      await loadUsers();
      alert(`User blocked successfully for ${getDurationLabel(blockDuration)}`);
    } catch (error) {
      console.error('Block error:', error);
      alert('Failed to block user: ' + error.message);
    }
  };

  const handleUnblock = async (userId) => {
    if (!isSuperAdmin) {
      alert('Only super admins can unblock users');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), {
        isBlocked: false,
        blockDetails: null,
        updatedAt: Timestamp.now(),
      });
      await loadUsers();
      alert('User unblocked successfully');
    } catch (error) {
      alert(error.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.displayName || u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.academicCode || '').includes(searchTerm);
    
    if (showBlockedOnly) {
      return matchSearch && u.isBlocked === true;
    }
    
    if (filter === 'admins') return matchSearch && u.role === 'admin' && !u.isBlocked;
    if (filter === 'users') return matchSearch && u.role === 'user' && !u.isBlocked;
    return matchSearch && !u.isBlocked;
  });

  const blockedCount = users.filter(u => u.isBlocked === true).length;

  return (
    <div className="users-container">
      <div className="users-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>👥 Manage Users</h1>
        <div></div>
      </div>

      <div className="users-controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by email, name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="toggle-container">
          <button 
            className={`toggle-btn ${!showBlockedOnly ? 'active' : ''}`}
            onClick={() => setShowBlockedOnly(false)}
          >
            All Users
          </button>
          <button 
            className={`toggle-btn ${showBlockedOnly ? 'active' : ''}`}
            onClick={() => setShowBlockedOnly(true)}
          >
            🔒 Blocked ({blockedCount})
          </button>
        </div>

        {!showBlockedOnly && (
          <div className="filter-buttons">
            <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
            <button className={`filter-btn ${filter === 'admins' ? 'active' : ''}`} onClick={() => setFilter('admins')}>Admins</button>
            <button className={`filter-btn ${filter === 'users' ? 'active' : ''}`} onClick={() => setFilter('users')}>Users</button>
          </div>
        )}
      </div>

      {isSuperAdmin && (
        <div className="super-admin-badge">
          🔑 Super Admin — can promote, demote, block, unblock & delete users
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredUsers.length === 0 ? (
        <div className="empty-state">📭 No users found</div>
      ) : (
        <div className="users-list">
          {filteredUsers.map(u => (
            <div key={u.id} className={`user-card ${u.isBlocked ? 'blocked' : ''}`}>
              <div className="user-avatar">
                {(u.displayName || u.fullName || u.email).charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{u.displayName || u.fullName || 'No Name'}</div>
                <div className="user-email">{u.email}</div>
                <div className="user-meta">
                  {u.academicCode && <span>Code: {u.academicCode} · </span>}
                  {u.division === 'computer_science' ? '💻 CS' : u.division === 'special_mathematics' ? '📐 Math' : ''}
                  {u.academicYear ? ` · Year ${u.academicYear}` : ''}
                  {u.currentTerm ? ` · Term ${u.currentTerm}` : ''}
                </div>
                {u.isBlocked && u.blockDetails && (
                  <div className="blocked-info">
                    🔒 Blocked: {u.blockDetails.reason} ({getDurationLabel(u.blockDetails.duration)})
                    {u.blockDetails.expiresAt && ` · ${getRemainingTime(u.blockDetails.expiresAt)}`}
                  </div>
                )}
              </div>
              <div className={`role-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>
                {u.role === 'admin' ? 'Admin' : 'User'}
              </div>
              <div className="user-actions">
                {isSuperAdmin && u.role === 'user' && !u.isBlocked && (
                  <button className="promote-btn" onClick={() => handlePromote(u.id)}>⬆ Make Admin</button>
                )}
                {isSuperAdmin && u.role === 'admin' && !u.isBlocked && (
                  <button className="demote-btn" onClick={() => handleDemote(u.id)}>⬇ Remove Admin</button>
                )}
                {isSuperAdmin && !u.isBlocked && (
                  <button className="block-btn" onClick={() => openBlockModal(u)}>🔒 Block</button>
                )}
                {isSuperAdmin && u.isBlocked && (
                  <button className="unblock-btn" onClick={() => handleUnblock(u.id)}>🔓 Unblock</button>
                )}
                {isSuperAdmin && (
                  <button className="delete-btn" onClick={() => handleDelete(u.id)}>🗑 Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Block Modal */}
      {blockModalVisible && selectedUser && (
        <div className="modal-overlay" onClick={() => setBlockModalVisible(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔒 Block User</h3>
              <button className="modal-close" onClick={() => setBlockModalVisible(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-user-info">
                <strong>{selectedUser.displayName || selectedUser.fullName || selectedUser.email}</strong>
                <span>{selectedUser.email}</span>
              </div>
              
              <div className="input-group">
                <label>Reason for blocking *</label>
                <textarea
                  className="modal-textarea"
                  placeholder="Enter reason..."
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  rows={3}
                />
              </div>
              
              <div className="input-group">
                <label>Block duration</label>
                <div className="duration-options">
                  <button className={`duration-btn ${blockDuration === '2days' ? 'active' : ''}`} onClick={() => setBlockDuration('2days')}>2 days</button>
                  <button className={`duration-btn ${blockDuration === '1week' ? 'active' : ''}`} onClick={() => setBlockDuration('1week')}>1 week</button>
                  <button className={`duration-btn ${blockDuration === '1month' ? 'active' : ''}`} onClick={() => setBlockDuration('1month')}>1 month</button>
                  <button className={`duration-btn ${blockDuration === 'permanent' ? 'active' : ''}`} onClick={() => setBlockDuration('permanent')}>Permanent</button>
                </div>
              </div>
              
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setBlockModalVisible(false)}>Cancel</button>
                <button className="block-submit-btn" onClick={handleBlock}>Block User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}