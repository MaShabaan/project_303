import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, getDocs } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SimplePieChart = ({ distribution, total }: { distribution: any; total: number }) => {
  const excellent = distribution?.excellent || 0;
  const good = distribution?.good || 0;
  const average = distribution?.average || 0;
  const poor = distribution?.poor || 0;
  
  const totalCount = excellent + good + average + poor;
  if (totalCount === 0) {
    return <Text style={styles.piePlaceholder}>No ratings yet</Text>;
  }
  
  return (
    <View style={styles.simplePieContainer}>
      <View style={styles.simplePieBars}>
        <View style={[styles.bar, styles.excellentBar, { width: `${(excellent / totalCount) * 100}%` }]} />
        <View style={[styles.bar, styles.goodBar, { width: `${(good / totalCount) * 100}%` }]} />
        <View style={[styles.bar, styles.averageBar, { width: `${(average / totalCount) * 100}%` }]} />
        <View style={[styles.bar, styles.poorBar, { width: `${(poor / totalCount) * 100}%` }]} />
      </View>
      <View style={styles.simplePieLegend}>
        <Text style={styles.legendText}>● Excellent ({excellent})</Text>
        <Text style={styles.legendText}>● Good ({good})</Text>
        <Text style={styles.legendText}>● Average ({average})</Text>
        <Text style={styles.legendText}>● Poor ({poor})</Text>
      </View>
    </View>
  );
};

