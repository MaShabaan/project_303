import React, { useState, useEffect } from 'react';
import {
  collection, getDocs, doc, getDoc,
  updateDoc, setDoc, Timestamp, query, where,
} from 'firebase/firestore';
import { db, getGroupsByCourse } from '../services/firebase';
import './Enrollments.css';

const DIVISION_LABEL = {
  computer_science:    { label: 'Computer Science',    icon: '💻', color: '#4f46e5' },
  special_mathematics: { label: 'Special Mathematics', icon: '📐', color: '#10b981' },
};

export default function Enrollments({ user, onBack }) {
  const [students, setStudents]             = useState([]);
  const [courses, setCourses]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedId, setSelectedId]         = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedEnrollments, setSelectedEnrollments] = useState({});
  const [saving, setSaving]                 = useState(false);
  const [search, setSearch]                 = useState('');
  const [groupsCache, setGroupsCache]       = useState({});
  const [loadingGroups, setLoadingGroups]   = useState({});
  
  const [filterYear, setFilterYear]         = useState('all');
  const [filterTerm, setFilterTerm]         = useState('all');
  const [filterDivision, setFilterDivision] = useState('all');
  
  const [transferRequests, setTransferRequests] = useState([]);
  const [showTransferRequests, setShowTransferRequests] = useState(false);
  const [processingTransfer, setProcessingTransfer] = useState(false);
  
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [showEnrollmentRequests, setShowEnrollmentRequests] = useState(false);
  const [processingEnrollmentRequest, setProcessingEnrollmentRequest] = useState(false);
  
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [currentCourseForGroup, setCurrentCourseForGroup] = useState(null);
  const [tempGroupSelection, setTempGroupSelection] = useState(null);

  useEffect(() => { 
    loadData(); 
    loadTransferRequests();
    loadEnrollmentRequests();
  }, []);

  useEffect(() => {
    if (selectedId) loadEnrollment(selectedId);
  }, [selectedId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersSnap, coursesSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'courses')),
      ]);
      setStudents(
        usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => u.role === 'user')
      );
      setCourses(coursesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadTransferRequests = async () => {
    try {
      const q = query(collection(db, 'transferRequests'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTransferRequests(list);
    } catch (error) {
      console.error('Error loading transfer requests:', error);
    }
  };

  const loadEnrollmentRequests = async () => {
    try {
      const q = query(collection(db, 'enrollmentRequests'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEnrollmentRequests(list);
    } catch (error) {
      console.error('Error loading enrollment requests:', error);
    }
  };

  const loadEnrollment = async (studentId) => {
    const student = students.find(s => s.id === studentId);
    setSelectedStudent(student);
    try {
      const snap = await getDoc(doc(db, 'enrollments', studentId));
      if (snap.exists()) {
        const data = snap.data();
        const enrollmentsMap = {};
        if (data.courses && Array.isArray(data.courses)) {
          data.courses.forEach(c => {
            enrollmentsMap[c.courseId] = c.groupId;
          });
        } else if (data.courseIds && Array.isArray(data.courseIds)) {
          data.courseIds.forEach(courseId => {
            enrollmentsMap[courseId] = null;
          });
        }
        setSelectedEnrollments(enrollmentsMap);
      } else {
        setSelectedEnrollments({});
      }
    } catch { 
      setSelectedEnrollments({});
    }
  };

  const loadGroupsForCourse = async (courseId) => {
    if (groupsCache[courseId]) return;
    setLoadingGroups(prev => ({ ...prev, [courseId]: true }));
    try {
      const groupsList = await getGroupsByCourse(courseId);
      setGroupsCache(prev => ({ ...prev, [courseId]: groupsList }));
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoadingGroups(prev => ({ ...prev, [courseId]: false }));
    }
  };

  const openGroupSelector = (course) => {
    setCurrentCourseForGroup(course);
    setTempGroupSelection(selectedEnrollments[course.id] || null);
    loadGroupsForCourse(course.id);
    setGroupModalOpen(true);
  };

  const confirmGroupSelection = () => {
    if (currentCourseForGroup) {
      setSelectedEnrollments(prev => ({
        ...prev,
        [currentCourseForGroup.id]: tempGroupSelection
      }));
    }
    setGroupModalOpen(false);
    setCurrentCourseForGroup(null);
    setTempGroupSelection(null);
  };

  const removeEnrollment = (courseId) => {
    setSelectedEnrollments(prev => {
      const newEnrollments = { ...prev };
      delete newEnrollments[courseId];
      return newEnrollments;
    });
  };

  const saveEnrollment = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const now = Timestamp.now();
      const ref = doc(db, 'enrollments', selectedId);
      
      const coursesArray = [];
      
      for (const [courseId, groupId] of Object.entries(selectedEnrollments)) {
        if (!groupId) continue;
        
        const course = courses.find(c => c.id === courseId);
        if (!course) continue;
        
        let group = null;
        if (groupsCache[courseId]) {
          group = groupsCache[courseId].find(g => g.id === groupId);
        } else {
          const courseGroups = await getGroupsByCourse(courseId);
          group = courseGroups.find(g => g.id === groupId);
        }
        
        coursesArray.push({
          courseId: course.id,
          courseName: course.courseName,
          courseCode: course.courseCode || '',
          year: course.year,
          term: course.term,
          division: course.division,
          groupId: group?.id,
          groupName: group?.groupName,
          day: group?.day,
          time: group?.time,
          room: group?.room,
          maxStudents: group?.maxStudents,
          enrolledAt: now,
        });
      }
      
      const data = {
        userId: selectedId,
        userEmail: selectedStudent?.email || null,
        userName: selectedStudent?.displayName || selectedStudent?.fullName || selectedStudent?.email?.split('@')[0],
        courses: coursesArray,
        division: selectedStudent?.division || 'computer_science',
        academicYear: selectedStudent?.academicYear || 2,
        term: selectedStudent?.currentTerm || 1,
        submitted: true,
        submittedAt: now,
        updatedAt: now,
      };
      
      const existingSnap = await getDoc(ref);
      if (!existingSnap.exists()) {
        data.createdAt = now;
      }
      
      await setDoc(ref, data, { merge: true });
      alert(`✅ Successfully enrolled ${coursesArray.length} course(s) for ${selectedStudent?.email}`);
      
      await loadEnrollment(selectedId);
      
    } catch (e) {
      console.error('Error saving enrollment:', e);
      alert('❌ Failed to save enrollment: ' + e.message);
    } finally { 
      setSaving(false); 
    }
  };

  const handleTransferRequest = async (requestId, studentId, courseId, newGroupId, action) => {
    setProcessingTransfer(true);
    const now = Timestamp.now();
    try {
      if (action === 'approve') {
        const enrollmentRef = doc(db, 'enrollments', studentId);
        const enrollmentSnap = await getDoc(enrollmentRef);
        
        if (enrollmentSnap.exists()) {
          const currentCourses = enrollmentSnap.data().courses || [];
          const updatedCourses = currentCourses.map(c => 
            c.courseId === courseId ? { ...c, groupId: newGroupId, updatedAt: now } : c
          );
          
          await updateDoc(enrollmentRef, { 
            courses: updatedCourses,
            updatedAt: now 
          });
        }
        
        await updateDoc(doc(db, 'transferRequests', requestId), {
          status: 'approved',
          processedAt: now,
          processedBy: user?.email,
        });
        
        alert('Transfer request approved!');
        await loadEnrollment(studentId);
        await loadTransferRequests();
        
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'transferRequests', requestId), {
          status: 'rejected',
          processedAt: now,
          processedBy: user?.email,
        });
        alert('Transfer request rejected');
        await loadTransferRequests();
      }
    } catch (error) {
      console.error('Error processing transfer:', error);
      alert('Failed to process request');
    } finally {
      setProcessingTransfer(false);
    }
  };

  const handleEnrollmentRequest = async (requestId, studentId, requestData, action) => {
    setProcessingEnrollmentRequest(true);
    const now = Timestamp.now();
    try {
      if (action === 'approve') {
        const enrollmentRef = doc(db, 'enrollments', studentId);
        const enrollmentSnap = await getDoc(enrollmentRef);
        
        let currentCourses = [];
        if (enrollmentSnap.exists()) {
          currentCourses = enrollmentSnap.data().courses || [];
        }
        
        // Get course details from requestData
        const courseId = requestData.courseId;
        if (courseId) {
          const course = courses.find(c => c.id === courseId);
          
          // Check if course already exists
          const existingCourseIds = new Set(currentCourses.map(c => c.courseId));
          
          if (!existingCourseIds.has(courseId)) {
            const newCourse = {
              courseId: courseId,
              courseName: course?.courseName || requestData.courseName || 'Course',
              courseCode: course?.courseCode || '',
              year: course?.year || requestData.courseYear || 2,
              term: course?.term || requestData.term || 1,
              division: course?.division,
              groupId: null,
              groupName: null,
              day: null,
              time: null,
              room: null,
              enrolledAt: now,
            };
            
            currentCourses.push(newCourse);
          }
        }
        
        const data = {
          userId: studentId,
          courses: currentCourses,
          updatedAt: now,
        };
        
        if (!enrollmentSnap.exists()) {
          data.createdAt = now;
          data.userEmail = requestData.userEmail || (await getDoc(doc(db, 'users', studentId))).data()?.email;
        }
        
        await setDoc(enrollmentRef, data, { merge: true });
        
        await updateDoc(doc(db, 'enrollmentRequests', requestId), {
          status: 'approved',
          processedAt: now,
          processedBy: user?.email,
        });
        
        alert('✅ Request approved!');
        await loadEnrollment(studentId);
        await loadEnrollmentRequests();
        
      } else if (action === 'reject') {
        await updateDoc(doc(db, 'enrollmentRequests', requestId), {
          status: 'rejected',
          processedAt: now,
          processedBy: user?.email,
        });
        alert('❌ Request rejected');
        await loadEnrollmentRequests();
      }
    } catch (error) {
      console.error('Error processing enrollment request:', error);
      alert('Failed to process request');
    } finally {
      setProcessingEnrollmentRequest(false);
    }
  };

  const getFilteredStudents = () => {
    let result = [...students];
    
    if (filterYear !== 'all') {
      result = result.filter(s => String(s.academicYear) === String(filterYear));
    }
    if (filterTerm !== 'all') {
      result = result.filter(s => String(s.currentTerm) === String(filterTerm));
    }
    if (filterDivision !== 'all') {
      result = result.filter(s => s.division === filterDivision);
    }
    if (search) {
      result = result.filter(s => 
        (s.email || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.displayName || s.fullName || '').toLowerCase().includes(search.toLowerCase())
      );
    }
    return result;
  };

  const filteredStudents = getFilteredStudents();

  const studentLabel = selectedStudent
    ? (selectedStudent.displayName || selectedStudent.fullName || selectedStudent.email?.split('@')[0])
    : '';

  const studentDiv = selectedStudent?.division;
  const studentDivInfo = studentDiv ? DIVISION_LABEL[studentDiv] : null;

  const getOrganizedCourses = () => {
    if (!selectedStudent) return { sameLevelCourses: [], lowerLevelCourses: [] };
    
    const studentYear = selectedStudent.academicYear || 2;
    const studentTerm = selectedStudent.currentTerm || 1;
    
    const allCourses = courses.filter(c => 
      c.term === studentTerm &&
      c.year <= studentYear
    );
    
    const sameLevelCourses = allCourses.filter(c => c.year === studentYear);
    const lowerLevelCourses = allCourses.filter(c => c.year < studentYear).sort((a, b) => b.year - a.year);
    
    return { sameLevelCourses, lowerLevelCourses };
  };

  const { sameLevelCourses, lowerLevelCourses } = getOrganizedCourses();

  const stats = {
    total: filteredStudents.length,
    cs: filteredStudents.filter(s => s.division === 'computer_science').length,
    math: filteredStudents.filter(s => s.division === 'special_mathematics').length,
  };

  const renderCoursesSection = (coursesList, title, icon, isCurrentLevel = true) => {
    if (coursesList.length === 0) return null;
    
    const groupedByYear = {};
    coursesList.forEach(course => {
      if (!groupedByYear[course.year]) {
        groupedByYear[course.year] = [];
      }
      groupedByYear[course.year].push(course);
    });
    
    return (
      <div className="year-group">
        <div className={`year-group-header ${isCurrentLevel ? 'current-year' : 'lower-year'}`}>
          <span className="year-icon">{icon}</span>
          <span className="year-title">{title}</span>
          <span className="year-badge">{isCurrentLevel ? 'Current Level' : 'Lower Level'}</span>
        </div>
        
        {Object.keys(groupedByYear)
          .sort((a, b) => parseInt(b) - parseInt(a))
          .map(year => (
            <div key={year} className="sub-year-group">
              <div className="sub-year-header">
                <span className="sub-year-title">Year {year}</span>
              </div>
              <div className="courses-year-group">
                {groupedByYear[year].map(course => {
                  const isEnrolled = selectedEnrollments.hasOwnProperty(course.id);
                  const selectedGroupId = selectedEnrollments[course.id];
                  const courseGroups = groupsCache[course.id] || [];
                  const selectedGroup = courseGroups.find(g => g.id === selectedGroupId);
                  const isSameDivision = course.division === studentDiv;
                  const otherDivInfo = course.division ? DIVISION_LABEL[course.division] : null;
                  
                  return (
                    <div 
                      key={course.id} 
                      className={`course-row ${isEnrolled ? 'is-enrolled' : ''} ${!isSameDivision ? 'course-row-other-division' : ''}`}
                    >
                      <div className="course-info-section">
                        <div className="course-name">
                          {course.courseName}
                          {!isSameDivision && otherDivInfo && (
                            <span className="other-division-badge">
                              ⚠️ {otherDivInfo.icon} {otherDivInfo.label}
                            </span>
                          )}
                        </div>
                        <div className="course-meta">
                          {course.courseCode && <span className="course-tag">{course.courseCode}</span>}
                          <span>Year {course.year}</span>
                          <span>Term {course.term}</span>
                        </div>
                        {isEnrolled && selectedGroup && (
                          <div className="enrolled-group-badge">
                            📅 Currently in: {selectedGroup.groupName} · {selectedGroup.day} {selectedGroup.time} · Room {selectedGroup.room}
                          </div>
                        )}
                        {!isEnrolled && courseGroups.length > 0 && (
                          <div className="available-groups-hint">
                            📋 Available groups: {courseGroups.map(g => g.groupName).join(', ')}
                          </div>
                        )}
                      </div>
                      
                      <div className="course-actions-section">
                        {!isEnrolled ? (
                          <button 
                            className="enroll-btn"
                            onClick={() => openGroupSelector(course)}
                          >
                            + Enroll
                          </button>
                        ) : (
                          <div className="enrolled-actions">
                            <button 
                              className="change-group-btn"
                              onClick={() => openGroupSelector(course)}
                            >
                              🔄 Change Group
                            </button>
                            <button 
                              className="remove-btn"
                              onClick={() => removeEnrollment(course.id)}
                            >
                              ✖ Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </div>
    );
  };

  const totalRequests = transferRequests.length + enrollmentRequests.length;

  return (
    <div className="enroll-page">

      <div className="enroll-topbar">
        <button className="enroll-back-btn" onClick={onBack}>← Back</button>
        <span className="enroll-topbar-title">📝 Course Enrollment Management</span>
        {totalRequests > 0 && (
          <button className="requests-badge" onClick={() => setShowEnrollmentRequests(true)}>
            📢 {totalRequests} Pending Request{totalRequests > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="enroll-body">

        {/* Students Panel */}
        <div className="panel panel-students">
          <div className="panel-head">
            <div className="panel-head-row">
              <span className="panel-head-title">👨‍🎓 Students</span>
              <span className="panel-count">{filteredStudents.length} / {students.length}</span>
            </div>
            
            <div className="student-filters">
              <div className="filter-row">
                <select 
                  className="filter-select"
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                >
                  <option value="all">🎓 All Years</option>
                  <option value="2">🎓 Year 2</option>
                  <option value="3">🎓 Year 3</option>
                  <option value="4">🎓 Year 4</option>
                </select>
                
                <select 
                  className="filter-select"
                  value={filterTerm}
                  onChange={(e) => setFilterTerm(e.target.value)}
                >
                  <option value="all">📅 All Terms</option>
                  <option value="1">📅 Term 1</option>
                  <option value="2">📅 Term 2</option>
                </select>
                
                <select 
                  className="filter-select"
                  value={filterDivision}
                  onChange={(e) => setFilterDivision(e.target.value)}
                >
                  <option value="all">📚 All Divisions</option>
                  <option value="computer_science">💻 Computer Science</option>
                  <option value="special_mathematics">📐 Special Mathematics</option>
                </select>
              </div>
              
              <div className="filter-stats-row">
                <div className="filter-stats">
                  <span className="stat-badge">📊 Total: {stats.total}</span>
                  <span className="stat-badge cs">💻 CS: {stats.cs}</span>
                  <span className="stat-badge math">📐 Math: {stats.math}</span>
                </div>
                
                {(filterYear !== 'all' || filterTerm !== 'all' || filterDivision !== 'all' || search) && (
                  <button 
                    className="clear-filters-btn"
                    onClick={() => {
                      setFilterYear('all');
                      setFilterTerm('all');
                      setFilterDivision('all');
                      setSearch('');
                    }}
                  >
                    ✖ Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            <input
              className="panel-search"
              type="text"
              placeholder="🔍 Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="students-scroll">
            {loading ? (
              <div className="panel-empty">
                <div className="spinner" />
                <div className="panel-empty-text">Loading...</div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="panel-empty">
                <div className="panel-empty-icon">🔍</div>
                <div className="panel-empty-text">No students found</div>
              </div>
            ) : (
              filteredStudents.map(s => {
                const divInfo = s.division ? DIVISION_LABEL[s.division] : null;
                return (
                  <div
                    key={s.id}
                    className={`student-row ${selectedId === s.id ? 'is-selected' : ''}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <div className="student-avatar">
                      {(s.displayName || s.fullName || s.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="student-name">{s.displayName || s.fullName || 'No Name'}</div>
                      <div className="student-email">{s.email}</div>
                      <div className="student-info-row">
                        {divInfo && (
                          <span className="student-div-tag" style={{ color: divInfo.color }}>
                            {divInfo.icon} {divInfo.label}
                          </span>
                        )}
                        <span className="student-year-term">
                          📅 Year {s.academicYear || 2} · Term {s.currentTerm || 1}
                        </span>
                      </div>
                    </div>
                    {selectedId === s.id && <span className="student-check">✓</span>}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Courses Panel */}
        <div className="panel panel-courses">
          {!selectedId ? (
            <div className="panel-empty">
              <div className="panel-empty-icon">👈</div>
              <div className="panel-empty-text">
                Select a student from the left panel<br />to manage their course enrollment
              </div>
            </div>
          ) : (
            <>
              <div className="panel-head">
                <div className="panel-head-row">
                  <span className="panel-head-title">
                    📚 Courses for {studentLabel}
                  </span>
                  <span className="panel-count">{Object.keys(selectedEnrollments).length} enrolled</span>
                </div>

                <div className="student-info-banner">
                  <span className="student-badge">
                    🎓 Student: {studentLabel}
                  </span>
                  <span className="student-badge">
                    {studentDivInfo?.icon} {studentDivInfo?.label}
                  </span>
                  <span className="student-badge">
                    📅 Current: Year {selectedStudent?.academicYear || 2} · Term {selectedStudent?.currentTerm || 1}
                  </span>
                </div>

                <div className="division-legend">
                  <span className="legend-same">✅ Same Division</span>
                  <span className="legend-other">⚠️ Other Division</span>
                </div>
              </div>

              <div className="courses-scroll">
                {renderCoursesSection(
                  sameLevelCourses, 
                  `Same Level · Year ${selectedStudent?.academicYear || 2} · Term ${selectedStudent?.currentTerm || 1}`, 
                  '🎓', 
                  true
                )}
                
                {renderCoursesSection(
                  lowerLevelCourses, 
                  `Lower Levels · Up to Year ${(selectedStudent?.academicYear || 2) - 1} · Term ${selectedStudent?.currentTerm || 1}`, 
                  '📖', 
                  false
                )}
                
                {sameLevelCourses.length === 0 && lowerLevelCourses.length === 0 && (
                  <div className="panel-empty">
                    <div className="panel-empty-icon">📭</div>
                    <div className="panel-empty-text">No courses available</div>
                  </div>
                )}
              </div>

              <div className="save-bar">
                <button className="save-btn" onClick={saveEnrollment} disabled={saving}>
                  {saving ? 'Saving...' : '💾 Save All Changes'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Enrollment Change Requests Modal */}
      {showEnrollmentRequests && (
        <div className="modal-overlay" onClick={() => setShowEnrollmentRequests(false)}>
          <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">📢 Pending Requests</span>
              <button className="modal-close" onClick={() => setShowEnrollmentRequests(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Transfer Requests Section */}
              {transferRequests.length > 0 && (
                <>
                  <h4 style={{ marginBottom: '12px', color: 'var(--purple)' }}>🔄 Group Transfer Requests ({transferRequests.length})</h4>
                  {transferRequests.map(req => {
                    const student = students.find(s => s.id === req.studentId);
                    const course = courses.find(c => c.id === req.courseId);
                    const oldGroup = groupsCache[req.courseId]?.find(g => g.id === req.oldGroupId);
                    const newGroup = groupsCache[req.courseId]?.find(g => g.id === req.newGroupId);
                    
                    return (
                      <div key={req.id} className="transfer-request-card">
                        <div className="request-header">
                          <div className="request-student">
                            <strong>{student?.displayName || student?.fullName || 'Student'}</strong>
                            <span className="request-email">{student?.email}</span>
                          </div>
                          <div className="request-date">
                            {req.createdAt?.toDate().toLocaleDateString()}
                          </div>
                        </div>
                        <div className="request-course">
                          📚 {course?.courseName}
                        </div>
                        <div className="request-transfer-details">
                          <div className="old-group">
                            From: {oldGroup?.groupName || 'Unknown'} · {oldGroup?.day || ''} {oldGroup?.time || ''}
                          </div>
                          <div className="transfer-arrow">→</div>
                          <div className="new-group">
                            To: {newGroup?.groupName || 'Unknown'} · {newGroup?.day || ''} {newGroup?.time || ''}
                          </div>
                        </div>
                        <div className="request-reason">
                          <strong>Reason:</strong> {req.reason || 'No reason provided'}
                        </div>
                        <div className="request-actions">
                          <button 
                            className="request-reject-btn" 
                            onClick={() => handleTransferRequest(req.id, req.studentId, req.courseId, req.newGroupId, 'reject')}
                            disabled={processingTransfer}
                          >
                            Reject
                          </button>
                          <button 
                            className="request-approve-btn" 
                            onClick={() => handleTransferRequest(req.id, req.studentId, req.courseId, req.newGroupId, 'approve')}
                            disabled={processingTransfer}
                          >
                            Approve Transfer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Enrollment Problem Requests Section */}
              {enrollmentRequests.length > 0 && (
                <>
                  <h4 style={{ marginBottom: '12px', marginTop: transferRequests.length > 0 ? '24px' : '0', color: 'var(--blue)' }}>📝 Problem Reports ({enrollmentRequests.length})</h4>
                  {enrollmentRequests.map(req => {
                    const student = students.find(s => s.id === req.userId);
                    
                    return (
                      <div key={req.id} className="transfer-request-card">
                        <div className="request-header">
                          <div className="request-student">
                            <strong>{req.userName || student?.displayName || student?.fullName || 'Student'}</strong>
                            <span className="request-email">{req.userEmail}</span>
                          </div>
                          <div className="request-date">
                            {req.createdAt?.toDate().toLocaleDateString()}
                          </div>
                        </div>
                        <div className="request-details">
                          <div className="request-course">
                            📚 {req.courseName} (Year {req.courseYear})
                          </div>
                          <div className="request-reason">
                            <strong>Problem:</strong> {req.reason}
                          </div>
                        </div>
                        <div className="request-actions">
                          <button 
                            className="request-reject-btn" 
                            onClick={() => handleEnrollmentRequest(req.id, req.userId, req, 'reject')}
                            disabled={processingEnrollmentRequest}
                          >
                            Reject
                          </button>
                          <button 
                            className="request-approve-btn" 
                            onClick={() => handleEnrollmentRequest(req.id, req.userId, req, 'approve')}
                            disabled={processingEnrollmentRequest}
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {totalRequests === 0 && (
                <div className="no-requests">No pending requests</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Group Selection Modal */}
      {groupModalOpen && currentCourseForGroup && (
        <div className="modal-overlay" onClick={() => setGroupModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">📅 Select Group for {currentCourseForGroup.courseName}</span>
              <button className="modal-close" onClick={() => setGroupModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {loadingGroups[currentCourseForGroup.id] ? (
                <div className="groups-loading">Loading groups...</div>
              ) : groupsCache[currentCourseForGroup.id]?.length === 0 ? (
                <div className="groups-empty">No groups available for this course. Please add groups first in Manage Courses.</div>
              ) : (
                <div className="groups-selection-list">
                  {groupsCache[currentCourseForGroup.id]?.map(group => (
                    <div
                      key={group.id}
                      className={`group-selection-item ${tempGroupSelection === group.id ? 'is-selected' : ''}`}
                      onClick={() => setTempGroupSelection(group.id)}
                    >
                      <div className="group-selection-radio">
                        {tempGroupSelection === group.id && <span className="radio-dot">●</span>}
                      </div>
                      <div className="group-selection-info">
                        <div className="group-selection-name">{group.groupName}</div>
                        <div className="group-selection-schedule">
                          📅 {group.day} · {group.time} · 🏠 {group.room}
                        </div>
                        <div className="group-selection-capacity">
                          👥 Max: {group.maxStudents} students
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="modal-footer">
                <button className="cancel-btn" onClick={() => setGroupModalOpen(false)}>Cancel</button>
                <button 
                  className="submit-btn" 
                  onClick={confirmGroupSelection}
                  disabled={!tempGroupSelection}
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}