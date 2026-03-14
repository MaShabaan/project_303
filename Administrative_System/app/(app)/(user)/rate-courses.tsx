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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { submitCourseRating, db, COLLECTIONS } from '@/services/firebase';
import { router } from 'expo-router';

const COURSES_DATA: Record<string, Record<number, Record<number, string[]>>> = {
  shared: {
    2: {
      1: ['Linear Algebra 1', 'Calculus 3', 'Newtonian Mechanics 2', 'Oriented Programming', 'Introduction to Probability Theory'],
      2: ['Linear Algebra 2', 'Discrete Math', 'Principles of Mathematical Analysis', 'Differential Equations', 'Analytical Mechanics', 'Data Structure'],
    },
  },
  special_mathematics: {
    3: {
      1: ['Abstract Algebra (1)', 'Real Analysis (1)', 'Mechanics of Modified Media (1)', 'Electromagnetism and Relativity (1)'],
      2: ['Abstract Algebra (2)', 'Topology', 'Real Analysis (2)', 'Functional Analysis', 'Mechanics of Continuous Media (2)'],
    },
    4: {
      1: ['Differential Geometry (1)', 'Complex Analysis (1)', 'Partial Differential Equations (1)', 'Quantum Mechanics (1)'],
      2: ['Differential Geometry (2)', 'Complex Analysis (2)', 'Quantum Mechanics (2)', 'Nonlinear Mechanics', 'Numerical Solutions to Integral Equations'],
    },
  },
  computer_science: {
    3: {
      1: ['Computer Logic', 'Computer Graphics', 'System Analysis', 'Database 1', 'Algorithms', 'Boolean Algebra 1'],
      2: ['Operating Systems', 'Database 2', 'Distributed Systems', 'File Structure', 'Boolean Algebra 2', 'Software Engineering'],
    },
    4: {
      1: ['Numbers Theory', 'Computer Networks', 'Automata', 'Neural Networks', 'Advanced Computer Graphics'],
      2: ['Cryptography Theory', 'Designing Programming Languages', 'Artificial Intelligence', 'Advanced Operating Systems', 'Advanced Computer Networks'],
    },
  },
};

const getCoursesForDivision = (division: string, year: number, term: number): string[] => {
  const shared = COURSES_DATA.shared[year]?.[term] ?? [];
  const specific = COURSES_DATA[division]?.[year]?.[term] ?? [];
  return [...shared, ...specific];
};

