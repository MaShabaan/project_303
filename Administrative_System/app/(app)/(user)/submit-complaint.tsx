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
import { submitTicket, type TicketType } from '@/services/firebase';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TICKET_TYPES = [
  { value: "harassment", label: "Harassment", priority: "urgent" },
  { value: "complaint", label: "Complaint", priority: "high" },
  { value: "technical_issue", label: "Technical Issue", priority: "medium" },
  { value: "request", label: "Request", priority: "low" },
] as const;

export default function SubmitComplaintScreen() {
  const { user } = useAuth();
  const [ticketType, setTicketType] = useState<TicketType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
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
    if (!user?.uid || !user?.email) {
      Alert.alert('Error', 'You must be signed in to submit a complaint.');
      return;
    }
    if (!ticketType) {
      Alert.alert('Required', 'Please select a complaint type.');
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
        isAnonymous,
      });
      
      Alert.alert(
        '✓ Complaint Submitted',
        isAnonymous 
          ? 'Your anonymous complaint has been recorded. Admin will see it as "Anonymous".'
          : 'Your complaint has been recorded. We will review it and get back to you within 24 hours.',
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

          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#7c3aed" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Submit Complaint</Text>
              <Text style={styles.headerSub}>We'll review and get back to you</Text>
            </View>
            <View style={{ width: 40 }} />
          </View>

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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ANONYMOUS</Text>
            <TouchableOpacity
              style={styles.anonymousOption}
              onPress={() => setIsAnonymous(!isAnonymous)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
                {isAnonymous && <Text style={styles.checkboxIcon}>✓</Text>}
              </View>
              <View style={styles.anonymousTextContainer}>
                <Text style={styles.anonymousTitle}>Submit anonymously</Text>
                <Text style={styles.anonymousSubtext}>Admin will see this as "Anonymous", but super admin can see your identity</Text>
              </View>
            </TouchableOpacity>
          </View>

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
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 16,
    paddingTop: 20,
    paddingBottom: 40,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
    marginTop: 2,
  },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
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

  typesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
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

  input: {
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#7c3aed',
    borderWidth: 2,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 120,
    paddingTop: 14,
  },

  anonymousOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  checkboxIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  anonymousTextContainer: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  anonymousSubtext: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },

  submitBtn: {
    height: 54,
    borderRadius: 16,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#7c3aed',
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