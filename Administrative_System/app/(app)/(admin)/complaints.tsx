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
  TextInput,
} from 'react-native';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS, replyToTicket, type TicketType } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface Ticket {
  id: string;
  userId: string;
  userEmail: string;
  type: TicketType;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: Timestamp | { toDate: () => Date };
  adminReply?: string;
  repliedAt?: Timestamp | { toDate: () => Date };
  repliedBy?: string;
}

const TYPE_LABELS: Record<string, string> = {
  technical_issue: 'Technical issue',
  complaint: 'Complaint',
  request: 'Request',
  other: 'Other',
};

const PRIORITY_BG: Record<string, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
};

function formatDate(t: Ticket['createdAt']): string {
  if (!t) return '—';
  const date = t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : new Date();
  return date.toLocaleDateString(undefined, { dateStyle: 'short' }) + ' ' + date.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export default function ComplaintsScreen() {
  const { profile } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  const loadTickets = async () => {
    try {
      const ref = collection(db, COLLECTIONS.TICKETS);
      const snapshot = await getDocs(ref);
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Ticket[];
      list.sort((a, b) => {
        const tA = a.createdAt && typeof (a.createdAt as Timestamp).toDate === 'function' ? (a.createdAt as Timestamp).toDate().getTime() : 0;
        const tB = b.createdAt && typeof (b.createdAt as Timestamp).toDate === 'function' ? (b.createdAt as Timestamp).toDate().getTime() : 0;
        return tB - tA;
      });
      setTickets(list);
    } catch (error: unknown) {
      console.error('Error loading tickets:', error);
      Alert.alert('Error', 'Failed to load complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const handleSendReply = async (ticketId: string) => {
    const text = replyText.trim();
    if (!text) {
      Alert.alert('Error', 'Please enter a reply message');
      return;
    }
    if (!profile?.email) {
      Alert.alert('Error', 'You must be logged in as admin');
      return;
    }
    
    setReplyLoading(true);
    try {
      await replyToTicket(ticketId, profile.email, text);
      setReplyingToId(null);
      setReplyText('');
      Alert.alert('Success', 'Reply sent successfully');
      loadTickets();
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#764ba2" />
        <Text style={styles.loadingText}>Loading complaints...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#764ba2']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No complaints submitted yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.badge, { backgroundColor: PRIORITY_BG[item.priority] || '#f59e0b' }]}>
                <Text style={styles.badgeText}>{item.priority}</Text>
              </View>
            </View>
            <Text style={styles.userEmail}>From: {item.userEmail}</Text>
            <Text style={styles.type}>{TYPE_LABELS[item.type] || item.type}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <View style={styles.meta}>
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
            {item.status && (
              <Text style={styles.status}>Status: {item.status}</Text>
            )}
            {item.adminReply ? (
              <View style={styles.replyBlock}>
                <Text style={styles.replyLabel}>Admin reply:</Text>
                <Text style={styles.replyText}>{item.adminReply}</Text>
                {item.repliedBy && (
                  <Text style={styles.repliedBy}>— {item.repliedBy}</Text>
                )}
                <TouchableOpacity 
                  style={styles.editReplyButton}
                  onPress={() => {
                    setReplyingToId(item.id);
                    setReplyText(item.adminReply || '');
                  }}
                >
                  <Text style={styles.editReplyButtonText}>Edit Reply</Text>
                </TouchableOpacity>
              </View>
            ) : replyingToId === item.id ? (
              <View style={styles.replyForm}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type your reply..."
                  placeholderTextColor="#9ca3af"
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <View style={styles.replyActions}>
                  <TouchableOpacity 
                    style={styles.cancelBtn}
                    onPress={() => { 
                      setReplyingToId(null); 
                      setReplyText(''); 
                    }}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.sendBtn, replyLoading && styles.sendBtnDisabled]}
                    onPress={() => handleSendReply(item.id)}
                    disabled={replyLoading}
                  >
                    <Text style={styles.sendBtnText}>
                      {replyLoading ? 'Sending...' : 'Send Reply'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={styles.replyButton} onPress={() => setReplyingToId(item.id)}>
                <Text style={styles.replyButtonText}>Reply to Complaint</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },
  listContent: { padding: 16, paddingBottom: 32 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1, marginRight: 8 },
  userEmail: { fontSize: 12, color: '#764ba2', fontWeight: '500', marginBottom: 6 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  type: { fontSize: 13, color: '#666', marginBottom: 8 },
  description: { fontSize: 14, color: '#555', marginBottom: 10, lineHeight: 20 },
  meta: { flexDirection: 'row', marginTop: 4 },
  metaText: { fontSize: 12, color: '#888' },
  status: { fontSize: 12, color: '#666', marginTop: 6 },
  replyBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  replyLabel: { fontSize: 12, fontWeight: '600', color: '#764ba2', marginBottom: 4 },
  replyText: { fontSize: 14, color: '#333' },
  repliedBy: { fontSize: 12, color: '#888', marginTop: 4 },
  editReplyButton: { marginTop: 8, alignSelf: 'flex-start' },
  editReplyButtonText: { color: '#764ba2', fontSize: 12, fontWeight: '500' },
  replyForm: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  replyInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  replyActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 12 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#f3f4f6' },
  cancelBtnText: { fontSize: 14, color: '#666', fontWeight: '500' },
  sendBtn: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#764ba2' },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  replyButton: { marginTop: 12, paddingVertical: 10, paddingHorizontal: 16, backgroundColor: '#764ba2', borderRadius: 8, alignItems: 'center' },
  replyButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});