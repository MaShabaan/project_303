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
  collection,
  Timestamp,
} from "firebase/firestore";
import { firebaseConfig } from "@/config/firebase";

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

export const auth: Auth = getAuth(app);

export const db: Firestore = (() => {
  try {
    return initializeFirestore(app, {
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
})();

enableNetwork(db).catch(() => {});

export type UserRole = "admin" | "user";

// ✅ أضفنا department و division هنا
export interface UserProfile {
  email: string;
  displayName?: string | null;
  role: UserRole;
  isApproved?: boolean;
  department?: string;
  division?: string;
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
} as const;

export type CourseRatingPayload = {
  userId: string;
  userEmail: string;
  courseName: string;
  instructor: string;
  courseRating: number;
  instructorRating: number;
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
    userId,
    userEmail,
    courseName: data.courseName.trim(),
    instructor: data.instructor.trim(),
    courseRating: data.courseRating,
    instructorRating: data.instructorRating,
    comments: (data.comments || "").trim(),
    createdAt: Timestamp.now(),
  });
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

// ✅ أضفنا department و division في signUpUser
export async function signUpUser(
  email: string,
  password: string,
  role: UserRole,
  userData?: {
    displayName?: string;
    department?: string;
    division?: string;
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
    // ✅ بيتخزنوا في Firestore بس لو role === "user"
    ...(role === "user" && userData?.department
      ? { department: userData.department }
      : {}),
    ...(role === "user" && userData?.division
      ? { division: userData.division }
      : {}),
    createdAt: now,
    updatedAt: now,
  });

  return credential;
}

export async function loginUser(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logoutUser(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}