export default function StatisticsScreen() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courses, setCourses] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedInstructor, setSelectedInstructor] = useState<string | null>(null);
  const [courseStats, setCourseStats] = useState<any>(null);
  const [instructorStats, setInstructorStats] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'course' | 'instructor'>('course');
  const [globalStats, setGlobalStats] = useState({
    users: { total: 0, admins: 0, students: 0, blocked: 0 },
    complaints: { total: 0, open: 0, inProgress: 0, replied: 0, closed: 0 },
    courses: { total: 0, cs: 0, math: 0, byYear: { 2: 0, 3: 0, 4: 0 } },
    feedback: { total: 0, avgCourse: 0, avgInstructor: 0, distribution: { excellent: 0, good: 0, average: 0, poor: 0 } },
    enrollments: { total: 0, avgPerStudent: 0 }
  });

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (selectedCourseId) loadCourseStats(selectedCourseId);
  }, [selectedCourseId]);

  useEffect(() => {
    if (selectedInstructor) loadInstructorStats(selectedInstructor);
  }, [selectedInstructor]);

  const getPercent = (value: number, total: number) => total ? Math.round((value / total) * 100) : 0;

  const loadAllData = async () => {
    try {
      const coursesSnap = await getDocs(collection(db, COLLECTIONS.COURSES));
      const coursesList = coursesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesList);

      const feedbackSnap = await getDocs(collection(db, COLLECTIONS.FEEDBACK));
      const instructorsList = [...new Set(feedbackSnap.docs.map(doc => doc.data().instructor))];
      setInstructors(instructorsList.filter(i => i));

      const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
      const users = usersSnap.docs.map(d => d.data());
      const usersStats = {
        total: users.length,
        admins: users.filter(u => u.role === 'admin').length,
        students: users.filter(u => u.role === 'user').length,
        blocked: users.filter(u => u.isBlocked === true).length,
      };

      const ticketsSnap = await getDocs(collection(db, COLLECTIONS.TICKETS));
      const tickets = ticketsSnap.docs.map(d => d.data());
      const complaintsStats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'open').length,
        inProgress: tickets.filter(t => t.status === 'in-progress').length,
        replied: tickets.filter(t => t.status === 'replied').length,
        closed: tickets.filter(t => t.status === 'closed').length,
      };

      const coursesData = coursesSnap.docs.map(d => d.data());
      const coursesStats = {
        total: coursesData.length,
        cs: coursesData.filter(c => c.division === 'computer_science').length,
        math: coursesData.filter(c => c.division === 'special_mathematics').length,
        byYear: {
          2: coursesData.filter(c => c.year === 2).length,
          3: coursesData.filter(c => c.year === 3).length,
          4: coursesData.filter(c => c.year === 4).length,
        }
      };

      const feedbacks = feedbackSnap.docs.map(d => d.data());
      let totalCourse = 0;
      let totalInstructor = 0;
      let distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      
      feedbacks.forEach((fb: any) => {
        const courseR = fb.courseRating ?? fb.rating ?? 0;
        const instrR = fb.instructorRating ?? fb.rating ?? 0;
        totalCourse += courseR;
        totalInstructor += instrR;
        const avg = (courseR + instrR) / 2;
        if (avg >= 8) distribution.excellent++;
        else if (avg >= 6) distribution.good++;
        else if (avg >= 4) distribution.average++;
        else distribution.poor++;
      });
      
      const feedbackStats = {
        total: feedbacks.length,
        avgCourse: feedbacks.length ? parseFloat((totalCourse / feedbacks.length).toFixed(1)) : 0,
        avgInstructor: feedbacks.length ? parseFloat((totalInstructor / feedbacks.length).toFixed(1)) : 0,
        distribution
      };

      const enrollmentsSnap = await getDocs(collection(db, COLLECTIONS.ENROLLMENTS));
      const enrollments = enrollmentsSnap.docs.map(d => d.data());
      const totalEnrollments = enrollments.reduce((sum: number, e: any) => sum + (e.courseIds?.length || 0), 0);
      const enrollmentsStats = {
        total: enrollments.length,
        avgPerStudent: enrollments.length ? parseFloat((totalEnrollments / enrollments.length).toFixed(1)) : 0,
      };

      setGlobalStats({
        users: usersStats,
        complaints: complaintsStats,
        courses: coursesStats,
        feedback: feedbackStats,
        enrollments: enrollmentsStats,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  const loadCourseStats = async (courseId: string) => {
    try {
      const course = courses.find(c => c.id === courseId);
      if (!course) return;
      
      const feedbackSnap = await getDocs(collection(db, COLLECTIONS.FEEDBACK));
      const feedbacks = feedbackSnap.docs
        .map(d => d.data())
        .filter((fb: any) => fb.courseName === course.courseName);
      
      if (feedbacks.length === 0) {
        setCourseStats(null);
        return;
      }
      
      let totalCourse = 0;
      let totalInstructor = 0;
      let distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      
      feedbacks.forEach((fb: any) => {
        const courseR = fb.courseRating ?? fb.rating ?? 0;
        const instrR = fb.instructorRating ?? fb.rating ?? 0;
        totalCourse += courseR;
        totalInstructor += instrR;
        const avg = (courseR + instrR) / 2;
        if (avg >= 8) distribution.excellent++;
        else if (avg >= 6) distribution.good++;
        else if (avg >= 4) distribution.average++;
        else distribution.poor++;
      });
      
      setCourseStats({
        name: course.courseName,
        total: feedbacks.length,
        avgCourse: (totalCourse / feedbacks.length).toFixed(1),
        avgInstructor: (totalInstructor / feedbacks.length).toFixed(1),
        distribution
      });
    } catch (error) {
      console.error('Error loading course stats:', error);
    }
  };

  const loadInstructorStats = async (instructorName: string) => {
    try {
      const feedbackSnap = await getDocs(collection(db, COLLECTIONS.FEEDBACK));
      const feedbacks = feedbackSnap.docs
        .map(d => d.data())
        .filter((fb: any) => fb.instructor === instructorName);
      
      if (feedbacks.length === 0) {
        setInstructorStats(null);
        return;
      }
      
      let totalCourse = 0;
      let totalInstructor = 0;
      let distribution = { excellent: 0, good: 0, average: 0, poor: 0 };
      
      feedbacks.forEach((fb: any) => {
        const courseR = fb.courseRating ?? fb.rating ?? 0;
        const instrR = fb.instructorRating ?? fb.rating ?? 0;
        totalCourse += courseR;
        totalInstructor += instrR;
        const avg = (courseR + instrR) / 2;
        if (avg >= 8) distribution.excellent++;
        else if (avg >= 6) distribution.good++;
        else if (avg >= 4) distribution.average++;
        else distribution.poor++;
      });
      
      setInstructorStats({
        name: instructorName,
        total: feedbacks.length,
        avgCourse: (totalCourse / feedbacks.length).toFixed(1),
        avgInstructor: (totalInstructor / feedbacks.length).toFixed(1),
        distribution
      });
    } catch (error) {
      console.error('Error loading instructor stats:', error);
    }
  };

  const openCourseSelector = () => {
    setModalType('course');
    setModalVisible(true);
  };

  const openInstructorSelector = () => {
    setModalType('instructor');
    setModalVisible(true);
  };

  const selectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setModalVisible(false);
  };

  const selectInstructor = (instructor: string) => {
    setSelectedInstructor(instructor);
    setModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📊 Statistics</Text>
          <Text style={styles.headerSubtitle}>Analytics Dashboard</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Course Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📚 Course Statistics</Text>
          <TouchableOpacity style={styles.picker} onPress={openCourseSelector}>
            <Text style={styles.pickerText}>
              {selectedCourseId ? courses.find(c => c.id === selectedCourseId)?.courseName : 'Select a course...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>
          
          {selectedCourseId && courseStats ? (
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailName}>{courseStats.name}</Text>
                <Text style={styles.detailTotal}>{courseStats.total} reviews</Text>
              </View>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{courseStats.avgCourse}</Text>
                  <Text style={styles.detailLabel}>Avg Course Rating</Text>
                  <Text style={styles.detailMax}>/10</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{courseStats.avgInstructor}</Text>
                  <Text style={styles.detailLabel}>Avg Instructor Rating</Text>
                  <Text style={styles.detailMax}>/10</Text>
                </View>
              </View>
              <SimplePieChart distribution={courseStats.distribution} total={courseStats.total} />
            </View>
          ) : selectedCourseId && !courseStats ? (
            <Text style={styles.emptyText}>No feedback available for this course yet.</Text>
          ) : null}
        </View>

        {/* Instructor Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👨‍🏫 Instructor Statistics</Text>
          <TouchableOpacity style={styles.picker} onPress={openInstructorSelector}>
            <Text style={styles.pickerText}>
              {selectedInstructor || 'Select an instructor...'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#94a3b8" />
          </TouchableOpacity>
          
          {selectedInstructor && instructorStats ? (
            <View style={styles.detailContainer}>
              <View style={styles.detailHeader}>
                <Text style={styles.detailName}>{instructorStats.name}</Text>
                <Text style={styles.detailTotal}>{instructorStats.total} reviews</Text>
              </View>
              <View style={styles.detailGrid}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{instructorStats.avgCourse}</Text>
                  <Text style={styles.detailLabel}>Avg Course Rating</Text>
                  <Text style={styles.detailMax}>/10</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailValue}>{instructorStats.avgInstructor}</Text>
                  <Text style={styles.detailLabel}>Avg Instructor Rating</Text>
                  <Text style={styles.detailMax}>/10</Text>
                </View>
              </View>
              <SimplePieChart distribution={instructorStats.distribution} total={instructorStats.total} />
            </View>
          ) : selectedInstructor && !instructorStats ? (
            <Text style={styles.emptyText}>No feedback available for this instructor yet.</Text>
          ) : null}
        </View>

        {/* Users Overview */}
        <View style={styles.cardFull}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👥 Users Overview</Text>
            <Text style={styles.cardTotal}>{globalStats.users.total} Total</Text>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{globalStats.users.students}</Text>
              <Text style={styles.statLabel}>Students</Text>
              <Text style={styles.statPercent}>{getPercent(globalStats.users.students, globalStats.users.total)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{globalStats.users.admins}</Text>
              <Text style={styles.statLabel}>Admins</Text>
              <Text style={styles.statPercent}>{getPercent(globalStats.users.admins, globalStats.users.total)}%</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{globalStats.users.blocked}</Text>
              <Text style={styles.statLabel}>Blocked</Text>
              <Text style={styles.statPercent}>{getPercent(globalStats.users.blocked, globalStats.users.total)}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, styles.studentsProgress, { width: `${getPercent(globalStats.users.students, globalStats.users.total)}%` }]} />
            <View style={[styles.progressSegment, styles.adminsProgress, { width: `${getPercent(globalStats.users.admins, globalStats.users.total)}%` }]} />
            <View style={[styles.progressSegment, styles.blockedProgress, { width: `${getPercent(globalStats.users.blocked, globalStats.users.total)}%` }]} />
          </View>
        </View>

        {/* Complaints Overview */}
        <View style={styles.cardFull}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 Complaints Overview</Text>
            <Text style={styles.cardTotal}>{globalStats.complaints.total} Total</Text>
          </View>
          <View style={styles.statsGrid4}>
            <View style={styles.statItemSmall}>
              <Text style={styles.statValueSmall}>{globalStats.complaints.open}</Text>
              <Text style={styles.statLabelSmall}>Open</Text>
              <Text style={styles.statPercentSmall}>{getPercent(globalStats.complaints.open, globalStats.complaints.total)}%</Text>
            </View>
            <View style={styles.statItemSmall}>
              <Text style={styles.statValueSmall}>{globalStats.complaints.inProgress}</Text>
              <Text style={styles.statLabelSmall}>In Progress</Text>
              <Text style={styles.statPercentSmall}>{getPercent(globalStats.complaints.inProgress, globalStats.complaints.total)}%</Text>
            </View>
            <View style={styles.statItemSmall}>
              <Text style={styles.statValueSmall}>{globalStats.complaints.replied}</Text>
              <Text style={styles.statLabelSmall}>Replied</Text>
              <Text style={styles.statPercentSmall}>{getPercent(globalStats.complaints.replied, globalStats.complaints.total)}%</Text>
            </View>
            <View style={styles.statItemSmall}>
              <Text style={styles.statValueSmall}>{globalStats.complaints.closed}</Text>
              <Text style={styles.statLabelSmall}>Closed</Text>
              <Text style={styles.statPercentSmall}>{getPercent(globalStats.complaints.closed, globalStats.complaints.total)}%</Text>
            </View>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, styles.openProgress, { width: `${getPercent(globalStats.complaints.open, globalStats.complaints.total)}%` }]} />
            <View style={[styles.progressSegment, styles.inProgressProgress, { width: `${getPercent(globalStats.complaints.inProgress, globalStats.complaints.total)}%` }]} />
            <View style={[styles.progressSegment, styles.repliedProgress, { width: `${getPercent(globalStats.complaints.replied, globalStats.complaints.total)}%` }]} />
            <View style={[styles.progressSegment, styles.closedProgress, { width: `${getPercent(globalStats.complaints.closed, globalStats.complaints.total)}%` }]} />
          </View>
        </View>

        {/* Global Feedback */}
        <View style={styles.cardFull}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>⭐ Global Feedback Overview</Text>
            <Text style={styles.cardTotal}>{globalStats.feedback.total} Reviews</Text>
          </View>
          <View style={styles.statsGrid2}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{globalStats.feedback.avgCourse}</Text>
              <Text style={styles.statLabel}>Avg Course Rating</Text>
              <Text style={styles.statMax}>/10</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{globalStats.feedback.avgInstructor}</Text>
              <Text style={styles.statLabel}>Avg Instructor Rating</Text>
              <Text style={styles.statMax}>/10</Text>
            </View>
          </View>
          <SimplePieChart distribution={globalStats.feedback.distribution} total={globalStats.feedback.total} />
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={loadAllData}>
          <Text style={styles.refreshButtonText}>⟳ Refresh Data</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal for selectors */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'course' ? 'Select a Course' : 'Select an Instructor'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>
            
            <FlatList
              data={modalType === 'course' ? courses : instructors}
              keyExtractor={(item, index) => (modalType === 'course' ? item.id : index.toString())}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    if (modalType === 'course') {
                      selectCourse(item.id);
                    } else {
                      selectInstructor(item);
                    }
                  }}
                >
                  <Text style={styles.modalItemText}>
                    {modalType === 'course' ? item.courseName : item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f5ff' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },

  header: { 
    paddingTop: 50, 
    paddingBottom: 25, 
    paddingHorizontal: 20, 
    borderBottomLeftRadius: 30, 
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardFull: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1e1b4b', marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' },
  cardTotal: { fontSize: 12, color: '#94a3b8', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontWeight: '500' },
  
  picker: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerText: { color: '#1e1b4b', fontSize: 14 },
  
  detailContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 },
  detailName: { fontSize: 14, color: '#7c3aed', fontWeight: '600' },
  detailTotal: { fontSize: 11, color: '#94a3b8' },
  detailGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  detailItem: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 12, alignItems: 'center' },
  detailValue: { fontSize: 24, fontWeight: 'bold', color: '#1e1b4b' },
  detailLabel: { fontSize: 10, color: '#64748b', marginTop: 4, textAlign: 'center' },
  detailMax: { fontSize: 9, color: '#cbd5e1' },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  statsGrid2: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statsGrid4: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  statItem: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 12, padding: 14, alignItems: 'center' },
  statItemSmall: { flex: 1, minWidth: '47%', backgroundColor: '#f8fafc', borderRadius: 12, padding: 10, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: 'bold', color: '#1e1b4b' },
  statValueSmall: { fontSize: 20, fontWeight: 'bold', color: '#1e1b4b' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },
  statLabelSmall: { fontSize: 10, color: '#64748b', marginTop: 2 },
  statPercent: { fontSize: 11, color: '#7c3aed', marginTop: 6, fontWeight: '600' },
  statPercentSmall: { fontSize: 10, color: '#7c3aed', marginTop: 3, fontWeight: '600' },
  statMax: { fontSize: 9, color: '#cbd5e1', marginTop: 2 },
  
  progressBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressSegment: { height: '100%' },
  studentsProgress: { backgroundColor: '#10b981' },
  adminsProgress: { backgroundColor: '#3b82f6' },
  blockedProgress: { backgroundColor: '#ef4444' },
  openProgress: { backgroundColor: '#f59e0b' },
  inProgressProgress: { backgroundColor: '#3b82f6' },
  repliedProgress: { backgroundColor: '#10b981' },
  closedProgress: { backgroundColor: '#6b7280' },
  
  simplePieContainer: { width: '100%', marginTop: 12 },
  simplePieBars: { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  bar: { height: '100%' },
  excellentBar: { backgroundColor: '#10b981' },
  goodBar: { backgroundColor: '#3b82f6' },
  averageBar: { backgroundColor: '#f59e0b' },
  poorBar: { backgroundColor: '#ef4444' },
  simplePieLegend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 8 },
  legendText: { fontSize: 11, color: '#64748b' },
  
  piePlaceholder: { textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 },
  emptyText: { textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 13 },
  
  refreshButton: { backgroundColor: '#7c3aed', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  refreshButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalClose: { padding: 8 },
  modalCloseText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  modalItem: { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  modalItemText: { fontSize: 15, color: '#1e1b4b' },
});