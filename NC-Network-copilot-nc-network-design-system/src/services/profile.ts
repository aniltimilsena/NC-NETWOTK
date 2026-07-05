import { auth, db } from "../lib/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { rateLimitedGet } from "../utils/rateLimitedFirestore";
import { uploadFile } from "./storage";
import { COLLECTIONS } from "../constants/collections";

export type ProfileData = {
  [key: string]: unknown;
};

type ProfileResponse = {
  data: ProfileData | null;
  error: string | null;
};


export const getProfile = async (uid: string): Promise<ProfileResponse> => {
  try {
    const snap = await rateLimitedGet(doc(db, COLLECTIONS.PROFILES, uid));
    if (snap.exists()) {
      return { data: snap.data() as ProfileData, error: null };
    }
    return { data: null, error: null };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch profile";
    console.error("Error fetching profile:", message);
    return { data: null, error: message };
  }
};

export const updateProfileData = async (
  uid: string,
  data: ProfileData,
): Promise<{ success: boolean; error: string | null }> => {
  try {
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid || currentUserUid !== uid) {
      return { success: false, error: "Unauthorized profile update" };
    }

    
    const cleanData = Object.entries(data).reduce((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {} as ProfileData);

    
    const profileRef = doc(db, COLLECTIONS.PROFILES, uid);
    await setDoc(profileRef, {
      ...cleanData,
      updatedAt: serverTimestamp()
    }, { merge: true });

    
    const userUpdate: Record<string, any> = {};
    if (cleanData.name !== undefined) userUpdate.name = cleanData.name;
    if (cleanData.role !== undefined) userUpdate.role = cleanData.role;
    if (cleanData.gender !== undefined) userUpdate.gender = cleanData.gender;
    if (cleanData.category !== undefined) userUpdate.category = cleanData.category;
    if (cleanData.openToAudition !== undefined) userUpdate.openToAudition = cleanData.openToAudition;
    if (cleanData.openToWork !== undefined) userUpdate.openToWork = cleanData.openToWork;
    if (cleanData.image !== undefined) userUpdate.image = cleanData.image;
    if (cleanData.photoURL !== undefined) userUpdate.photoURL = cleanData.photoURL;
    if (cleanData.bio !== undefined) userUpdate.bio = cleanData.bio;
    if (cleanData.location !== undefined) userUpdate.location = cleanData.location;
    if (cleanData.skills !== undefined) userUpdate.skills = cleanData.skills;
    if (cleanData.experience !== undefined) userUpdate.experience = cleanData.experience;

    if (Object.keys(userUpdate).length > 0) {
      const userRef = doc(db, COLLECTIONS.USERS, uid);
      await setDoc(userRef, {
        ...userUpdate,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    console.error("Profile update error:", message);
    return { success: false, error: message };
  }
};


export const subscribeToProfile = (
  uid: string,
  callback: (data: ProfileData | null) => void,
) => {
  return onSnapshot(
    doc(db, COLLECTIONS.PROFILES, uid),
    (snap) => {
      callback(snap.exists() ? (snap.data() as ProfileData) : null);
    },
    (error) => {
      console.error("Profile subscription error:", error);
      callback(null);
    },
  );
};

export const uploadProfileMedia = async (
  uid: string,
  file: File,
  onProgress?: (progress: number) => void,
  customPath?: string,
): Promise<string | null> => {
  try {
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid || currentUserUid !== uid) {
      console.error("Unauthorized media upload attempt");
      return null;
    }

    const defaultPath = `media/${uid}/${Date.now()}_${file.name}`;
    const targetPath = customPath || defaultPath;

    const url = await uploadFile(file, targetPath, onProgress);
    return url;
  } catch (error) {
    console.error("Client-side storage upload failed:", error);
    return null;
  }
};
