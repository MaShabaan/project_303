

import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, updateDoc, doc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './ThemeContext';
import './MyTickets.css';

const STATUS_COLORS = {
  open: { bg: '#fef3c7', text: '#d97706', label: '⏳ Open' },
  'in-progress': { bg: '#eff6ff', text: '#2563eb', label: '🔄 In Progress' },
  replied: { bg: '#d1fae5', text: '#059669', label: '✅ Replied' },
  closed: { bg: '#fee2e2', text: '#dc2626', label: '🔒 Closed' },
};

const TYPE_LABELS = {
  harassment: { label: 'Harassment', icon: '⚠️' },
  complaint: { label: 'Complaint', icon: '📝' },
  technical_issue: { label: 'Technical Issue', icon: '🔧' },
  request: { label: 'Request', icon: '🙏' },
};

function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

function getDaysDifference(date) {
  const today = new Date();
  const diffTime = today - date;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

export default function MyTickets({ onBack }) {
  const { user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    
    setLoading(true);
    
   
    const q = query(collection(db, 'tickets'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const myTickets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isPinned: doc.data().isPinned || false,
        isRead: doc.data().isRead || false
      }));
      
   
      myTickets.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      

      const unread = myTickets.filter(t => !t.isRead && t.adminReply).length;
      setUnreadCount(unread);
      
      setTickets(myTickets);
      setLoading(false);
    }, (error) => {
      console.error('Error in real-time listener:', error);
      setLoading(false);
    });
    

    return () => unsubscribe();
  }, [user?.uid]);

  const markAsRead = async (ticketId) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), { isRead: true });

    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleDelete = async (ticketId, ticketTitle) => {
    if (window.confirm(`Are you sure you want to delete "${ticketTitle}"?`)) {
      try {
        await deleteDoc(doc(db, 'tickets', ticketId));
    
        alert('✅ Complaint deleted successfully');
      } catch (error) {
        console.error('Error deleting ticket:', error);
        alert('❌ Failed to delete complaint');
      }
    }
  };

  const openEditModal = (ticket) => {
    if (ticket.status !== 'open') {
      alert('⚠️ You can only edit complaints that are still open.');
      return;
    }
    setEditingTicket(ticket);
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditModalOpen(true);
  };

  const handleEdit = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      alert('Please fill in all fields');
      return;
    }
    try {
      await updateDoc(doc(db, 'tickets', editingTicket.id), {
        title: editTitle.trim(),
        description: editDescription.trim(),
        updatedAt: new Date()
      });
      setEditModalOpen(false);
      setEditingTicket(null);
      
      alert('✅ Complaint updated successfully');
    } catch (error) {
      console.error('Error updating ticket:', error);
      alert('❌ Failed to update complaint');
    }
  };

  const handlePin = async (ticketId, isPinned) => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        isPinned: !isPinned
      });
    
    } catch (error) {
      console.error('Error pinning ticket:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter !== 'all' && ticket.status !== filter) return false;
    if (dateFilter !== 'all') {
      const date = ticket.createdAt?.toDate() || new Date();
      const daysDiff = getDaysDifference(date);
      if (dateFilter === 'week' && daysDiff > 7) return false;
      if (dateFilter === 'month' && daysDiff > 30) return false;
      if (dateFilter === 'year' && daysDiff > 365) return false;
    }
    return true;
  });

  const stats = [
    { label: 'Total', value: tickets.length, color: '#7c3aed', icon: '📋' },
    { label: 'Open', value: tickets.filter(t => t.status === 'open').length, color: '#f59e0b', icon: '⏳' },
    { label: 'In Progress', value: tickets.filter(t => t.status === 'in-progress').length, color: '#3b82f6', icon: '🔄' },
    { label: 'Replied', value: tickets.filter(t => t.status === 'replied').length, color: '#10b981', icon: '✅' },
    { label: 'Closed', value: tickets.filter(t => t.status === 'closed').length, color: '#6b7280', icon: '🔒' },
  ];

  if (loading) {
    return (
      <div className="my-tickets-page">
        <div className="my-tickets-topbar">
          <button className="my-tickets-back-btn" onClick={onBack}>← Back</button>
          <span className="my-tickets-title">📋 My Complaints</span>
        </div>
        <div className="my-tickets-loading">
          <div className="my-tickets-spinner" />
          <div>Loading your complaints...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-tickets-page">
      <div className="my-tickets-topbar">
        <button className="my-tickets-back-btn" onClick={onBack}>← Back</button>
        <span className="my-tickets-title">📋 My Complaints</span>
        <div className="topbar-right">
          {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          <span className="my-tickets-count">{tickets.length} total</span>
        </div>
      </div>

      <div className="my-tickets-body">
        <div className="my-tickets-stats">
          {stats.map(stat => (
            <div key={stat.label} className="stat-card" style={{ borderTopColor: stat.color }}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-info">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="advanced-filters">
          <select 
            className="filter-select"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          >
            <option value="all">All Time</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        <div className="my-tickets-filters">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`filter-btn ${filter === 'open' ? 'active' : ''}`} onClick={() => setFilter('open')}>Open</button>
          <button className={`filter-btn ${filter === 'in-progress' ? 'active' : ''}`} onClick={() => setFilter('in-progress')}>In Progress</button>
          <button className={`filter-btn ${filter === 'replied' ? 'active' : ''}`} onClick={() => setFilter('replied')}>Replied</button>
          <button className={`filter-btn ${filter === 'closed' ? 'active' : ''}`} onClick={() => setFilter('closed')}>Closed</button>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="my-tickets-empty">
            <div className="empty-icon">📭</div>
            <div className="empty-title">No complaints found</div>
            <div className="empty-text">Try changing the filters.</div>
          </div>
        ) : (
          <div className="my-tickets-list">
            {filteredTickets.map(ticket => {
              const statusStyle = STATUS_COLORS[ticket.status] || STATUS_COLORS.open;
              const typeInfo = TYPE_LABELS[ticket.type] || { label: ticket.type, icon: '📌' };
              const hasNewReply = ticket.adminReply && !ticket.isRead;
              
              return (
                <div 
                  key={ticket.id} 
                  className={`ticket-card ${ticket.isPinned ? 'pinned' : ''} ${hasNewReply ? 'has-new-reply' : ''}`}
                  onClick={() => {
                    if (hasNewReply) markAsRead(ticket.id);
                  }}
                >
                  {ticket.isPinned && <div className="pinned-badge">📌 Pinned</div>}
                  {hasNewReply && <div className="new-reply-badge">🔴 New Reply</div>}
                  
                  <div className="ticket-header">
                    <div className="ticket-title-section">
                      <div className="ticket-type">{typeInfo.icon} {typeInfo.label}</div>
                      {ticket.isAnonymous && <div className="anonymous-badge">🔒 Anonymous</div>}
                    </div>
                    <div className="ticket-status" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>
                      {statusStyle.label}
                    </div>
                  </div>

                  <div className="ticket-title">{ticket.title}</div>
                  <div className="ticket-description">{ticket.description}</div>
                  
                  <div className="ticket-footer">
                    <div className="ticket-date">{formatDate(ticket.createdAt)}</div>
                    <div className="ticket-actions">
                      <button 
                        className={`action-btn pin-btn ${ticket.isPinned ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); handlePin(ticket.id, ticket.isPinned); }}
                        title={ticket.isPinned ? 'Unpin' : 'Pin'}
                      >
                        📌
                      </button>
                      
                      {ticket.status === 'open' && (
                        <button 
                          className="action-btn edit-btn"
                          onClick={(e) => { e.stopPropagation(); openEditModal(ticket); }}
                          title="Edit"
                        >
                          ✏️
                        </button>
                      )}
                      
                      <button 
                        className="action-btn delete-btn"
                        onClick={(e) => { e.stopPropagation(); handleDelete(ticket.id, ticket.title); }}
                        title="Delete"
                      >
                        🗑️
                      </button>
                      
                      <button 
                        className="view-reply-btn"
                        onClick={(e) => { e.stopPropagation(); setSelectedTicket(ticket); setShowReplyModal(true); }}
                      >
                        {ticket.adminReply ? '👁️ View Reply' : '💬 No Reply Yet'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showReplyModal && selectedTicket && (
        <div className="reply-modal-overlay" onClick={() => setShowReplyModal(false)}>
          <div className="reply-modal" onClick={e => e.stopPropagation()}>
            <div className="reply-modal-header">
              <div className="reply-modal-title"><span className="reply-icon">💬</span><span>Reply Details</span></div>
              <button className="reply-modal-close" onClick={() => setShowReplyModal(false)}>✕</button>
            </div>
            <div className="reply-modal-body">
              <div className="reply-ticket-info">
                <div className="reply-ticket-title">{selectedTicket.title}</div>
                <div className="reply-ticket-meta">
                  <span>Status: {STATUS_COLORS[selectedTicket.status]?.label || selectedTicket.status}</span>
                  <span>Type: {TYPE_LABELS[selectedTicket.type]?.label || selectedTicket.type}</span>
                  <span>Submitted: {formatDate(selectedTicket.createdAt)}</span>
                </div>
              </div>
              
              <div className="reply-original">
                <div className="reply-section-title">📝 Your Complaint</div>
                <div className="reply-original-text">{selectedTicket.description}</div>
              </div>
              
              {selectedTicket.adminReply ? (
                <div className="reply-response">
                  <div className="reply-section-title">✅ Admin Response</div>
                  <div className="reply-response-text">{selectedTicket.adminReply}</div>
                  {selectedTicket.repliedBy && <div className="reply-response-meta">Replied by: {selectedTicket.repliedBy}</div>}
                </div>
              ) : (
                <div className="reply-waiting">
                  <div className="reply-waiting-icon">⏳</div>
                  <div className="reply-waiting-text">Waiting for admin response</div>
                  <div className="reply-waiting-sub">An administrator will reply to your complaint as soon as possible.</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {editModalOpen && editingTicket && (
        <div className="edit-modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="edit-modal-header">
              <div className="edit-modal-title">✏️ Edit Complaint</div>
              <button className="edit-modal-close" onClick={() => setEditModalOpen(false)}>✕</button>
            </div>
            <div className="edit-modal-body">
              <div className="edit-field">
                <label>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Enter title"
                />
              </div>
              <div className="edit-field">
                <label>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Enter description"
                  rows={5}
                />
              </div>
              <div className="edit-modal-footer">
                <button className="edit-cancel-btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button className="edit-save-btn" onClick={handleEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}