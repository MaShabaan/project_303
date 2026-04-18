import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  TextInput,
  Animated,
  ActivityIndicator,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { submitCourseRating, db, COLLECTIONS } from '@/services/firebase';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const NPS_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const getCoursesFromFirebase = async (division: string, year: number, term: number): Promise<string[]> => {
  try {
    const q = query(
      collection(db, 'courses'),
      where('division', '==', division),
      where('year', '==', year),
      where('term', '==', term)
    );
    const snapshot = await getDocs(q);
    const courses = snapshot.docs.map(doc => doc.data().courseName);
    return courses;
  } catch (error) {
    console.error('Error fetching courses from Firebase:', error);
    return [];
  }
};

const getNpsColor = (n: number) => {
  if (n <= 3) return { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', activeBg: '#ef4444' };
  if (n <= 6) return { bg: '#fffbeb', border: '#fde68a', text: '#d97706', activeBg: '#f59e0b' };
  return { bg: '#f0fdf4', border: '#bbf7d0', text: '#059669', activeBg: '#10b981' };
};

const getNpsLabel = (n: number | null) => {
  if (n === null) return '';
  if (n <= 3) return '😞 Not satisfied';
  if (n <= 6) return '😐 Average';
  if (n <= 8) return '😊 Good experience!';
  return '🤩 Excellent!';
};

const getInstructorLabel = (n: number | null) => {
  if (n === null) return '';
  if (n <= 3) return '😞 Needs improvement';
  if (n <= 6) return '😐 Average';
  if (n <= 8) return '😊 Good';
  return '🤩 Excellent!';
};

export default function RateCoursesScreen() {
  const { user, profile } = useAuth();

  // ✅ خذ البيانات من profile مباشرة
  const division = profile?.division ?? 'computer_science';
  const academicYear = profile?.academicYear ?? 2;
  const currentTerm = profile?.currentTerm ?? 1;
  const divisionLabel = division === 'computer_science' ? 'Computer Science' : 'Special Mathematics';
  const divisionIcon = division === 'computer_science' ? '💻' : '📐';

  const [step, setStep] = useState(1);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [instructor, setInstructor] = useState('');
  const [courseRating, setCourseRating] = useState<number | null>(null);
  const [instructorRating, setInstructorRating] = useState<number | null>(null);
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [instructorFocused, setInstructorFocused] = useState(false);
  const [commentsFocused, setCommentsFocused] = useState(false);
  const [ratedCourses, setRatedCourses] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
      delay: 100,
    }).start();
    loadRatedCourses();
  }, []);

  // ✅ جلب المواد بناءً على academicYear و currentTerm من profile
  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      const courses = await getCoursesFromFirebase(division, academicYear, currentTerm);
      setAvailableCourses(courses);
      setLoadingCourses(false);
      setSelectedCourse(null);
    };
    fetchCourses();
  }, [division, academicYear, currentTerm]);

  const loadRatedCourses = async () => {
    if (!user?.uid) return;
    try {
      const q = query(
        collection(db, COLLECTIONS.FEEDBACK),
        where('userId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      const courses = snapshot.docs.map(d => d.data().courseName as string);
      setRatedCourses(courses);
    } catch (e) {
      console.error('Error loading rated courses:', e);
    }
  };

  const isAlreadyRated = (courseName: string) => ratedCourses.includes(courseName);

  const goNext = async () => {
    if (step === 1) {
      if (!selectedCourse) { Alert.alert('Required', 'Please select a course.'); return; }
      if (!instructor.trim()) { Alert.alert('Required', 'Please enter the instructor name.'); return; }

      setCheckingDuplicate(true);
      try {
        const q = query(
          collection(db, COLLECTIONS.FEEDBACK),
          where('userId', '==', user?.uid),
          where('courseName', '==', selectedCourse)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          Alert.alert('⚠️ Already Rated', `You have already rated "${selectedCourse}" before.\n\nYou can only rate each course once.`, [{ text: 'OK' }]);
          setCheckingDuplicate(false);
          return;
        }
      } catch (e) {
        console.error('Duplicate check error:', e);
      } finally {
        setCheckingDuplicate(false);
      }
    }
    if (step === 2 && courseRating === null) { Alert.alert('Required', 'Please select a course rating.'); return; }
    if (step === 3 && instructorRating === null) { Alert.alert('Required', 'Please select an instructor rating.'); return; }
    setStep(s => s + 1);
  };

  const goBack = () => { if (step > 1) setStep(s => s - 1); else router.back(); };

  const handleSubmit = async () => {
    if (!user?.uid || !user?.email) { Alert.alert('Error', 'You must be signed in.'); return; }
    setLoading(true);
    try {
      await submitCourseRating(user.uid, user.email, {
        courseName: selectedCourse!,
        instructor: instructor.trim(),
        courseRating: courseRating!,
        instructorRating: instructorRating!,
        comments,
        year: academicYear,
        term: currentTerm,
        division,
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
      <LinearGradient colors={["#667eea", "#764ba2"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerGradient}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>⭐ Rate Courses</Text>
          <Text style={styles.headerSubtitle}>Term {currentTerm} · Year {academicYear}</Text>
        </View>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>

          <View style={styles.divisionBanner}>
            <View style={styles.divisionIcon}><Text style={styles.divisionIconText}>{divisionIcon}</Text></View>
            <View>
              <Text style={styles.divisionLabel}>YOUR DIVISION</Text>
              <Text style={styles.divisionName}>{divisionLabel}</Text>
            </View>
          </View>

          <View style={styles.stepsRow}>
            {[1, 2, 3, 4].map(s => (
              <View key={s} style={styles.stepItem}>
                <View style={[styles.stepDot, step >= s && styles.stepDotActive]}>
                  <Text style={[styles.stepDotText, step >= s && styles.stepDotTextActive]}>{step > s ? '✓' : s}</Text>
                </View>
                {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
              </View>
            ))}
          </View>

          {step === 1 && (
            <View>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>YEAR / TERM</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>Year {academicYear} — Term {currentTerm}</Text>
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionLabel}>SELECT COURSE</Text>
                {loadingCourses ? (
                  <View style={styles.noCourses}>
                    <ActivityIndicator size="small" color="#7c3aed" />
                    <Text style={styles.noCoursesText}>Loading courses for Term {currentTerm}...</Text>
                  </View>
                ) : availableCourses.length === 0 ? (
                  <View style={styles.noCourses}>
                    <Text style={styles.noCoursesText}>No courses for Term {currentTerm}</Text>
                    <Text style={styles.noCoursesSubText}>Ask admin to add courses first</Text>
                  </View>
                ) : (
                  <View style={styles.courseList}>
                    {availableCourses.map((course, i) => {
                      const alreadyRated = isAlreadyRated(course);
                      const isSelected = selectedCourse === course;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[styles.courseItem, isSelected && styles.courseItemSel, alreadyRated && styles.courseItemRated]}
                          onPress={() => {
                            if (alreadyRated) {
                              Alert.alert('Already Rated ✓', `You've already rated "${course}".`);
                              return;
                            }
                            setSelectedCourse(course);
                          }}
                          activeOpacity={alreadyRated ? 0.5 : 0.8}
                        >
                          <View style={[styles.courseNum, isSelected && styles.courseNumSel, alreadyRated && styles.courseNumRated]}>
                            <Text style={[styles.courseNumText, isSelected && styles.courseNumTextSel, alreadyRated && styles.courseNumTextRated]}>
                              {alreadyRated ? '✓' : i + 1}
                            </Text>
                          </View>
                          <Text style={[styles.courseName, isSelected && styles.courseNameSel, alreadyRated && styles.courseNameRated]}>
                            {course}
                          </Text>
                          {alreadyRated && (
                            <View style={styles.ratedBadge}>
                              <Text style={styles.ratedBadgeText}>Rated</Text>
                            </View>
                          )}
                          {isSelected && !alreadyRated && <Text style={styles.courseCheck}>✓</Text>}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <View style={styles.card}>
                <Text style={[styles.sectionLabel, instructorFocused && styles.sectionLabelFocused]}>INSTRUCTOR NAME</Text>
                <TextInput style={[styles.input, instructorFocused && styles.inputFocused]}
                  placeholder="e.g. Dr. Ahmed Hassan" placeholderTextColor="#94a3b8"
                  value={instructor} onChangeText={setInstructor}
                  onFocus={() => setInstructorFocused(true)} onBlur={() => setInstructorFocused(false)}
                  autoCapitalize="words" />
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.card}>
              <Text style={styles.stepTitle}>Course Rating</Text>
              <Text style={styles.stepDesc}>How satisfied are you with{'\n'}<Text style={styles.highlight}>"{selectedCourse}"</Text>?</Text>
              <View style={styles.npsGrid}>
                {NPS_SCALE.map(n => {
                  const c = getNpsColor(n);
                  const isSel = courseRating === n;
                  return (
                    <TouchableOpacity key={n} onPress={() => setCourseRating(n)} activeOpacity={0.8}
                      style={[styles.npsBtn, { backgroundColor: c.bg, borderColor: c.border }, isSel && { backgroundColor: c.activeBg, borderColor: c.activeBg }]}>
                      <Text style={[styles.npsBtnText, { color: c.text }, isSel && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.npsLabels}><Text style={styles.npsLabelText}>Not satisfied</Text><Text style={styles.npsLabelText}>Very satisfied</Text></View>
              {courseRating !== null && <View style={styles.npsResult}><Text style={styles.npsResultText}>{getNpsLabel(courseRating)}</Text></View>}
            </View>
          )}

          {step === 3 && (
            <View style={styles.card}>
              <Text style={styles.stepTitle}>Instructor Rating</Text>
              <Text style={styles.stepDesc}>How would you rate{'\n'}<Text style={styles.highlight}>"{instructor}"</Text>?</Text>
              <View style={styles.npsGrid}>
                {NPS_SCALE.map(n => {
                  const c = getNpsColor(n);
                  const isSel = instructorRating === n;
                  return (
                    <TouchableOpacity key={n} onPress={() => setInstructorRating(n)} activeOpacity={0.8}
                      style={[styles.npsBtn, { backgroundColor: c.bg, borderColor: c.border }, isSel && { backgroundColor: c.activeBg, borderColor: c.activeBg }]}>
                      <Text style={[styles.npsBtnText, { color: c.text }, isSel && { color: '#fff' }]}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.npsLabels}><Text style={styles.npsLabelText}>Needs improvement</Text><Text style={styles.npsLabelText}>Excellent</Text></View>
              {instructorRating !== null && <View style={styles.npsResult}><Text style={styles.npsResultText}>{getInstructorLabel(instructorRating)}</Text></View>}
            </View>
          )}

          {step === 4 && (
            <View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>SUMMARY</Text>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Course</Text><Text style={styles.summaryValue} numberOfLines={1}>{selectedCourse}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Instructor</Text><Text style={styles.summaryValue}>{instructor}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Year / Term</Text><Text style={styles.summaryValue}>Year {academicYear} — Term {currentTerm}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Division</Text><Text style={styles.summaryValue}>{divisionLabel}</Text></View>
                <View style={styles.summaryScores}>
                  <View style={styles.scoreBox}><Text style={styles.scoreNum}>{courseRating}</Text><Text style={styles.scoreLabel}>Course</Text></View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreBox}><Text style={styles.scoreNum}>{instructorRating}</Text><Text style={styles.scoreLabel}>Instructor</Text></View>
                  <View style={styles.scoreDivider} />
                  <View style={styles.scoreBox}>
                    <Text style={[styles.scoreNum, styles.scoreAvg]}>{(((courseRating ?? 0) + (instructorRating ?? 0)) / 2).toFixed(1)}</Text>
                    <Text style={styles.scoreLabel}>Average</Text>
                  </View>
                </View>
              </View>
              <View style={styles.card}>
                <Text style={styles.stepTitle}>Any additional feedback?</Text>
                <Text style={styles.stepDesc}>Optional — but very helpful!</Text>
                <TextInput style={[styles.input, styles.textArea, commentsFocused && styles.inputFocused]}
                  placeholder="What could be improved? What did you love?" placeholderTextColor="#94a3b8"
                  value={comments} onChangeText={setComments}
                  onFocus={() => setCommentsFocused(true)} onBlur={() => setCommentsFocused(false)}
                  multiline numberOfLines={5} textAlignVertical="top" />
              </View>
            </View>
          )}

          <View style={styles.navRow}>
            {step < totalSteps ? (
              <TouchableOpacity style={[styles.nextBtn, checkingDuplicate && styles.btnDisabled]} onPress={goNext} disabled={checkingDuplicate} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>{checkingDuplicate ? 'Checking...' : 'Next →'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.nextBtn, loading && styles.btnDisabled]} onPress={handleSubmit} disabled={loading} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>{loading ? 'Submitting...' : 'Submit Rating 🎉'}</Text>
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

  divisionBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e1b4b', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#312e81' },
  divisionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(124,58,237,0.3)', alignItems: 'center', justifyContent: 'center' },
  divisionIconText: { fontSize: 18 },
  divisionLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '700', letterSpacing: 1.5 },
  divisionName: { fontSize: 14, fontWeight: '700', color: '#a78bfa', marginTop: 2 },

  stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepDot: { width: 28, height: 28, borderRadius: 99, backgroundColor: '#f5f3ff', borderWidth: 1.5, borderColor: '#ede9fe', alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  stepDotText: { fontSize: 11, fontWeight: '800', color: '#94a3b8' },
  stepDotTextActive: { color: '#fff' },
  stepLine: { width: 28, height: 2, backgroundColor: '#ede9fe' },
  stepLineActive: { backgroundColor: '#7c3aed' },

  card: { backgroundColor: '#fff', borderRadius: 20, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#ede9fe', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b', marginBottom: 6 },
  stepDesc: { fontSize: 13, color: '#94a3b8', fontWeight: '500', marginBottom: 20, lineHeight: 20 },
  highlight: { color: '#7c3aed', fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 1.2, marginBottom: 12 },
  sectionLabelFocused: { color: '#7c3aed' },
  infoRow: { padding: 12, backgroundColor: '#f5f3ff', borderRadius: 12, alignItems: 'center' },
  infoText: { fontSize: 14, fontWeight: '600', color: '#7c3aed' },

  courseList: { gap: 8 },
  courseItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, backgroundColor: '#fafafa', borderWidth: 1.5, borderColor: '#f1f5f9' },
  courseItemSel: { backgroundColor: '#f5f3ff', borderColor: '#7c3aed' },
  courseItemRated: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', opacity: 0.8 },
  courseNum: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#ede9fe', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  courseNumSel: { backgroundColor: '#7c3aed' },
  courseNumRated: { backgroundColor: '#10b981' },
  courseNumText: { fontSize: 11, fontWeight: '800', color: '#7c3aed' },
  courseNumTextSel: { color: '#fff' },
  courseNumTextRated: { color: '#fff' },
  courseName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1e1b4b' },
  courseNameSel: { color: '#7c3aed' },
  courseNameRated: { color: '#94a3b8' },
  courseCheck: { fontSize: 14, color: '#7c3aed', fontWeight: '800' },
  ratedBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: '#d1fae5' },
  ratedBadgeText: { fontSize: 10, fontWeight: '700', color: '#059669' },
  noCourses: { padding: 20, alignItems: 'center' },
  noCoursesText: { fontSize: 13, color: '#94a3b8', fontWeight: '500' },
  noCoursesSubText: { fontSize: 11, color: '#c084fc', marginTop: 4 },

  input: { height: 50, borderRadius: 12, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe', paddingHorizontal: 16, fontSize: 14, color: '#1e1b4b', fontWeight: '500' },
  inputFocused: { borderColor: '#7c3aed', backgroundColor: '#fff', shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.15, shadowRadius: 6 },
  textArea: { height: 120, paddingTop: 14 },

  npsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  npsBtn: { width: '17%', aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  npsBtnText: { fontSize: 14, fontWeight: '800' },
  npsLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  npsLabelText: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  npsResult: { backgroundColor: '#f5f3ff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ede9fe' },
  npsResultText: { fontSize: 14, fontWeight: '700', color: '#7c3aed' },

  summaryCard: { backgroundColor: '#1e1b4b', borderRadius: 20, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: '#312e81' },
  summaryTitle: { fontSize: 11, fontWeight: '700', color: '#a5b4fc', letterSpacing: 1.2, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  summaryValue: { fontSize: 12, color: '#e2e8f0', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  summaryScores: { flexDirection: 'row', marginTop: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 14 },
  scoreBox: { flex: 1, alignItems: 'center' },
  scoreNum: { fontSize: 28, fontWeight: '800', color: '#a78bfa' },
  scoreAvg: { color: '#06b6d4' },
  scoreLabel: { fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginTop: 2 },
  scoreDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 8 },

  navRow: { marginTop: 4 },
  nextBtn: { height: 54, borderRadius: 16, backgroundColor: '#1e1b4b', alignItems: 'center', justifyContent: 'center', shadowColor: '#1e1b4b', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 14, elevation: 8 },
  btnDisabled: { opacity: 0.6 },
  nextBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.5 },
});