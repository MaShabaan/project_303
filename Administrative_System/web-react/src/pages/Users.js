// web-react/src/pages/Users.jsx
import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Users.css';

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

const autoUnblock = async () => {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const now = Timestamp.now();
    for (const d of snap.docs) {
      const u = d.data();
      if (u.isBlocked && u.blockDetails?.expiresAt?.toDate() < now.toDate()) {
        await updateDoc(doc(db, 'users', d.id), { isBlocked: false, blockDetails: null, updatedAt: now });
      }
    }
  } catch (e) { console.error(e); }
};

const durLabel = (d) => ({ '2days': '2 days', '1week': '1 week', '1month': '1 month', permanent: 'Permanent' }[d] || d);

const remaining = (expiresAt) => {
  if (!expiresAt) return 'Never expires';
  try {
    const diff = expiresAt.toDate() - new Date();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d left`;
    const hrs = Math.floor(diff / 3600000);
    return hrs > 0 ? `${hrs}h left` : 'Less than 1h';
  } catch { return '—'; }
};

export default function Users({ user, onBack }) {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [view, setView]             = useState('active');   // active | blocked
  const [roleFilter, setRoleFilter] = useState('all');      // all | admins | users

  const [blockModal, setBlockModal] = useState(false);
  const [selUser, setSelUser]       = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockDur, setBlockDur]     = useState('2days');

  const isSuperAdmin = SUPER_ADMINS.includes(user?.email);

  useEffect(() => { loadUsers(); autoUnblock(); }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => !SUPER_ADMINS.includes(u.email))
      );
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const confirm = (msg) => window.confirm(msg);

  const handlePromote = async (uid) => {
    if (!isSuperAdmin) return alert('Only super admins can promote users');
    try {
      await updateDoc(doc(db, 'users', uid), { role: 'admin', updatedAt: Timestamp.now() });
      await loadUsers();
    } catch (e) { alert(e.message); }
  };

  const handleDemote = async (uid) => {
    if (!isSuperAdmin) return alert('Only super admins can demote users');
    try {
      await updateDoc(doc(db, 'users', uid), { role: 'user', updatedAt: Timestamp.now() });
      await loadUsers();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (uid) => {
    if (!isSuperAdmin) return alert('Only super admins can delete users');
    if (!confirm('Delete this user? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', uid));
      await loadUsers();
    } catch (e) { alert(e.message); }
  };

  const openBlock = (u) => {
    if (!isSuperAdmin) return alert('Only super admins can block users');
    setSelUser(u); setBlockReason(''); setBlockDur('2days'); setBlockModal(true);
  };

  const handleBlock = async () => {
    if (!selUser || !blockReason.trim()) return alert('Please enter a reason');
    try {
      const now = Timestamp.now();
      const durMs = { '2days': 2*86400000, '1week': 7*86400000, '1month': 30*86400000 };
      const expiresAt = blockDur === 'permanent' ? null
        : Timestamp.fromDate(new Date(now.toDate().getTime() + durMs[blockDur]));
      await updateDoc(doc(db, 'users', selUser.id), {
        isBlocked: true,
        blockDetails: {
          reason: blockReason.trim(), duration: blockDur,
          blockedBy: user?.email, blockedAt: now, expiresAt,
        },
        updatedAt: now,
      });
      setBlockModal(false);
      await loadUsers();
    } catch (e) { alert('Failed: ' + e.message); }
  };

  const handleUnblock = async (uid) => {
    if (!isSuperAdmin) return alert('Only super admins can unblock users');
    try {
      await updateDoc(doc(db, 'users', uid), { isBlocked: false, blockDetails: null, updatedAt: Timestamp.now() });
      await loadUsers();
    } catch (e) { alert(e.message); }
  };

  const filtered = users.filter(u => {
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.displayName || u.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.academicCode || '').includes(search);

    if (view === 'blocked') return matchSearch && u.isBlocked;
    if (roleFilter === 'admins') return matchSearch && !u.isBlocked && u.role === 'admin';
    if (roleFilter === 'users')  return matchSearch && !u.isBlocked && u.role === 'user';
    return matchSearch && !u.isBlocked;
  });

  const stats = [
    { lbl: 'TOTAL',   num: users.length,                                     ac: '#7c3aed' },
    { lbl: 'ADMINS',  num: users.filter(u => u.role === 'admin').length,      ac: '#4f46e5' },
    { lbl: 'USERS',   num: users.filter(u => u.role === 'user').length,       ac: '#10b981' },
    { lbl: 'BLOCKED', num: users.filter(u => u.isBlocked).length,             ac: '#ef4444' },
  ];

  return (
    <div className="users-page">

      {/* Top Bar */}
      <div className="users-topbar">
        <button className="users-back-btn" onClick={onBack}>← Back</button>
        <span className="users-topbar-title">👥 Manage Users</span>
        <span className="users-topbar-count">{filtered.length}</span>
      </div>

      {/* Controls */}
      <div className="users-controls">
        <input
          className="users-search"
          type="text"
          placeholder="Search name, email or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Active / Blocked */}
        <div className="seg-group">
          <button className={`seg-btn ${view === 'active' ? 'active' : ''}`} onClick={() => setView('active')}>Active</button>
          <button className={`seg-btn ${view === 'blocked' ? 'active' : ''}`} onClick={() => setView('blocked')}>
            🔒 Blocked ({users.filter(u => u.isBlocked).length})
          </button>
        </div>

        {/* Role filter — only when showing active */}
        {view === 'active' && (
          <div className="seg-group">
            {['all', 'admins', 'users'].map(f => (
              <button
                key={f}
                className={`seg-btn ${roleFilter === f ? 'active' : ''}`}
                onClick={() => setRoleFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Super Admin Banner */}
      {isSuperAdmin && (
        <div className="sa-banner">
          🔑 Super Admin — promote, demote, block, unblock &amp; delete users
        </div>
      )}

      {/* Body */}
      <div className="users-body">

        {/* Stats */}
        <div className="users-stats">
          {stats.map(s => (
            <div key={s.lbl} className="u-stat" style={{ '--ac': s.ac }}>
              <div className="u-stat-num">{s.num}</div>
              <div className="u-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="u-loading">
            <div className="u-spinner" />
            <div style={{ color: '#94a3b8', fontSize: 13 }}>Loading users...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="u-empty">
            <div className="u-empty-icon">📭</div>
            <div className="u-empty-text">No users found</div>
            <div className="u-empty-sub">Try adjusting the filters</div>
          </div>
        ) : (
          <div className="users-grid">
            {filtered.map(u => (
              <div key={u.id} className={`u-card ${u.isBlocked ? 'is-blocked' : ''}`}>
                <div className="u-card-top">
                  <div className="u-avatar">
                    {(u.displayName || u.fullName || u.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="u-info">
                    <div className="u-name">{u.displayName || u.fullName || 'No Name'}</div>
                    <div className="u-email">{u.email}</div>
                    <div className="u-meta">
                      {u.academicCode && <span className="u-meta-tag">🎓 {u.academicCode}</span>}
                      {u.division === 'computer_science' && <span className="u-meta-tag">💻 CS</span>}
                      {u.division === 'special_mathematics' && <span className="u-meta-tag">📐 Math</span>}
                      {u.semester && <span className="u-meta-tag">Sem {u.semester}</span>}
                    </div>
                    {u.isBlocked && u.blockDetails && (
                      <div className="u-blocked-info">
                        🔒 {u.blockDetails.reason}
                        {u.blockDetails.expiresAt && ` · ${remaining(u.blockDetails.expiresAt)}`}
                      </div>
                    )}
                  </div>
                  <div className={`u-role-badge ${u.role === 'admin' ? 'u-role-admin' : 'u-role-user'}`}>
                    {u.role === 'admin' ? 'Admin' : 'User'}
                  </div>
                </div>

                <div className="u-actions">
                  {isSuperAdmin && u.role === 'user'  && !u.isBlocked && <button className="u-btn btn-promote"  onClick={() => handlePromote(u.id)}>⬆ Make Admin</button>}
                  {isSuperAdmin && u.role === 'admin' && !u.isBlocked && <button className="u-btn btn-demote"   onClick={() => handleDemote(u.id)}>⬇ Remove Admin</button>}
                  {isSuperAdmin && !u.isBlocked                        && <button className="u-btn btn-block"    onClick={() => openBlock(u)}>🔒 Block</button>}
                  {isSuperAdmin && u.isBlocked                         && <button className="u-btn btn-unblock"  onClick={() => handleUnblock(u.id)}>🔓 Unblock</button>}
                  {isSuperAdmin                                         && <button className="u-btn btn-delete"   onClick={() => handleDelete(u.id)}>🗑 Delete</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Block Modal */}
      {blockModal && selUser && (
        <div className="u-modal-overlay" onClick={() => setBlockModal(false)}>
          <div className="u-modal" onClick={e => e.stopPropagation()}>
            <div className="u-modal-head">
              <span className="u-modal-head-title">🔒 Block User</span>
              <button className="u-modal-close" onClick={() => setBlockModal(false)}>✕</button>
            </div>
            <div className="u-modal-body">
              <div className="u-modal-user">
                <div className="u-modal-user-name">{selUser.displayName || selUser.fullName || 'No Name'}</div>
                <div className="u-modal-user-email">{selUser.email}</div>
              </div>

              <label className="u-field-label">Reason *</label>
              <textarea
                className="u-textarea"
                placeholder="Enter reason for blocking..."
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                rows={3}
              />

              <label className="u-field-label" style={{ marginTop: 16 }}>Duration</label>
              <div className="duration-grid">
                {['2days', '1week', '1month', 'permanent'].map(d => (
                  <button
                    key={d}
                    className={`dur-btn ${blockDur === d ? 'active' : ''}`}
                    onClick={() => setBlockDur(d)}
                  >
                    {durLabel(d)}
                  </button>
                ))}
              </div>

              <div className="u-modal-footer">
                <button className="u-cancel-btn" onClick={() => setBlockModal(false)}>Cancel</button>
                <button className="u-block-submit-btn" onClick={handleBlock}>Block User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
