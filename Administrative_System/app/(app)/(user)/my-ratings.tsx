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
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface FeedbackDoc {
  id: string;
  userId: string;
  userEmail: string;
  courseName: string;
  instructor: string;
  courseRating?: number;
  instructorRating?: number;
  rating?: number;
  comments: string;
  createdAt: Timestamp | { toDate: () => Date };
}

function formatDate(t: FeedbackDoc['createdAt']): string {
  if (!t) return '—';
  const date = t && typeof (t as Timestamp).toDate === 'function' ? (t as Timestamp).toDate() : new Date();
  return date.toLocaleDateString(undefined, { dateStyle: 'short' }) + ' ' + date.toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export default function MyRatingsScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<FeedbackDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRatings = async () => {
    if (!user?.uid) return;
    try {
      const ref = collection(db, COLLECTIONS.FEEDBACK);
      const snapshot = await getDocs(ref);
      const mapped = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as FeedbackDoc[];
      const list = mapped.filter((f) => f.userId === user.uid);
      list.sort((a, b) => {
        const tA = a.createdAt && typeof (a.createdAt as Timestamp).toDate === 'function' ? (a.createdAt as Timestamp).toDate().getTime() : 0;
        const tB = b.createdAt && typeof (b.createdAt as Timestamp).toDate === 'function' ? (b.createdAt as Timestamp).toDate().getTime() : 0;
        return tB - tA;
      });
      setItems(list);
    } catch (error) {
      console.error('Error loading my ratings:', error);
      Alert.alert('Error', 'Failed to load your ratings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, [user?.uid]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRatings();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#667eea" />
        <Text style={styles.loadingText}>Loading your ratings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>You haven't submitted any course ratings yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const courseR = item.courseRating ?? item.rating ?? '—';
          const instrR = item.instructorRating ?? item.rating ?? '—';
          return (
            <View style={styles.card}>
              <Text style={styles.courseName}>{item.courseName}</Text>
              <Text style={styles.instructor}>Instructor: {item.instructor}</Text>
              <View style={styles.ratingsRow}>
                <Text style={styles.ratingLabel}>Course: </Text>
                <Text style={styles.ratingValue}>{courseR}</Text>
                <Text style={styles.ratingLabel}>/5</Text>
                <Text style={styles.ratingLabel}>  ·  Instructor: </Text>
                <Text style={styles.ratingValue}>{instrR}</Text>
                <Text style={styles.ratingLabel}>/5</Text>
              </View>
              {item.comments ? (
                <Text style={styles.comments}>"{item.comments}"</Text>
              ) : null}
              <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            </View>
          );
        }}
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
  courseName: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 4 },
  instructor: { fontSize: 14, color: '#555', marginBottom: 8 },
  ratingsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  ratingLabel: { fontSize: 14, color: '#666' },
  ratingValue: { fontSize: 16, fontWeight: '700', color: '#667eea' },
  comments: { fontSize: 14, color: '#666', fontStyle: 'italic', marginBottom: 8 },
  date: { fontSize: 12, color: '#888' },
});
