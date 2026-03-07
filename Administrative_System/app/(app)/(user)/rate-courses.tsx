import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { submitCourseRating } from '@/services/firebase';
import { router } from 'expo-router';

const RATINGS = [1, 2, 3, 4, 5];

export default function RateCoursesScreen() {
  const { user } = useAuth();
  const [courseName, setCourseName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [courseRating, setCourseRating] = useState<number | null>(null);
  const [instructorRating, setInstructorRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user?.uid || !user?.email) {
      Alert.alert('Error', 'You must be signed in to submit a rating.');
      return;
    }
    const name = courseName.trim();
    const inst = instructor.trim();
    if (!name) {
      Alert.alert('Required', 'Please enter the course name.');
      return;
    }
    if (!inst) {
      Alert.alert('Required', 'Please enter the instructor name.');
      return;
    }
    if (courseRating === null) {
      Alert.alert('Required', 'Please select a course rating from 1 to 5.');
      return;
    }
    if (instructorRating === null) {
      Alert.alert('Required', 'Please select an instructor rating from 1 to 5.');
      return;
    }

    setLoading(true);
    try {
      await submitCourseRating(user.uid, user.email, {
        courseName: name,
        instructor: inst,
        courseRating,
        instructorRating,
        comments,
      });
      Alert.alert('Success', 'Your course rating has been submitted. Admins can view it in the dashboard.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to submit rating. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.title}>Rate a Course</Text>
        <Text style={styles.subtitle}>Your feedback helps improve our courses.</Text>

        <Input
          label="Course name"
          placeholder="e.g. Introduction to Programming"
          value={courseName}
          onChangeText={setCourseName}
          autoCapitalize="words"
        />

        <Input
          label="Instructor"
          placeholder="Instructor name"
          value={instructor}
          onChangeText={setInstructor}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Course rating (1–5)</Text>
        <View style={styles.ratingRow}>
          {RATINGS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.ratingBtn, courseRating === r && styles.ratingBtnActive]}
              onPress={() => setCourseRating(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.ratingText, courseRating === r && styles.ratingTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Instructor rating (1–5)</Text>
        <View style={styles.ratingRow}>
          {RATINGS.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.ratingBtn, instructorRating === r && styles.ratingBtnActive]}
              onPress={() => setInstructorRating(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.ratingText, instructorRating === r && styles.ratingTextActive]}>{r}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Comments (optional)"
          placeholder="Any additional feedback..."
          value={comments}
          onChangeText={setComments}
          multiline
          numberOfLines={4}
          style={styles.commentsInput}
        />

        <View style={styles.submitWrap}>
          <Button
            title="Submit rating"
            onPress={handleSubmit}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#667eea' },
  content: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  ratingBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBtnActive: {
    backgroundColor: '#667eea',
  },
  ratingText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  ratingTextActive: {
    color: '#fff',
  },
  commentsInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  submitWrap: { marginTop: 12 },
  submitBtn: { backgroundColor: '#667eea', paddingVertical: 16, borderRadius: 12 },
});
