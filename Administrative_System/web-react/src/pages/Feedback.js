
import React, { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Feedback.css';

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

const getRatingColor = (rating) => {
  if (rating <= 3) return '#dc2626';
  if (rating <= 6) return '#f59e0b';
  return '#10b981';
};

const getAverageColor = (avg) => {
  if (avg <= 3) return '#dc2626';
  if (avg <= 6) return '#f59e0b';
  return '#10b981';
};

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function Feedback({ user, onBack }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingFeedback, setDeletingFeedback] = useState(null);

  const isSuperAdmin = SUPER_ADMINS.includes(user?.email);

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'feedback'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      list.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setFeedbacks(list);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingFeedback) return;
    try {
      await deleteDoc(doc(db, 'feedback', deletingFeedback.id));
      await loadFeedbacks();
      setDeleteModal(false);
      setDeletingFeedback(null);
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    const matchSearch = fb.courseName?.toLowerCase().includes(search.toLowerCase()) ||
                        fb.instructor?.toLowerCase().includes(search.toLowerCase()) ||
                        fb.userEmail?.toLowerCase().includes(search.toLowerCase());
    if (divisionFilter !== 'all' && fb.division !== divisionFilter) return false;
    return matchSearch;
  });

  const stats = [
    { lbl: 'TOTAL', num: feedbacks.length, ac: '#7c3aed' },
    { lbl: 'AVG COURSE', num: feedbacks.length > 0 ? (feedbacks.reduce((sum, fb) => sum + (fb.courseRating ?? fb.rating ?? 0), 0) / feedbacks.length).toFixed(1) : '—', ac: '#4f46e5' },
    { lbl: 'AVG INSTRUCTOR', num: feedbacks.length > 0 ? (feedbacks.reduce((sum, fb) => sum + (fb.instructorRating ?? fb.rating ?? 0), 0) / feedbacks.length).toFixed(1) : '—', ac: '#10b981' },
    { lbl: 'DIVISIONS', num: [...new Set(feedbacks.map(fb => fb.division))].length, ac: '#f59e0b' },
  ];

  return (
    <div className="feedback-page">
      {/* Top Bar */}
      <div className="feedback-topbar">
        <button className="feedback-back-btn" onClick={onBack}>← Back</button>
        <span className="feedback-topbar-title">⭐ Course Feedback</span>
        <span className="feedback-topbar-count">{filteredFeedbacks.length}</span>
      </div>

      {/* Controls */}
      <div className="feedback-controls">
        <input
          className="feedback-search"
          type="text"
          placeholder="Search by course, instructor or student..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="seg-group">
          <button className={`seg-btn ${divisionFilter === 'all' ? 'active' : ''}`} onClick={() => setDivisionFilter('all')}>All</button>
          <button className={`seg-btn ${divisionFilter === 'computer_science' ? 'active' : ''}`} onClick={() => setDivisionFilter('computer_science')}>💻 CS</button>
          <button className={`seg-btn ${divisionFilter === 'special_mathematics' ? 'active' : ''}`} onClick={() => setDivisionFilter('special_mathematics')}>📐 Math</button>
        </div>
      </div>

      {/* Body */}
      <div className="feedback-body">
        {/* Stats */}
        <div className="feedback-stats">
          {stats.map(s => (
            <div key={s.lbl} className="f-stat" style={{ '--ac': s.ac }}>
              <div className="f-stat-num">{s.num}</div>
              <div className="f-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Feedback List */}
        {loading ? (
          <div className="f-loading">
            <div className="f-spinner" />
            <div>Loading feedback...</div>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="f-empty">
            <div className="f-empty-icon">⭐</div>
            <div className="f-empty-text">No feedback found</div>
          </div>
        ) : (
          <div className="feedback-grid">
            {filteredFeedbacks.map(fb => {
              const courseRating = fb.courseRating ?? fb.rating ?? 0;
              const instructorRating = fb.instructorRating ?? fb.rating ?? 0;
              const average = ((courseRating + instructorRating) / 2).toFixed(1);
              const courseColor = getRatingColor(courseRating);
              const instructorColor = getRatingColor(instructorRating);
              const avgColor = getAverageColor(parseFloat(average));
              const divisionIcon = fb.division === 'computer_science' ? '💻' : '📐';
              const divisionLabel = fb.division === 'computer_science' ? 'Computer Science' : 'Special Mathematics';

              return (
                <div key={fb.id} className="f-card">
                  <div className="f-card-header">
                    <div className="f-card-course">
                      <div className="f-course-name">{fb.courseName}</div>
                      <div className="f-instructor-name">{fb.instructor}</div>
                    </div>
                    <div className="f-division-badge">
                      {divisionIcon} {divisionLabel}
                    </div>
                  </div>

                  <div className="f-card-meta">
                    <span className="f-meta-item">👤 {fb.userEmail?.split('@')[0]}</span>
                    <span className="f-meta-item">📅 {formatDate(fb.createdAt)}</span>
                    {fb.year && fb.term && <span className="f-meta-item">📖 Year {fb.year} · Term {fb.term}</span>}
                  </div>

                  <div className="f-ratings">
                    <div className="f-rating-item">
                      <span className="f-rating-label">Course</span>
                      <span className="f-rating-value" style={{ color: courseColor }}>{courseRating}</span>
                      <span className="f-rating-max">/10</span>
                    </div>
                    <div className="f-rating-divider" />
                    <div className="f-rating-item">
                      <span className="f-rating-label">Instructor</span>
                      <span className="f-rating-value" style={{ color: instructorColor }}>{instructorRating}</span>
                      <span className="f-rating-max">/10</span>
                    </div>
                    <div className="f-rating-divider" />
                    <div className="f-rating-item">
                      <span className="f-rating-label">Average</span>
                      <span className="f-rating-value" style={{ color: avgColor }}>{average}</span>
                      <span className="f-rating-max">/10</span>
                    </div>
                  </div>

                  {fb.comments && (
                    <div className="f-comments">
                      <div className="f-comments-label">💬 Student Feedback</div>
                      <div className="f-comments-text">"{fb.comments}"</div>
                    </div>
                  )}

                  {isSuperAdmin && (
                    <div className="f-card-actions">
                      <button className="f-delete-btn" onClick={() => {
                        setDeletingFeedback(fb);
                        setDeleteModal(true);
                      }}>🗑 Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Modal */}
      {deleteModal && deletingFeedback && (
        <div className="f-modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="f-modal" onClick={e => e.stopPropagation()}>
            <div className="f-modal-head">
              <span className="f-modal-title">🗑 Delete Feedback</span>
              <button className="f-modal-close" onClick={() => setDeleteModal(false)}>✕</button>
            </div>
            <div className="f-modal-body">
              <div className="f-modal-course">{deletingFeedback.courseName}</div>
              <div className="f-modal-warning">
                Are you sure you want to delete this feedback? This action cannot be undone.
              </div>
              <div className="f-modal-footer">
                <button className="f-cancel-btn" onClick={() => setDeleteModal(false)}>Cancel</button>
                <button className="f-confirm-btn" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}