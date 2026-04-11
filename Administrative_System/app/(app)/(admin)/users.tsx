import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { collection, query, getDocs, where, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { notifyAccountBanned, notifyAccountUnbanned } from '@/services/notifications';

interface User {
  id: string;
  email: string;
  displayName?: string | null;
  role: 'admin' | 'user';
  isApproved?: boolean;
  isBanned?: boolean;
  createdAt: any;
}

export default function UsersScreen() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'admins' | 'users' | 'pending'>('all');

  const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com'];
  const isSuperAdmin = SUPER_ADMINS.includes(profile?.email || '');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      const usersList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersList);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Approve Admin',
      `Approve ${userEmail} as admin?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'users', userId), {
                isApproved: true
              });
              Alert.alert('Success', 'Admin approved');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to approve');
            }
          }
        }
      ]
    );
  };

  const handleBanUser = async (userId: string, userEmail: string) => {
    Alert.alert('Suspend account', `Suspend ${userEmail}? They will be signed out and blocked from the app.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Suspend',
        style: 'destructive',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'users', userId), { isBanned: true, updatedAt: Timestamp.now() });
            await notifyAccountBanned(userId);
            Alert.alert('Done', 'Account suspended.');
            loadUsers();
          } catch (error) {
            Alert.alert('Error', 'Failed to update user');
          }
        },
      },
    ]);
  };

  const handleUnbanUser = async (userId: string, userEmail: string) => {
    Alert.alert('Reinstate account', `Allow ${userEmail} to use the app again?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reinstate',
        onPress: async () => {
          try {
            await updateDoc(doc(db, 'users', userId), { isBanned: false, updatedAt: Timestamp.now() });
            await notifyAccountUnbanned(userId);
            Alert.alert('Done', 'Account reinstated.');
            loadUsers();
          } catch (error) {
            Alert.alert('Error', 'Failed to update user');
          }
        },
      },
    ]);
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userEmail}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'users', userId));
              Alert.alert('Success', 'User deleted');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const filteredUsers = users.filter(user => {
    // Search filter
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Role filter
    if (filter === 'admins') return matchesSearch && user.role === 'admin';
    if (filter === 'users') return matchesSearch && user.role === 'user';
    if (filter === 'pending') return matchesSearch && user.role === 'admin' && user.isApproved === false;
    
    return matchesSearch;
  });

  const getRoleBadge = (user: User) => {
    if (user.role === 'admin') {
      if (user.isApproved === false) {
        return <View style={[styles.badge, styles.pendingBadge]}>
          <Text style={styles.badgeText}>Pending</Text>
        </View>;
      }
      return <View style={[styles.badge, styles.adminBadge]}>
        <Text style={styles.badgeText}>Admin</Text>
      </View>;
    }
    return <View style={[styles.badge, styles.userBadge]}>
      <Text style={styles.badgeText}>User</Text>
    </View>;
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {item.displayName ? item.displayName.charAt(0).toUpperCase() : item.email.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.displayName || 'No Name'}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
          </View>
        </View>
        {getRoleBadge(item)}
      </View>

      <View style={styles.userFooter}>
        {item.role === 'admin' && item.isApproved === false && isSuperAdmin && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item.id, item.email)}
          >
            <IconSymbol size={18} name="checkmark" color="#fff" />
            <Text style={styles.actionText}>Approve</Text>
          </TouchableOpacity>
        )}

        {item.role === 'user' && (
          item.isBanned ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleUnbanUser(item.id, item.email)}
            >
              <Text style={styles.actionText}>Reinstate</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.warnButton]}
              onPress={() => handleBanUser(item.id, item.email)}
            >
              <Text style={styles.actionText}>Suspend</Text>
            </TouchableOpacity>
          )
        )}
        
        {isSuperAdmin && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteUser(item.id, item.email)}
          >
            <IconSymbol size={18} name="trash" color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#764ba2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Users</Text>
        <Text style={styles.subtitle}>Total Users: {users.length}</Text>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <IconSymbol size={20} name="magnifyingglass" color="#666" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'admins' && styles.filterChipActive]}
          onPress={() => setFilter('admins')}
        >
          <Text style={[styles.filterText, filter === 'admins' && styles.filterTextActive]}>Admins</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterChip, filter === 'users' && styles.filterChipActive]}
          onPress={() => setFilter('users')}
        >
          <Text style={[styles.filterText, filter === 'users' && styles.filterTextActive]}>Users</Text>
        </TouchableOpacity>
        {isSuperAdmin && (
          <TouchableOpacity 
            style={[styles.filterChip, filter === 'pending' && styles.filterChipActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>Pending</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#764ba2',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.9,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 15,
    backgroundColor: '#fff',
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: {
    backgroundColor: '#764ba2',
  },
  filterText: {
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
  },
  list: {
    padding: 15,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#764ba2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  adminBadge: {
    backgroundColor: '#764ba2',
  },
  userBadge: {
    backgroundColor: '#28a745',
  },
  pendingBadge: {
    backgroundColor: '#ffc107',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  userFooter: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: '#28a745',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  warnButton: {
    backgroundColor: '#d97706',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});