import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  sendPasswordResetEmail, 
  UserCredential,
  Auth
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  enableNetwork,
  Firestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  Timestamp,
} from "firebase/firestore";
import { firebaseConfig } from "@/config/firebase";

const getFirebaseApp = (): FirebaseApp => {
  const existingApps = getApps();
  if (existingApps.length > 0) return getApp();
  if (!firebaseConfig?.apiKey) {
    throw new Error("Firebase config is missing. Add your Firebase options in mobile/config/firebase.ts");
  }
  return initializeApp(firebaseConfig);
};

const app: FirebaseApp = getFirebaseApp();
export const auth: Auth = getAuth(app);

export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, { experimentalForceLongPolling: true });
  } catch {
    return getFirestore(app);
  }
})();

enableNetwork(db).catch(() => {});

export type UserRole = "admin" | "user";

export interface UserProfile {
  email: string;
  displayName?: string | null;
  role: UserRole;
  isApproved?: boolean;
  /** When true, student users cannot use the app (checked after load / realtime). */
  isBanned?: boolean;
  department?: string;
  division?: string;
  academicCode?: string;
  /** Study level used with `currentTerm` to filter courses (defaults: 2, 1). */
  academicYear?: number;
  /** Semester / term (1 or 2). */
  currentTerm?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const COLLECTIONS = {
  USERS: "users",
  TICKETS: "tickets",
  TICKET_MESSAGES: "messages",
  TICKET_CATEGORIES: "ticketCategories",
  COURSES: "courses",
  FEEDBACK: "feedback",
  ENROLLMENTS: "enrollments",
  NOTIFICATIONS: "notifications",
} as const;

/** Max courses a student may enroll in (admins may exceed in Firestore). */
export const MAX_STUDENT_ENROLLMENT_COURSES = 5;

export type InAppNotificationType =
  | "complaint_reply"
  | "enrollment_edited"
  | "account_banned"
  | "account_unbanned";

export interface InAppNotificationRecord {
  userId: string;
  type: InAppNotificationType;
  title: string;
  body: string;
  read: boolean;
  createdAt: Timestamp;
  meta?: Record<string, string>;
}

/** One doc per student: `enrollments/{userId}` */
export interface EnrollmentRecord {
  userId: string;
  userEmail?: string | null;
  /** Firestore `courses` document IDs */
  courseIds: string[];
  division: string;
  academicYear: number;
  term: number;
  submitted: boolean;
  submittedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CourseRatingPayload = {
  userId: string;
  userEmail: string;
  courseName: string;
  instructor: string;
  courseRating: number;
  instructorRating: number;
  comments: string;
  year?: number;
  term?: number;
  division?: string;
  createdAt: Timestamp;
};

// ── Submit new rating ─────────────────────────────────────────
export async function submitCourseRating(
  userId: string,
  userEmail: string,
  data: {
    courseName: string;
    instructor: string;
    courseRating: number;
    instructorRating: number;
    comments: string;
    year?: number;
    term?: number;
    division?: string;
  }
): Promise<void> {
  const ref = collection(db, COLLECTIONS.FEEDBACK);
  await addDoc(ref, {
    userId,
    userEmail,
    courseName: data.courseName.trim(),
    instructor: data.instructor.trim(),
    courseRating: data.courseRating,
    instructorRating: data.instructorRating,
    comments: (data.comments || "").trim(),
    year: data.year ?? null,
    term: data.term ?? null,
    division: data.division ?? null,
    createdAt: Timestamp.now(),
  });
}

// ── Update existing rating ────────────────────────────────────
export async function updateCourseRating(
  feedbackId: string,
  data: {
    instructor: string;
    courseRating: number;
    instructorRating: number;
    comments: string;
  }
): Promise<void> {
  const ref = doc(db, COLLECTIONS.FEEDBACK, feedbackId);
  await updateDoc(ref, {
    instructor: data.instructor.trim(),
    courseRating: data.courseRating,
    instructorRating: data.instructorRating,
    comments: (data.comments || "").trim(),
    updatedAt: Timestamp.now(),
  });
}

// ── Delete rating ─────────────────────────────────────────────
export async function deleteCourseRating(feedbackId: string): Promise<void> {
  const ref = doc(db, COLLECTIONS.FEEDBACK, feedbackId);
  await deleteDoc(ref);
}

export const TICKET_TYPES = [
  { value: "technical_issue", label: "Technical issue" },
  { value: "complaint", label: "Complaint" },
  { value: "request", label: "Request" },
  { value: "other", label: "Other" },
] as const;

export type TicketType = (typeof TICKET_TYPES)[number]["value"];

export type TicketPayload = {
  userId: string;
  userEmail: string;
  type: TicketType;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: Timestamp;
  adminReply?: string;
  repliedAt?: Timestamp;
  repliedBy?: string;
};

export async function replyToTicket(
  ticketId: string,
  adminEmail: string,
  replyText: string
): Promise<void> {
  const ref = doc(db, COLLECTIONS.TICKETS, ticketId);
  await updateDoc(ref, {
    adminReply: replyText.trim(),
    repliedAt: Timestamp.now(),
    repliedBy: adminEmail,
    status: "replied",
  });
}

export async function submitTicket(
  userId: string,
  userEmail: string,
  data: { type: TicketType; title: string; description: string; priority: string }
): Promise<void> {
  const ref = collection(db, COLLECTIONS.TICKETS);
  await addDoc(ref, {
    userId,
    userEmail,
    type: data.type,
    title: data.title.trim(),
    description: data.description.trim(),
    priority: data.priority,
    status: "open",
    createdAt: Timestamp.now(),
  });
}

export function getUserDocRef(uid: string) {
  return doc(db, COLLECTIONS.USERS, uid);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(getUserDocRef(uid));
  return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
}

export async function signUpUser(
  email: string,
  password: string,
  role: UserRole,
  userData?: {
    displayName?: string;
    department?: string;
    division?: string;
    academicCode?: string;
    academicYear?: number;
    currentTerm?: number;
  },
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;
  const now = Timestamp.now();

  await setDoc(getUserDocRef(uid), {
    email,
    displayName: userData?.displayName ?? null,
    role,
    isApproved: role === "admin" ? false : true,
    ...(role === "user" && userData?.department ? { department: userData.department } : {}),
    ...(role === "user" && userData?.division ? { division: userData.division } : {}),
    academicCode: userData?.academicCode ?? null,
    ...(role === "user" && userData?.academicYear != null
      ? { academicYear: Number(userData.academicYear) }
      : {}),
    ...(role === "user" && userData?.currentTerm != null
      ? { currentTerm: Number(userData.currentTerm) }
      : {}),
    createdAt: now,
    updatedAt: now,
  });

  return credential;
}

export async function loginUser(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// ── In-app notifications (created by admins / admin flows only; see firestore.rules) ──

export async function createInAppNotification(
  data: Omit<InAppNotificationRecord, "createdAt" | "read"> & { read?: boolean },
): Promise<void> {
  const ref = collection(db, COLLECTIONS.NOTIFICATIONS);
  await addDoc(ref, {
    userId: data.userId,
    type: data.type,
    title: data.title,
    body: data.body,
    read: data.read ?? false,
    createdAt: Timestamp.now(),
    ...(data.meta && Object.keys(data.meta).length > 0 ? { meta: data.meta } : {}),
  });
}

export function getEnrollmentDocRef(userId: string) {
  return doc(db, COLLECTIONS.ENROLLMENTS, userId);
}
