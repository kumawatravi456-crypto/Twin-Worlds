import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Timestamp
} from 'firebase/firestore';
import {
  FIREBASE_LIMITS,
  OperationType,
  auth,
  db,
  googleProvider,
  handleFirestoreError
} from '../lib/firebase';

export interface UserProfile {
  uid: string;
  firstName: string;
  lastName: string;
  email: string;
  createdAt?: Timestamp | unknown;
  updatedAt?: Timestamp | unknown;
}

export interface SavedExploration {
  id: string;
  uid: string;
  targetId: string;
  siteId: string;
  compositeScore: number;
  createdAt?: Timestamp | unknown;
}

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  backendVerified: boolean;
  savedExplorations: SavedExploration[];
  signUpWithEmail: (input: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  signInWithEmail: (input: {
    email: string;
    password: string;
    rememberMe: boolean;
  }) => Promise<void>;
  signInWithGoogle: (rememberMe?: boolean) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  saveExploration: (targetId: string, siteId: string, compositeScore: number) => Promise<void>;
  removeExploration: (explorationId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function splitDisplayName(displayName: string | null | undefined, email: string | null | undefined) {
  const cleaned = (displayName ?? '').trim();
  if (cleaned) {
    const parts = cleaned.split(/\s+/);
    const first = parts[0].slice(0, FIREBASE_LIMITS.MAX_NAME_LENGTH);
    const last = (parts.slice(1).join(' ') || 'Explorer').slice(0, FIREBASE_LIMITS.MAX_NAME_LENGTH);
    return { firstName: first, lastName: last };
  }
  const local = (email ?? 'researcher').split('@')[0] || 'Space';
  return {
    firstName: local.slice(0, FIREBASE_LIMITS.MAX_NAME_LENGTH),
    lastName: 'Explorer'
  };
}

function sanitizeField(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function getTimestampMillis(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const maybeTs = value as { toMillis?: () => number; seconds?: number };
  if (typeof maybeTs.toMillis === 'function') {
    return maybeTs.toMillis();
  }
  if (typeof maybeTs.seconds === 'number') {
    return maybeTs.seconds * 1000;
  }
  return 0;
}

export function formatAuthError(err: unknown): { message: string; isProviderDisabled: boolean } {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const rawMessage = err instanceof Error ? err.message : String(err);

  if (code === 'auth/operation-not-allowed') {
    return {
      isProviderDisabled: true,
      message:
        'Email/Password sign-in is not yet enabled in this Firebase project. Enable Email/Password under Firebase Console → Authentication → Sign-in method, or use Google Sign-In below.'
    };
  }
  if (code === 'auth/email-already-in-use') {
    return { isProviderDisabled: false, message: 'An account with this email address already exists.' };
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return { isProviderDisabled: false, message: 'Invalid email address or password.' };
  }
  if (code === 'auth/invalid-email') {
    return { isProviderDisabled: false, message: 'Please enter a valid email address.' };
  }
  if (code === 'auth/weak-password') {
    return { isProviderDisabled: false, message: 'Password must be at least 6 characters long.' };
  }
  if (code === 'auth/too-many-requests') {
    return { isProviderDisabled: false, message: 'Too many attempts. Please wait a moment before trying again.' };
  }
  if (code === 'auth/popup-closed-by-user') {
    return { isProviderDisabled: false, message: 'Google Sign-In popup was closed before completing.' };
  }
  if (code === 'auth/popup-blocked') {
    return { isProviderDisabled: false, message: 'Popup was blocked by the browser. Please allow popups for this site.' };
  }
  return {
    isProviderDisabled: false,
    message: rawMessage.replace(/^Firebase:\s*/i, '').replace(/\s*\(auth\/[^)]+\)\.?/i, '') || 'Authentication failed.'
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [backendVerified, setBackendVerified] = useState(false);
  const [savedExplorations, setSavedExplorations] = useState<SavedExploration[]>([]);

  const ensureUserProfileDoc = useCallback(
    async (firebaseUser: User, explicitNames?: { firstName: string; lastName: string }): Promise<UserProfile> => {
      const userPath = `users/${firebaseUser.uid}`;
      const userRef = doc(db, 'users', firebaseUser.uid);

      let existingSnap;
      try {
        existingSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, userPath);
      }

      if (existingSnap.exists()) {
        return existingSnap.data() as UserProfile;
      }

      const derived = explicitNames ?? splitDisplayName(firebaseUser.displayName, firebaseUser.email);
      const email = sanitizeField(
        firebaseUser.email ?? `${firebaseUser.uid}@twinworlds.local`,
        FIREBASE_LIMITS.MAX_EMAIL_LENGTH
      );

      const newProfile: UserProfile = {
        uid: firebaseUser.uid,
        firstName: sanitizeField(derived.firstName || 'Space', FIREBASE_LIMITS.MAX_NAME_LENGTH),
        lastName: sanitizeField(derived.lastName || 'Explorer', FIREBASE_LIMITS.MAX_NAME_LENGTH),
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      try {
        await setDoc(userRef, newProfile);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, userPath);
      }

      return newProfile;
    },
    []
  );

  // Sync Firebase Auth state & verify token against Express backend
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setBackendVerified(false);
        setSavedExplorations([]);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', firebaseUser.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        } else {
          const fallback = splitDisplayName(firebaseUser.displayName, firebaseUser.email);
          setProfile({
            uid: firebaseUser.uid,
            firstName: fallback.firstName,
            lastName: fallback.lastName,
            email: firebaseUser.email ?? ''
          });
        }
      } catch {
        const fallback = splitDisplayName(firebaseUser.displayName, firebaseUser.email);
        setProfile({
          uid: firebaseUser.uid,
          firstName: fallback.firstName,
          lastName: fallback.lastName,
          email: firebaseUser.email ?? ''
        });
      }

      try {
        const idToken = await firebaseUser.getIdToken();
        const res = await fetch('/api/auth/verify', {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        setBackendVerified(res.ok);
      } catch {
        setBackendVerified(false);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for user profile and saved explorations when authenticated
  useEffect(() => {
    if (!authReady || !user) return;

    const profilePath = `users/${user.uid}`;
    const unsubProfile = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, profilePath);
      }
    );

    const expPath = `users/${user.uid}/explorations`;
    const expQuery = query(
      collection(db, 'users', user.uid, 'explorations'),
      where('uid', '==', user.uid)
    );
    const unsubExplorations = onSnapshot(
      expQuery,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as SavedExploration)
          .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setSavedExplorations(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, expPath);
      }
    );

    return () => {
      unsubProfile();
      unsubExplorations();
    };
  }, [authReady, user]);

  const signUpWithEmail = useCallback(
    async ({
      firstName,
      lastName,
      email,
      password
    }: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      await setPersistence(auth, browserLocalPersistence);
      const cleanFirst = sanitizeField(firstName, FIREBASE_LIMITS.MAX_NAME_LENGTH);
      const cleanLast = sanitizeField(lastName, FIREBASE_LIMITS.MAX_NAME_LENGTH);
      const cleanEmail = sanitizeField(email, FIREBASE_LIMITS.MAX_EMAIL_LENGTH);

      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(cred.user, {
        displayName: `${cleanFirst} ${cleanLast}`.trim()
      });

      const created = await ensureUserProfileDoc(cred.user, {
        firstName: cleanFirst,
        lastName: cleanLast
      });
      setProfile(created);
    },
    [ensureUserProfileDoc]
  );

  const signInWithEmail = useCallback(
    async ({
      email,
      password,
      rememberMe
    }: {
      email: string;
      password: string;
      rememberMe: boolean;
    }) => {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const ensured = await ensureUserProfileDoc(cred.user);
      setProfile(ensured);
    },
    [ensureUserProfileDoc]
  );

  const signInWithGoogle = useCallback(
    async (rememberMe = true) => {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const cred = await signInWithPopup(auth, googleProvider);
      const ensured = await ensureUserProfileDoc(cred.user);
      setProfile(ensured);
    },
    [ensureUserProfileDoc]
  );

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const saveExploration = useCallback(
    async (targetId: string, siteId: string, compositeScore: number) => {
      if (!user) throw new Error('Authentication required to save exploration.');
      // Ensure profile document exists before saving subcollection entry
      await ensureUserProfileDoc(user);
      const id = `${targetId}__${siteId}`.replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, FIREBASE_LIMITS.MAX_ID_LENGTH);
      const path = `users/${user.uid}/explorations/${id}`;
      const expRef = doc(db, 'users', user.uid, 'explorations', id);
      try {
        const existingExp = await getDoc(expRef);
        if (existingExp.exists()) return;
        await setDoc(expRef, {
          id,
          uid: user.uid,
          targetId: sanitizeField(targetId, 64),
          siteId: sanitizeField(siteId, 64),
          compositeScore: Math.max(0, Math.min(100, Number(compositeScore.toFixed(1)))),
          createdAt: serverTimestamp()
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    },
    [user, ensureUserProfileDoc]
  );

  const removeExploration = useCallback(
    async (explorationId: string) => {
      if (!user) return;
      const path = `users/${user.uid}/explorations/${explorationId}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'explorations', explorationId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      authReady,
      backendVerified,
      savedExplorations,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      resetPassword,
      logout,
      saveExploration,
      removeExploration
    }),
    [
      user,
      profile,
      authReady,
      backendVerified,
      savedExplorations,
      signUpWithEmail,
      signInWithEmail,
      signInWithGoogle,
      resetPassword,
      logout,
      saveExploration,
      removeExploration
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
