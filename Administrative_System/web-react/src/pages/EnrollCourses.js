import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { COLLECTIONS, MAX_STUDENT_ENROLLMENT_COURSES, createInAppNotification, db } from "../services/firebase";
import "./EnrollCourses.css";

const ACCENT = "#764ba2";

// You'll need to add this helper function to your firebase service
const getEnrollmentDocRef = (userId) => doc(db, COLLECTIONS.ENROLLMENTS, userId);

// Add this to your firebase.js COLLECTIONS object
// ENROLLMENTS: "enrollments",

export default function EnrollCourses({ user, profile, onBack }) {
  const division = profile?.division ?? "computer_science";
  const academicYear = profile?.academicYear ?? 2;
  const term = profile?.currentTerm ?? 1;
  const departmentLabel = profile?.department ?? "Mathematics Department";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [courseNamesById, setCourseNamesById] = useState({});

  useEffect(() => {
    if (!user?.uid) return;
    const ref = getEnrollmentDocRef(user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setEnrollment(null);
        } else {
          const data = snap.data();
          setEnrollment(data);
          setSelected(new Set(data.courseIds ?? []));
        }
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = query(
          collection(db, COLLECTIONS.COURSES),
          where("division", "==", division),
          where("year", "==", academicYear),
          where("term", "==", term),
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        const list = snap.docs.map((d) => {
          const x = d.data();
          const name =
            (typeof x.courseName === "string" && x.courseName) ||
            (typeof x.name === "string" && x.name) ||
            "Course";
          const code = typeof x.courseCode === "string" ? x.courseCode : "";
          return { id: d.id, courseName: name, courseCode: code };
        });
        list.sort((a, b) => a.courseName.localeCompare(b.courseName));
        setCourses(list);
        const nm = {};
        list.forEach((c) => {
          nm[c.id] = c.courseName;
        });
        setCourseNamesById(nm);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [division, academicYear, term]);

  const submitted = enrollment?.submitted === true;
  const canEdit = !submitted;

  const toggle = (courseId) => {
    if (!canEdit) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        if (next.size >= MAX_STUDENT_ENROLLMENT_COURSES) {
          alert(
            `You can enroll in at most ${MAX_STUDENT_ENROLLMENT_COURSES} courses.`
          );
          return prev;
        }
        next.add(courseId);
      }
      return next;
    });
  };

  const submitFinal = async () => {
    if (!user?.uid || !profile) return;
    if (selected.size === 0) {
      alert("Choose at least one course before submitting.");
      return;
    }
    if (selected.size > MAX_STUDENT_ENROLLMENT_COURSES) {
      alert(`Maximum ${MAX_STUDENT_ENROLLMENT_COURSES} courses.`);
      return;
    }
    setSubmitting(true);
    try {
      const ref = getEnrollmentDocRef(user.uid);
      const snap = await getDoc(ref);
      const now = Timestamp.now();
      const base = {
        userId: user.uid,
        userEmail: profile.email ?? null,
        courseIds: Array.from(selected),
        division,
        academicYear,
        term,
        updatedAt: now,
      };
      const batch = writeBatch(db);
      let ops = 0;
      if (!snap.exists()) {
        batch.set(ref, {
          ...base,
          submitted: false,
          submittedAt: null,
          createdAt: now,
        });
        ops += 1;
        batch.update(ref, {
          ...base,
          submitted: true,
          submittedAt: now,
        });
        ops += 1;
      } else if (!snap.data().submitted) {
        batch.update(ref, {
          ...base,
          submitted: true,
          submittedAt: now,
        });
        ops += 1;
      }
      if (ops > 0) await batch.commit();

      await createInAppNotification({
        userId: user.uid,
        type: "enrollment_edited",
        title: "✅ Enrollment submitted",
        body: `You have successfully enrolled in ${selected.size} course(s) for Year ${academicYear} Term ${term}.`,
        read: false,
      });

      alert("Your enrollment is locked. Contact an administrator to make changes.");
      if (onBack) onBack();
    } catch (e) {
      console.error(e);
      alert("Could not submit enrollment. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!enrollment?.submitted || !enrollment.courseIds?.length) return;
    const ids = enrollment.courseIds;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        ids.map(async (id) => {
          const snap = await getDoc(doc(db, COLLECTIONS.COURSES, id));
          if (!snap.exists()) return [id, id];
          const x = snap.data();
          const name =
            (typeof x.courseName === "string" && x.courseName) ||
            (typeof x.name === "string" && x.name) ||
            id;
          return [id, name];
        }),
      );
      if (cancelled) return;
      setCourseNamesById((prev) => {
        const next = { ...prev };
        entries.forEach(([id, name]) => {
          if (next[id] !== name) next[id] = name;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [enrollment?.submitted, enrollment?.courseIds?.join("|")]);

  const summary = useMemo(() => {
    if (!enrollment?.submitted) return null;
    const ids = enrollment.courseIds ?? [];
    return ids.map((id) => courseNamesById[id] || id);
  }, [enrollment, courseNamesById]);

  if (loading) {
    return (
      <div className="centered">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header-gradient">
        <button className="back-button" onClick={() => onBack && onBack()}>
          ←
        </button>
        <div className="header-center">
          <h1 className="header-title">📚 Course Enrollment</h1>
          <p className="header-subtitle">Term {term} · Year {academicYear}</p>
        </div>
        <div style={{ width: 40 }}></div>
      </div>

      <div className="content">
        <div className="content-container">
          <div className="info-card">
            <p className="info-label">Your context</p>
            <p className="info-text">{departmentLabel}</p>
            <p className="info-sub">
              Division: {division === "computer_science" ? "Computer Science" : "Special Mathematics"} · Year{" "}
              {academicYear} · Term {term}
            </p>
            <p className="hint">
              Showing only courses for Term {term}. You may enroll in up to{" "}
              {MAX_STUDENT_ENROLLMENT_COURSES} courses.
            </p>
          </div>

          {submitted ? (
            <div className="locked-card">
              <div className="lock-icon">🔒</div>
              <h3 className="locked-title">Enrollment submitted</h3>
              <p className="locked-body">
                Your choices are locked. Only an administrator can change them.
              </p>
              {summary && summary.length > 0 ? (
                <div className="read-list">
                  {summary.map((name, i) => (
                    <p key={i} className="read-item">
                      • {name}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="muted">Loading course names…</p>
              )}
            </div>
          ) : (
            <>
              <p className="section-title">
                Select up to {MAX_STUDENT_ENROLLMENT_COURSES} courses ({selected.size} selected)
              </p>
              {courses.length === 0 ? (
                <p className="muted">No courses found for Term {term}. Check back later.</p>
              ) : (
                courses.map((c) => {
                  const on = selected.has(c.id);
                  const atCap = selected.size >= MAX_STUDENT_ENROLLMENT_COURSES && !on;
                  return (
                    <button
                      key={c.id}
                      className={`course-row ${on ? "course-row-on" : ""} ${atCap && !on ? "course-row-disabled" : ""}`}
                      onClick={() => toggle(c.id)}
                      disabled={atCap}
                    >
                      <div className="check">
                        {on ? (
                          <span className="checkbox-checked">✓</span>
                        ) : (
                          <span className="checkbox-unchecked">□</span>
                        )}
                      </div>
                      <div className="course-info">
                        <p className="course-name">{c.courseName}</p>
                        {c.courseCode && <p className="course-code">{c.courseCode}</p>}
                      </div>
                    </button>
                  );
                })
              )}

              <button
                className={`primary-btn ${submitting ? "btn-disabled" : ""}`}
                onClick={submitFinal}
                disabled={submitting}
              >
                {submitting ? (
                  <div className="spinner-small"></div>
                ) : (
                  "Submit enrollment"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}