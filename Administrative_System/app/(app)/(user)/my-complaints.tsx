import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db, COLLECTIONS, type TicketType } from '@/services/firebase';
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

function formatDate(t: Ticket['createdAt']): string {
  if (!t) return '—';
  const date = t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : new Date();
  return date.toLocaleDateString(undefined, { dateStyle: 'short' }) + ' ' + date.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export default function MyComplaintsScreen() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

    const loadTickets = async () => {
    if (!user?.uid) return;
    try {
      const ref = collection(db, COLLECTIONS.TICKETS);
      
      // NEW: Tell Firebase to ONLY give us tickets created by this user
      const q = query(ref, where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as Ticket[];
      
      // Sort them by date in the app
      list.sort((a, b) => {
        const tA = a.createdAt && typeof (a.createdAt as Timestamp).toDate === 'function' ? (a.createdAt as Timestamp).toDate().getTime() : 0;
        const tB = b.createdAt && typeof (b.createdAt as Timestamp).toDate === 'function' ? (b.createdAt as Timestamp).toDate().getTime() : 0;
        return tB - tA;
      });
      setTickets(list);
    } catch (error) {
      console.error('Error loading my complaints:', error);
      Alert.alert('Error', 'Failed to load your complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your complaints...</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven&apos;t submitted any complaints yet.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={[styles.statusBadge, item.adminReply ? styles.statusReplied : styles.statusOpen]}>
                <Text style={styles.statusBadgeText}>{item.adminReply ? 'Replied' : 'Open'}</Text>
              </View>
            </View>
            <Text style={styles.type}>{TYPE_LABELS[item.type] || item.type}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.date}>Submitted: {formatDate(item.createdAt)}</Text>
            {item.adminReply ? (
              <View style={styles.replyBlock}>
                <Text style={styles.replyLabel}>Admin reply:</Text>
                <Text style={styles.replyText}>{item.adminReply}</Text>
                {item.repliedBy && (
                  <Text style={styles.repliedBy}>— {item.repliedBy}</Text>
                )}
              </View>
            ) : (
              <Text style={styles.pendingText}>No reply yet. An admin will respond when possible.</Text>
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
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 16, fontWeight: '700', color: '#333', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  statusOpen: { backgroundColor: '#f59e0b' },
  statusReplied: { backgroundColor: '#22c55e' },
  type: { fontSize: 13, color: '#667eea', marginBottom: 8 },
  description: { fontSize: 14, color: '#555', marginBottom: 8 },
  date: { fontSize: 12, color: '#888', marginBottom: 8 },
  replyBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#f0f4ff', padding: 12, borderRadius: 8 },
  replyLabel: { fontSize: 12, fontWeight: '600', color: '#667eea', marginBottom: 6 },
  replyText: { fontSize: 14, color: '#1f2937' },
  repliedBy: { fontSize: 12, color: '#666', marginTop: 6 },
  pendingText: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
});
