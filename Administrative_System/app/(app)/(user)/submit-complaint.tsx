import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { TICKET_TYPES, submitTicket, type TicketType } from '@/services/firebase';
import { router } from 'expo-router';

const PRIORITIES = [
  { value: 'low', label: '🟢 Low', color: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
  { value: 'medium', label: '🟡 Medium', color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
  { value: 'high', label: '🔴 High', color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
] as const;

export default function SubmitComplaintScreen() {
  const { user } = useAuth();
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [loading, setLoading] = useState(false);
  const [titleFocused, setTitleFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
      delay: 100,
    }).start();
  }, []);

  const handleSubmit = async () => {
    console.log('User object:', user);
    console.log('User UID:', user?.uid);
    console.log('User Email:', user?.email);

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
      
      Alert.alert(
        '✓ Complaint Submitted',
        'Your complaint has been recorded. We will review it and get back to you within 24 hours.',
        [
          { 
            text: 'View My Complaints', 
            onPress: () => router.push('/(app)/(user)/my-complaints') 
          },
          { 
            text: 'OK', 
            onPress: () => router.back(),
            style: 'cancel'
          }
        ]
      );
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{
          opacity: fadeAnim,
          transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Submit Complaint</Text>
              <Text style={styles.headerSub}>We&apos;ll review and get back to you</Text>
            </View>
            <View style={{ width: 60 }} />
          </View>

          {/* Ticket Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>COMPLAINT TYPE</Text>
            <View style={styles.typesGrid}>
              {TICKET_TYPES.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.typeBtn, ticketType === value && styles.typeBtnActive]}
                  onPress={() => setTicketType(value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.typeText, ticketType === value && styles.typeTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, titleFocused && styles.sectionTitleFocused]}>TITLE</Text>
            <TextInput
              style={[styles.input, titleFocused && styles.inputFocused]}
              placeholder="Short title for your complaint"
              placeholderTextColor="#94a3b8"
              value={title}
              onChangeText={setTitle}
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
            />
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, descFocused && styles.sectionTitleFocused]}>DESCRIPTION</Text>
            <TextInput
              style={[styles.input, styles.textArea, descFocused && styles.inputFocused]}
              placeholder="Describe the issue in detail..."
              placeholderTextColor="#94a3b8"
              value={description}
              onChangeText={setDescription}
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PRIORITY</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map(({ value, label, color, bg, border }) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.priorityBtn,
                    { backgroundColor: bg, borderColor: border },
                    priority === value && styles.priorityBtnActive,
                    priority === value && { borderColor: color },
                  ]}
                  onPress={() => setPriority(value)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.priorityText, priority === value && { color }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.submitText}>
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f5ff',
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7c3aed',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1e1b4b',
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },

  // Section
  section: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ede9fe',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  sectionTitleFocused: {
    color: '#7c3aed',
  },

  // Types
  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8f7ff',
    borderWidth: 1.5,
    borderColor: '#ede9fe',
  },
  typeBtnActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  typeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeTextActive: {
    color: '#fff',
  },

  // Input
  input: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f8f7ff',
    borderWidth: 1.5,
    borderColor: '#ede9fe',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1e1b4b',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#7c3aed',
    backgroundColor: '#fff',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },

  // Priority
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  priorityBtnActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },

  // Submit
  submitBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#1e1b4b',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#1e1b4b',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});