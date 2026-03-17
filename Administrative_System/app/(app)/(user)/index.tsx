import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db, COLLECTIONS } from '@/services/firebase';
import { router } from 'expo-router';

interface ActivityItem {
  icon: string;
  title: string;
  sub: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  iconBg: string;
}

interface CourseProgress {
  name: string;
  pct: number;
  color: string;
}

export default function UserDashboardScreen() {
  const { user, profile, signOut } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [complaintsCount, setComplaintsCount] = useState<number>(0);
  const [ratingsCount, setRatingsCount] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<string>('—');
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const PROGRESS_COLORS = ['#7c3aed', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#4f46e5'];

  React.useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
      delay: 100,
    }).start();
  }, []);

  useEffect(() => {
    if (user?.uid) loadStats();
  }, [user?.uid]);

  const loadStats = async () => {
    if (!user?.uid) return;
    setStatsLoading(true);
    try {
      // ── Complaints ──
      const ticketsQ = query(collection(db, COLLECTIONS.TICKETS), where('userId', '==', user.uid));
      const ticketsSnap = await getDocs(ticketsQ);
      setComplaintsCount(ticketsSnap.size);

      // ── Ratings ──
      const feedbackQ = query(collection(db, COLLECTIONS.FEEDBACK), where('userId', '==', user.uid));
      const feedbackSnap = await getDocs(feedbackQ);
      setRatingsCount(feedbackSnap.size);

      if (feedbackSnap.size > 0) {
        const ratings = feedbackSnap.docs.map(d => {
          const data = d.data();
          return ((data.courseRating ?? data.rating ?? 0) + (data.instructorRating ?? data.rating ?? 0)) / 2;
        });
        const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        setAvgRating(avg.toFixed(1));

        // ── Course Satisfaction — من التقييمات الحقيقية ──
        const courseMap: Record<string, number[]> = {};
        feedbackSnap.docs.forEach(doc => {
          const d = doc.data();
          const name = d.courseName ?? 'Unknown';
          const courseR = d.courseRating ?? d.rating ?? 0;
          const instrR = d.instructorRating ?? d.rating ?? 0;
          const avg = (courseR + instrR) / 2;
          if (!courseMap[name]) courseMap[name] = [];
          courseMap[name].push(avg);
        });

        // حول لـ percentage (avg / 10 * 100) وخد أحدث 4 مواد
        const progress: CourseProgress[] = Object.entries(courseMap)
          .map(([name, avgs], i) => ({
            name,
            pct: Math.round((avgs.reduce((a, b) => a + b, 0) / avgs.length / 10) * 100),
            color: PROGRESS_COLORS[i % PROGRESS_COLORS.length],
          }))
          .slice(0, 4);

        setCourseProgress(progress);
      }

      // ── Recent Activity ──
      const activity: ActivityItem[] = [];

      const recentTickets = ticketsSnap.docs
        .sort((a, b) => {
          const tA = (a.data().createdAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
          const tB = (b.data().createdAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
          return tB - tA;
        })
        .slice(0, 2);

      recentTickets.forEach(doc => {
        const d = doc.data();
        const status = d.status ?? 'open';
        activity.push({
          icon: '📝',
          title: d.title ?? 'Complaint',
          sub: d.type ?? '',
          badge: status === 'open' ? 'Pending' : status === 'replied' ? 'Replied' : 'Resolved',
          badgeBg: status === 'open' ? '#fef3c7' : '#d1fae5',
          badgeColor: status === 'open' ? '#d97706' : '#059669',
          iconBg: '#f5f3ff',
        });
      });

      const recentRatings = feedbackSnap.docs
        .sort((a, b) => {
          const tA = (a.data().createdAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
          const tB = (b.data().createdAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
          return tB - tA;
        })
        .slice(0, 1);

      recentRatings.forEach(doc => {
        const d = doc.data();
        activity.push({
          icon: '⭐',
          title: d.courseName ?? 'Course',
          sub: `Rated ${d.courseRating ?? d.rating ?? '—'}/10`,
          badge: 'Done',
          badgeBg: '#d1fae5',
          badgeColor: '#059669',
          iconBg: '#fffbeb',
        });
      });

      setRecentActivity(activity);
    } catch (e) {
      console.error('Error loading stats:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const stats = [
    { num: statsLoading ? '...' : String(complaintsCount), label: 'MY COMPLAINTS', change: `${complaintsCount} total`, color: '#7c3aed', bg: '#f5f3ff' },
    { num: statsLoading ? '...' : String(ratingsCount), label: 'COURSES RATED', change: `${ratingsCount} total`, color: '#f59e0b', bg: '#fffbeb' },
    { num: statsLoading ? '...' : avgRating, label: 'AVG RATING', change: 'out of 10', color: '#10b981', bg: '#f0fdf4' },
  ];

  const actions = [
    { icon: '📝', title: 'Submit Complaint', sub: 'Share your concerns', bg: '#f5f3ff', border: '#ede9fe', route: './submit-complaint' as const },
    { icon: '⭐', title: 'Rate Courses', sub: 'Evaluate courses', bg: '#fffbeb', border: '#fde68a', route: './rate-courses' as const },
    { icon: '📋', title: 'My Complaints', sub: 'Track status', bg: '#f0fdf4', border: '#bbf7d0', route: './my-complaints' as const },
    { icon: '📊', title: 'My Ratings', sub: 'View ratings', bg: '#eff6ff', border: '#bfdbfe', route: './my-ratings' as const },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
              <View>
                <Text style={styles.welcomeText}>Welcome back, {displayName} 👋</Text>
                <Text style={styles.roleText}>Regular User</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.notifBtn}>
                <Text style={styles.notifIcon}>🔔</Text>
                <View style={styles.notifDot} />
              </View>
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <View key={i} style={[styles.statCard, { backgroundColor: s.bg }]}>
                <View style={[styles.statAccent, { backgroundColor: s.color }]} />
                <Text style={styles.statNum}>{s.num}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
                <Text style={[styles.statChange, { color: s.color }]}>{s.change}</Text>
              </View>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
            <View style={styles.actionsGrid}>
              {actions.map((a, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.actionCard, { backgroundColor: a.bg, borderColor: a.border }]}
                  activeOpacity={0.8}
                  onPress={() => router.push(a.route)}
                >
                  <Text style={styles.actionIcon}>{a.icon}</Text>
                  <Text style={styles.actionTitle}>{a.title}</Text>
                  <Text style={styles.actionSub}>{a.sub}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyActivityText}>No activity yet — submit a complaint or rate a course!</Text>
              </View>
            ) : (
              <View style={styles.activityList}>
                {recentActivity.map((a, i) => (
                  <View key={i} style={styles.actItem}>
                    <View style={[styles.actIconBox, { backgroundColor: a.iconBg }]}>
                      <Text style={styles.actIconText}>{a.icon}</Text>
                    </View>
                    <View style={styles.actContent}>
                      <Text style={styles.actTitle} numberOfLines={1}>{a.title}</Text>
                      <Text style={styles.actSub}>{a.sub}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: a.badgeBg }]}>
                      <Text style={[styles.badgeText, { color: a.badgeColor }]}>{a.badge}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Course Satisfaction */}
          {courseProgress.length > 0 && (
            <View style={styles.progressSection}>
              <Text style={styles.progressTitle}>COURSE SATISFACTION</Text>
              {courseProgress.map((p, i) => (
                <View key={i} style={styles.progItem}>
                  <View style={styles.progRow}>
                    <Text style={styles.progName} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.progPct, { color: p.color }]}>{p.pct}%</Text>
                  </View>
                  <View style={styles.progBar}>
                    <View style={[styles.progFill, { width: `${p.pct}%` as any, backgroundColor: p.color }]} />
                  </View>
                </View>
              ))}
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  scrollContent: { padding: 16, paddingTop: 20, paddingBottom: 40 },

  header: { backgroundColor: '#fff', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  welcomeText: { fontSize: 14, fontWeight: '700', color: '#1e1b4b' },
  roleText: { fontSize: 12, color: '#a78bfa', fontWeight: '600', marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  notifBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#f3f0ff', borderWidth: 1, borderColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  notifIcon: { fontSize: 16 },
  notifDot: { width: 7, height: 7, backgroundColor: '#ef4444', borderRadius: 99, position: 'absolute', top: 7, right: 7, borderWidth: 1.5, borderColor: '#fff' },
  logoutBtn: { backgroundColor: '#1e1b4b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, borderRadius: 16, padding: 14, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
  statAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: 4 },
  statNum: { fontSize: 24, fontWeight: '800', color: '#1e1b4b', marginLeft: 8 },
  statLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.8, marginTop: 3, marginLeft: 8 },
  statChange: { fontSize: 10, fontWeight: '700', marginTop: 6, marginLeft: 8 },

  section: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 14 },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '47%', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1.5 },
  actionIcon: { fontSize: 26, marginBottom: 8 },
  actionTitle: { fontSize: 12, fontWeight: '700', color: '#1e1b4b', marginBottom: 2, textAlign: 'center' },
  actionSub: { fontSize: 10, color: '#94a3b8', fontWeight: '500', textAlign: 'center' },

  activityList: { gap: 8 },
  actItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fafafa', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  actIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actIconText: { fontSize: 16 },
  actContent: { flex: 1 },
  actTitle: { fontSize: 12, fontWeight: '700', color: '#1e1b4b' },
  actSub: { fontSize: 10, color: '#94a3b8', fontWeight: '500', marginTop: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },

  emptyActivity: { padding: 16, alignItems: 'center' },
  emptyActivityText: { fontSize: 12, color: '#94a3b8', textAlign: 'center', lineHeight: 18 },

  // Course Satisfaction
  progressSection: { backgroundColor: '#1e1b4b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#312e81', marginBottom: 14 },
  progressTitle: { fontSize: 11, fontWeight: '700', color: '#a5b4fc', letterSpacing: 1.2, marginBottom: 16 },
  progItem: { marginBottom: 14 },
  progRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progName: { fontSize: 12, fontWeight: '600', color: '#e2e8f0', flex: 1, marginRight: 8 },
  progPct: { fontSize: 12, fontWeight: '700' },
  progBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 99, overflow: 'hidden' },
  progFill: { height: '100%', borderRadius: 99 },
});
