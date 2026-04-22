

import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Complaints.css';

const PRIORITY_COLORS = {
  urgent: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: '🔴 Urgent' },
  high: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: '🟡 High' },
  medium: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', label: '🔵 Medium' },
  low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', label: '🟢 Low' },
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
];

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

export default function Complaints({ user, onBack }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showReplyModal, setShowReplyModal] = useState(false);

  const isSuperAdmin = SUPER_ADMINS.includes(user?.email);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'tickets'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      list.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      setTickets(list);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) {
      alert('Please enter a reply');
      return;
    }
    setReplyLoading(true);
    try {
      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        adminReply: replyText.trim(),
        repliedAt: Timestamp.now(),
        repliedBy: user?.email || 'admin',
        status: 'replied',
        updatedAt: Timestamp.now(),
      });
      alert('Reply sent successfully');
      setShowReplyModal(false);
      setReplyText('');
      setSelectedTicket(null);
      await loadTickets();
    } catch (error) {
      console.error('Reply error:', error);
      alert('Failed to send reply: ' + error.message);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      alert(`Status updated to ${newStatus}`);
      await loadTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      console.error('Status error:', error);
      alert('Failed to update status: ' + error.message);
    }
  };

  const handleDelete = async (ticket) => {
    if (!isSuperAdmin) {
      alert('Only super admins can delete complaints');
      return;
    }
    if (window.confirm(`Delete "${ticket.title}"?`)) {
      try {
        await deleteDoc(doc(db, 'tickets', ticket.id));
        await loadTickets();
        alert('Complaint deleted');
      } catch (error) {
        alert('Failed to delete');
      }
    }
  };

  const getDisplayEmail = (ticket) => {
    if (isSuperAdmin) return ticket.userEmail || 'No email';
    if (ticket.isAnonymous) return '🔒 Anonymous';
    return ticket.userEmail || 'No email';
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const stats = [
    { lbl: 'TOTAL', num: tickets.length, ac: '#7c3aed' },
    { lbl: 'OPEN', num: tickets.filter(t => t.status === 'open').length, ac: '#f59e0b' },
    { lbl: 'IN PROGRESS', num: tickets.filter(t => t.status === 'in-progress').length, ac: '#3b82f6' },
    { lbl: 'CLOSED', num: tickets.filter(t => t.status === 'closed').length, ac: '#10b981' },
  ];

  return (
    <div className="complaints-page">
      {/* Top Bar */}
      <div className="complaints-topbar">
        <button className="complaints-back-btn" onClick={onBack}>← Back</button>
        <span className="complaints-topbar-title">📋 Complaints</span>
        <span className="complaints-topbar-count">{filteredTickets.length}</span>
      </div>

      {/* Filters Bar */}
      <div className="complaints-controls">
        <div className="seg-group">
          <button className={`seg-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} className={`seg-btn ${filter === opt.value ? 'active' : ''}`} onClick={() => setFilter(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="complaints-body">
        {/* Stats */}
        <div className="complaints-stats">
          {stats.map(s => (
            <div key={s.lbl} className="c-stat" style={{ '--ac': s.ac }}>
              <div className="c-stat-num">{s.num}</div>
              <div className="c-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="c-loading">
            <div className="c-spinner" />
            <div>Loading complaints...</div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="c-empty">
            <div className="c-empty-icon">📭</div>
            <div className="c-empty-text">No complaints found</div>
          </div>
        ) : (
          <div className="complaints-grid">
            {filteredTickets.map(ticket => {
              const priorityKey = ticket.priority?.toLowerCase() || 'medium';
              const priorityStyle = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.medium;
              const date = ticket.createdAt?.toDate?.().toLocaleDateString() || 'Unknown date';

              return (
                <div key={ticket.id} className="c-card" style={{ borderLeftColor: priorityStyle.text }}>
                  <div className="c-card-header">
                    <div className="c-card-title">{ticket.title}</div>
                    <div className={`c-priority-badge`} style={{ backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }}>
                      <span style={{ color: priorityStyle.text }}>{priorityStyle.label}</span>
                    </div>
                  </div>
                  <div className="c-card-email">{getDisplayEmail(ticket)}</div>
                  <div className="c-card-desc">{ticket.description}</div>
                  <div className="c-card-footer">
                    <span className="c-card-date">{date}</span>
                    <span className={`c-status-badge status-${ticket.status}`}>{ticket.status}</span>
                  </div>
                  <div className="c-card-actions">
                    <button className="c-reply-btn" onClick={() => {
                      setSelectedTicket(ticket);
                      setReplyText(ticket.adminReply || '');
                      setShowReplyModal(true);
                    }}>💬 Reply</button>
                    {isSuperAdmin && (
                      <button className="c-delete-btn" onClick={() => handleDelete(ticket)}>🗑 Delete</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <div className="c-modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="c-modal" onClick={e => e.stopPropagation()}>
            <div className="c-modal-head">
              <span className="c-modal-title">💬 Reply to Complaint</span>
              <button className="c-modal-close" onClick={() => setShowReplyModal(false)}>✕</button>
            </div>
            <div className="c-modal-body">
              <div className="c-modal-ticket">
                <div className="c-modal-ticket-title">{selectedTicket.title}</div>
                <div className="c-modal-ticket-email">{getDisplayEmail(selectedTicket)}</div>
              </div>

              <label className="c-field-label">Status</label>
              <select
                className="c-status-select"
                value={selectedTicket?.status || 'open'}
                onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <label className="c-field-label">Your Reply</label>
              <textarea
                className="c-reply-textarea"
                placeholder="Type your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={4}
              />

              <div className="c-modal-footer">
                <button className="c-cancel-btn" onClick={() => setShowReplyModal(false)}>Cancel</button>
                <button className="c-send-btn" onClick={handleReply} disabled={replyLoading}>
                  {replyLoading ? 'Sending...' : 'Send Reply'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}