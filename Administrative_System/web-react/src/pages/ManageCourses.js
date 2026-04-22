
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './ManageCourses.css';

const DIVISIONS = [
  { value: 'computer_science', label: 'Computer Science', icon: '💻' },
  { value: 'special_mathematics', label: 'Special Mathematics', icon: '📐' },
];
const YEARS = [2, 3, 4];
const TERMS = [1, 2];

export default function ManageCourses({ user, onBack }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [termFilter, setTermFilter] = useState('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    courseName: '',
    courseCode: '',
    division: 'computer_science',
    year: 2,
    term: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCourses(list);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.courseName.trim()) {
      alert('Please enter course name');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), {
          courseName: formData.courseName.trim(),
          courseCode: formData.courseCode.trim(),
          division: formData.division,
          year: formData.year,
          term: formData.term,
          updatedAt: new Date(),
        });
        alert('Course updated successfully');
      } else {
        await addDoc(collection(db, 'courses'), {
          courseName: formData.courseName.trim(),
          courseCode: formData.courseCode.trim(),
          division: formData.division,
          year: formData.year,
          term: formData.term,
          createdAt: new Date(),
        });
        alert('Course added successfully');
      }
      setModalOpen(false);
      resetForm();
      await loadCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCourse) return;
    try {
      await deleteDoc(doc(db, 'courses', deletingCourse.id));
      await loadCourses();
      setDeleteModal(false);
      setDeletingCourse(null);
      alert('Course deleted successfully');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setFormData({
      courseName: course.courseName || '',
      courseCode: course.courseCode || '',
      division: course.division || 'computer_science',
      year: course.year || 2,
      term: course.term || 1,
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setEditingCourse(null);
    setFormData({
      courseName: '',
      courseCode: '',
      division: 'computer_science',
      year: 2,
      term: 1,
    });
  };

  const filteredCourses = courses.filter(course => {
    const matchSearch = course.courseName?.toLowerCase().includes(search.toLowerCase()) ||
                        course.courseCode?.toLowerCase().includes(search.toLowerCase());
    if (divisionFilter !== 'all' && course.division !== divisionFilter) return false;
    if (yearFilter !== 'all' && course.year !== parseInt(yearFilter)) return false;
    if (termFilter !== 'all' && course.term !== parseInt(termFilter)) return false;
    return matchSearch;
  });

  const stats = [
    { lbl: 'TOTAL', num: courses.length, ac: '#7c3aed' },
    { lbl: 'CS', num: courses.filter(c => c.division === 'computer_science').length, ac: '#4f46e5' },
    { lbl: 'MATH', num: courses.filter(c => c.division === 'special_mathematics').length, ac: '#10b981' },
    { lbl: 'ACTIVE', num: courses.filter(c => c.year && c.term).length, ac: '#f59e0b' },
  ];

  return (
    <div className="courses-page">
      {/* Top Bar */}
      <div className="courses-topbar">
        <button className="courses-back-btn" onClick={onBack}>← Back</button>
        <span className="courses-topbar-title">📚 Manage Courses</span>
        <span className="courses-topbar-count">{filteredCourses.length}</span>
        <button className="courses-add-btn" onClick={() => { resetForm(); setModalOpen(true); }}>+ Add Course</button>
      </div>

      {/* Controls */}
      <div className="courses-controls">
        <input
          className="courses-search"
          type="text"
          placeholder="Search by course name or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        <div className="seg-group">
          <select className="filter-select" value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}>
            <option value="all">All Divisions</option>
            <option value="computer_science">💻 Computer Science</option>
            <option value="special_mathematics">📐 Special Mathematics</option>
          </select>
          <select className="filter-select" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
            <option value="all">All Years</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
          <select className="filter-select" value={termFilter} onChange={e => setTermFilter(e.target.value)}>
            <option value="all">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="courses-body">
        {/* Stats */}
        <div className="courses-stats">
          {stats.map(s => (
            <div key={s.lbl} className="c-stat" style={{ '--ac': s.ac }}>
              <div className="c-stat-num">{s.num}</div>
              <div className="c-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Courses List */}
        {loading ? (
          <div className="c-loading">
            <div className="c-spinner" />
            <div>Loading courses...</div>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="c-empty">
            <div className="c-empty-icon">📚</div>
            <div className="c-empty-text">No courses found</div>
          </div>
        ) : (
          <div className="courses-grid">
            {filteredCourses.map(course => {
              const divisionIcon = course.division === 'computer_science' ? '💻' : '📐';
              const divisionLabel = course.division === 'computer_science' ? 'CS' : 'Math';
              return (
                <div key={course.id} className="course-card">
                  <div className="course-card-header">
                    <div className="course-icon">{divisionIcon}</div>
                    <div className="course-info">
                      <div className="course-name">{course.courseName}</div>
                      {course.courseCode && <div className="course-code">{course.courseCode}</div>}
                    </div>
                    <div className="course-division-badge">
                      {divisionIcon} {divisionLabel}
                    </div>
                  </div>
                  <div className="course-meta">
                    <span className="course-meta-item">📅 Year {course.year}</span>
                    <span className="course-meta-item">📖 Term {course.term}</span>
                  </div>
                  <div className="course-actions">
                    <button className="course-edit-btn" onClick={() => openEditModal(course)}>✏️ Edit</button>
                    <button className="course-delete-btn" onClick={() => { setDeletingCourse(course); setDeleteModal(true); }}>🗑 Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="c-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="c-modal" onClick={e => e.stopPropagation()}>
            <div className="c-modal-head">
              <span className="c-modal-title">{editingCourse ? '✏️ Edit Course' : '➕ Add New Course'}</span>
              <button className="c-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="c-modal-body">
              <div className="input-group">
                <label className="input-label">Course Name *</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g. Linear Algebra 1"
                  value={formData.courseName}
                  onChange={e => setFormData({ ...formData, courseName: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Course Code (optional)</label>
                <input
                  className="modal-input"
                  type="text"
                  placeholder="e.g. MATH201"
                  value={formData.courseCode}
                  onChange={e => setFormData({ ...formData, courseCode: e.target.value })}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Division</label>
                <div className="option-group">
                  {DIVISIONS.map(d => (
                    <button
                      key={d.value}
                      className={`option-btn ${formData.division === d.value ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, division: d.value })}
                    >
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Year</label>
                <div className="option-group">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      className={`option-btn ${formData.year === y ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, year: y })}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Term</label>
                <div className="option-group">
                  {TERMS.map(t => (
                    <button
                      key={t}
                      className={`option-btn ${formData.term === t ? 'active' : ''}`}
                      onClick={() => setFormData({ ...formData, term: t })}
                    >
                      Term {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setModalOpen(false)}>Cancel</button>
                <button className="submit-btn" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Saving...' : (editingCourse ? 'Update Course' : 'Add Course')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && deletingCourse && (
        <div className="c-modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="c-modal" onClick={e => e.stopPropagation()}>
            <div className="c-modal-head">
              <span className="c-modal-title">🗑 Delete Course</span>
              <button className="c-modal-close" onClick={() => setDeleteModal(false)}>✕</button>
            </div>
            <div className="c-modal-body">
              <div className="delete-warning">
                <div className="delete-course-name">{deletingCourse.courseName}</div>
                <div className="delete-message">Are you sure you want to delete this course? This action cannot be undone.</div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setDeleteModal(false)}>Cancel</button>
                <button className="delete-confirm-btn" onClick={handleDelete}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}