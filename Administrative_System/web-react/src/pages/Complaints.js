// web-react/src/pages/Complaints.jsx

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
      
      // ترتيب حسب الأولوية (مع التحويل لحروف صغيرة)
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      list.sort((a, b) => {
        const priorityA = a.priority?.toLowerCase() || 'medium';
        const priorityB = b.priority?.toLowerCase() || 'medium';
        return priorityOrder[priorityA] - priorityOrder[priorityB];
      });
      
      setTickets(list);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedTicket) return;
    setReplyLoading(true);
    try {
      await updateDoc(doc(db, 'tickets', selectedTicket.id), {
        adminReply: replyText.trim(),
        repliedAt: Timestamp.now(),
        repliedBy: user.email,
        status: 'replied',
        updatedAt: Timestamp.now(),
      });
      setShowReplyModal(false);
      setReplyText('');
      setSelectedTicket(null);
      await loadTickets();
      alert('Reply sent successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
      await loadTickets();
      alert(`Status updated to ${newStatus}`);
    } catch (error) {
      alert('Failed to update status');
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
    if (isSuperAdmin) {
      return ticket.userEmail || 'No email';
    }
    if (ticket.isAnonymous) {
      return '🔒 Anonymous';
    }
    return ticket.userEmail || 'No email';
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  return (
    <div className="complaints-container">
      <div className="complaints-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>📋 Complaints</h1>
        <div className="filter-buttons">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          {STATUS_OPTIONS.map(opt => (
            <button key={opt.value} className={`filter-btn ${filter === opt.value ? 'active' : ''}`} onClick={() => setFilter(opt.value)}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state">📭 No complaints found</div>
      ) : (
        <div className="tickets-list">
          {filteredTickets.map(ticket => {
            const priorityKey = ticket.priority?.toLowerCase() || 'medium';
            const priorityStyle = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.medium;
            const date = ticket.createdAt?.toDate?.().toLocaleDateString() || 'Unknown date';
            
            return (
              <div key={ticket.id} className="ticket-card" style={{ borderLeftColor: priorityStyle.text }}>
                <div className="ticket-content" onClick={() => {
                  setSelectedTicket(ticket);
                  setReplyText(ticket.adminReply || '');
                  setShowReplyModal(true);
                }}>
                  <div className="ticket-header">
                    <div>
                      <div className="ticket-title">{ticket.title}</div>
                      <div className="ticket-email">{getDisplayEmail(ticket)}</div>
                    </div>
                    <div className="priority-badge" style={{ backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }}>
                      <span style={{ color: priorityStyle.text }}>{priorityStyle.label}</span>
                    </div>
                  </div>
                  <div className="ticket-description">{ticket.description}</div>
                  <div className="ticket-footer">
                    <span className="ticket-date">{date}</span>
                    <span className={`status-badge status-${ticket.status}`}>{ticket.status}</span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <div className="ticket-actions">
                    <button className="delete-btn" onClick={() => handleDelete(ticket)}>🗑 Delete</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Modal */}
      {showReplyModal && selectedTicket && (
        <div className="modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reply to Complaint</h3>
              <button className="modal-close" onClick={() => setShowReplyModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="ticket-info">
                <div><strong>Title:</strong> {selectedTicket.title}</div>
                <div><strong>From:</strong> {getDisplayEmail(selectedTicket)}</div>
              </div>
              <div className="status-selector">
                <label>Status:</label>
                <select value={selectedTicket.status} onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="reply-textarea"
                placeholder="Type your reply here..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
              />
              <button className="send-btn" onClick={handleReply} disabled={replyLoading}>
                {replyLoading ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}