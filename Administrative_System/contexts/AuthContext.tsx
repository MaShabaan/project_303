import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  auth,
  getUserProfile,
  signUpUser,
  loginUser,
  logoutUser,
  resetPassword,
  UserProfile,
  UserRole,
} from '@/services/firebase';
import { Timestamp } from 'firebase/firestore';

const USER_PROFILE_KEY = '@auth_user_profile';

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signUp: (
    email: string,
    password: string,
    role: UserRole,
    userData?: { 
      displayName?: string; 
      department?: string; 
      division?: string; 
      academicCode?: string;
      semester?: number;
    }
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  clearError: () => void;
  approveAdmin: (adminId: string) => Promise<void>;
  rejectAdmin: (adminId: string) => Promise<void>;
  getPendingAdmins: () => Promise<(UserProfile & { id: string })[]>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const SUPER_ADMINS = ['mshabaan295@gmail.com', 'hoda17753@gmail.com'];

  const loadUserProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null);
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
      return;
    }

    try {
      const userProfile = await getUserProfile(firebaseUser.uid);
      setProfile(userProfile ?? null);
      if (userProfile) {
        await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
      } else {
        await AsyncStorage.removeItem(USER_PROFILE_KEY);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(USER_PROFILE_KEY).then((stored) => {
      if (stored) {
        try {
          setProfile(JSON.parse(stored));
        } catch {
          // Ignore parse errors
        }
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      await loadUserProfile(firebaseUser);
      setIsInitialized(true);
    });
    return unsubscribe;
  }, [loadUserProfile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      role: UserRole,
      userData?: { 
        displayName?: string; 
        department?: string; 
        division?: string; 
        academicCode?: string;
        semester?: number;
      }
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        await signUpUser(email, password, role, userData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Sign up failed. Please try again.';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const signIn = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const credential = await loginUser(email, password);
      const userProfile = await getUserProfile(credential.user.uid);

      if (!userProfile) {
        throw new Error('User profile not found. Please contact support.');
      }

      if (userProfile.role === 'admin' && userProfile.isApproved === false) {
        await logoutUser();
        throw new Error('Your admin account is pending approval. Please wait for super admin confirmation.');
      }

      setProfile(userProfile);
      await AsyncStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await logoutUser();
      setProfile(null);
      await AsyncStorage.removeItem(USER_PROFILE_KEY);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Logout failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await resetPassword(email);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Password reset failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const approveAdmin = useCallback(async (adminId: string) => {
    if (!profile || !SUPER_ADMINS.includes(profile.email)) {
      throw new Error('Only super admins can approve admins');
    }
    setIsLoading(true);
    try {
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');
      await updateDoc(doc(db, 'users', adminId), {
        isApproved: true,
        approvedBy: profile.email,
        approvedAt: Timestamp.now(),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve admin';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const rejectAdmin = useCallback(async (adminId: string) => {
    if (!profile || !SUPER_ADMINS.includes(profile.email)) {
      throw new Error('Only super admins can reject admins');
    }
    setIsLoading(true);
    try {
      const { doc, deleteDoc } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');
      await deleteDoc(doc(db, 'users', adminId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject admin';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [profile]);

  const getPendingAdmins = useCallback(async () => {
    if (!profile || !SUPER_ADMINS.includes(profile.email)) {
      return [];
    }
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/services/firebase');
      const q = query(
        collection(db, 'users'),
        where('role', '==', 'admin'),
        where('isApproved', '==', false)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as (UserProfile & { id: string })[];
    } catch (err) {
      console.error('Error fetching pending admins:', err);
      return [];
    }
  }, [profile]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoading,
      isInitialized,
      error,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      clearError,
      approveAdmin,
      rejectAdmin,
      getPendingAdmins,
    }),
    [
      user,
      profile,
      isLoading,
      isInitialized,
      error,
      signUp,
      signIn,
      signOut,
      sendPasswordReset,
      clearError,
      approveAdmin,
      rejectAdmin,
      getPendingAdmins,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}