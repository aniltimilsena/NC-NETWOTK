import { auth, db, storage } from "../lib/firebase";
import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from "firebase/storage";
import axios from "axios";
import apiClient from "../api/client";
import { callSecureFunction } from "../api/functionsClient";

export type ProfileData = {
  [key: string]: unknown;
};

type ProfileResponse = {
  data: ProfileData | null;
  error: string | null;
};

/**
 * Fetch a profile once from Firestore (direct read, no backend needed).
 */
export const getProfile = async (uid: string): Promise<ProfileResponse> => {
  try {
    const snap = await getDoc(doc(db, "profiles", uid));
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

    // Remove undefined values to prevent Firebase synchronous throw errors
    const cleanData = Object.entries(data).reduce((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {} as ProfileData);

    await apiClient.post("/profile", cleanData);
    return { success: true, error: null };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update profile";
    console.error("Profile update error:", message);
    return { success: false, error: message };
  }
};

/**
 * Real-time listener — calls `callback` whenever the profile document changes.
 * Returns an unsubscribe function.
 */
export const subscribeToProfile = (
  uid: string,
  callback: (data: ProfileData | null) => void,
) => {
  return onSnapshot(
    doc(db, "profiles", uid),
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
): Promise<string | null> => {
  try {
    const currentUserUid = auth.currentUser?.uid;
    if (!currentUserUid || currentUserUid !== uid) {
      console.error("Unauthorized media upload attempt");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<{ url: string }>("/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          const percent = Math.round((event.loaded * 100) / event.total);
          onProgress(percent);
        }
      },
    });

    return response.data?.url || null;
  } catch (error) {
    console.error("Secure backend upload failed:", error);
    return null;
  }
};
