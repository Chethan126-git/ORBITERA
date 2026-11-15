import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  authBusy: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function syncUserProfileDocument(firebaseUser: User) {
  if (!firebaseUser.uid || !firebaseUser.email || !firebaseUser.emailVerified) {
    return;
  }

  const userPath = `users/${firebaseUser.uid}`;
  const userRef = doc(db, 'users', firebaseUser.uid);

  const sanitizedDisplayName = (firebaseUser.displayName?.trim() || 'ORBITERA Researcher').slice(
    0,
    120
  );
  const sanitizedEmail = firebaseUser.email.trim().slice(0, 254);
  const sanitizedPhoto = firebaseUser.photoURL?.trim().slice(0, 1024);

  let existingSnap;
  try {
    existingSnap = await getDoc(userRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, userPath);
  }

  if (existingSnap.exists()) {
    const updatePayload: Record<string, unknown> = {
      displayName: sanitizedDisplayName,
      email: sanitizedEmail,
      updatedAt: serverTimestamp(),
    };
    if (sanitizedPhoto) {
      updatePayload.photoURL = sanitizedPhoto;
    }
    try {
      await updateDoc(userRef, updatePayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  } else {
    const createPayload: Record<string, unknown> = {
      uid: firebaseUser.uid,
      displayName: sanitizedDisplayName,
      email: sanitizedEmail,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    if (sanitizedPhoto) {
      createPayload.photoURL = sanitizedPhoto;
    }
    try {
      await setDoc(userRef, createPayload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, userPath);
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
      if (nextUser) {
        void syncUserProfileDocument(nextUser).catch((err) => {
          console.error('Profile sync failed:', err);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      if (credential.user) {
        await syncUserProfileDocument(credential.user).catch((err) => {
          console.error('Profile sync failed:', err);
        });
      }
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? String((error as { code?: unknown }).code)
          : '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        setAuthError('Sign-in was cancelled before completion.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Pop-up blocked by browser. Allow pop-ups for this site and try again.');
      } else {
        setAuthError('Unable to complete Google sign-in right now. Please try again.');
      }
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    setAuthBusy(true);
    setAuthError(null);
    try {
      await signOut(auth);
    } catch {
      setAuthError('Failed to sign out. Please try again.');
    } finally {
      setAuthBusy(false);
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        authBusy,
        authError,
        clearAuthError,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
