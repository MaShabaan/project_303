// web-react/src/pages/ManageCourses.jsx

import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import './ManageCourses.css';

const DIVISIONS = [
  { id: 'computer_science', label: 'Computer Science', icon: '💻' },
  { id: 'special_mathematics', label: 'Special Mathematics', icon: '📐' },
];
const YEARS = [2, 3, 4];
const TERMS = [1, 2];

export default function ManageCourses({ user, onBack }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterYear, setFilterYear] = useState(null);
  const [filterTerm, setFilterTerm] = useState(null);
  
  // Modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [division, setDivision] = useState('computer_science');
  const [year, setYear] = useState(2);
  const [term, setTerm] = useState(1);
  const [submitting, setSubmitting] = useState(false);

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

  const handleAddCourse = async () => {
    if (!courseName.trim()) {
      alert('Please enter course name');
      return;
    }
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'courses'), {
        courseName: courseName.trim(),
        courseCode: courseCode.trim() || '',
        division,
        year: Number(year),
        term: Number(term),
        createdAt: new Date(),
      });
      
      setModalVisible(false);
      resetForm();
      await loadCourses();
      alert('Course added successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to add course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse) return;
    if (!courseName.trim()) {
      alert('Please enter course name');
      return;
    }
    
    setSubmitting(true);
    try {
      const courseRef = doc(db, 'courses', editingCourse.id);
      await updateDoc(courseRef, {
        courseName: courseName.trim(),
        courseCode: courseCode.trim() || '',
        division,
        year: Number(year),
        term: Number(term),
        updatedAt: new Date(),
      });
      
      setModalVisible(false);
      setEditingCourse(null);
      resetForm();
      await loadCourses();
      alert('Course updated successfully!');
    } catch (error) {
      console.error(error);
      alert('Failed to update course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (courseId, courseName) => {
    if (window.confirm(`Delete "${courseName}"? This action cannot be undone.`)) {
      try {
        await deleteDoc(doc(db, 'courses', courseId));
        await loadCourses();
        alert('Course deleted successfully');
      } catch (error) {
        console.error(error);
        alert('Failed to delete course');
      }
    }
  };

  const openAddModal = () => {
    setEditingCourse(null);
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setCourseName(course.courseName);
    setCourseCode(course.courseCode || '');
    setDivision(course.division);
    setYear(course.year);
    setTerm(course.term);
    setModalVisible(true);
  };

  const resetForm = () => {
    setCourseName('');
    setCourseCode('');
    setDivision('computer_science');
    setYear(2);
    setTerm(1);
  };

  const filteredCourses = courses.filter(course => {
    const matchSearch = course.courseName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (course.courseCode || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (filterDivision !== 'all' && course.division !== filterDivision) return false;
    if (filterYear && course.year !== filterYear) return false;
    if (filterTerm && course.term !== filterTerm) return false;
    return matchSearch;
  });

  const stats = {
    total: courses.length,
    cs: courses.filter(c => c.division === 'computer_science').length,
    math: courses.filter(c => c.division === 'special_mathematics').length,
  };

  return (
    <div className="courses-container">
      <div className="courses-header">
        <button className="back-button" onClick={onBack}>← Back</button>
        <h1>📚 Manage Courses</h1>
        <button className="add-btn" onClick={openAddModal}>+ Add Course</button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-num">{stats.total}</div>
          <div className="stat-label">TOTAL COURSES</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.cs}</div>
          <div className="stat-label">💻 COMPUTER SCIENCE</div>
        </div>
        <div className="stat-card">
          <div className="stat-num">{stats.math}</div>
          <div className="stat-label">📐 SPECIAL MATH</div>
        </div>
      </div>

      <div className="controls">
        <input
          type="text"
          className="search-input"
          placeholder="Search by course name or code..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <div className="filters">
          <select className="filter-select" value={filterDivision} onChange={(e) => setFilterDivision(e.target.value)}>
            <option value="all">All Divisions</option>
            <option value="computer_science">💻 Computer Science</option>
            <option value="special_mathematics">📐 Special Mathematics</option>
          </select>
          
          <select className="filter-select" value={filterYear || ''} onChange={(e) => setFilterYear(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All Years</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>
          
          <select className="filter-select" value={filterTerm || ''} onChange={(e) => setFilterTerm(e.target.value ? Number(e.target.value) : null)}>
            <option value="">All Terms</option>
            <option value="1">Term 1</option>
            <option value="2">Term 2</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="empty-state">📭 No courses found</div>
      ) : (
        <div className="courses-list">
          {filteredCourses.map(course => (
            <div key={course.id} className="course-card">
              <div className="course-icon">
                {course.division === 'computer_science' ? '💻' : '📐'}
              </div>
              <div className="course-info">
                <div className="course-name">{course.courseName}</div>
                {course.courseCode && <div className="course-code">{course.courseCode}</div>}
                <div className="course-meta">
                  <span className={`division-badge ${course.division}`}>
                    {course.division === 'computer_science' ? 'CS' : 'Math'}
                  </span>
                  <span>Year {course.year}</span>
                  <span>Term {course.term}</span>
                </div>
              </div>
              <div className="course-actions">
                <button className="edit-btn" onClick={() => openEditModal(course)}>✏️ Edit</button>
                <button className="delete-btn" onClick={() => handleDelete(course.id, course.courseName)}>🗑 Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {modalVisible && (
        <div className="modal-overlay" onClick={() => { setModalVisible(false); setEditingCourse(null); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCourse ? '✏️ Edit Course' : '➕ Add New Course'}</h3>
              <button className="modal-close" onClick={() => { setModalVisible(false); setEditingCourse(null); resetForm(); }}>✕</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Course Name *</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Linear Algebra 1"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label>Course Code (optional)</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. MATH201"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
              </div>
              
              <div className="input-group">
                <label>Division</label>
                <div className="division-options">
                  {DIVISIONS.map(d => (
                    <button
                      key={d.id}
                      className={`division-option ${division === d.id ? 'active' : ''}`}
                      onClick={() => setDivision(d.id)}
                    >
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="input-group">
                <label>Year</label>
                <div className="year-options">
                  {YEARS.map(y => (
                    <button
                      key={y}
                      className={`year-option ${year === y ? 'active' : ''}`}
                      onClick={() => setYear(y)}
                    >
                      Year {y}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="input-group">
                <label>Term</label>
                <div className="term-options">
                  {TERMS.map(t => (
                    <button
                      key={t}
                      className={`term-option ${term === t ? 'active' : ''}`}
                      onClick={() => setTerm(t)}
                    >
                      Term {t}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="modal-buttons">
                <button className="cancel-btn" onClick={() => { setModalVisible(false); setEditingCourse(null); resetForm(); }}>Cancel</button>
                <button className="submit-btn" onClick={editingCourse ? handleUpdateCourse : handleAddCourse} disabled={submitting}>
                  {submitting ? 'Saving...' : (editingCourse ? 'Update Course' : 'Add Course')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}