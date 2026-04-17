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
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { firebaseConfig } from "@/config/firebase";

const getFirebaseApp = (): FirebaseApp => {
  const existingApps = getApps();
  if (existingApps.length > 0) return getApp();
  if (!firebaseConfig?.apiKey) {
    throw new Error("Firebase config is missing.");
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

export type UserRole = "admin" | "user" | "super_admin";

export interface UserProfile {
  uid?: string;
  email: string;
  displayName?: string | null;
  role: UserRole;
  isApproved?: boolean;
  /** When true, student users cannot use the app (checked after load / realtime). */
  isBanned?: boolean;
  department?: string;
  division?: string;
  academicCode?: string;
  semester?: number;
  isBlocked?: boolean;
  blockDetails?: {
    reason: string;
    duration: string;
    blockedBy: string;
    blockedByRole: string;
    blockedAt: Timestamp;
    expiresAt: Timestamp | null;
  } | null;
  /** Study level used with `currentTerm` to filter courses (defaults: 2, 1). */
  academicYear?: number;
  /** Semester / term (1 or 2). */
  currentTerm?: number;
  permissions?: {
    manage_courses?: boolean;
    manage_enrollments?: boolean;
    view_feedback?: boolean;
    manage_complaints?: boolean;
    view_users?: boolean;
    manage_users?: boolean;
    manage_admins?: boolean;
  };
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

const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com', 'Tbarckyasir@gmail.com'];

export async function getAllUsers(): Promise<(UserProfile & { id: string })[]> {
  const usersRef = collection(db, COLLECTIONS.USERS);
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as (UserProfile & { id: string })[];
}

export async function checkAcademicCodeExists(academicCode: string): Promise<boolean> {
  const q = query(
    collection(db, COLLECTIONS.USERS),
    where("academicCode", "==", academicCode)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function promoteToAdmin(userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    role: "admin",
    isApproved: true,
    updatedAt: Timestamp.now(),
  });
}

export async function demoteFromAdmin(userId: string): Promise<void> {
  await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
    role: "user",
    isApproved: true,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteUser(userId: string, currentUserEmail: string): Promise<void> {
  if (!SUPER_ADMINS.includes(currentUserEmail)) {
    throw new Error('Only super admins can delete users');
  }
  
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  
  if (SUPER_ADMINS.includes(userData?.email || '')) {
    throw new Error('Cannot delete super admin account');
  }
  
  await deleteDoc(userRef);
}

export async function blockUser(
  userId: string,
  reason: string,
  duration: '2days' | '1week' | '1month' | 'permanent',
  currentUser: UserProfile
): Promise<void> {
  const isSuperAdmin = SUPER_ADMINS.includes(currentUser.email);
  
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);
  const targetUser = userDoc.data() as UserProfile;
  
  if (targetUser.email === currentUser.email) {
    throw new Error('You cannot block yourself');
  }
  
  if (SUPER_ADMINS.includes(targetUser.email)) {
    throw new Error('Cannot block super admin');
  }
  
  if (!isSuperAdmin && currentUser.role !== 'admin') {
    throw new Error('Only admins can block users');
  }
  
  let expiresAt: Timestamp | null = null;
  const now = Timestamp.now();
  
  switch (duration) {
    case '2days':
      expiresAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 2 * 24 * 60 * 60 * 1000));
      break;
    case '1week':
      expiresAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 7 * 24 * 60 * 60 * 1000));
      break;
    case '1month':
      expiresAt = Timestamp.fromDate(new Date(now.toDate().getTime() + 30 * 24 * 60 * 60 * 1000));
      break;
    case 'permanent':
      expiresAt = null;
      break;
  }
  
  await updateDoc(userRef, {
    isBlocked: true,
    blockDetails: {
      reason: reason,
      duration: duration,
      blockedBy: currentUser.email,
      blockedByRole: currentUser.role,
      blockedAt: now,
      expiresAt: expiresAt,
    },
    updatedAt: now,
  });
}

export async function unblockUser(userId: string, currentUser: UserProfile): Promise<void> {
  const isSuperAdmin = SUPER_ADMINS.includes(currentUser.email);
  
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);
  const targetUser = userDoc.data() as UserProfile;
  
  if (!isSuperAdmin && currentUser.role === 'admin') {
    if (targetUser.blockDetails?.blockedBy !== currentUser.email) {
      throw new Error('You can only unblock users you blocked yourself');
    }
  }
  
  await updateDoc(userRef, {
    isBlocked: false,
    blockDetails: null,
    updatedAt: Timestamp.now(),
  });
}

export async function autoUnblockExpiredUsers(): Promise<number> {
  try {
    const usersRef = collection(db, COLLECTIONS.USERS);
    const q = query(usersRef, where("isBlocked", "==", true));
    const snapshot = await getDocs(q);
    const now = Timestamp.now();
    let unblockedCount = 0;
    
    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      if (userData.blockDetails?.expiresAt && userData.blockDetails.expiresAt < now) {
        await updateDoc(doc(db, COLLECTIONS.USERS, userDoc.id), {
          isBlocked: false,
          blockDetails: null,
          updatedAt: now,
        });
        unblockedCount++;
      }
    }
    
    return unblockedCount;
  } catch (error) {
    console.error("Error in autoUnblockExpiredUsers:", error);
    return 0;
  }
}

export async function updateUserPermissions(
  userId: string,
  permissions: {
    manage_courses: boolean;
    manage_enrollments: boolean;
    view_feedback: boolean;
    manage_complaints: boolean;
    view_users: boolean;
    manage_users: boolean;
    manage_admins: boolean;
  },
  currentUserEmail: string
): Promise<void> {
  if (!SUPER_ADMINS.includes(currentUserEmail)) {
    throw new Error('Only super admins can update permissions');
  }
  
  const userRef = doc(db, COLLECTIONS.USERS, userId);
  const userDoc = await getDoc(userRef);
  const userData = userDoc.data();
  
  if (SUPER_ADMINS.includes(userData?.email || '')) {
    throw new Error('Cannot change super admin permissions');
  }
  
  await updateDoc(userRef, {
    permissions: permissions,
    updatedAt: Timestamp.now(),
  });
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

export async function deleteCourseRating(feedbackId: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTIONS.FEEDBACK, feedbackId));
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
  await updateDoc(doc(db, COLLECTIONS.TICKETS, ticketId), {
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
  await addDoc(collection(db, COLLECTIONS.TICKETS), {
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
  if (!userDoc.exists()) return null;
  const data = userDoc.data() as UserProfile;
  return { ...data, uid: userDoc.id };
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
    semester?: number;
    academicYear?: number;
    currentTerm?: number;
  },
): Promise<UserCredential> {
  
  if (userData?.academicCode) {
    const exists = await checkAcademicCodeExists(userData.academicCode);
    if (exists) {
      throw new Error("Academic code already exists. Please contact support.");
    }
  }

  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;
  const now = Timestamp.now();

  await setDoc(getUserDocRef(uid), {
    email,
    displayName: userData?.displayName ?? null,
    role,
    isApproved: role === "admin" ? false : true,
    isBlocked: false,
    isBanned: false,
    ...(userData?.department ? { department: userData.department } : {}),
    ...(userData?.division ? { division: userData.division } : {}),
    ...(userData?.semester !== undefined ? { semester: userData.semester } : {}),
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
