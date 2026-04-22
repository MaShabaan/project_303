
import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './ThemeContext';
import './MyRatings.css';

const NPS_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const getRatingColor = (rating) => {
  if (rating <= 3) return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
  if (rating <= 6) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706' };
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#10b981' };
};

const getNpsColor = (n) => {
  if (n <= 3) return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', activeBg: '#ef4444' };
  if (n <= 6) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', activeBg: '#f59e0b' };
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', activeBg: '#10b981' };
};

const getNpsLabel = (n) => {
  if (n === null) return '';
  if (n <= 3) return '😞 Not satisfied';
  if (n <= 6) return '😐 Average';
  if (n <= 8) return '😊 Good';
  return '🤩 Excellent!';
};

function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate();
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyRatings({ onBack }) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRating, setEditingRating] = useState(null);
  const [editInstructor, setEditInstructor] = useState('');
  const [editCourseRating, setEditCourseRating] = useState(null);
  const [editInstructorRating, setEditInstructorRating] = useState(null);
  const [editComments, setEditComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadRatings();
  }, [user]);

  const loadRatings = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'feedback'),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      list.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setRatings(list);
    } catch (error) {
      console.error('Error loading ratings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (rating) => {
    if (window.confirm(`Delete your rating for "${rating.courseName}"?`)) {
      try {
        await deleteDoc(doc(db, 'feedback', rating.id));
        await loadRatings();
        alert('Rating deleted successfully');
      } catch (error) {
        console.error(error);
        alert('Failed to delete rating');
      }
    }
  };

  const openEditModal = (rating) => {
    setEditingRating(rating);
    setEditInstructor(rating.instructor || '');
    setEditCourseRating(rating.courseRating ?? rating.rating ?? null);
    setEditInstructorRating(rating.instructorRating ?? rating.rating ?? null);
    setEditComments(rating.comments || '');
    setEditModalOpen(true);
  };

  const handleUpdate = async () => {
    if (!editInstructor.trim()) {
      alert('Please enter instructor name');
      return;
    }
    if (editCourseRating === null) {
      alert('Please select a course rating');
      return;
    }
    if (editInstructorRating === null) {
      alert('Please select an instructor rating');
      return;
    }

    setSubmitting(true);
    try {
      const ratingRef = doc(db, 'feedback', editingRating.id);
      await updateDoc(ratingRef, {
        instructor: editInstructor.trim(),
        courseRating: editCourseRating,
        instructorRating: editInstructorRating,
        comments: editComments,
        updatedAt: new Date(),
      });
      setEditModalOpen(false);
      await loadRatings();
      alert('Rating updated successfully');
    } catch (error) {
      console.error(error);
      alert('Failed to update rating');
    } finally {
      setSubmitting(false);
    }
  };

  const getDivisionLabel = (division) => {
    if (division === 'computer_science') return '💻 Computer Science';
    if (division === 'special_mathematics') return '📐 Special Mathematics';
    return '';
  };

  const totalRatings = ratings.length;
  const avgCourse = totalRatings > 0
    ? (ratings.reduce((sum, r) => sum + (r.courseRating ?? r.rating ?? 0), 0) / totalRatings).toFixed(1)
    : '—';
  const avgInstructor = totalRatings > 0
    ? (ratings.reduce((sum, r) => sum + (r.instructorRating ?? r.rating ?? 0), 0) / totalRatings).toFixed(1)
    : '—';

  if (loading) {
    return (
      <div className="my-ratings-container">
        <div className="my-ratings-header">
          <button className="back-button" onClick={onBack}>← Back</button>
          <h1>⭐ My Ratings</h1>
          <div></div>
        </div>
        <div className="loading">Loading your ratings...</div>
      </div>
    );
  }

  return (
    <div className="my-ratings-container">
      <div className="my-ratings-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>⭐ My Ratings</h1>
        <div></div>
      </div>

      {totalRatings > 0 && (
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-num">{totalRatings}</div>
            <div className="stat-label">TOTAL RATINGS</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{avgCourse}</div>
            <div className="stat-label">AVG COURSE</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{avgInstructor}</div>
            <div className="stat-label">AVG INSTRUCTOR</div>
          </div>
        </div>
      )}

      {ratings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">⭐</div>
          <div className="empty-title">No ratings yet</div>
          <div className="empty-text">You haven't rated any courses yet.</div>
        </div>
      ) : (
        <div className="ratings-list">
          {ratings.map((rating, index) => {
            const courseR = rating.courseRating ?? rating.rating ?? 0;
            const instrR = rating.instructorRating ?? rating.rating ?? 0;
            const avg = ((courseR + instrR) / 2).toFixed(1);
            const courseColors = getRatingColor(courseR);
            const instrColors = getRatingColor(instrR);
            const avgColors = getRatingColor(parseFloat(avg));
            const divisionInfo = getDivisionLabel(rating.division);
            const avatarLetter = rating.courseName?.charAt(0).toUpperCase() || 'C';
            const avatarColors = ['#7c3aed', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
            const avatarColor = avatarColors[index % avatarColors.length];

            return (
              <div key={rating.id} className="rating-card">
                <div className="rating-header">
                  <div className="course-avatar" style={{ backgroundColor: avatarColor }}>
                    {avatarLetter}
                  </div>
                  <div className="course-info">
                    <div className="course-name">{rating.courseName}</div>
                    <div className="instructor-name">{rating.instructor}</div>
                    {divisionInfo && <div className="division-info">{divisionInfo}</div>}
                    {rating.year && rating.term && (
                      <div className="course-meta">Year {rating.year} · Term {rating.term}</div>
                    )}
                  </div>
                  <div className="rating-date">{formatDate(rating.createdAt)}</div>
                </div>

                <div className="ratings-row">
                  <div className="rating-item" style={{ backgroundColor: courseColors.bg, borderColor: courseColors.border }}>
                    <div className="rating-label">COURSE</div>
                    <div className="rating-value" style={{ color: courseColors.text }}>{courseR}</div>
                    <div className="rating-max">/10</div>
                  </div>
                  <div className="rating-item" style={{ backgroundColor: instrColors.bg, borderColor: instrColors.border }}>
                    <div className="rating-label">INSTRUCTOR</div>
                    <div className="rating-value" style={{ color: instrColors.text }}>{instrR}</div>
                    <div className="rating-max">/10</div>
                  </div>
                  <div className="rating-item" style={{ backgroundColor: avgColors.bg, borderColor: avgColors.border }}>
                    <div className="rating-label">AVERAGE</div>
                    <div className="rating-value" style={{ color: avgColors.text }}>{avg}</div>
                    <div className="rating-max">/10</div>
                  </div>
                </div>

                {rating.comments && (
                  <div className="comments-section">
                    <div className="comments-label">💬 Your Feedback</div>
                    <div className="comments-text">"{rating.comments}"</div>
                  </div>
                )}

                <div className="rating-actions">
                  <button className="edit-btn" onClick={() => openEditModal(rating)}>✏️ Edit</button>
                  <button className="delete-btn" onClick={() => handleDelete(rating)}>🗑️ Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingRating && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ Edit Rating</h3>
              <button className="modal-close" onClick={() => setEditModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-course-info">
                <strong>{editingRating.courseName}</strong>
              </div>

              <div className="input-group">
                <label>Instructor Name</label>
                <input
                  type="text"
                  className="modal-input"
                  value={editInstructor}
                  onChange={(e) => setEditInstructor(e.target.value)}
                  placeholder="Instructor name"
                />
              </div>

              <div className="input-group">
                <label>Course Rating</label>
                <div className="nps-grid">
                  {NPS_SCALE.map(n => {
                    const colors = getNpsColor(n);
                    const isSelected = editCourseRating === n;
                    return (
                      <button
                        key={n}
                        className={`nps-btn ${isSelected ? 'selected' : ''}`}
                        style={{
                          backgroundColor: isSelected ? colors.activeBg : colors.bg,
                          borderColor: colors.border
                        }}
                        onClick={() => setEditCourseRating(n)}
                      >
                        <span style={{ color: isSelected ? '#fff' : colors.text }}>{n}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="nps-labels">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
                {editCourseRating !== null && (
                  <div className="nps-result">{getNpsLabel(editCourseRating)}</div>
                )}
              </div>

              <div className="input-group">
                <label>Instructor Rating</label>
                <div className="nps-grid">
                  {NPS_SCALE.map(n => {
                    const colors = getNpsColor(n);
                    const isSelected = editInstructorRating === n;
                    return (
                      <button
                        key={n}
                        className={`nps-btn ${isSelected ? 'selected' : ''}`}
                        style={{
                          backgroundColor: isSelected ? colors.activeBg : colors.bg,
                          borderColor: colors.border
                        }}
                        onClick={() => setEditInstructorRating(n)}
                      >
                        <span style={{ color: isSelected ? '#fff' : colors.text }}>{n}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="nps-labels">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
                {editInstructorRating !== null && (
                  <div className="nps-result">{getNpsLabel(editInstructorRating)}</div>
                )}
              </div>

              <div className="input-group">
                <label>Comments (optional)</label>
                <textarea
                  className="modal-textarea"
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  placeholder="Share your feedback..."
                  rows={3}
                />
              </div>

              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => setEditModalOpen(false)}>Cancel</button>
                <button className="save-btn" onClick={handleUpdate} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}