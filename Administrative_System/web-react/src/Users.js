// web-react/src/pages/Users.jsx

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Users.css';

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

export default function Users({ user, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  const isSuperAdmin = SUPER_ADMINS.includes(user?.email);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      // فلترة السوبر أدمن من القائمة
      setUsers(list.filter(u => !SUPER_ADMINS.includes(u.email)));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
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

  const handleBlock = async (userId, isBlocked) => {
    if (!isSuperAdmin) {
      alert('Only super admins can block users');
      return;
    }
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: !isBlocked });
      await loadUsers();
      alert(isBlocked ? 'User unblocked' : 'User blocked');
    } catch (error) {
      alert(error.message);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filter === 'admins') return matchSearch && u.role === 'admin';
    if (filter === 'users') return matchSearch && u.role === 'user';
    return matchSearch;
  });

  return (
    <div className="users-container">
      <div className="users-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>Manage Users</h1>
        <div></div>
      </div>

      <div className="users-controls">
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <div className="filter-buttons">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'admins' ? 'active' : ''}`} onClick={() => setFilter('admins')}>Admins</button>
          <button className={`filter-btn ${filter === 'users' ? 'active' : ''}`} onClick={() => setFilter('users')}>Users</button>
        </div>
      </div>

      {isSuperAdmin && (
        <div className="super-admin-badge">
          🔑 Super Admin — can promote, demote, block, unblock & delete users
        </div>
      )}

      {loading ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="users-list">
          {filteredUsers.map(u => (
            <div key={u.id} className={`user-card ${u.isBlocked ? 'blocked' : ''}`}>
              <div className="user-avatar">
                {(u.fullName || u.email).charAt(0).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{u.fullName || 'No Name'}</div>
                <div className="user-email">{u.email}</div>
                <div className="user-meta">
                  {u.division === 'computer_science' ? '💻 CS' : '📐 Math'}
                  {u.academicYear ? ` · Year ${u.academicYear}` : ''}
                </div>
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
                  <button className="block-btn" onClick={() => handleBlock(u.id, false)}>🔒 Block</button>
                )}
                {isSuperAdmin && u.isBlocked && (
                  <button className="unblock-btn" onClick={() => handleBlock(u.id, true)}>🔓 Unblock</button>
                )}
                {isSuperAdmin && (
                  <button className="delete-btn" onClick={() => handleDelete(u.id)}>🗑 Delete</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}