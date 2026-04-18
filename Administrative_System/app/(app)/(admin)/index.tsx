// app/(app)/(admin)/dashboard.tsx

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
import { NotificationBellButton } from '@/components/NotificationBellButton';

interface ActivityItem {
  icon: string;
  title: string;
  sub: string;
  badge: string;
  badgeBg: string;
  badgeColor: string;
  iconBg: string;
}

export default function AdminDashboardScreen() {
  const { user, profile, signOut } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [usersCount, setUsersCount] = useState<number>(0);
  const [coursesCount, setCoursesCount] = useState<number>(0);
  const [complaintsCount, setComplaintsCount] = useState<number>(0);
  const [pendingComplaints, setPendingComplaints] = useState<number>(0);
  const [ratingsCount, setRatingsCount] = useState<number>(0);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);

  const isSuperAdmin = profile?.email === 'mshabaan295@gmail.com' || 
                       profile?.email === 'hoda17753@gmail.com' || 
                       profile?.email === 'Tbarckyasir@gmail.com';

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
    setStatsLoading(true);
    try {
      const usersSnap = await getDocs(collection(db, COLLECTIONS.USERS));
      setUsersCount(usersSnap.size);

      const coursesSnap = await getDocs(collection(db, COLLECTIONS.COURSES));
      setCoursesCount(coursesSnap.size);

      const ticketsSnap = await getDocs(collection(db, COLLECTIONS.TICKETS));
      setComplaintsCount(ticketsSnap.size);
      
      const pending = ticketsSnap.docs.filter(d => {
        const status = d.data().status;
        return status === 'open' || status === 'in-progress';
      }).length;
      setPendingComplaints(pending);

      const ratingsSnap = await getDocs(collection(db, COLLECTIONS.FEEDBACK));
      setRatingsCount(ratingsSnap.size);

      const activity: ActivityItem[] = [];

      const recentTickets = ticketsSnap.docs
        .sort((a, b) => {
          const tA = (a.data().createdAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
          const tB = (b.data().createdAt as Timestamp)?.toDate?.()?.getTime() ?? 0;
          return tB - tA;
        })
        .slice(0, 3);

      recentTickets.forEach(doc => {
        const d = doc.data();
        const status = d.status ?? 'open';
        activity.push({
          icon: '📝',
          title: d.title ?? 'Complaint',
          sub: `From: ${d.userEmail?.split('@')[0] || 'User'}`,
          badge: status === 'open' ? 'Pending' : status === 'replied' ? 'Replied' : 'Closed',
          badgeBg: status === 'open' ? '#fef3c7' : status === 'replied' ? '#d1fae5' : '#fee2e2',
          badgeColor: status === 'open' ? '#d97706' : status === 'replied' ? '#059669' : '#dc2626',
          iconBg: '#f5f3ff',
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

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Admin';
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const roleLabel = isSuperAdmin ? 'Super Admin' : 'Administrator';

  const stats = [
    { num: statsLoading ? '...' : String(usersCount), label: 'TOTAL USERS', change: `${usersCount} registered`, color: '#7c3aed', bg: '#f5f3ff' },
    { num: statsLoading ? '...' : String(coursesCount), label: 'COURSES', change: `${coursesCount} available`, color: '#f59e0b', bg: '#fffbeb' },
    { num: statsLoading ? '...' : String(complaintsCount), label: 'COMPLAINTS', change: `${pendingComplaints} pending`, color: '#10b981', bg: '#f0fdf4' },
    { num: statsLoading ? '...' : String(ratingsCount), label: 'RATINGS', change: `total feedback`, color: '#06b6d4', bg: '#ecfeff' },
  ];

  const actions = [
    { icon: '📋', title: 'Complaints', sub: 'View & reply', bg: '#f5f3ff', border: '#ede9fe', route: './complaints' as const },
    { icon: '👥', title: 'Manage Users', sub: 'Promote or block', bg: '#fdf4ff', border: '#f5d0fe', route: './users' as const },
    { icon: '📚', title: ' Manage Courses', sub: 'Add or edit courses', bg: '#fffbeb', border: '#fde68a', route: './courses' as const },
    { icon: '📝', title: 'Enrollments', sub: 'Assign courses', bg: '#f0fdf4', border: '#bbf7d0', route: './enrollments' as const },
    { icon: '⭐', title: 'Feedback', sub: 'View ratings', bg: '#eff6ff', border: '#bfdbfe', route: './feedback' as const },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }}>

          <View style={styles.header}>
            <View style={styles.userRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarLetter}</Text>
              </View>
              <View>
                <Text style={styles.welcomeText}>Welcome back, {displayName} 👋</Text>
                <Text style={styles.roleText}>{roleLabel}</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <NotificationBellButton href="./notifications" />
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
                <Text style={styles.logoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>

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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyActivity}>
                <Text style={styles.emptyActivityText}>No recent activity — wait for user submissions.</Text>
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

          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>💡 ADMIN TIPS</Text>
            <Text style={styles.tipsText}>
              • Reply to complaints promptly to keep users informed.
            </Text>
            <Text style={styles.tipsText}>
              • Use the Enrollments panel to assign courses to students.
            </Text>
            <Text style={styles.tipsText}>
              • Block users who violate policies.
            </Text>
          </View>

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
  logoutBtn: { backgroundColor: '#1e1b4b', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  logoutText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { flex: 1, minWidth: '47%', borderRadius: 16, padding: 14, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'transparent' },
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

  tipsSection: { backgroundColor: '#1e1b4b', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#312e81', marginBottom: 14 },
  tipsTitle: { fontSize: 11, fontWeight: '700', color: '#a5b4fc', letterSpacing: 1.2, marginBottom: 12 },
  tipsText: { fontSize: 12, color: '#cbd5e1', marginBottom: 8, lineHeight: 18 },
});