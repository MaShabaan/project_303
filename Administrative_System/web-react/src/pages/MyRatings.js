import React, { useState, useEffect } from 'react';
import { collection, deleteDoc, doc, updateDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './ThemeContext';
import './MyRatings.css';

const RATING_COLORS = {
  1: { bg: '#fef2f2', text: '#dc2626', label: 'Very Poor' },
  2: { bg: '#fef2f2', text: '#dc2626', label: 'Poor' },
  3: { bg: '#fef2f2', text: '#dc2626', label: 'Below Average' },
  4: { bg: '#fffbeb', text: '#d97706', label: 'Below Average' },
  5: { bg: '#fffbeb', text: '#d97706', label: 'Average' },
  6: { bg: '#fffbeb', text: '#d97706', label: 'Above Average' },
  7: { bg: '#f0fdf4', text: '#10b981', label: 'Good' },
  8: { bg: '#f0fdf4', text: '#10b981', label: 'Very Good' },
  9: { bg: '#f0fdf4', text: '#10b981', label: 'Excellent' },
  10: { bg: '#f0fdf4', text: '#059669', label: 'Outstanding' },
};

function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
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

export default function MyRatings({ onBack }) {
  const { user } = useAuth();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRating, setEditingRating] = useState(null);
  const [editCourseRating, setEditCourseRating] = useState(null);
  const [editInstructorRating, setEditInstructorRating] = useState(null);
  const [editComments, setEditComments] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [uniqueCourses, setUniqueCourses] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;

    setLoading(true);
    const q = query(collection(db, 'feedback'), where('userId', '==', user.uid));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const myRatings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isPinned: doc.data().isPinned || false
      }));
      
      myRatings.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      
      setRatings(myRatings);
      const courses = [...new Set(myRatings.map(r => r.courseName))];
      setUniqueCourses(courses);
      
      setLoading(false);
    }, (error) => {
      console.error('Error loading ratings:', error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const handlePin = async (ratingId, isPinned) => {
    try {
      await updateDoc(doc(db, 'feedback', ratingId), {
        isPinned: !isPinned
      });
    } catch (error) {
      console.error('Error pinning rating:', error);
    }
  };

  const handleDelete = async () => {
    if (!selectedRating) return;
    try {
      await deleteDoc(doc(db, 'feedback', selectedRating.id));
      setShowDeleteModal(false);
      setSelectedRating(null);
    } catch (error) {
      console.error('Error deleting rating:', error);
      alert('❌ Failed to delete rating');
    }
  };

  const openEditModal = (rating) => {
    setEditingRating(rating);
    setEditCourseRating(rating.courseRating || rating.rating || null);
    setEditInstructorRating(rating.instructorRating || rating.rating || null);
    setEditComments(rating.comments || '');
    setShowEditModal(true);
  };

  const handleEdit = async () => {
    if (editCourseRating === null || editInstructorRating === null) {
      alert('Please select both ratings');
      return;
    }
    
    try {
      await updateDoc(doc(db, 'feedback', editingRating.id), {
        courseRating: editCourseRating,
        instructorRating: editInstructorRating,
        comments: editComments,
        updatedAt: new Date()
      });
      setShowEditModal(false);
      setEditingRating(null);
      alert('✅ Rating updated successfully');
    } catch (error) {
      console.error('Error updating rating:', error);
      alert('❌ Failed to update rating');
    }
  };

  const filteredRatings = ratings.filter(rating => {
    if (dateFilter !== 'all') {
      const date = rating.createdAt?.toDate() || new Date();
      const daysDiff = getDaysDifference(date);
      if (dateFilter === 'week' && daysDiff > 7) return false;
      if (dateFilter === 'month' && daysDiff > 30) return false;
      if (dateFilter === 'year' && daysDiff > 365) return false;
    }
    if (courseFilter !== 'all' && rating.courseName !== courseFilter) return false;
    return true;
  });

  const avgCourse = ratings.length > 0 
    ? (ratings.reduce((s, r) => s + (r.courseRating || r.rating || 0), 0) / ratings.length).toFixed(1) 
    : '—';
  const avgInstructor = ratings.length > 0 
    ? (ratings.reduce((s, r) => s + (r.instructorRating || r.rating || 0), 0) / ratings.length).toFixed(1) 
    : '—';
  const filteredAvgCourse = filteredRatings.length > 0 
    ? (filteredRatings.reduce((s, r) => s + (r.courseRating || r.rating || 0), 0) / filteredRatings.length).toFixed(1) 
    : '—';
  const filteredAvgInstructor = filteredRatings.length > 0 
    ? (filteredRatings.reduce((s, r) => s + (r.instructorRating || r.rating || 0), 0) / filteredRatings.length).toFixed(1) 
    : '—';

  const stats = [
    { label: 'Total', value: filteredRatings.length, total: ratings.length, color: '#7c3aed', icon: '⭐' },
    { label: 'Avg Course', value: filteredAvgCourse, total: avgCourse, color: '#f59e0b', icon: '📚' },
    { label: 'Avg Instructor', value: filteredAvgInstructor, total: avgInstructor, color: '#10b981', icon: '👨‍🏫' },
  ];

  if (loading) {
    return (
      <div className="my-ratings-page">
        <div className="my-ratings-topbar">
          <button className="my-ratings-back-btn" onClick={onBack}>← Back</button>
          <span className="my-ratings-title">⭐ My Ratings</span>
        </div>
        <div className="my-ratings-loading">
          <div className="my-ratings-spinner" />
          <div>Loading your ratings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="my-ratings-page">
      <div className="my-ratings-topbar">
        <button className="my-ratings-back-btn" onClick={onBack}>← Back</button>
        <span className="my-ratings-title">⭐ My Ratings</span>
        <span className="my-ratings-count">{ratings.length} total</span>
      </div>

      <div className="my-ratings-body">
        <div className="my-ratings-stats">
          {stats.map(stat => (
            <div key={stat.label} className="stat-card" style={{ borderTopColor: stat.color }}>
              <div className="stat-icon">{stat.icon}</div>
              <div className="stat-info">
                <div className="stat-value">{stat.value}</div>
                <div className="stat-label">{stat.label}</div>
                {stat.total !== stat.value && stat.total !== '—' && (
                  <div className="stat-total">of {stat.total}</div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="advanced-filters">
          <select 
            className="filter-select"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
          >
            <option value="all">All Courses</option>
            {uniqueCourses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>

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

        {filteredRatings.length === 0 ? (
          <div className="my-ratings-empty">
            <div className="empty-icon">⭐</div>
            <div className="empty-title">No ratings found</div>
            <div className="empty-text">Try changing the filters.</div>
          </div>
        ) : (
          <div className="my-ratings-list">
            {filteredRatings.map(rating => {
              const courseRating = rating.courseRating || rating.rating || 0;
              const instructorRating = rating.instructorRating || rating.rating || 0;
              const avgRating = ((courseRating + instructorRating) / 2).toFixed(1);
              const courseStyle = RATING_COLORS[Math.round(courseRating)] || RATING_COLORS[5];
              const instructorStyle = RATING_COLORS[Math.round(instructorRating)] || RATING_COLORS[5];
              const avgStyle = RATING_COLORS[Math.round(avgRating)] || RATING_COLORS[5];
              
              return (
                <div key={rating.id} className={`rating-card ${rating.isPinned ? 'pinned' : ''}`}>
                  {rating.isPinned && <div className="pinned-badge">📌 Pinned</div>}
                  
                  <div className="rating-header">
                    <div className="course-info">
                      <div className="course-name">{rating.courseName}</div>
                      <div className="instructor-name">👨‍🏫 {rating.instructor}</div>
                    </div>
                    <div className="rating-date">{formatDate(rating.createdAt)}</div>
                  </div>

                  <div className="ratings-row">
                    <div className="rating-item" style={{ backgroundColor: courseStyle.bg }}>
                      <div className="rating-label">📚 Course</div>
                      <div className="rating-value" style={{ color: courseStyle.text }}>{courseRating}</div>
                      <div className="rating-max">/10</div>
                      <div className="rating-label-small">{courseStyle.label}</div>
                    </div>
                    <div className="rating-item" style={{ backgroundColor: instructorStyle.bg }}>
                      <div className="rating-label">👨‍🏫 Instructor</div>
                      <div className="rating-value" style={{ color: instructorStyle.text }}>{instructorRating}</div>
                      <div className="rating-max">/10</div>
                      <div className="rating-label-small">{instructorStyle.label}</div>
                    </div>
                    <div className="rating-item" style={{ backgroundColor: avgStyle.bg }}>
                      <div className="rating-label">📊 Average</div>
                      <div className="rating-value" style={{ color: avgStyle.text }}>{avgRating}</div>
                      <div className="rating-max">/10</div>
                      <div className="rating-label-small">{avgStyle.label}</div>
                    </div>
                  </div>

                  {rating.comments && (
                    <div className="comments-section">
                      <div className="comments-label">💬 Your Feedback</div>
                      <div className="comments-text">"{rating.comments}"</div>
                    </div>
                  )}

                  <div className="rating-actions">
                    <button 
                      className={`action-btn pin-btn ${rating.isPinned ? 'active' : ''}`}
                      onClick={() => handlePin(rating.id, rating.isPinned)}
                      title={rating.isPinned ? 'Unpin' : 'Pin'}
                    >
                      📌
                    </button>
                    <button className="action-btn edit-btn" onClick={() => openEditModal(rating)}>✏️</button>
                    <button className="action-btn delete-btn" onClick={() => { setSelectedRating(rating); setShowDeleteModal(true); }}>🗑️</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showDeleteModal && selectedRating && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">🗑️ Delete Rating</div>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <div className="delete-icon">⚠️</div>
                <div className="delete-text">Are you sure you want to delete your rating for</div>
                <div className="delete-course">{selectedRating.courseName}</div>
                <div className="delete-sub">This action cannot be undone.</div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="delete-btn" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editingRating && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">✏️ Edit Rating</div>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="edit-course-name">{editingRating.courseName}</div>
              
              <div className="edit-field">
                <label>Course Rating (1-10)</label>
                <div className="rating-input-group">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={editCourseRating || 5}
                    onChange={(e) => setEditCourseRating(parseInt(e.target.value))}
                  />
                  <span className="rating-value-display">{editCourseRating || 5}</span>
                </div>
              </div>

              <div className="edit-field">
                <label>Instructor Rating (1-10)</label>
                <div className="rating-input-group">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={editInstructorRating || 5}
                    onChange={(e) => setEditInstructorRating(parseInt(e.target.value))}
                  />
                  <span className="rating-value-display">{editInstructorRating || 5}</span>
                </div>
              </div>

              <div className="edit-field">
                <label>Comments (optional)</label>
                <textarea
                  value={editComments}
                  onChange={(e) => setEditComments(e.target.value)}
                  placeholder="Share your feedback..."
                  rows={3}
                />
              </div>

              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="save-btn" onClick={handleEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}