/**
 * Firebase Initialization & Services
 *
 * Initializes Firebase Auth, Firestore, and (optionally) Storage.
 * Use this file for all Firebase-related initialization.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
  UserCredential,
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
  collection,
  Timestamp,
} from "firebase/firestore";
import { firebaseConfig } from "@/config/firebase";

// Required when not deployed to Firebase Hosting (e.g. React Native/Expo)
const getFirebaseApp = (): FirebaseApp => {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp();
  }
  if (!firebaseConfig?.apiKey) {
    throw new Error(
      "Firebase config is missing. Add your Firebase options in mobile/config/firebase.ts",
    );
  }
  return initializeApp(firebaseConfig);
};

const app: FirebaseApp = getFirebaseApp();

// Initialize services
export const auth: Auth = getAuth(app);
// Use initializeFirestore with long polling for React Native (fixes "client is offline")
export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

// Force Firestore online (fixes "client is offline" in React Native/Expo)
enableNetwork(db).catch(() => {});

// User role type
export type UserRole = "admin" | "user";

// User profile stored in Firestore
export interface UserProfile {
  email: string;
  displayName?: string | null;
  role: UserRole;
  isApproved?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection names
export const COLLECTIONS = {
  USERS: "users",
  TICKETS: "tickets",
  TICKET_MESSAGES: "messages",
  TICKET_CATEGORIES: "ticketCategories",
  COURSES: "courses",
  FEEDBACK: "feedback",
  ENROLLMENTS: "enrollments",
} as const;

// --- Course rating (feedback) ---
export type CourseRatingPayload = {
  userId: string;
  userEmail: string;
  courseName: string;
  instructor: string;
  courseRating: number; // 1-5
  instructorRating: number; // 1-5
  comments: string;
  createdAt: Timestamp;
};

export async function submitCourseRating(
  userId: string,
  userEmail: string,
  data: { courseName: string; instructor: string; courseRating: number; instructorRating: number; comments: string }
): Promise<void> {
  const ref = collection(db, COLLECTIONS.FEEDBACK);
  await addDoc(ref, {
    userId: userId,
    userEmail,
    courseName: data.courseName.trim(),
    instructor: data.instructor.trim(),
    courseRating: data.courseRating,
    instructorRating: data.instructorRating,
    comments: (data.comments || "").trim(),
    createdAt: Timestamp.now(),
  });
}

// --- Tickets (complaints) ---
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
    userId: userId, // CHANGED from userId to createdBy
    userEmail,
    type: data.type,
    title: data.title.trim(),
    description: data.description.trim(),
    priority: data.priority,
    status: "open",
    createdAt: Timestamp.now(),
  });
}

/**
 * Get user profile document reference
 */
export function getUserDocRef(uid: string) {
  return doc(db, COLLECTIONS.USERS, uid);
}

/**
 * Fetch user profile (including role) from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDoc = await getDoc(getUserDocRef(uid));
  return userDoc.exists() ? (userDoc.data() as UserProfile) : null;
}

/**
 * Sign up a new user with email/password and save profile to Firestore
 */
export async function signUpUser(
  email: string,
  password: string,
  role: UserRole,
  userData?: { displayName?: string },
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(
    auth,
    email,
    password,
  );
  const { uid } = credential.user;
  const now = Timestamp.now();

  await setDoc(getUserDocRef(uid), {
    email,
    displayName: userData?.displayName ?? null,
    role,
    isApproved: role === "admin" ? false : true,
    createdAt: now,
    updatedAt: now,
  });

  return credential;
}

/**
 * Sign in with email and password
 */
export async function loginUser(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out the current user
 */
export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