const YEARS = [2, 3, 4];
const TERMS = [1, 2];
const NPS_SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

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

  const division = profile?.division ?? 'computer_science';
  const divisionLabel = division === 'computer_science' ? 'Computer Science' : 'Special Mathematics';
  const divisionIcon = division === 'computer_science' ? '💻' : '📐';

  const [step, setStep] = useState(1);
  const [selectedYear, setSelectedYear] = useState<number>(2);
  const [selectedTerm, setSelectedTerm] = useState<number>(1);
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

  const fadeAnim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.spring(fadeAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
      delay: 100,
    }).start();
    loadRatedCourses();
  }, []);

  // جيب كل المواد اللي اليوزر قيّمها قبل كده
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

  const availableCourses = getCoursesForDivision(division, selectedYear, selectedTerm);

  const goNext = async () => {
    if (step === 1) {
      if (!selectedCourse) { Alert.alert('Required', 'Please select a course.'); return; }
      if (!instructor.trim()) { Alert.alert('Required', 'Please enter the instructor name.'); return; }

      //  Check duplicate قبل ما يكمل
      setCheckingDuplicate(true);
      try {
        const q = query(
          collection(db, COLLECTIONS.FEEDBACK),
          where('userId', '==', user?.uid),
          where('courseName', '==', selectedCourse)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          Alert.alert(
            '⚠️ Already Rated',
            `You have already rated "${selectedCourse}" before.\n\nYou can only rate each course once.`,
            [{ text: 'OK' }]
          );
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
        year: selectedYear,
        term: selectedTerm,
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
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>

          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={goBack} activeOpacity={0.8} style={styles.progressCircleWrap}>
              <Svg width={SIZE} height={SIZE}>
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#ede9fe" strokeWidth={3} />
                <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke={strokeColor} strokeWidth={3}
                  strokeDasharray={`${CIRCUMFERENCE}`} strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round" rotation="-90" origin={`${SIZE / 2}, ${SIZE / 2}`} />
              </Svg>
              <View style={[styles.progressCircleInner, { backgroundColor: innerBg }]}>
                <Text style={[styles.progressCircleText, { color: innerColor }]}>{isComplete ? '✓' : '←'}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Rate a Course</Text>
              <Text style={styles.headerSub}>Step {step} of {totalSteps}</Text>
            </View>
            <View style={{ width: 48 }} />
          </View>

          {/* Division Banner */}
          <View style={styles.divisionBanner}>
            <View style={styles.divisionIcon}><Text style={styles.divisionIconText}>{divisionIcon}</Text></View>
            <View>
              <Text style={styles.divisionLabel}>YOUR DIVISION</Text>
              <Text style={styles.divisionName}>{divisionLabel}</Text>
            </View>
          </View>

          {/* Step Dots */}
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

          {/* Step 1 */}
          {step === 1 && (
            <View>
              <View style={styles.card}>
                <Text style={styles.sectionLabel}>SELECT YEAR</Text>
                <View style={styles.yearRow}>
                  {YEARS.map(y => (
                    <TouchableOpacity key={y} style={[styles.yearBtn, selectedYear === y && styles.yearBtnActive]}
                      onPress={() => { setSelectedYear(y); setSelectedCourse(null); }} activeOpacity={0.8}>
                      <Text style={[styles.yearBtnText, selectedYear === y && styles.yearBtnTextActive]}>Year {y}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionLabel}>SELECT TERM</Text>
                <View style={styles.termRow}>
                  {TERMS.map(t => (
                    <TouchableOpacity key={t} style={[styles.termBtn, selectedTerm === t && styles.termBtnActive]}
                      onPress={() => { setSelectedTerm(t); setSelectedCourse(null); }} activeOpacity={0.8}>
                      <Text style={[styles.termBtnText, selectedTerm === t && styles.termBtnTextActive]}>Term {t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.card}>
                <Text style={styles.sectionLabel}>SELECT COURSE</Text>
                {availableCourses.length === 0 ? (
                  <View style={styles.noCourses}><Text style={styles.noCoursesText}>No courses for this selection</Text></View>
                ) : (
                  <View style={styles.courseList}>
                    {availableCourses.map((course, i) => {
                      const alreadyRated = isAlreadyRated(course);
                      const isSelected = selectedCourse === course;
                      return (
                        <TouchableOpacity
                          key={i}
                          style={[
                            styles.courseItem,
                            isSelected && styles.courseItemSel,
                            alreadyRated && styles.courseItemRated,
                          ]}
                          onPress={() => {
                            if (alreadyRated) {
                              Alert.alert('Already Rated ✓', `You've already rated "${course}".`);
                              return;
                            }
                            setSelectedCourse(course);
                          }}
                          activeOpacity={alreadyRated ? 0.5 : 0.8}
                        >
                          <View style={[
                            styles.courseNum,
                            isSelected && styles.courseNumSel,
                            alreadyRated && styles.courseNumRated,
                          ]}>
                            <Text style={[
                              styles.courseNumText,
                              isSelected && styles.courseNumTextSel,
                              alreadyRated && styles.courseNumTextRated,
                            ]}>
                              {alreadyRated ? '✓' : i + 1}
                            </Text>
                          </View>
                          <Text style={[
                            styles.courseName,
                            isSelected && styles.courseNameSel,
                            alreadyRated && styles.courseNameRated,
                          ]}>
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

          {/* Step 2 */}
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

          {/* Step 3 */}
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

          {/* Step 4 */}
          {step === 4 && (
            <View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>SUMMARY</Text>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Course</Text><Text style={styles.summaryValue} numberOfLines={1}>{selectedCourse}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Instructor</Text><Text style={styles.summaryValue}>{instructor}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Year / Term</Text><Text style={styles.summaryValue}>Year {selectedYear} — Term {selectedTerm}</Text></View>
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

          {/* Nav */}
          <View style={styles.navRow}>
            {step < totalSteps ? (
              <TouchableOpacity
                style={[styles.nextBtn, checkingDuplicate && styles.btnDisabled]}
                onPress={goNext}
                disabled={checkingDuplicate}
                activeOpacity={0.85}
              >
                <Text style={styles.nextBtnText}>
                  {checkingDuplicate ? 'Checking...' : 'Next →'}
                </Text>
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

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerCenter: { alignItems: 'center', flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1e1b4b' },
  headerSub: { fontSize: 11, color: '#94a3b8', fontWeight: '500', marginTop: 2 },
  progressCircleWrap: { width: 48, height: 48 },
  progressCircleInner: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  progressCircleText: { fontSize: 16, fontWeight: '800' },

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

  yearRow: { flexDirection: 'row', gap: 8 },
  yearBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe', alignItems: 'center' },
  yearBtnActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  yearBtnText: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
  yearBtnTextActive: { color: '#fff' },

  termRow: { flexDirection: 'row', gap: 10 },
  termBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#f8f7ff', borderWidth: 1.5, borderColor: '#ede9fe', alignItems: 'center' },
  termBtnActive: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  termBtnText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  termBtnTextActive: { color: '#fff' },

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
