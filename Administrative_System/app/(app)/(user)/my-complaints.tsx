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
} from 'react-native';
import { collection, getDocs, Timestamp, query, where } from 'firebase/firestore';
import { db, COLLECTIONS, type TicketType } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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
  harassment: 'Harassment',
  complaint: 'Complaint',
  technical_issue: 'Technical Issue',
  request: 'Request',
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
      const q = query(ref, where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      
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
        <ActivityIndicator size="large" color="#7c3aed" />
        <Text style={styles.loadingText}>Loading your complaints...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#667eea", "#764ba2"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>📋 My Complaints</Text>
          <Text style={styles.headerSubtitle}>{tickets.length} total</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={tickets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7c3aed']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>You haven't submitted any complaints yet.</Text>
            <TouchableOpacity 
              style={styles.submitBtn}
              onPress={() => router.push('/(app)/(user)/submit-complaint')}
            >
              <Text style={styles.submitBtnText}>+ Submit a complaint</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.statusBadge, item.adminReply ? styles.statusReplied : styles.statusOpen]}>
                <Text style={styles.statusBadgeText}>{item.adminReply ? 'Replied' : 'Open'}</Text>
              </View>
            </View>
            <Text style={styles.type}>{TYPE_LABELS[item.type] || item.type}</Text>
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
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
              <Text style={styles.pendingText}>⏳ No reply yet. An admin will respond when possible.</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f6f5ff' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },

  headerGradient: {
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  listContent: { padding: 16, paddingBottom: 32 },
  empty: { padding: 40, alignItems: 'center' },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#94a3b8', textAlign: 'center' },
  submitBtn: { marginTop: 20, backgroundColor: '#7c3aed', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ede9fe',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', color: '#1e1b4b', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', color: '#fff' },
  statusOpen: { backgroundColor: '#f59e0b' },
  statusReplied: { backgroundColor: '#10b981' },
  type: { fontSize: 12, color: '#7c3aed', fontWeight: '600', marginBottom: 6 },
  description: { fontSize: 14, color: '#475569', marginBottom: 8, lineHeight: 18 },
  date: { fontSize: 11, color: '#94a3b8', marginBottom: 8 },
  replyBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#ede9fe', backgroundColor: '#f5f3ff', padding: 12, borderRadius: 12 },
  replyLabel: { fontSize: 11, fontWeight: '700', color: '#7c3aed', marginBottom: 6, letterSpacing: 0.5 },
  replyText: { fontSize: 13, color: '#1e1b4b', lineHeight: 18 },
  repliedBy: { fontSize: 11, color: '#94a3b8', marginTop: 6, textAlign: 'right' },
  pendingText: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 },
});