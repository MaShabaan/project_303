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
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '@/services/firebase';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

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

export default function FeedbackScreen() {
  const [items, setItems] = useState<FeedbackDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeedback = async () => {
    try {
      const ref = collection(db, COLLECTIONS.FEEDBACK);
      const snapshot = await getDocs(ref);
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as FeedbackDoc[];
      list.sort((a, b) => {
        const tA = a.createdAt && typeof (a.createdAt as Timestamp).toDate === 'function' ? (a.createdAt as Timestamp).toDate().getTime() : 0;
        const tB = b.createdAt && typeof (b.createdAt as Timestamp).toDate === 'function' ? (b.createdAt as Timestamp).toDate().getTime() : 0;
        return tB - tA;
      });
      setItems(list);
    } catch (error: unknown) {
      console.error('Error loading feedback:', error);
      const msg = error && typeof error === 'object' && 'message' in error ? String((error as { message: string }).message) : 'Failed to load course ratings';
      Alert.alert('Error', msg.includes('permission') ? 'Permission denied. Check Firestore rules (feedback).' : 'Failed to load course ratings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFeedback();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeedback();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#764ba2" />
        <Text style={styles.loadingText}>Loading course ratings...</Text>
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
          <Text style={styles.headerTitle}>⭐ Course Ratings</Text>
          <Text style={styles.headerSubtitle}>{items.length} total ratings</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#764ba2']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No course ratings yet.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const courseR = item.courseRating ?? item.rating ?? '—';
          const instrR = item.instructorRating ?? item.rating ?? '—';
          return (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.courseName}>{item.courseName}</Text>
            </View>
            <Text style={styles.instructor}>Instructor: {item.instructor}</Text>
            <View style={styles.ratingsRow}>
              <Text style={styles.ratingLabel}>Course: </Text>
              <Text style={styles.ratingText}>{courseR}</Text>
              <Text style={styles.ratingLabel}> / 5</Text>
              <Text style={styles.ratingLabel}>  ·  Instructor: </Text>
              <Text style={styles.ratingText}>{instrR}</Text>
              <Text style={styles.ratingLabel}> / 5</Text>
            </View>
            {item.comments ? (
              <Text style={styles.comments} numberOfLines={4}>{item.comments}</Text>
            ) : null}
            <View style={styles.meta}>
              <Text style={styles.metaText}>{item.userEmail}</Text>
              <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          );
        }}
      />
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
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#a5b4fc', marginTop: 4 },

  listContent: { padding: 16, paddingBottom: 32 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#94a3b8' },
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
  cardHeader: { marginBottom: 6 },
  courseName: { fontSize: 17, fontWeight: '800', color: '#1e1b4b' },
  instructor: { fontSize: 14, color: '#64748b', marginBottom: 6 },
  ratingsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  ratingText: { fontSize: 16, fontWeight: '700', color: '#7c3aed' },
  ratingLabel: { fontSize: 14, color: '#64748b' },
  comments: { fontSize: 14, color: '#475569', fontStyle: 'italic', marginBottom: 8, backgroundColor: '#f8f7ff', padding: 10, borderRadius: 10 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { fontSize: 11, color: '#94a3b8' },
});