import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  type User,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { COLLECTIONS } from "../constants/collections";

export const ensureUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);

    
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "NC User",
      email: user.email,
      role: "Actor",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    
    await setDoc(profileRef, {
      uid: user.uid,
      name: user.displayName || "NC User",
      role: "Actor",
      bio: "",
      location: "",
      skills: [],
      experience: [],
      languages: [],
      media: [],
      verified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to ensure user profile";
    console.error("ensureUserProfile error:", message);
    return { success: false, error: message };
  }
};

type AuthResult = {
  user: User | null;
  error: string | null;
};

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Authentication request failed";

export const signUpUser = async (
  email: string,
  password: string,
  name: string,
  role: string,
  gender: string = '',
): Promise<AuthResult> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    const userRef = doc(db, COLLECTIONS.USERS, user.uid);
    const profileRef = doc(db, COLLECTIONS.PROFILES, user.uid);

    
    await setDoc(userRef, {
      uid: user.uid,
      name,
      email,
      role: role || "Actor",
      gender: gender || "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await setDoc(profileRef, {
      uid: user.uid,
      name,
      role: role || "Actor",
      gender: gender || "",
      bio: "",
      location: "",
      skills: [],
      experience: [],
      languages: [],
      media: [],
      verified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { user, error: null };
  } catch (error: unknown) {
    return { user: null, error: getErrorMessage(error) };
  }
};

export const signInUser = async (email: string, password: string): Promise<AuthResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('Login error code:', error?.code); 

    
    const invalidCredentialCodes = [
      'auth/user-not-found',      
      'auth/wrong-password',      
      'auth/invalid-credential',  
      'auth/invalid-email',       
      'auth/user-mismatch',       
    ];

    if (error?.code && invalidCredentialCodes.includes(error.code)) {
      return { user: null, error: 'Invalid credentials. Please check your email and password.' };
    }

    
    let message = 'Something went wrong. Please try again.';
    switch (error?.code) {
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later or reset your password.';
        break;
      case 'auth/user-disabled':
        message = 'This account has been disabled. Please contact support.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your internet connection.';
        break;
    }
    return { user: null, error: message };
  }
};

export const logoutUser = async (): Promise<{ error: string | null }> => {
  try {
    await signOut(auth);
    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }
};

export const sendPasswordReset = async (email: string): Promise<{ error: string | null }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: unknown) {
    return { error: getErrorMessage(error) };
  }
};

export const verifyUserPassword = async (password: string): Promise<boolean> => {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) return false;
  try {
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
    return true;
  } catch (error) {
    console.error("Re-authentication failed:", error);
    return false;
  }
};
