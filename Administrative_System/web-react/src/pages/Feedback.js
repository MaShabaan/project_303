// web-react/src/pages/Feedback.jsx

import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import './Feedback.css';

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

export default function Feedback({ user, onBack }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterDivision, setFilterDivision] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

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
      // ترتيب حسب التاريخ (الأحدث أولاً)
      list.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.()?.getTime() || 0;
        const dateB = b.createdAt?.toDate?.()?.getTime() || 0;
        return dateB - dateA;
      });
      setFeedbacks(list);
    } catch (error) {
      console.error('Error loading feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFeedback) return;
    try {
      await deleteDoc(doc(db, 'feedback', selectedFeedback.id));
      setShowDeleteModal(false);
      setSelectedFeedback(null);
      await loadFeedbacks();
      alert('Feedback deleted successfully');
    } catch (error) {
      console.error('Error deleting feedback:', error);
      alert('Failed to delete feedback');
    }
  };

  const getRatingColor = (rating) => {
    if (rating <= 3) return '#ef4444';
    if (rating <= 6) return '#f59e0b';
    return '#10b981';
  };

  const getDivisionIcon = (division) => {
    if (division === 'computer_science') return '💻';
    if (division === 'special_mathematics') return '📐';
    return '📚';
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const filteredFeedbacks = feedbacks.filter(fb => {
    // Search
    const matchSearch = fb.courseName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        fb.instructor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        fb.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchSearch) return false;
    
    // Rating filter
    if (filterRating !== 'all') {
      const avg = ((fb.courseRating || fb.rating || 0) + (fb.instructorRating || fb.rating || 0)) / 2;
      if (filterRating === 'good' && avg < 7) return false;
      if (filterRating === 'average' && (avg < 4 || avg >= 7)) return false;
      if (filterRating === 'poor' && avg >= 4) return false;
    }
    
    // Division filter
    if (filterDivision !== 'all' && fb.division !== filterDivision) return false;
    
    return true;
  });

  const stats = {
    total: feedbacks.length,
    avgCourse: feedbacks.length ? (feedbacks.reduce((sum, fb) => sum + (fb.courseRating || fb.rating || 0), 0) / feedbacks.length).toFixed(1) : '—',
    avgInstructor: feedbacks.length ? (feedbacks.reduce((sum, fb) => sum + (fb.instructorRating || fb.rating || 0), 0) / feedbacks.length).toFixed(1) : '—',
  };

  return (
    <div className="feedback-container">
      <div className="feedback-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>⭐ Course Feedback</h1>
        <div></div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">TOTAL FEEDBACK</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.avgCourse}</div>
          <div className="stat-label">AVG COURSE RATING</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.avgInstructor}</div>
          <div className="stat-label">AVG INSTRUCTOR RATING</div>
        </div>
      </div>

      <div className="controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by course, instructor or student..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="filters">
          <select className="filter-select" value={filterRating} onChange={(e) => setFilterRating(e.target.value)}>
            <option value="all">All Ratings</option>
            <option value="good">Good (7-10)</option>
            <option value="average">Average (4-6)</option>
            <option value="poor">Poor (1-3)</option>
          </select>
          
          <select className="filter-select" value={filterDivision} onChange={(e) => setFilterDivision(e.target.value)}>
            <option value="all">All Divisions</option>
            <option value="computer_science">💻 Computer Science</option>
            <option value="special_mathematics">📐 Special Mathematics</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="empty-state">📭 No feedback found</div>
      ) : (
        <div className="feedback-list">
          {filteredFeedbacks.map(fb => {
            const courseRating = fb.courseRating ?? fb.rating ?? 0;
            const instructorRating = fb.instructorRating ?? fb.rating ?? 0;
            const avgRating = (courseRating + instructorRating) / 2;
            
            return (
              <div key={fb.id} className="feedback-card">
                <div className="feedback-header-row">
                  <div className="course-info">
                    <div className="course-name">{fb.courseName}</div>
                    <div className="instructor-name">👨‍🏫 {fb.instructor}</div>
                  </div>
                  <div className="average-rating" style={{ backgroundColor: getRatingColor(avgRating) }}>
                    {avgRating.toFixed(1)}
                  </div>
                </div>

                <div className="ratings-row">
                  <div className="rating-item">
                    <div className="rating-label">Course Rating</div>
                    <div className="rating-value" style={{ color: getRatingColor(courseRating) }}>
                      {courseRating} <span className="rating-max">/10</span>
                    </div>
                  </div>
                  <div className="rating-divider"></div>
                  <div className="rating-item">
                    <div className="rating-label">Instructor Rating</div>
                    <div className="rating-value" style={{ color: getRatingColor(instructorRating) }}>
                      {instructorRating} <span className="rating-max">/10</span>
                    </div>
                  </div>
                </div>

                {fb.comments && (
                  <div className="comments-section">
                    <div className="comments-label">💬 Feedback</div>
                    <div className="comments-text">"{fb.comments}"</div>
                  </div>
                )}

                <div className="feedback-meta">
                  <div className="meta-item">
                    <span className="meta-icon">👤</span>
                    <span>{fb.userEmail}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-icon">📅</span>
                    <span>{formatDate(fb.createdAt)}</span>
                  </div>
                  {fb.division && (
                    <div className="meta-item">
                      <span className="meta-icon">{getDivisionIcon(fb.division)}</span>
                      <span>{fb.division === 'computer_science' ? 'Computer Science' : 'Special Mathematics'}</span>
                    </div>
                  )}
                  {fb.year && fb.term && (
                    <div className="meta-item">
                      <span className="meta-icon">📖</span>
                      <span>Year {fb.year} · Term {fb.term}</span>
                    </div>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="feedback-actions">
                    <button className="delete-feedback-btn" onClick={() => {
                      setSelectedFeedback(fb);
                      setShowDeleteModal(true);
                    }}>
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedFeedback && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Feedback</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the feedback for:</p>
              <p className="modal-course-name">"{selectedFeedback.courseName}"</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-buttons">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="delete-confirm-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}