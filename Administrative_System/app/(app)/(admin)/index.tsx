import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { router } from 'expo-router';

export default function AdminDashboardScreen() {
  const { user, profile, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/login');
  };

  const displayName = profile?.displayName || user?.email?.split('@')[0] || 'Admin';

  const cards = [
    { icon: '📋', title: 'Manage Complaints', subtitle: 'View and resolve user complaints' },
    { icon: '📚', title: 'Manage Courses', subtitle: 'Add, edit, and manage courses' },
    { icon: '👥', title: 'Manage Users', subtitle: 'View and manage user accounts' },
    { icon: '📊', title: 'View Reports', subtitle: 'Activity logs and analytics' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardCard}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.title}>Welcome Mr. {displayName}!</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>ADMIN</Text>
            </View>
          </View>

          <View style={styles.cardsGrid}>
            {cards.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.card}
                activeOpacity={0.8}
              >
                <Text style={styles.cardIcon}>{item.icon}</Text>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userInfoText}>
              <Text style={styles.bold}>Email:</Text> {user?.email ?? '—'}
            </Text>
            <Text style={styles.userInfoText}>
              <Text style={styles.bold}>Account Type:</Text> Administrator
            </Text>
          </View>

          <View style={styles.logoutWrapper}>
            <Button
              title="LOGOUT"
              onPress={handleLogout}
              style={styles.logoutButton}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  dashboardCard: {
    width: '100%',
    maxWidth: 800,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.2,
    shadowRadius: 35,
    elevation: 10,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: '#764ba2',
    paddingVertical: 5,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 10,
  },
  roleText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
    marginBottom: 30,
    justifyContent: 'space-between',
  },
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  userInfo: {
    backgroundColor: '#f0f4ff',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
  },
  userInfoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '600',
  },
  logoutWrapper: {
    marginTop: 20,
    alignSelf: 'center',
    width: 200,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    height: 50,
    borderRadius: 12,
  },
});
