import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, getGroupsByCourse, addGroup, updateGroup, deleteGroup } from '../services/firebase';
import { useAuth } from './ThemeContext';
import './ManageCourses.css';

const DIVISIONS = [
  { value: 'all', label: 'All Divisions', icon: '📚' },
  { value: 'computer_science', label: 'Computer Science', icon: '💻' },
  { value: 'special_mathematics', label: 'Special Mathematics', icon: '📐' },
];
const YEARS = [
  { value: 'all', label: 'All Years' },
  { value: 2, label: 'Year 2' },
  { value: 3, label: 'Year 3' },
  { value: 4, label: 'Year 4' },
];
const TERMS = [
  { value: 'all', label: 'All Terms' },
  { value: 1, label: 'Term 1' },
  { value: 2, label: 'Term 2' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const TIME_SLOTS = ['8:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

export default function ManageCourses({ user, onBack }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [groups, setGroups] = useState({});
  const [loadingGroups, setLoadingGroups] = useState({});
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDivision, setFilterDivision] = useState('all');
  const [filterYear, setFilterYear] = useState('all');
  const [filterTerm, setFilterTerm] = useState('all');

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseForm, setCourseForm] = useState({
    courseName: '',
    courseCode: '',
    division: 'computer_science',
    year: 2,
    term: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);

  // Group Modal states
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupForm, setGroupForm] = useState({
    groupName: '',
    day: 'Sunday',
    time: '8:00-10:00',
    room: '',
    maxStudents: 30,
  });
  const [currentCourse, setCurrentCourse] = useState(null);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'courses'));
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(list);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupsForCourse = async (courseId) => {
    setLoadingGroups(prev => ({ ...prev, [courseId]: true }));
    try {
      const groupsList = await getGroupsByCourse(courseId);
      setGroups(prev => ({ ...prev, [courseId]: groupsList }));
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const toggleCourse = (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      if (!groups[courseId]) {
        loadGroupsForCourse(courseId);
      }
    }
  };

  const handleCourseSubmit = async () => {
    if (!courseForm.courseName.trim()) {
      alert('Please enter course name');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), {
          courseName: courseForm.courseName.trim(),
          courseCode: courseForm.courseCode.trim(),
          division: courseForm.division,
          year: courseForm.year,
          term: courseForm.term,
          updatedAt: new Date(),
        });
        alert('Course updated successfully');
      } else {
        await addDoc(collection(db, 'courses'), {
          courseName: courseForm.courseName.trim(),
          courseCode: courseForm.courseCode.trim(),
          division: courseForm.division,
          year: courseForm.year,
          term: courseForm.term,
          createdAt: new Date(),
        });
        alert('Course added successfully');
      }
      setCourseModalOpen(false);
      resetCourseForm();
      await loadCourses();
    } catch (error) {
      console.error('Error saving course:', error);
      alert('Failed to save course');
    } finally {
      setSubmitting(false);
    }
  };

  const openCourseEditModal = (course) => {
    setEditingCourse(course);
    setCourseForm({
      courseName: course.courseName || '',
      courseCode: course.courseCode || '',
      division: course.division || 'computer_science',
      year: course.year || 2,
      term: course.term || 1,
    });
    setCourseModalOpen(true);
  };

  const resetCourseForm = () => {
    setEditingCourse(null);
    setCourseForm({
      courseName: '',
      courseCode: '',
      division: 'computer_science',
      year: 2,
      term: 1,
    });
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    try {
      const courseGroups = await getGroupsByCourse(deletingCourse.id);
      for (const group of courseGroups) {
        await deleteGroup(group.id);
      }
      await deleteDoc(doc(db, 'courses', deletingCourse.id));
      alert('Course and all its groups deleted successfully');
      setDeleteModal(false);
      setDeletingCourse(null);
      await loadCourses();
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
    }
  };

  const openGroupModal = (course, group = null) => {
    setCurrentCourse(course);
    if (group) {
      setEditingGroup(group);
      setGroupForm({
        groupName: group.groupName || '',
        day: group.day || 'Sunday',
        time: group.time || '8:00-10:00',
        room: group.room || '',
        maxStudents: group.maxStudents || 30,
      });
    } else {
      setEditingGroup(null);
      setGroupForm({
        groupName: '',
        day: 'Sunday',
        time: '8:00-10:00',
        room: '',
        maxStudents: 30,
      });
    }
    setGroupModalOpen(true);
  };

  const handleGroupSubmit = async () => {
    if (!groupForm.groupName.trim() || !groupForm.room.trim()) {
      alert('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      const groupData = {
        courseId: currentCourse.id,
        courseName: currentCourse.courseName,
        groupName: groupForm.groupName.trim(),
        day: groupForm.day,
        time: groupForm.time,
        room: groupForm.room.trim(),
        maxStudents: groupForm.maxStudents,
      };
      
      if (editingGroup) {
        await updateGroup(editingGroup.id, groupData);
        alert('Group updated successfully');
      } else {
        await addGroup(groupData);
        alert('Group added successfully');
      }
      setGroupModalOpen(false);
      await loadGroupsForCourse(currentCourse.id);
    } catch (error) {
      console.error('Error saving group:', error);
      alert('Failed to save group');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId, groupName) => {
    if (window.confirm(`Delete group "${groupName}"?`)) {
      try {
        await deleteGroup(groupId);
        await loadGroupsForCourse(currentCourse.id);
        alert('Group deleted successfully');
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group');
      }
    }
  };

  const filteredCourses = (() => {
    let result = [...courses];
    
    if (searchTerm.trim() !== '') {
      result = result.filter(course => 
        (course.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (course.courseCode || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (filterDivision !== 'all') {
      result = result.filter(course => course.division === filterDivision);
    }
    
    if (filterYear !== 'all') {
      result = result.filter(course => Number(course.year) === Number(filterYear));
    }
    
    if (filterTerm !== 'all') {
      result = result.filter(course => Number(course.term) === Number(filterTerm));
    }
    
    return result;
  })();

  const stats = [
    { lbl: 'TOTAL', num: filteredCourses.length, ac: '#7c3aed' },
    { lbl: 'CS', num: filteredCourses.filter(c => c.division === 'computer_science').length, ac: '#4f46e5' },
    { lbl: 'MATH', num: filteredCourses.filter(c => c.division === 'special_mathematics').length, ac: '#10b981' },
  ];

  if (loading) {
    return (
      <div className="courses-page">
        <div className="courses-topbar">
          <button className="courses-back-btn" onClick={onBack}>← Back</button>
          <span className="courses-topbar-title">📚 Manage Courses</span>
        </div>
        <div className="courses-loading">
          <div className="courses-spinner" />
          <div>Loading courses...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="courses-page">
      <div className="courses-topbar">
        <button className="courses-back-btn" onClick={onBack}>← Back</button>
        <span className="courses-topbar-title">📚 Manage Courses</span>
        <span className="courses-topbar-count">{filteredCourses.length} / {courses.length}</span>
        <button className="courses-add-btn" onClick={() => { resetCourseForm(); setCourseModalOpen(true); }}>+ Add Course</button>
      </div>

      {/* Filters Bar */}
      <div className="courses-filters-bar">
        <div className="filters-row">
          <div className="search-group">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="courses-search"
              placeholder="Search by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select 
            className="filter-select"
            value={filterDivision}
            onChange={(e) => setFilterDivision(e.target.value)}
          >
            {DIVISIONS.map(div => (
              <option key={div.value} value={div.value}>
                {div.icon} {div.label}
              </option>
            ))}
          </select>
          
          <select 
            className="filter-select"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
          >
            {YEARS.map(year => (
              <option key={year.value} value={year.value}>
                🎓 {year.label}
              </option>
            ))}
          </select>
          
          <select 
            className="filter-select"
            value={filterTerm}
            onChange={(e) => setFilterTerm(e.target.value)}
          >
            {TERMS.map(term => (
              <option key={term.value} value={term.value}>
                📅 {term.label}
              </option>
            ))}
          </select>
          
          {(searchTerm || filterDivision !== 'all' || filterYear !== 'all' || filterTerm !== 'all') && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setSearchTerm('');
                setFilterDivision('all');
                setFilterYear('all');
                setFilterTerm('all');
              }}
            >
              ✖ Clear
            </button>
          )}
        </div>
      </div>

      <div className="courses-body">
        <div className="courses-stats">
          {stats.map(s => (
            <div key={s.lbl} className="c-stat" style={{ '--ac': s.ac }}>
              <div className="c-stat-num">{s.num}</div>
              <div className="c-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        <div className="courses-list">
          {filteredCourses.length === 0 ? (
            <div className="courses-empty">No courses found</div>
          ) : (
            filteredCourses.map(course => (
              <div key={course.id} className="course-item">
                <div className="course-item-header">
                  <div className="course-icon" onClick={() => toggleCourse(course.id)}>
                    {course.division === 'computer_science' ? '💻' : '📐'}
                  </div>
                  
                  <div className="course-info" onClick={() => toggleCourse(course.id)}>
                    <div className="course-name">{course.courseName}</div>
                    <div className="course-code">{course.courseCode || '—'}</div>
                    <div className="course-meta">Year {course.year} · Term {course.term}</div>
                  </div>
                  
                  <div className="course-division">
                    {course.division === 'computer_science' ? 'CS' : 'Math'}
                  </div>

                  <div className="course-actions" onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="course-edit-btn" 
                      onClick={() => openCourseEditModal(course)}
                      title="Edit course"
                    >
                      ✏️
                    </button>
                    <button 
                      className="course-delete-btn" 
                      onClick={() => {
                        setDeletingCourse(course);
                        setDeleteModal(true);
                      }}
                      title="Delete course"
                    >
                      🗑️
                    </button>
                  </div>

                  <div className="course-expand" onClick={() => toggleCourse(course.id)}>
                    {expandedCourse === course.id ? '▲' : '▼'}
                  </div>
                </div>

                {expandedCourse === course.id && (
                  <div className="course-groups-section">
                    <div className="groups-header">
                      <div className="groups-title">📅 Groups & Schedule</div>
                      <button className="add-group-btn" onClick={() => openGroupModal(course)}>+ Add Group</button>
                    </div>
                    
                    {loadingGroups[course.id] ? (
                      <div className="groups-loading">Loading groups...</div>
                    ) : groups[course.id]?.length === 0 ? (
                      <div className="groups-empty">No groups yet. Click "Add Group" to create one.</div>
                    ) : (
                      <div className="groups-list">
                        {groups[course.id]?.map(group => (
                          <div key={group.id} className="group-card">
                            <div className="group-header">
                              <div className="group-name">{group.groupName}</div>
                              <div className="group-actions">
                                <button className="group-edit" onClick={() => openGroupModal(course, group)}>✏️</button>
                                <button className="group-delete" onClick={() => handleDeleteGroup(group.id, group.groupName)}>🗑️</button>
                              </div>
                            </div>
                            <div className="group-details">
                              <div className="group-detail">📅 {group.day} · {group.time}</div>
                              <div className="group-detail">🏠 Room: {group.room}</div>
                              <div className="group-detail">👥 Max: {group.maxStudents} students</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Course Add/Edit Modal */}
      {courseModalOpen && (
        <div className="modal-overlay" onClick={() => setCourseModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingCourse ? '✏️ Edit Course' : '➕ Add New Course'}</span>
              <button className="modal-close" onClick={() => setCourseModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Course Name *</label>
                <input className="modal-input" type="text" placeholder="e.g. Linear Algebra 1" value={courseForm.courseName} onChange={e => setCourseForm({ ...courseForm, courseName: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Course Code</label>
                <input className="modal-input" type="text" placeholder="e.g. MATH201" value={courseForm.courseCode} onChange={e => setCourseForm({ ...courseForm, courseCode: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Division</label>
                <div className="option-group">
                  {DIVISIONS.filter(d => d.value !== 'all').map(d => (
                    <button key={d.value} className={`option-btn ${courseForm.division === d.value ? 'active' : ''}`} onClick={() => setCourseForm({ ...courseForm, division: d.value })}>
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label>Year</label>
                <div className="option-group">
                  {YEARS.filter(y => y.value !== 'all').map(y => (
                    <button key={y.value} className={`option-btn ${courseForm.year === y.value ? 'active' : ''}`} onClick={() => setCourseForm({ ...courseForm, year: y.value })}>Year {y.value}</button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label>Term</label>
                <div className="option-group">
                  {TERMS.filter(t => t.value !== 'all').map(t => (
                    <button key={t.value} className={`option-btn ${courseForm.term === t.value ? 'active' : ''}`} onClick={() => setCourseForm({ ...courseForm, term: t.value })}>Term {t.value}</button>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setCourseModalOpen(false)}>Cancel</button>
                <button className="submit-btn" onClick={handleCourseSubmit} disabled={submitting}>{submitting ? 'Saving...' : (editingCourse ? 'Update' : 'Add')}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Course Modal */}
      {deleteModal && deletingCourse && (
        <div className="modal-overlay" onClick={() => setDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🗑️ Delete Course</span>
              <button className="modal-close" onClick={() => setDeleteModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <div className="delete-course-name">{deletingCourse.courseName}</div>
                <div className="delete-message">⚠️ This will also delete ALL groups for this course. This action cannot be undone.</div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setDeleteModal(false)}>Cancel</button>
                <button className="delete-confirm-btn" onClick={handleDeleteCourse}>Delete Permanently</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Add/Edit Modal */}
      {groupModalOpen && currentCourse && (
        <div className="modal-overlay" onClick={() => setGroupModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingGroup ? '✏️ Edit Group' : '➕ Add Group'}</span>
              <span className="modal-subtitle">{currentCourse.courseName}</span>
              <button className="modal-close" onClick={() => setGroupModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label>Group Name *</label>
                <input className="modal-input" type="text" placeholder="e.g. Group A" value={groupForm.groupName} onChange={e => setGroupForm({ ...groupForm, groupName: e.target.value })} />
              </div>
              <div className="input-row">
                <div className="input-group half">
                  <label>Day</label>
                  <select className="modal-select" value={groupForm.day} onChange={e => setGroupForm({ ...groupForm, day: e.target.value })}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="input-group half">
                  <label>Time</label>
                  <select className="modal-select" value={groupForm.time} onChange={e => setGroupForm({ ...groupForm, time: e.target.value })}>
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label>Room *</label>
                <input className="modal-input" type="text" placeholder="e.g. Hall 101" value={groupForm.room} onChange={e => setGroupForm({ ...groupForm, room: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Max Students</label>
                <input className="modal-input" type="number" min="1" max="100" value={groupForm.maxStudents} onChange={e => setGroupForm({ ...groupForm, maxStudents: parseInt(e.target.value) })} />
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setGroupModalOpen(false)}>Cancel</button>
                <button className="submit-btn" onClick={handleGroupSubmit} disabled={submitting}>{submitting ? 'Saving...' : (editingGroup ? 'Update' : 'Add Group')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}