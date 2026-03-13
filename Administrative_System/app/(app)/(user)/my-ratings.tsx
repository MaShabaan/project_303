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
} from 'react-native';
import { db, COLLECTIONS } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

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
  createdAt: Timestamp | { toDate: () => Date };
}

function formatDate(t: FeedbackDoc['createdAt']): string {
  if (!t) return '—';
  const date = typeof (t as Timestamp).toDate === 'function'
    ? (t as Timestamp).toDate()
    : new Date();
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

function getRatingColor(r: number | string) {
  if (typeof r !== 'number') return { color: '#94a3b8', bg: '#f8f7ff', border: '#ede9fe' };
  if (r <= 4) return { color: '#ef4444', bg: '#fef2f2', border: '#fecaca' };
  if (r <= 6) return { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' };
  return { color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' };
}

export default function MyRatingsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    loadRatings();
  }, [user?.uid]);

  useEffect(() => {
    if (!loading) {
      Animated.spring(fadeAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
        delay: 100,
      }).start();
    }
  }, [loading]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRatings();
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
    ? (items.reduce((s, i) => s + (i.courseRating ?? i.rating ?? 0), 0) / items.length).toFixed(1)
    : '—';
  const avgInstructor = items.length
    ? (items.reduce((s, i) => s + (i.instructorRating ?? i.rating ?? 0), 0) / items.length).toFixed(1)
    : '—';

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#7c3aed']}
            tintColor="#7c3aed"
          />
        }
        ListHeaderComponent={
          <Animated.View style={{
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                <Text style={styles.backText}>← Back</Text>
              </TouchableOpacity>
              <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>My Ratings</Text>
                <Text style={styles.headerSub}>{items.length} course{items.length !== 1 ? 's' : ''} rated</Text>
              </View>
              <View style={{ width: 60 }} />
            </View>

            {/* Stats */}
            {items.length > 0 && (
              <View style={styles.statsRow}>
                <View style={styles.statCard}>
                  <View style={[styles.statAccent, { backgroundColor: '#7c3aed' }]} />
                  <Text style={styles.statNum}>{items.length}</Text>
                  <Text style={styles.statLabel}>TOTAL RATED</Text>
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

            {items.length > 0 && (
              <Text style={styles.listLabel}>ALL RATINGS</Text>
            )}
          </Animated.View>
        }
        ListEmptyComponent={
          <Animated.View style={[styles.empty, {
            opacity: fadeAnim,
            transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }]}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>No ratings yet</Text>
            <Text style={styles.emptyText}>You haven't rated any courses yet.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('./rate-courses')}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyBtnText}>Rate a Course</Text>
            </TouchableOpacity>
          </Animated.View>
        }
        renderItem={({ item, index }) => {
          const courseR = item.courseRating ?? item.rating ?? '—';
          const instrR = item.instructorRating ?? item.rating ?? '—';
          const courseColors = getRatingColor(courseR);
          const instrColors = getRatingColor(instrR);

          return (
            <Animated.View style={{
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            }}>
              <View style={styles.card}>
                {/* Course Info */}
                <View style={styles.cardHeader}>
                  <View style={styles.courseAvatar}>
                    <Text style={styles.courseAvatarText}>
                      {item.courseName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName} numberOfLines={1}>{item.courseName}</Text>
                    <Text style={styles.instructor}>{item.instructor}</Text>
                  </View>
                  <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
                </View>

                {/* Ratings */}
                <View style={styles.ratingsRow}>
                  <View style={[styles.ratingBadge, { backgroundColor: courseColors.bg, borderColor: courseColors.border }]}>
                    <Text style={styles.ratingBadgeLabel}>Course</Text>
                    <Text style={[styles.ratingBadgeNum, { color: courseColors.color }]}>{courseR}/10</Text>
                  </View>
                  <View style={[styles.ratingBadge, { backgroundColor: instrColors.bg, borderColor: instrColors.border }]}>
                    <Text style={styles.ratingBadgeLabel}>Instructor</Text>
                    <Text style={[styles.ratingBadgeNum, { color: instrColors.color }]}>{instrR}/10</Text>
                  </View>
                  <View style={styles.avgBadge}>
                    <Text style={styles.ratingBadgeLabel}>Average</Text>
                    <Text style={styles.avgNum}>
                      {typeof courseR === 'number' && typeof instrR === 'number'
                        ? ((courseR + instrR) / 2).toFixed(1)
                        : '—'}
                    </Text>
                  </View>
                </View>

                {/* Comments */}
                {item.comments ? (
                  <View style={styles.commentsBox}>
                    <Text style={styles.commentsText}>"{item.comments}"</Text>
                  </View>
                ) : null}
              </View>
            </Animated.View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f5ff',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b' },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 14,
    backgroundColor: '#fff', position: 'relative', overflow: 'hidden',
    borderWidth: 1, borderColor: '#ede9fe',
  },
  statAccent: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 4,
  },
  statNum: { fontSize: 22, fontWeight: '800', color: '#1e1b4b', marginLeft: 8 },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.8, marginTop: 3, marginLeft: 8 },

  listLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 1.2, marginBottom: 12,
  },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#ede9fe',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12,
  },
  courseAvatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  courseAvatarText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  courseInfo: { flex: 1 },
  courseName: { fontSize: 14, fontWeight: '700', color: '#1e1b4b' },
  instructor: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  dateText: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  // Ratings
  ratingsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  ratingBadge: {
    flex: 1, borderRadius: 12, padding: 10,
    alignItems: 'center', borderWidth: 1.5,
  },
  ratingBadgeLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 3 },
  ratingBadgeNum: { fontSize: 15, fontWeight: '800' },
  avgBadge: {
    flex: 1, borderRadius: 12, padding: 10,
    alignItems: 'center', backgroundColor: '#f5f3ff', borderWidth: 1.5, borderColor: '#ede9fe',
  },
  avgNum: { fontSize: 15, fontWeight: '800', color: '#7c3aed' },

  // Comments
  commentsBox: {
    backgroundColor: '#fafafa', borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: '#f1f5f9',
  },
  commentsText: { fontSize: 12, color: '#64748b', fontStyle: 'italic', lineHeight: 18 },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginBottom: 24 },
  emptyBtn: {
    backgroundColor: '#7c3aed', borderRadius: 14,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
