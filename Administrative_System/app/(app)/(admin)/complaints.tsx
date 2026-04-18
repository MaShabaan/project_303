import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { collection, doc, updateDoc, deleteDoc, Timestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db, COLLECTIONS, replyToTicket, updateTicketStatus, getAllTickets, type Ticket } from '@/services/firebase';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const PRIORITY_COLORS = {
  urgent: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: '🔴 Urgent' },
  high: { bg: '#fffbeb', border: '#fde68a', text: '#d97706', label: '🟡 High' },
  medium: { bg: '#eff6ff', border: '#bfdbfe', text: '#2563eb', label: '🔵 Medium' },
  low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', label: '🟢 Low' },
};

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'replied', label: 'Replied' },
  { value: 'closed', label: 'Closed' },
];

export default function AdminComplaintsScreen() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<(Ticket & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<(Ticket & { id: string }) | null>(null);
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const isSuperAdmin = profile?.email === 'mshabaan295@gmail.com' || 
                       profile?.email === 'hoda17753@gmail.com' || 
                       profile?.email === 'Tbarckyasir@gmail.com';

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const allTickets = await getAllTickets();
      setTickets(allTickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
      Alert.alert('Error', 'Failed to load complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const getDisplayEmail = (ticket: (Ticket & { id: string }) | null) => {
    if (!ticket) return '';
    if (isSuperAdmin) {
      return ticket.userEmail || 'No email';
    }
    if (ticket.isAnonymous) {
      return '🔒 Anonymous';
    }
    return ticket.userEmail || 'No email';
  };

  const openReplyModal = (ticket: Ticket & { id: string }) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.adminReply || '');
    setReplyModalVisible(true);
  };

  const openEditModal = (ticket: Ticket & { id: string }) => {
    setSelectedTicket(ticket);
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditModalVisible(true);
  };

  const handleEdit = async () => {
    if (!editTitle.trim() || !editDescription.trim()) {
      Alert.alert('Error', 'Title and description are required');
      return;
    }
    if (!selectedTicket) return;

    try {
      const ticketRef = doc(db, COLLECTIONS.TICKETS, selectedTicket.id);
      await updateDoc(ticketRef, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        updatedAt: Timestamp.now(),
      });
      await loadTickets();
      setEditModalVisible(false);
      Alert.alert('Success', 'Complaint updated successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to update complaint');
    }
  };

  const handleDelete = (ticket: Ticket & { id: string }) => {
    Alert.alert(
      'Delete Complaint',
      `Are you sure you want to delete "${ticket.title}"?\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, COLLECTIONS.TICKETS, ticket.id));
              await loadTickets();
              Alert.alert('Success', 'Complaint deleted successfully');
            } catch (error) {
              console.error(error);
              Alert.alert('Error', 'Failed to delete complaint');
            }
          },
        },
      ]
    );
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      Alert.alert('Error', 'Please enter a reply');
      return;
    }
    if (!selectedTicket) return;

    setReplyLoading(true);
    try {
      await replyToTicket(selectedTicket.id, profile?.email || 'admin', replyText.trim(), 'replied');
      await loadTickets();
      setReplyModalVisible(false);
      setReplyText('');
      Alert.alert('Success', 'Reply sent successfully');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    try {
      await updateTicketStatus(ticketId, newStatus);
      await loadTickets();
      Alert.alert('Success', `Status updated to ${newStatus}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    }
  };

  const displayEmail = (ticket: Ticket & { id: string }) => {
    if (isSuperAdmin) {
      return ticket.userEmail || 'No email';
    }
    if (ticket.isAnonymous) {
      return '🔒 Anonymous';
    }
    return ticket.userEmail || 'No email';
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true;
    return ticket.status === filter;
  });

  const renderTicket = ({ item }: { item: Ticket & { id: string } }) => {
    const priorityKey = item.priority as keyof typeof PRIORITY_COLORS;
    const priorityStyle = PRIORITY_COLORS[priorityKey] || PRIORITY_COLORS.medium;
    const date = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Unknown date';

    return (
      <View style={[styles.ticketCard, { borderLeftColor: priorityStyle.text, borderLeftWidth: 4 }]}>
        <TouchableOpacity style={styles.ticketContent} onPress={() => openReplyModal(item)} activeOpacity={0.7}>
          <View style={styles.ticketHeader}>
            <View style={styles.ticketInfo}>
              <Text style={styles.ticketTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.ticketEmail}>{displayEmail(item)}</Text>
            </View>
            <View style={[styles.priorityBadge, { backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }]}>
              <Text style={[styles.priorityText, { color: priorityStyle.text }]}>{priorityStyle.label}</Text>
            </View>
          </View>

          <Text style={styles.ticketDescription} numberOfLines={2}>{item.description}</Text>

          <View style={styles.ticketFooter}>
            <Text style={styles.ticketDate}>{date}</Text>
            <View style={[styles.statusBadge, item.status === 'closed' && styles.statusClosed, item.status === 'replied' && styles.statusReplied]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </TouchableOpacity>

        {isSuperAdmin && (
          <View style={styles.adminActions}>
            <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
              <Text style={styles.editButtonText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading complaints...</Text>
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
          <Text style={styles.headerTitle}>📋 Complaints</Text>
          <Text style={styles.headerSubtitle}>{filteredTickets.length} tickets</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {STATUS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.filterChip, filter === opt.value && styles.filterChipActive]}
              onPress={() => setFilter(opt.value)}
            >
              <Text style={[styles.filterText, filter === opt.value && styles.filterTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>No complaints found</Text>
          </View>
        }
        renderItem={renderTicket}
      />

      <Modal visible={replyModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reply to Complaint</Text>
              <Text style={styles.modalSubtitle}>{getDisplayEmail(selectedTicket)}</Text>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <View style={styles.ticketDetails}>
                <Text style={styles.detailLabel}>Title</Text>
                <Text style={styles.detailValue}>{selectedTicket?.title}</Text>

                <Text style={styles.detailLabel}>Description</Text>
                <Text style={styles.detailValue}>{selectedTicket?.description}</Text>

                <Text style={styles.detailLabel}>Status</Text>
                <View style={styles.statusSelector}>
                  {STATUS_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.statusOption, selectedTicket?.status === opt.value && styles.statusOptionActive]}
                      onPress={() => {
                        if (selectedTicket) {
                          handleStatusChange(selectedTicket.id, opt.value);
                          setSelectedTicket({ ...selectedTicket, status: opt.value });
                        }
                      }}
                    >
                      <Text style={[styles.statusOptionText, selectedTicket?.status === opt.value && styles.statusOptionTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.detailLabel}>Your Reply</Text>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type your reply here..."
                  placeholderTextColor="#94a3b8"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setReplyModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sendButton} onPress={handleReply} disabled={replyLoading}>
                  <Text style={styles.sendButtonText}>{replyLoading ? 'Sending...' : 'Send Reply'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={editModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>✏️ Edit Complaint</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.detailLabel}>Title</Text>
              <TextInput
                style={styles.editInput}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="Enter title"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.detailLabel}>Description</Text>
              <TextInput
                style={[styles.editInput, styles.editTextArea]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="Enter description"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setEditModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleEdit}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
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

  filterContainer: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#ede9fe' },
  filterScroll: { flexDirection: 'row' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginRight: 8 },
  filterChipActive: { backgroundColor: '#7c3aed' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  filterTextActive: { color: '#fff' },

  listContent: { padding: 16, paddingBottom: 32 },

  ticketCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  ticketContent: { padding: 16 },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ticketInfo: { flex: 1 },
  ticketTitle: { fontSize: 16, fontWeight: '700', color: '#1e1b4b', marginBottom: 2 },
  ticketEmail: { fontSize: 12, color: '#94a3b8' },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  priorityText: { fontSize: 11, fontWeight: '700' },
  ticketDescription: { fontSize: 13, color: '#555', marginBottom: 12, lineHeight: 18 },
  ticketFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketDate: { fontSize: 11, color: '#aaa' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f1f5f9' },
  statusClosed: { backgroundColor: '#fef2f2' },
  statusReplied: { backgroundColor: '#f0fdf4' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#64748b' },

  adminActions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', padding: 12, gap: 12 },
  editButton: { flex: 1, backgroundColor: '#e0e7ff', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  editButtonText: { fontSize: 12, fontWeight: '600', color: '#4f46e5' },
  deleteButton: { flex: 1, backgroundColor: '#fee2e2', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  deleteButtonText: { fontSize: 12, fontWeight: '600', color: '#dc2626' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#94a3b8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.8)', position: 'absolute', bottom: 12, left: 20 },
  modalClose: { padding: 8 },
  modalCloseText: { fontSize: 18, fontWeight: '600', color: '#fff' },
  modalBody: { padding: 20 },
  ticketDetails: { marginBottom: 20 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: '#64748b', marginBottom: 4, marginTop: 12 },
  detailValue: { fontSize: 14, color: '#1e1b4b', lineHeight: 20 },
  statusSelector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  statusOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  statusOptionActive: { backgroundColor: '#7c3aed' },
  statusOptionText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  statusOptionTextActive: { color: '#fff' },
  replyInput: { height: 120, borderRadius: 12, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe', paddingHorizontal: 16, paddingTop: 14, fontSize: 14, color: '#1e1b4b', textAlignVertical: 'top', marginTop: 8 },
  editInput: { height: 50, borderRadius: 12, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe', paddingHorizontal: 16, fontSize: 14, color: '#1e1b4b', marginTop: 8 },
  editTextArea: { height: 120, paddingTop: 14, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20, marginBottom: 20 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelButtonText: { fontWeight: '700', color: '#64748b' },
  sendButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center' },
  sendButtonText: { fontWeight: '700', color: '#fff' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10b981', alignItems: 'center' },
  saveButtonText: { fontWeight: '700', color: '#fff' },
});