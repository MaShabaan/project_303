import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Animated,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { db, COLLECTIONS, updateCourseRating, deleteCourseRating } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface FeedbackDoc {
  id: string;
  userId: string;
  userEmail: string;
  courseName: string;
  instructor: string;
  courseRating?: number;
  instructorRating?: number;
  rating?: number;
  comments: string;
  division?: string | null;
  year?: number | null;
  term?: number | null;
  createdAt: Timestamp | { toDate: () => Date };
}

function formatDate(t: FeedbackDoc['createdAt']): string {
  if (!t) return '—';
  const date = typeof (t as Timestamp).toDate === 'function'
    ? (t as Timestamp).toDate() : new Date();
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getRatingColor(r: number | string) {
  if (typeof r !== 'number') return { color: '#94a3b8', bg: '#f8f7ff', border: '#ede9fe' };
  if (r <= 4) return { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
  if (r <= 6) return { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
  return { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' };
}

function getDivisionInfo(division?: string | null) {
  if (division === 'computer_science') return { label: 'Computer Science', icon: '💻' };
  if (division === 'special_mathematics') return { label: 'Special Mathematics', icon: '📐' };
  return null;
}

const NPS_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const getNpsColor = (n: number) => {
  if (n <= 3) return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', activeBg: '#ef4444' };
  if (n <= 6) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', activeBg: '#f59e0b' };
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', activeBg: '#10b981' };
};

const AVATAR_COLORS = ['#7c3aed', '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

export default function MyRatingsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<FeedbackDoc | null>(null);
  const [editInstructor, setEditInstructor] = useState('');
  const [editCourseRating, setEditCourseRating] = useState<number | null>(null);
  const [editInstructorRating, setEditInstructorRating] = useState<number | null>(null);
  const [editComments, setEditComments] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const loadRatings = async () => {
    if (!user?.uid) return;
    try {
      const ref = collection(db, COLLECTIONS.FEEDBACK);
      const q = query(ref, where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as FeedbackDoc[];
      list.sort((a, b) => {
        const tA = typeof (a.createdAt as Timestamp).toDate === 'function'
          ? (a.createdAt as Timestamp).toDate().getTime() : 0;
        const tB = typeof (b.createdAt as Timestamp).toDate === 'function'
          ? (b.createdAt as Timestamp).toDate().getTime() : 0;
        return tB - tA;
      });
      setItems(list);
    } catch (error) {
      console.error('Error loading my ratings:', error);
      Alert.alert('Error', 'Failed to load your ratings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadRatings(); }, [user?.uid]);

  useEffect(() => {
    if (!loading) {
      Animated.spring(fadeAnim, {
        toValue: 1, useNativeDriver: true, tension: 60, friction: 8, delay: 100,
      }).start();
    }
  }, [loading]);

  const onRefresh = () => { setRefreshing(true); loadRatings(); };

  const openEdit = (item: FeedbackDoc) => {
    setEditingItem(item);
    setEditInstructor(item.instructor);
    setEditCourseRating(item.courseRating ?? item.rating ?? null);
    setEditInstructorRating(item.instructorRating ?? item.rating ?? null);
    setEditComments(item.comments ?? '');
    setEditModalVisible(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    if (!editInstructor.trim()) { Alert.alert('Required', 'Please enter instructor name.'); return; }
    if (editCourseRating === null) { Alert.alert('Required', 'Please select a course rating.'); return; }
    if (editInstructorRating === null) { Alert.alert('Required', 'Please select an instructor rating.'); return; }
    setEditLoading(true);
    try {
      await updateCourseRating(editingItem.id, {
        instructor: editInstructor.trim(),
        courseRating: editCourseRating,
        instructorRating: editInstructorRating,
        comments: editComments,
      });
      setEditModalVisible(false);
      await loadRatings();
      Alert.alert('Updated! ✅', 'Your rating has been updated successfully.');
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to update. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (item: FeedbackDoc) => {
    Alert.alert(
      'Delete Rating',
      `Delete your rating for "${item.courseName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setDeleteLoading(item.id);
            deleteCourseRating(item.id)
              .then(() => loadRatings())
              .then(() => { Alert.alert('Deleted ✅', 'Rating deleted successfully.'); })
              .catch((e) => { console.error(e); Alert.alert('Error', 'Failed to delete.'); })
              .finally(() => { setDeleteLoading(null); });
          },
        },
      ],
      { cancelable: true }
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading your ratings...</Text>
      </View>
    );
  }

  const avgCourse = items.length
    ? (items.reduce((s, i) => s + (i.courseRating ?? i.rating ?? 0), 0) / items.length).toFixed(1) : '—';
  const avgInstructor = items.length
    ? (items.reduce((s, i) => s + (i.instructorRating ?? i.rating ?? 0), 0) / items.length).toFixed(1) : '—';

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>⭐ My Ratings</Text>
          <Text style={styles.headerSubtitle}>{items.length} course{items.length !== 1 ? 's' : ''} rated</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} tintColor="#7c3aed" />
        }
        ListHeaderComponent={
          <Animated.View style={{ opacity: fadeAnim }}>
            {items.length > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statAccent, { backgroundColor: '#7c3aed' }]} />
                  <Text style={styles.statNum}>{items.length}</Text>
                  <Text style={styles.statLabel}>TOTAL</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statAccent, { backgroundColor: '#f59e0b' }]} />
                  <Text style={styles.statNum}>{avgCourse}</Text>
                  <Text style={styles.statLabel}>AVG COURSE</Text>
                </View>
                <View style={styles.statCard}>
                  <View style={[styles.statAccent, { backgroundColor: '#10b981' }]} />
                  <Text style={styles.statNum}>{avgInstructor}</Text>
                  <Text style={styles.statLabel}>AVG INSTRUCTOR</Text>
                </View>
              </View>
            )}
            {items.length > 0 && <Text style={styles.listLabel}>ALL RATINGS</Text>}
          </Animated.View>
        }
        ListEmptyComponent={
          <Animated.View style={[styles.empty, { opacity: fadeAnim }]}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>No ratings yet</Text>
            <Text style={styles.emptyText}>You haven't rated any courses yet.</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('./rate-courses')} activeOpacity={0.85}>
              <Text style={styles.emptyBtnText}>Rate a Course</Text>
            </TouchableOpacity>
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const courseR = item.courseRating ?? item.rating ?? '—';
          const instrR = item.instructorRating ?? item.rating ?? '—';
          const courseColors = getRatingColor(courseR);
          const instrColors = getRatingColor(instrR);
          const divInfo = getDivisionInfo(item.division);
          const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
          const hasTags = divInfo || item.year || item.term;
          const isDeleting = deleteLoading === item.id;

          return (
            <Animated.View style={{ opacity: fadeAnim }}>
              <View style={[styles.card, isDeleting && { opacity: 0.5 }]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.courseAvatar, { backgroundColor: avatarColor }]}>
                    <Text style={styles.courseAvatarText}>{item.courseName.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName} numberOfLines={1}>{item.courseName}</Text>
                    <Text style={styles.instructor}>{item.instructor}</Text>
                  </View>
                  <View style={styles.cardActions}>
                    <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                    <View style={styles.actionBtns}>
                      <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)} activeOpacity={0.8} disabled={isDeleting}>
                        <Text style={styles.editBtnText}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.8} disabled={isDeleting}>
                        <Text style={styles.deleteBtnText}>{isDeleting ? '...' : '🗑️'}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                {hasTags && (
                  <View style={styles.tagsRow}>
                    {divInfo && <View style={styles.tagDiv}><Text style={styles.tagDivText}>{divInfo.icon} {divInfo.label}</Text></View>}
                    {item.year && <View style={styles.tagYear}><Text style={styles.tagYearText}>Year {item.year}</Text></View>}
                    {item.term && <View style={styles.tagTerm}><Text style={styles.tagTermText}>Term {item.term}</Text></View>}
                  </View>
                )}

                <View style={styles.ratingsRow}>
                  <View style={[styles.ratingBadge, { backgroundColor: courseColors.bg, borderColor: courseColors.border }]}>
                    <Text style={styles.ratingBadgeLabel}>COURSE</Text>
                    <Text style={[styles.ratingBadgeNum, { color: courseColors.color }]}>{courseR}/10</Text>
                  </View>
                  <View style={[styles.ratingBadge, { backgroundColor: instrColors.bg, borderColor: instrColors.border }]}>
                    <Text style={styles.ratingBadgeLabel}>INSTRUCTOR</Text>
                    <Text style={[styles.ratingBadgeNum, { color: instrColors.color }]}>{instrR}/10</Text>
                  </View>
                  <View style={styles.avgBadge}>
                    <Text style={styles.ratingBadgeLabel}>AVERAGE</Text>
                    <Text style={styles.avgNum}>
                      {typeof courseR === 'number' && typeof instrR === 'number'
                        ? ((courseR + instrR) / 2).toFixed(1) : '—'}
                    </Text>
                  </View>
                </View>

                {item.comments ? (
                  <View style={styles.commentsBox}>
                    <Text style={styles.commentsText}>&ldquo;{item.comments}&quot;</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          );
        }}
      />

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Rating</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalCourseBanner}>
                <Text style={styles.modalCourseLabel}>COURSE</Text>
                <Text style={styles.modalCourseName}>{editingItem?.courseName}</Text>
              </View>

              <Text style={styles.modalLabel}>INSTRUCTOR</Text>
              <TextInput style={styles.modalInput} value={editInstructor} onChangeText={setEditInstructor}
                placeholder="Instructor name" placeholderTextColor="#94a3b8" autoCapitalize="words" />

              <Text style={styles.modalLabel}>COURSE RATING</Text>
              <View style={styles.npsGrid}>
                {NPS_SCALE.map(n => {
                  const c = getNpsColor(n);
                  const isSel = editCourseRating === n;
                  return (
                    <TouchableOpacity key={n} onPress={() => setEditCourseRating(n)} activeOpacity={0.8}
                      style={[styles.npsBtn, { backgroundColor: c.bg, borderColor: c.border }, isSel && { backgroundColor: c.activeBg, borderColor: c.activeBg }]}>
                      <Text style={[styles.npsBtnText, { color: c.text }, isSel && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.npsLabels}>
                <Text style={styles.npsLabelText}>Not satisfied</Text>
                <Text style={styles.npsLabelText}>Very satisfied</Text>
              </View>

              <Text style={styles.modalLabel}>INSTRUCTOR RATING</Text>
              <View style={styles.npsGrid}>
                {NPS_SCALE.map(n => {
                  const c = getNpsColor(n);
                  const isSel = editInstructorRating === n;
                  return (
                    <TouchableOpacity key={n} onPress={() => setEditInstructorRating(n)} activeOpacity={0.8}
                      style={[styles.npsBtn, { backgroundColor: c.bg, borderColor: c.border }, isSel && { backgroundColor: c.activeBg, borderColor: c.activeBg }]}>
                      <Text style={[styles.npsBtnText, { color: c.text }, isSel && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.npsLabels}>
                <Text style={styles.npsLabelText}>Needs improvement</Text>
                <Text style={styles.npsLabelText}>Excellent</Text>
              </View>

              <Text style={styles.modalLabel}>COMMENTS</Text>
              <TextInput style={[styles.modalInput, styles.modalTextArea]} value={editComments}
                onChangeText={setEditComments} placeholder="Any additional feedback..."
                placeholderTextColor="#94a3b8" multiline numberOfLines={4} textAlignVertical="top" />

              <TouchableOpacity style={[styles.saveBtn, editLoading && styles.saveBtnDisabled]}
                onPress={handleUpdate} disabled={editLoading} activeOpacity={0.85}>
                <Text style={styles.saveBtnText}>{editLoading ? 'Saving...' : 'Save Changes ✅'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f5ff' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },

  headerGradient: {
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, backgroundColor: '#fff', position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#ede9fe' },
  statAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 4 },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1e1b4b', marginLeft: 8 },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.8, marginTop: 3, marginLeft: 8 },
  listLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 12 },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  courseAvatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  courseAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: '700', color: '#1e1b4b' },
  instructor: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  cardActions: { alignItems: 'flex-end', gap: 6 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  actionBtns: { flexDirection: 'row', gap: 6 },
  editBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  editBtnText: { fontSize: 14 },
  deleteBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', alignItems: 'center', justifyContent: 'center' },
  deleteBtnText: { fontSize: 14 },

  tagsRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  tagDiv: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#f5f3ff', borderWidth: 1, borderColor: '#ede9fe' },
  tagDivText: { fontSize: 10, fontWeight: '700', color: '#7c3aed' },
  tagYear: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe' },
  tagYearText: { fontSize: 10, fontWeight: '700', color: '#3b82f6' },
  tagTerm: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#bbf7d0' },
  tagTermText: { fontSize: 10, fontWeight: '700', color: '#10b981' },

  ratingsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ratingBadge: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', borderWidth: 1.5 },
  ratingBadgeLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 3 },
  ratingBadgeNum: { fontSize: 15, fontWeight: '800' },
  avgBadge: { flex: 1, borderRadius: 12, padding: 10, alignItems: 'center', backgroundColor: '#f5f3ff', borderWidth: 1.5, borderColor: '#ede9fe' },
  avgNum: { fontSize: 15, fontWeight: '800', color: '#7c3aed' },

  commentsBox: { backgroundColor: '#fafafa', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  commentsText: { fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 18 },

  empty: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  emptyBtn: { backgroundColor: '#7c3aed', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 12 },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1e1b4b' },
  modalCloseBtn: { width: 32, height: 32, borderRadius: 99, backgroundColor: '#f5f3ff', alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 14, color: '#7c3aed', fontWeight: '700' },
  modalCourseBanner: { backgroundColor: '#f5f3ff', borderRadius: 14, padding: 14, marginBottom: 20, borderWidth: 1, borderColor: '#ede9fe' },
  modalCourseLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  modalCourseName: { fontSize: 15, fontWeight: '700', color: '#7c3aed' },
  modalLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 10, marginTop: 16 },
  modalInput: { height: 50, borderRadius: 12, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe', paddingHorizontal: 16, fontSize: 14, color: '#1e1b4b', fontWeight: '500' },
  modalTextArea: { height: 100, paddingTop: 14 },

  npsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  npsBtn: { width: '17%', aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  npsBtnText: { fontSize: 14, fontWeight: '800' },
  npsLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  npsLabelText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },

  saveBtn: { height: 54, borderRadius: 16, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 8, shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});