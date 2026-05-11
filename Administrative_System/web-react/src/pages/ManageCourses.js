
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db, getGroupsByCourse, addGroup, updateGroup, deleteGroup } from '../services/firebase';
import './ManageCourses.css';

const DIVISIONS = [
  { value: 'all', label: 'All Divisions', icon: '📚' },
  { value: 'computer_science', label: 'Computer Science', icon: '💻' },
  { value: 'special_mathematics', label: 'Special Mathematics', icon: '📐' },
];
const YEARS  = [{ value: 'all', label: 'All Years' }, { value: 2, label: 'Year 2' }, { value: 3, label: 'Year 3' }, { value: 4, label: 'Year 4' }];
const TERMS  = [{ value: 'all', label: 'All Terms' }, { value: 1, label: 'Term 1' }, { value: 2, label: 'Term 2' }];
const DAYS   = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
const SLOTS  = ['8:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

export default function ManageCourses({ user, onBack }) {
  const [courses, setCourses]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [expandedCourse, setExpanded]   = useState(null);
  const [groups, setGroups]             = useState({});
  const [loadingGroups, setLoadingGrps] = useState({});

  const [search, setSearch]             = useState('');
  const [filterDiv, setFilterDiv]       = useState('all');
  const [filterYear, setFilterYear]     = useState('all');
  const [filterTerm, setFilterTerm]     = useState('all');

  const [courseModal, setCourseModal]   = useState(false);
  const [editingCourse, setEditCourse]  = useState(null);
  const [courseForm, setCourseForm]     = useState({ courseName: '', courseCode: '', division: 'computer_science', year: 2, term: 1 });
  const [submitting, setSubmitting]     = useState(false);
  const [deleteModal, setDeleteModal]   = useState(false);
  const [deletingCourse, setDeletingC]  = useState(null);

  const [groupModal, setGroupModal]     = useState(false);
  const [editingGroup, setEditGroup]    = useState(null);
  const [groupForm, setGroupForm]       = useState({ groupName: '', day: 'Sunday', time: '8:00-10:00', room: '', maxStudents: 30 });
  const [currentCourse, setCurrentC]   = useState(null);

  const [courseError, setCourseError]   = useState('');
  const [groupError, setGroupError]     = useState('');
  const [checkingConflict, setCheckingConflict] = useState(false);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'courses'));
      setCourses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadGroupsForCourse = async (courseId) => {
    setLoadingGrps(p => ({ ...p, [courseId]: true }));
    try {
      const list = await getGroupsByCourse(courseId);
      setGroups(p => ({ ...p, [courseId]: list }));
    } catch (e) { console.error(e); }
    finally { setLoadingGrps(p => ({ ...p, [courseId]: false })); }
  };

  const toggleCourse = (courseId) => {
    if (expandedCourse === courseId) { setExpanded(null); return; }
    setExpanded(courseId);
    if (!groups[courseId]) loadGroupsForCourse(courseId);
  };

  const checkDuplicateCourse = () => {
    const name = courseForm.courseName.trim().toLowerCase();
    return courses.some(c =>
      c.courseName.trim().toLowerCase() === name &&
      c.division === courseForm.division &&
      Number(c.year) === Number(courseForm.year) &&
      Number(c.term) === Number(courseForm.term) &&
      c.id !== editingCourse?.id
    );
  };

  const handleCourseSubmit = async () => {
    setCourseError('');
    if (!courseForm.courseName.trim()) { setCourseError('Course name is required.'); return; }

    if (checkDuplicateCourse()) {
      setCourseError(
        `❌ "${courseForm.courseName.trim()}" already exists for this division, year, and term.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        courseName: courseForm.courseName.trim(),
        courseCode: courseForm.courseCode.trim(),
        division:   courseForm.division,
        year:       Number(courseForm.year),
        term:       Number(courseForm.term),
      };
      if (editingCourse) {
        await updateDoc(doc(db, 'courses', editingCourse.id), { ...payload, updatedAt: new Date() });
      } else {
        await addDoc(collection(db, 'courses'), { ...payload, createdAt: new Date() });
      }
      setCourseModal(false);
      resetCourseForm();
      await loadCourses();
    } catch (e) { setCourseError('Failed to save. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const openCourseEdit = (course) => {
    setEditCourse(course);
    setCourseForm({ courseName: course.courseName || '', courseCode: course.courseCode || '', division: course.division || 'computer_science', year: course.year || 2, term: course.term || 1 });
    setCourseError('');
    setCourseModal(true);
  };

  const resetCourseForm = () => {
    setEditCourse(null);
    setCourseForm({ courseName: '', courseCode: '', division: 'computer_science', year: 2, term: 1 });
    setCourseError('');
  };

  const handleDeleteCourse = async () => {
    if (!deletingCourse) return;
    try {
      const courseGroups = await getGroupsByCourse(deletingCourse.id);
      for (const g of courseGroups) await deleteGroup(g.id);
      await deleteDoc(doc(db, 'courses', deletingCourse.id));
      setDeleteModal(false);
      setDeletingC(null);
      await loadCourses();
    } catch (e) { alert('Failed to delete.'); }
  };

  const checkGlobalGroupConflict = async () => {
    const room = groupForm.room.trim().toLowerCase();
    const day  = groupForm.day;
    const time = groupForm.time;

    try {
      const q = query(
        collection(db, 'groups'),
        where('day', '==', day),
        where('time', '==', time)
      );
      const snap = await getDocs(q);

      const conflict = snap.docs.find(d => {
        const g = d.data();
        return (
          g.room.trim().toLowerCase() === room &&
          d.id !== editingGroup?.id
        );
      });

      if (conflict) {
        const g = conflict.data();
        const conflictCourse = courses.find(c => c.id === g.courseId);
        return {
          groupName:  g.groupName,
          courseName: conflictCourse?.courseName || g.courseName || 'Another course',
          day:        g.day,
          time:       g.time,
          room:       g.room,
        };
      }
      return null;
    } catch (e) {
      console.error('Conflict check error:', e);
      return null;
    }
  };

  const handleGroupSubmit = async () => {
    setGroupError('');
    if (!groupForm.groupName.trim()) { setGroupError('Group name is required.'); return; }
    if (!groupForm.room.trim())      { setGroupError('Room is required.'); return; }

    setCheckingConflict(true);
    const conflict = await checkGlobalGroupConflict();
    setCheckingConflict(false);

    if (conflict) {
      setGroupError(
        `❌ Room "${groupForm.room.trim()}" is already booked on ${conflict.day} at ${conflict.time} by group "${conflict.groupName}" (${conflict.courseName}).`
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        courseId:    currentCourse.id,
        courseName:  currentCourse.courseName,
        groupName:   groupForm.groupName.trim(),
        day:         groupForm.day,
        time:        groupForm.time,
        room:        groupForm.room.trim(),
        maxStudents: Number(groupForm.maxStudents),
      };
      if (editingGroup) {
        await updateGroup(editingGroup.id, payload);
      } else {
        await addGroup(payload);
      }
      setGroupModal(false);
      await loadGroupsForCourse(currentCourse.id);
    } catch (e) { setGroupError('Failed to save. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const openGroupModal = (course, group = null) => {
    setCurrentC(course);
    setGroupError('');
    if (group) {
      setEditGroup(group);
      setGroupForm({ groupName: group.groupName || '', day: group.day || 'Sunday', time: group.time || '8:00-10:00', room: group.room || '', maxStudents: group.maxStudents || 30 });
    } else {
      setEditGroup(null);
      setGroupForm({ groupName: '', day: 'Sunday', time: '8:00-10:00', room: '', maxStudents: 30 });
    }
    setGroupModal(true);
  };

  const handleDeleteGroup = async (groupId, groupName, courseId) => {
    if (!window.confirm(`Delete group "${groupName}"?`)) return;
    try {
      await deleteGroup(groupId);
      await loadGroupsForCourse(courseId);
    } catch (e) { alert('Failed to delete.'); }
  };

  const filtered = courses.filter(c => {
    const matchSearch = (c.courseName || '').toLowerCase().includes(search.toLowerCase()) || (c.courseCode || '').toLowerCase().includes(search.toLowerCase());
    if (!matchSearch) return false;
    if (filterDiv  !== 'all' && c.division !== filterDiv) return false;
    if (filterYear !== 'all' && Number(c.year) !== Number(filterYear)) return false;
    if (filterTerm !== 'all' && Number(c.term) !== Number(filterTerm)) return false;
    return true;
  });

  const stats = [
    { lbl: 'TOTAL', num: filtered.length, ac: '#7c3aed' },
    { lbl: 'CS',    num: filtered.filter(c => c.division === 'computer_science').length, ac: '#4f46e5' },
    { lbl: 'MATH',  num: filtered.filter(c => c.division === 'special_mathematics').length, ac: '#10b981' },
  ];

  if (loading) return (
    <div className="courses-page">
      <div className="courses-topbar">
        <button className="courses-back-btn" onClick={onBack}>← Back</button>
        <span className="courses-topbar-title">📚 Manage Courses</span>
      </div>
      <div className="courses-loading"><div className="courses-spinner" /><div>Loading courses...</div></div>
    </div>
  );

  return (
    <div className="courses-page">

      {/* Top Bar */}
      <div className="courses-topbar">
        <button className="courses-back-btn" onClick={onBack}>← Back</button>
        <span className="courses-topbar-title">📚 Manage Courses</span>
        <span className="courses-topbar-count">{filtered.length} / {courses.length}</span>
        <button className="courses-add-btn" onClick={() => { resetCourseForm(); setCourseModal(true); }}>+ Add Course</button>
      </div>

      {/* Filters */}
      <div className="courses-filters-bar">
        <div className="filters-row">
          <div className="search-group">
            <span className="search-icon">🔍</span>
            <input className="courses-search" type="text" placeholder="Search by name or code..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterDiv}  onChange={e => setFilterDiv(e.target.value)}>
            {DIVISIONS.map(d => <option key={d.value} value={d.value}>{d.icon} {d.label}</option>)}
          </select>
          <select className="filter-select" value={filterYear} onChange={e => setFilterYear(e.target.value)}>
            {YEARS.map(y => <option key={y.value} value={y.value}>🎓 {y.label}</option>)}
          </select>
          <select className="filter-select" value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
            {TERMS.map(t => <option key={t.value} value={t.value}>📅 {t.label}</option>)}
          </select>
          {(search || filterDiv !== 'all' || filterYear !== 'all' || filterTerm !== 'all') && (
            <button className="clear-filters-btn" onClick={() => { setSearch(''); setFilterDiv('all'); setFilterYear('all'); setFilterTerm('all'); }}>✖ Clear</button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="courses-body">
        <div className="courses-stats">
          {stats.map(s => (
            <div key={s.lbl} className="c-stat" style={{ '--ac': s.ac }}>
              <div className="c-stat-num">{s.num}</div>
              <div className="c-stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="courses-empty">
            <div style={{ fontSize: 44, marginBottom: 12 }}>📭</div>
            <div>No courses found</div>
          </div>
        ) : (
          <div className="courses-list">
            {filtered.map(course => (
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
                  <div className="course-division">{course.division === 'computer_science' ? 'CS' : 'Math'}</div>
                  <div className="course-actions" onClick={e => e.stopPropagation()}>
                    <button className="course-edit-btn"   onClick={() => openCourseEdit(course)}>✏️</button>
                    <button className="course-delete-btn" onClick={() => { setDeletingC(course); setDeleteModal(true); }}>🗑️</button>
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
                    ) : (groups[course.id]?.length || 0) === 0 ? (
                      <div className="groups-empty">No groups yet. Click "Add Group" to create one.</div>
                    ) : (
                      <div className="groups-list">
                        {groups[course.id].map(group => (
                          <div key={group.id} className="group-card">
                            <div className="group-header">
                              <div className="group-name">{group.groupName}</div>
                              <div className="group-actions">
                                <button className="group-edit"   onClick={() => openGroupModal(course, group)}>✏️</button>
                                <button className="group-delete" onClick={() => handleDeleteGroup(group.id, group.groupName, course.id)}>🗑️</button>
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
            ))}
          </div>
        )}
      </div>

      {/* ── Course Modal ── */}
      {courseModal && (
        <div className="modal-overlay" onClick={() => setCourseModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editingCourse ? '✏️ Edit Course' : '➕ Add New Course'}</span>
              <button className="modal-close" onClick={() => setCourseModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {courseError && (
                <div className="validation-error">
                  <span>⚠️</span><span>{courseError}</span>
                </div>
              )}
              <div className="input-group">
                <label className="input-label">Course Name *</label>
                <input className="modal-input" type="text" placeholder="e.g. Linear Algebra 1" value={courseForm.courseName} onChange={e => { setCourseForm({ ...courseForm, courseName: e.target.value }); setCourseError(''); }} />
              </div>
              <div className="input-group">
                <label className="input-label">Course Code (optional)</label>
                <input className="modal-input" type="text" placeholder="e.g. MATH201" value={courseForm.courseCode} onChange={e => setCourseForm({ ...courseForm, courseCode: e.target.value })} />
              </div>
              <div className="input-group">
                <label className="input-label">Division</label>
                <div className="option-group">
                  {DIVISIONS.filter(d => d.value !== 'all').map(d => (
                    <button key={d.value} className={`option-btn ${courseForm.division === d.value ? 'active' : ''}`} onClick={() => { setCourseForm({ ...courseForm, division: d.value }); setCourseError(''); }}>
                      {d.icon} {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Year</label>
                <div className="option-group">
                  {YEARS.filter(y => y.value !== 'all').map(y => (
                    <button key={y.value} className={`option-btn ${courseForm.year === y.value ? 'active' : ''}`} onClick={() => { setCourseForm({ ...courseForm, year: y.value }); setCourseError(''); }}>
                      Year {y.value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Term</label>
                <div className="option-group">
                  {TERMS.filter(t => t.value !== 'all').map(t => (
                    <button key={t.value} className={`option-btn ${courseForm.term === t.value ? 'active' : ''}`} onClick={() => { setCourseForm({ ...courseForm, term: t.value }); setCourseError(''); }}>
                      Term {t.value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setCourseModal(false)}>Cancel</button>
                <button className="submit-btn" onClick={handleCourseSubmit} disabled={submitting}>
                  {submitting ? 'Saving...' : (editingCourse ? 'Update Course' : 'Add Course')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Course Modal ── */}
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
                <div className="delete-message">⚠️ This will also delete ALL groups for this course. This cannot be undone.</div>
              </div>
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setDeleteModal(false)}>Cancel</button>
                <button className="delete-confirm-btn" onClick={handleDeleteCourse}>Delete Permanently</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Group Modal ── */}
      {groupModal && currentCourse && (
        <div className="modal-overlay" onClick={() => setGroupModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <span className="modal-title">{editingGroup ? '✏️ Edit Group' : '➕ Add Group'}</span>
                <div className="modal-subtitle">{currentCourse.courseName}</div>
              </div>
              <button className="modal-close" onClick={() => setGroupModal(false)}>✕</button>
            </div>
            <div className="modal-body">

              {groupError && (
                <div className="validation-error">
                  <span>⚠️</span><span>{groupError}</span>
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Group Name *</label>
                <input className="modal-input" type="text" placeholder="e.g. Group A" value={groupForm.groupName} onChange={e => { setGroupForm({ ...groupForm, groupName: e.target.value }); setGroupError(''); }} />
              </div>
              <div className="input-row">
                <div className="input-group half">
                  <label className="input-label">Day</label>
                  <select className="modal-select" value={groupForm.day} onChange={e => { setGroupForm({ ...groupForm, day: e.target.value }); setGroupError(''); }}>
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="input-group half">
                  <label className="input-label">Time Slot</label>
                  <select className="modal-select" value={groupForm.time} onChange={e => { setGroupForm({ ...groupForm, time: e.target.value }); setGroupError(''); }}>
                    {SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Room *</label>
                <input className="modal-input" type="text" placeholder="e.g. Hall 101" value={groupForm.room} onChange={e => { setGroupForm({ ...groupForm, room: e.target.value }); setGroupError(''); }} />
              </div>
              <div className="input-group">
                <label className="input-label">Max Students</label>
                <input className="modal-input" type="number" min="1" max="200" value={groupForm.maxStudents} onChange={e => setGroupForm({ ...groupForm, maxStudents: parseInt(e.target.value) || 30 })} />
              </div>

              {groupForm.day && groupForm.time && groupForm.room && (
                <div className="schedule-preview">
                  <div className="schedule-preview-label">SCHEDULE PREVIEW</div>
                  <div className="schedule-preview-row">
                    <span>📅 {groupForm.day}</span>
                    <span>⏰ {groupForm.time}</span>
                    <span>🏠 {groupForm.room}</span>
                    <span>👥 Max {groupForm.maxStudents}</span>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setGroupModal(false)}>Cancel</button>
                <button className="submit-btn" onClick={handleGroupSubmit} disabled={submitting || checkingConflict}>
                  {checkingConflict ? 'Checking...' : submitting ? 'Saving...' : (editingGroup ? 'Update Group' : 'Add Group')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
