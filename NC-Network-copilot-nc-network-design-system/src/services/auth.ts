import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export const ensureUserProfile = async (user: User) => {
  try {
    const userRef = doc(db, "users", user.uid);
    const profileRef = doc(db, "profiles", user.uid);

    // Bootstrap user document
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || "NC User",
      email: user.email,
      role: "Talent",
      isAdmin: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    // Bootstrap profile document
    await setDoc(profileRef, {
      uid: user.uid,
      name: user.displayName || "NC User",
      role: "Talent",
      bio: "",
      location: "",
      skills: [],
      experience: [],
      languages: [],
      media: [],
      verified: false,
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

    const userRef = doc(db, "users", user.uid);
    const profileRef = doc(db, "profiles", user.uid);

    await setDoc(userRef, {
      uid: user.uid,
      name,
      email,
      role: role || "Talent",
      gender: gender || "",
      isAdmin: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await setDoc(profileRef, {
      uid: user.uid,
      name,
      role: role || "Talent",
      gender: gender || "",
      bio: "",
      location: "",
      skills: [],
      experience: [],
      languages: [],
      media: [],
      verified: false,
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
  } catch (error: unknown) {
    return { user: null, error: getErrorMessage(error) };
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
