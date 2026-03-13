import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';

export default function UserDashboardScreen() {
  const { user, profile, signOut } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
      delay: 100,
    }).start();
  }, []);

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'User';
  const avatarLetter = displayName.charAt(0).toUpperCase();

  const stats = [
    { num: '3', label: 'MY COMPLAINTS', change: '↑ 1 this week', color: '#7c3aed', bg: '#f5f3ff' },
    { num: '7', label: 'COURSES RATED', change: '↑ 2 this month', color: '#f59e0b', bg: '#fffbeb' },
    { num: '4.2', label: 'AVG RATING', change: '↑ 0.3 avg', color: '#10b981', bg: '#f0fdf4' },
  ];

  const actions = [
    { icon: '📝', title: 'Submit Complaint', sub: 'Share your concerns', bg: '#f5f3ff', border: '#ede9fe', route: './submit-complaint' as const },
    { icon: '⭐', title: 'Rate Courses', sub: 'Evaluate courses', bg: '#fffbeb', border: '#fde68a', route: './rate-courses' as const },
    { icon: '📋', title: 'My Complaints', sub: 'Track status', bg: '#f0fdf4', border: '#bbf7d0', route: './my-complaints' as const },
    { icon: '📊', title: 'My Ratings', sub: 'View ratings', bg: '#eff6ff', border: '#bfdbfe', route: './my-ratings' as const },
  ];

  const activity = [
    { icon: '📝', title: 'Complaint #003', sub: 'Lab equipment issue', badge: 'Pending', badgeBg: '#fef3c7', badgeColor: '#d97706', iconBg: '#f5f3ff' },
    { icon: '⭐', title: 'Data Science 101', sub: 'Rated 4.5 stars', badge: 'Done', badgeBg: '#d1fae5', badgeColor: '#059669', iconBg: '#fffbeb' },
    { icon: '📋', title: 'Complaint #002', sub: 'Schedule conflict', badge: 'Resolved', badgeBg: '#d1fae5', badgeColor: '#059669', iconBg: '#f0fdf4' },
  ];

  const progress = [
    { name: 'Math & Statistics', pct: 72, color: '#7c3aed' },
    { name: 'Computer Science', pct: 45, color: '#f59e0b' },
    { name: 'Data Science 101', pct: 88, color: '#10b981' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            }],
          }}
        >
          {/* ── Header ── */}
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

          {/* ── Stats ── */}
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

          {/* ── Quick Actions ── */}
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

          {/* ── Recent Activity ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
            <View style={styles.activityList}>
              {activity.map((a, i) => (
                <View key={i} style={styles.actItem}>
                  <View style={[styles.actIconBox, { backgroundColor: a.iconBg }]}>
                    <Text style={styles.actIconText}>{a.icon}</Text>
                  </View>
                  <View style={styles.actContent}>
                    <Text style={styles.actTitle}>{a.title}</Text>
                    <Text style={styles.actSub}>{a.sub}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: a.badgeBg }]}>
                    <Text style={[styles.badgeText, { color: a.badgeColor }]}>{a.badge}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* ── Course Satisfaction ── */}
          <View style={styles.progressSection}>
            <Text style={styles.progressTitle}>COURSE SATISFACTION</Text>
            {progress.map((p, i) => (
              <View key={i} style={styles.progItem}>
                <View style={styles.progRow}>
                  <Text style={styles.progName}>{p.name}</Text>
                  <Text style={[styles.progPct, { color: p.color }]}>{p.pct}%</Text>
                </View>
                <View style={styles.progBar}>
                  <View style={[styles.progFill, { width: `${p.pct}%` as any, backgroundColor: p.color }]} />
                </View>
              </View>
            ))}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f5ff',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  roleText: {
    fontSize: 12,
    color: '#a78bfa',
    fontWeight: '600',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f3f0ff',
    borderWidth: 1,
    borderColor: '#ede9fe',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifIcon: {
    fontSize: 16,
  },
  notifDot: {
    width: 7,
    height: 7,
    backgroundColor: '#ef4444',
    borderRadius: 99,
    position: 'absolute',
    top: 7,
    right: 7,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  logoutBtn: {
    backgroundColor: '#1e1b4b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 4,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1e1b4b',
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 3,
    marginLeft: 8,
  },
  statChange: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 6,
    marginLeft: 8,
  },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginBottom: 14,
  },

  // Actions Grid
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  actionIcon: {
    fontSize: 26,
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e1b4b',
    marginBottom: 2,
    textAlign: 'center',
  },
  actionSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    textAlign: 'center',
  },

  // Activity
  activityList: {
    gap: 8,
  },
  actItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  actIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actIconText: {
    fontSize: 16,
  },
  actContent: {
    flex: 1,
  },
  actTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e1b4b',
  },
  actSub: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Progress
  progressSection: {
    backgroundColor: '#1e1b4b',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#312e81',
    marginBottom: 14,
  },
  progressTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a5b4fc',
    letterSpacing: 1.2,
    marginBottom: 16,
  },
  progItem: {
    marginBottom: 14,
  },
  progRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  progPct: {
    fontSize: 12,
    fontWeight: '700',
  },
  progBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    borderRadius: 99,
  },
});
