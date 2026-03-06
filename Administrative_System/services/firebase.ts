/**
 * Firebase Initialization & Services
 *
 * Initializes Firebase Auth, Firestore, and (optionally) Storage.
 * Use this file for all Firebase-related initialization.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
  UserCredential,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  enableNetwork,
  Firestore,
  doc,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '@/config/firebase';

// Required when not deployed to Firebase Hosting (e.g. React Native/Expo)
const getFirebaseApp = (): FirebaseApp => {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return getApp();
  }
  if (!firebaseConfig?.apiKey) {
    throw new Error(
      'Firebase config is missing. Add your Firebase options in mobile/config/firebase.ts'
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
export type UserRole = 'admin' | 'user';

// User profile stored in Firestore
export interface UserProfile {
  email: string;
  displayName?: string | null;
  role: UserRole;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  TICKETS: 'tickets',
  TICKET_MESSAGES: 'messages',
  TICKET_CATEGORIES: 'ticketCategories',
  COURSES: 'courses',
  FEEDBACK: 'feedback',
  ENROLLMENTS: 'enrollments',
} as const;

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
  userData?: { displayName?: string }
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const { uid } = credential.user;
  const now = Timestamp.now();

  await setDoc(getUserDocRef(uid), {
    email,
    displayName: userData?.displayName ?? null,
    role,
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
  password: string
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
