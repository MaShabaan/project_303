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
import { TICKET_TYPES, submitTicket, type TicketType } from '@/services/firebase';
import { router } from 'expo-router';

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

export default function SubmitComplaintScreen() {
  const { user } = useAuth();
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user?.uid || !user?.email) {
      Alert.alert('Error', 'You must be signed in to submit a complaint.');
      return;
    }
    if (!ticketType) {
      Alert.alert('Required', 'Please select a ticket type.');
      return;
    }
    const t = title.trim();
    if (!t) {
      Alert.alert('Required', 'Please enter a title.');
      return;
    }
    const d = description.trim();
    if (!d) {
      Alert.alert('Required', 'Please enter a description.');
      return;
    }

    setLoading(true);
    try {
      await submitTicket(user.uid, user.email, {
        type: ticketType,
        title: t,
        description: d,
        priority,
      });
      Alert.alert('Success', 'Your complaint has been submitted. Admins can view and respond to it.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
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
        <Text style={styles.title}>Submit a Complaint</Text>
        <Text style={styles.subtitle}>We’ll review your submission and get back to you.</Text>

        <Text style={styles.label}>Type</Text>
        <View style={styles.optionsRow}>
          {TICKET_TYPES.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.optionBtn, ticketType === value && styles.optionBtnActive]}
              onPress={() => setTicketType(value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.optionText, ticketType === value && styles.optionTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Input
          label="Title"
          placeholder="Short title for your complaint"
          value={title}
          onChangeText={setTitle}
        />

        <Input
          label="Description"
          placeholder="Describe the issue in detail..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          style={styles.descInput}
        />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.priorityRow}>
          {PRIORITIES.map(({ value, label }) => (
            <TouchableOpacity
              key={value}
              style={[styles.priorityBtn, priority === value && styles.priorityBtnActive]}
              onPress={() => setPriority(value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.priorityText, priority === value && styles.priorityTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.submitWrap}>
          <Button
            title="Submit complaint"
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
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  optionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  optionBtnActive: {
    backgroundColor: '#667eea',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  optionTextActive: {
    color: '#fff',
  },
  descInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  priorityBtnActive: {
    backgroundColor: '#667eea',
  },
  priorityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  priorityTextActive: {
    color: '#fff',
  },
  submitWrap: { marginTop: 8 },
  submitBtn: { backgroundColor: '#667eea', paddingVertical: 16, borderRadius: 12 },
});
