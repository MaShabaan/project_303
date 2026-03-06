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

// Storage keys for persistence
const USER_PROFILE_KEY = '@auth_user_profile';

// Auth state types
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
    userData?: { displayName?: string }
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load profile from Firestore when user changes
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
        await AsyncStorage.setItem(
          USER_PROFILE_KEY,
          JSON.stringify(userProfile)
        );
      } else {
        await AsyncStorage.removeItem(USER_PROFILE_KEY);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
      setProfile(null);
    }
  }, []);

  // Restore profile from AsyncStorage on init (for quick initial render)
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

  // Listen to auth state changes
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
      userData?: { displayName?: string }
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        await signUpUser(email, password, role, userData);
        // onAuthStateChanged will handle profile load
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Sign up failed. Please try again.';
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
      setProfile(userProfile);
      await AsyncStorage.setItem(
        USER_PROFILE_KEY,
        JSON.stringify(userProfile)
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please try again.';
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
      const message =
        err instanceof Error ? err.message : 'Logout failed. Please try again.';
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
      const message =
        err instanceof Error
          ? err.message
          : 'Password reset failed. Please try again.';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

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
