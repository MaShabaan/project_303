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
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, doc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db, promoteToAdmin, demoteFromAdmin, blockUser, unblockUser, autoUnblockExpiredUsers } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';

interface User {
  id: string;
  email: string;
  displayName?: string | null;
  role: 'admin' | 'user' | 'super_admin';
  isApproved?: boolean;
  academicCode?: string;
  division?: string;
  semester?: number;
  isBlocked?: boolean;
  blockDetails?: {
    reason: string;
    duration: string;
    blockedBy: string;
    blockedByRole: string;
    blockedAt: Timestamp;
    expiresAt: Timestamp | null;
  };
  createdAt: any;
}

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

export default function UsersScreen() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'admins' | 'users'>('all');
  const [showBlockedOnly, setShowBlockedOnly] = useState(false);
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [blockDuration, setBlockDuration] = useState<'2days' | '1week' | '1month' | 'permanent'>('permanent');

  const isSuperAdmin = SUPER_ADMINS.includes(profile?.email || '');
  const isAdmin = profile?.role === 'admin';

  useEffect(() => { 
    loadUsers();
    autoUnblockExpiredUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as User[];
      setUsers(list.filter(u => !SUPER_ADMINS.includes(u.email)));
    } catch (error) {
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (user: User) => {
    if (!isSuperAdmin) {
      Alert.alert('Permission Denied', 'Only super admins can promote users');
      return;
    }
    Alert.alert('Promote to Admin', `Promote ${user.displayName || user.email} to Admin?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Promote',
        onPress: () => {
          promoteToAdmin(user.id)
            .then(() => { loadUsers(); Alert.alert('Done ✅', 'User promoted to Admin.'); })
            .catch(() => Alert.alert('Error', 'Failed to promote.'));
        },
      },
    ]);
  };

  const handleDemote = (user: User) => {
    if (!isSuperAdmin) {
      Alert.alert('Permission Denied', 'Only super admins can demote users');
      return;
    }
    Alert.alert('Remove Admin Role', `Remove admin role from ${user.displayName || user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          demoteFromAdmin(user.id)
            .then(() => { loadUsers(); Alert.alert('Done ✅', 'Admin role removed.'); })
            .catch(() => Alert.alert('Error', 'Failed to demote.'));
        },
      },
    ]);
  };

  const handleDelete = (user: User) => {
    if (!isSuperAdmin) {
      Alert.alert('Permission Denied', 'Only super admins can delete users.');
      return;
    }

    Alert.alert('Delete User', `Delete ${user.displayName || user.email}?\n\nThis cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'users', user.id));
            await loadUsers();
            Alert.alert('Deleted ✅', 'User deleted.');
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete.');
          }
        },
      },
    ]);
  };

  const openBlockModal = (user: User) => {
    if (!isSuperAdmin) {
      Alert.alert('Permission Denied', 'Only super admins can block users');
      return;
    }
    if (SUPER_ADMINS.includes(user.email)) {
      Alert.alert('Cannot Block', 'Super admin cannot be blocked');
      return;
    }
    setSelectedUser(user);
    setBlockReason('');
    setBlockDuration('permanent');
    setBlockModalVisible(true);
  };

  const confirmBlock = async () => {
    if (!blockReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for blocking');
      return;
    }
    if (!selectedUser) return;
    
    try {
      await blockUser(selectedUser.id, blockReason, blockDuration, profile!);
      await autoUnblockExpiredUsers();
      await loadUsers();
      setBlockModalVisible(false);
      Alert.alert('Success', 'User blocked successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleUnblock = async (user: User) => {
    if (!isSuperAdmin) {
      Alert.alert('Permission Denied', 'Only super admins can unblock users');
      return;
    }

    Alert.alert('Unblock User', `Unblock ${user.displayName || user.email}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          try {
            await unblockUser(user.id, profile!);
            await autoUnblockExpiredUsers();
            await loadUsers();
            Alert.alert('Success', 'User unblocked');
          } catch (error: any) {
            Alert.alert('Error', error.message);
          }
        },
      },
    ]);
  };

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case '2days': return '2 days';
      case '1week': return '1 week';
      case '1month': return '1 month';
      case 'permanent': return 'Permanent';
      default: return duration;
    }
  };

  const getRemainingTime = (expiresAt: Timestamp | null) => {
    if (!expiresAt) return 'Never';
    const now = new Date();
    const expiry = expiresAt.toDate();
    if (expiry < now) return 'Expired';
    const diff = expiry.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 0) return `${days} days left`;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours} hours left`;
    return 'Less than an hour';
  };

  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (u.academicCode || '').includes(searchTerm);
    
    if (showBlockedOnly) {
      return matchSearch && u.isBlocked === true;
    }
    
    if (filter === 'admins') return matchSearch && u.role === 'admin' && !u.isBlocked;
    if (filter === 'users') return matchSearch && u.role === 'user' && !u.isBlocked;
    return matchSearch && !u.isBlocked;
  });

  const renderUser = ({ item }: { item: User }) => (
    <View style={[styles.card, item.isBlocked && styles.blockedCard]}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.displayName || item.email).charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.displayName || 'No Name'}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.academicCode && (
            <Text style={styles.userMeta}>Code: {item.academicCode}</Text>
          )}
          {item.division && (
            <Text style={styles.userMeta}>
              {item.division === 'computer_science' ? '💻 CS' : '📐 Special Math'}
              {item.semester ? ` · Semester ${item.semester}` : ''}
            </Text>
          )}
          {item.isBlocked && item.blockDetails && (
            <Text style={styles.blockedInfo}>
              🔒 Blocked: {item.blockDetails.reason} ({getDurationLabel(item.blockDetails.duration)})
              {item.blockDetails.expiresAt && ` · ${getRemainingTime(item.blockDetails.expiresAt)}`}
            </Text>
          )}
        </View>
        <View style={[styles.badge, item.role === 'admin' ? styles.adminBadge : styles.userBadge]}>
          <Text style={styles.badgeText}>{item.role === 'admin' ? 'Admin' : 'User'}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {isSuperAdmin && item.role === 'user' && !item.isBlocked && (
          <TouchableOpacity style={[styles.actionBtn, styles.promoteBtn]} onPress={() => handlePromote(item)} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>⬆ Make Admin</Text>
          </TouchableOpacity>
        )}
        {isSuperAdmin && item.role === 'admin' && !item.isBlocked && (
          <TouchableOpacity style={[styles.actionBtn, styles.demoteBtn]} onPress={() => handleDemote(item)} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>⬇ Remove Admin</Text>
          </TouchableOpacity>
        )}
        {isSuperAdmin && !item.isBlocked && (
          <TouchableOpacity style={[styles.actionBtn, styles.blockBtn]} onPress={() => openBlockModal(item)} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>🔒 Block</Text>
          </TouchableOpacity>
        )}
        {isSuperAdmin && item.isBlocked && (
          <TouchableOpacity style={[styles.actionBtn, styles.unblockBtn]} onPress={() => handleUnblock(item)} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>🔓 Unblock</Text>
          </TouchableOpacity>
        )}
        {isSuperAdmin && (
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(item)} activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>🗑 Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <Text style={styles.headerSub}>{filteredUsers.length} of {users.length} users</Text>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, email or code..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBtn, !showBlockedOnly && styles.toggleBtnActive]}
          onPress={() => setShowBlockedOnly(false)}
        >
          <Text style={[styles.toggleText, !showBlockedOnly && styles.toggleTextActive]}>All Users</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, showBlockedOnly && styles.toggleBtnActive]}
          onPress={() => setShowBlockedOnly(true)}
        >
          <Text style={[styles.toggleText, showBlockedOnly && styles.toggleTextActive]}>
            🔒 Blocked ({users.filter(u => u.isBlocked).length})
          </Text>
        </TouchableOpacity>
      </View>

      {!showBlockedOnly && (
        <View style={styles.filters}>
          {(['all', 'admins', 'users'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.permInfo}>
        <Text style={styles.permInfoText}>
          {isSuperAdmin
            ? '🔑 Super Admin — can promote, demote, block, unblock & delete users'
            : '👤 View only'}
        </Text>
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        }
      />

      <Modal visible={blockModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔒 Block User</Text>
              <Text style={styles.modalSubtitle}>{selectedUser?.displayName || selectedUser?.email}</Text>
              <TouchableOpacity onPress={() => setBlockModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Reason for blocking *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter reason..."
                placeholderTextColor="#94a3b8"
                value={blockReason}
                onChangeText={setBlockReason}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Block duration</Text>
              <View style={styles.durationOptions}>
                <TouchableOpacity
                  style={[styles.durationOption, blockDuration === '2days' && styles.durationOptionActive]}
                  onPress={() => setBlockDuration('2days')}
                >
                  <Text style={[styles.durationText, blockDuration === '2days' && styles.durationTextActive]}>2 days</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.durationOption, blockDuration === '1week' && styles.durationOptionActive]}
                  onPress={() => setBlockDuration('1week')}
                >
                  <Text style={[styles.durationText, blockDuration === '1week' && styles.durationTextActive]}>1 week</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.durationOption, blockDuration === '1month' && styles.durationOptionActive]}
                  onPress={() => setBlockDuration('1month')}
                >
                  <Text style={[styles.durationText, blockDuration === '1month' && styles.durationTextActive]}>1 month</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.durationOption, blockDuration === 'permanent' && styles.durationOptionActive]}
                  onPress={() => setBlockDuration('permanent')}
                >
                  <Text style={[styles.durationText, blockDuration === 'permanent' && styles.durationTextActive]}>Permanent</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setBlockModalVisible(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={confirmBlock}>
                  <Text style={styles.modalSubmitText}>Block User</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { paddingTop: 50, paddingBottom: 25, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  headerSub: { fontSize: 13, color: '#a5b4fc' },

  searchWrap: { backgroundColor: '#fff', padding: 12, borderBottomWidth: 1, borderBottomColor: '#ede9fe' },
  searchInput: { backgroundColor: '#f8f7ff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#1e1b4b', borderWidth: 1.5, borderColor: '#ede9fe' },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, gap: 10 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#f1f5f9' },
  toggleBtnActive: { backgroundColor: '#7c3aed' },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  toggleTextActive: { color: '#fff' },

  filters: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#ede9fe' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe' },
  filterChipActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  filterTextActive: { color: '#fff' },

  permInfo: { backgroundColor: '#ede9fe', paddingHorizontal: 16, paddingVertical: 8 },
  permInfoText: { fontSize: 12, color: '#6d28d9', fontWeight: '500' },

  list: { padding: 14, paddingBottom: 40 },

  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  blockedCard: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: '#1e1b4b', marginBottom: 2 },
  userEmail: { fontSize: 12, color: '#94a3b8', marginBottom: 2 },
  userMeta: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  blockedInfo: { fontSize: 11, color: '#dc2626', marginTop: 4 },

  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  adminBadge: { backgroundColor: '#ede9fe' },
  userBadge: { backgroundColor: '#f0fdf4' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#1e1b4b' },

  actions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  promoteBtn: { backgroundColor: '#4f46e5' },
  demoteBtn: { backgroundColor: '#f59e0b' },
  blockBtn: { backgroundColor: '#ef4444' },
  unblockBtn: { backgroundColor: '#10b981' },
  deleteBtn: { backgroundColor: '#dc2626' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: '#94a3b8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden' },
  modalHeader: { padding: 20, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  modalSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  modalClose: { position: 'absolute', top: 20, right: 20 },
  modalCloseText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 6, marginTop: 12 },
  input: { height: 80, borderRadius: 12, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe', paddingHorizontal: 14, fontSize: 14, textAlignVertical: 'top' },
  durationOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  durationOption: { flex: 1, minWidth: '45%', paddingVertical: 12, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  durationOptionActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  durationText: { fontWeight: '600', color: '#64748b' },
  durationTextActive: { color: '#fff' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 20 },
  modalCancel: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  modalCancelText: { fontWeight: '700', color: '#64748b' },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  modalSubmitText: { fontWeight: '700', color: '#fff' },
});