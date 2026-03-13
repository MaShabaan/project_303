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
import Svg, { Circle } from 'react-native-svg';
import { useAuth } from '@/contexts/AuthContext';
import { submitCourseRating } from '@/services/firebase';
import { router } from 'expo-router';

const NPS_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const getNpsColor = (n: number) => {
  if (n <= 3) return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', activeBg: '#ef4444' };
  if (n <= 6) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', activeBg: '#f59e0b' };
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', activeBg: '#10b981' };
};

const getNpsLabel = (n: number | null) => {
  if (n === null) return '';
  if (n <= 3) return '😞 Not likely at all';
  if (n <= 6) return '😐 Maybe';
  if (n <= 8) return '😊 Likely';
  return '🤩 Definitely yes!';
};

const getInstructorLabel = (n: number | null) => {
  if (n === null) return '';
  if (n <= 3) return '😞 Needs improvement';
  if (n <= 6) return '😐 Average';
  if (n <= 8) return '😊 Good';
  return '🤩 Excellent!';
};

export default function RateCoursesScreen() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [courseName, setCourseName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [courseRating, setCourseRating] = useState<number | null>(null);
  const [instructorRating, setInstructorRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [courseNameFocused, setCourseNameFocused] = useState(false);
  const [instructorFocused, setInstructorFocused] = useState(false);
  const [commentsFocused, setCommentsFocused] = useState(false);

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

  const goNext = () => {
    if (step === 1) {
      if (!courseName.trim()) { Alert.alert('Required', 'Please enter the course name.'); return; }
      if (!instructor.trim()) { Alert.alert('Required', 'Please enter the instructor name.'); return; }
    }
    if (step === 2 && courseRating === null) {
      Alert.alert('Required', 'Please select a course rating.'); return;
    }
    if (step === 3 && instructorRating === null) {
      Alert.alert('Required', 'Please select an instructor rating.'); return;
    }
    setStep(s => s + 1);
  };

  const goBack = () => setStep(s => s - 1);

  const handleSubmit = async () => {
    if (!user?.uid || !user?.email) {
      Alert.alert('Error', 'You must be signed in.');
      return;
    }
    setLoading(true);
    try {
      await submitCourseRating(user.uid, user.email, {
        courseName: courseName.trim(),
        instructor: instructor.trim(),
        courseRating: courseRating!,
        instructorRating: instructorRating!,
        comments,
      });
      Alert.alert('Thank you! 🎉', 'Your feedback has been submitted successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;
  const SIZE = 48;
  const RADIUS = 20;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

  const isComplete = step === totalSteps;
  const strokeColor = isComplete ? '#10b981' : '#7c3aed';
  const innerBg = isComplete ? '#f0fdf4' : '#f5f3ff';
  const innerColor = isComplete ? '#10b981' : '#7c3aed';
  const strokeDashoffset = CIRCUMFERENCE - (progress / 100) * CIRCUMFERENCE;

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
            {/* Progress Circle Back Button */}
            <TouchableOpacity
              onPress={() => step > 1 ? goBack() : router.back()}
              activeOpacity={0.8}
              style={styles.progressCircleWrap}
            >
              <Svg width={SIZE} height={SIZE}>
                <Circle
                  cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                  fill="none" stroke="#ede9fe" strokeWidth={3}
                />
                <Circle
                  cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={3}
                  strokeDasharray={`${CIRCUMFERENCE}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${SIZE / 2}, ${SIZE / 2}`}
                />
              </Svg>
              <View style={[styles.progressCircleInner, { backgroundColor: innerBg }]}>
                <Text style={[styles.progressCircleText, { color: innerColor }]}>
                  {isComplete ? '✓' : '←'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Rate a Course</Text>
              <Text style={styles.headerSub}>Step {step} of {totalSteps}</Text>
            </View>
            <View style={{ width: 48 }} />
          </View>

          {/* Step Indicators */}
          <View style={styles.stepsRow}>
            {[1, 2, 3, 4].map(s => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                  <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>
                    {step > s ? '✓' : s}
                  </Text>
                </View>
                {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          {/* ── Step 1: Course Info ── */}
          {step === 1 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>Course Information</Text>
              <Text style={styles.stepDesc}>Tell us which course you're rating</Text>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, courseNameFocused && styles.fieldLabelFocused]}>COURSE NAME</Text>
                <TextInput
                  style={[styles.input, courseNameFocused && styles.inputFocused]}
                  placeholder="e.g. Introduction to Programming"
                  placeholderTextColor="#94a3b8"
                  value={courseName}
                  onChangeText={setCourseName}
                  onFocus={() => setCourseNameFocused(true)}
                  onBlur={() => setCourseNameFocused(false)}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, instructorFocused && styles.fieldLabelFocused]}>INSTRUCTOR NAME</Text>
                <TextInput
                  style={[styles.input, instructorFocused && styles.inputFocused]}
                  placeholder="Instructor name"
                  placeholderTextColor="#94a3b8"
                  value={instructor}
                  onChangeText={setInstructor}
                  onFocus={() => setInstructorFocused(true)}
                  onBlur={() => setInstructorFocused(false)}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* ── Step 2: Course NPS ── */}
          {step === 2 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>Course Rating</Text>
              <Text style={styles.stepDesc}>
                How likely are you to recommend{'\n'}
                <Text style={styles.highlight}>"{courseName}"</Text> to others?
              </Text>
              <View style={styles.npsGrid}>
                {NPS_SCALE.map(n => {
                  const c = getNpsColor(n);
                  const isSelected = courseRating === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.npsBtn,
                        { backgroundColor: c.bg, borderColor: c.border },
                        isSelected && { backgroundColor: c.activeBg, borderColor: c.activeBg },
                      ]}
                      onPress={() => setCourseRating(n)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.npsBtnText, { color: c.text }, isSelected && { color: '#fff' }]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.npsLabels}>
                <Text style={styles.npsLabelText}>Not at all</Text>
                <Text style={styles.npsLabelText}>Definitely yes</Text>
              </View>
              {courseRating !== null && (
                <View style={styles.npsResult}>
                  <Text style={styles.npsResultText}>{getNpsLabel(courseRating)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Step 3: Instructor NPS ── */}
          {step === 3 && (
            <View style={styles.stepCard}>
              <Text style={styles.stepTitle}>Instructor Rating</Text>
              <Text style={styles.stepDesc}>
                How would you rate{'\n'}
                <Text style={styles.highlight}>"{instructor}"</Text> as an instructor?
              </Text>
              <View style={styles.npsGrid}>
                {NPS_SCALE.map(n => {
                  const c = getNpsColor(n);
                  const isSelected = instructorRating === n;
                  return (
                    <TouchableOpacity
                      key={n}
                      style={[
                        styles.npsBtn,
                        { backgroundColor: c.bg, borderColor: c.border },
                        isSelected && { backgroundColor: c.activeBg, borderColor: c.activeBg },
                      ]}
                      onPress={() => setInstructorRating(n)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.npsBtnText, { color: c.text }, isSelected && { color: '#fff' }]}>
                        {n}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.npsLabels}>
                <Text style={styles.npsLabelText}>Needs improvement</Text>
                <Text style={styles.npsLabelText}>Excellent</Text>
              </View>
              {instructorRating !== null && (
                <View style={styles.npsResult}>
                  <Text style={styles.npsResultText}>{getInstructorLabel(instructorRating)}</Text>
                </View>
              )}
            </View>
          )}

          {/* ── Step 4: Summary + Comments ── */}
          {step === 4 && (
            <View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>SUMMARY</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Course</Text>
                  <Text style={styles.summaryValue}>{courseName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Instructor</Text>
                  <Text style={styles.summaryValue}>{instructor}</Text>
                </View>
                <View style={styles.summaryScores}>
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreNum}>{courseRating}</Text>
                    <Text style={styles.scoreLabel}>Course</Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreBox}>
                    <Text style={styles.scoreNum}>{instructorRating}</Text>
                    <Text style={styles.scoreLabel}>Instructor</Text>
                  </View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreBox}>
                    <Text style={[styles.scoreNum, styles.scoreAvg]}>
                      {(((courseRating ?? 0) + (instructorRating ?? 0)) / 2).toFixed(1)}
                    </Text>
                    <Text style={styles.scoreLabel}>Average</Text>
                  </View>
                </View>
              </View>
              <View style={styles.stepCard}>
                <Text style={styles.stepTitle}>Any additional feedback?</Text>
                <Text style={styles.stepDesc}>Optional — but very helpful!</Text>
                <TextInput
                  style={[styles.input, styles.textArea, commentsFocused && styles.inputFocused]}
                  placeholder="What could be improved? What did you love?"
                  placeholderTextColor="#94a3b8"
                  value={comments}
                  onChangeText={setComments}
                  onFocus={() => setCommentsFocused(true)}
                  onBlur={() => setCommentsFocused(false)}
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}

          {/* Next / Submit */}
          <View style={styles.navRow}>
            {step < totalSteps ? (
              <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>Next →</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextBtn, loading && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>
                  {loading ? 'Submitting...' : 'Submit Rating 🎉'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f6f5ff' },
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b' },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },

  progressCircleWrap: { width: 48, height: 48 },
  progressCircleInner: {
    position: 'absolute', top: 4, left: 4, right: 4, bottom: 4,
    borderRadius: 99, alignItems: 'center', justifyContent: 'center',
  },
  progressCircleText: { fontSize: 16, fontWeight: '800' },

  stepsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', marginBottom: 20,
  },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 28, height: 28, borderRadius: 99,
    backgroundColor: '#f5f3ff', borderWidth: 1.5, borderColor: '#ede9fe',
    alignItems: 'center', justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  stepDotText: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  stepDotTextActive: { color: '#fff' },
  stepLine: { width: 32, height: 2, backgroundColor: '#ede9fe' },
  stepLineActive: { backgroundColor: '#7c3aed' },

  stepCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: '#ede9fe',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b', marginBottom: 6 },
  stepDesc: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 20, lineHeight: 20 },
  highlight: { color: '#7c3aed', fontWeight: '700' },

  fieldGroup: { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 8 },
  fieldLabelFocused: { color: '#7c3aed' },
  input: {
    height: 50, borderRadius: 12, backgroundColor: '#f8f7ff',
    borderWidth: 1.5, borderColor: '#ede9fe',
    paddingHorizontal: 16, fontSize: 14, color: '#1e1b4b', fontWeight: '500',
  },
  inputFocused: {
    borderColor: '#7c3aed', backgroundColor: '#fff',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15, shadowRadius: 6,
  },
  textArea: { height: 120, paddingTop: 14 },

  npsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  npsBtn: {
    width: '17%', aspectRatio: 1, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  npsBtnText: { fontSize: 14, fontWeight: '800' },
  npsLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  npsLabelText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  npsResult: {
    backgroundColor: '#f5f3ff', borderRadius: 12,
    padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ede9fe',
  },
  npsResultText: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },

  summaryCard: {
    backgroundColor: '#1e1b4b', borderRadius: 20, padding: 20,
    marginBottom: 12, borderWidth: 1, borderColor: '#312e81',
  },
  summaryTitle: { fontSize: 11, fontWeight: '700', color: '#a5b4fc', letterSpacing: 1.2, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  summaryValue: { fontSize: 12, color: '#e2e8f0', fontWeight: '700' },
  summaryScores: {
    flexDirection: 'row', marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14,
  },
  scoreBox: { flex: 1, alignItems: 'center' },
  scoreNum: { fontSize: 28, fontWeight: '800', color: '#a78bfa' },
  scoreAvg: { color: '#06b6d4' },
  scoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 8 },

  navRow: { marginTop: 4 },
  nextBtn: {
    height: 54, borderRadius: 16, backgroundColor: '#1e1b4b',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 14, elevation: 8,
  },
  btnDisabled: { opacity: 0.6 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});
