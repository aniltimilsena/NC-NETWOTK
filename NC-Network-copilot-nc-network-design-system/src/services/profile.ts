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

    // Save directly to Firestore since rules allow write if owner
    await setDoc(doc(db, "profiles", uid), cleanData, { merge: true });

    // Also update users/{uid} for shared fields to keep them in sync
    const userUpdate: Record<string, any> = {};
    if (cleanData.name !== undefined) userUpdate.name = cleanData.name;
    if (cleanData.role !== undefined) userUpdate.role = cleanData.role;
    if (cleanData.gender !== undefined) userUpdate.gender = cleanData.gender;

    if (Object.keys(userUpdate).length > 0) {
      await setDoc(doc(db, "users", uid), userUpdate, { merge: true });
    }

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

export const uploadProfileMedia = (uid: string, file: File, onProgress?: (progress: number) => void): Promise<string | null> => {
  return new Promise(async (resolve) => {
    // 1. Try Cloudinary direct unsigned upload if configured
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (cloudName && uploadPreset) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        // Using /auto/upload to let Cloudinary auto-detect the file type (image, video, etc.)
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
          formData,
          {
            onUploadProgress: (event) => {
              if (onProgress && event.total) {
                const percent = Math.round((event.loaded * 100) / event.total);
                onProgress(percent);
              }
            },
          }
        );

        if (response.data?.secure_url) {
          resolve(response.data.secure_url);
          return;
        }
      } catch (err) {
        console.warn("Cloudinary upload failed, falling back to Firebase Storage:", err);
      }
    }

    // Helper to upload to a specific Firebase Storage instance
    const uploadWithStorage = (storageInstance: ReturnType<typeof getStorage>) => {
      return new Promise<string | null>((resUpload) => {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const storageRef = ref(storageInstance, `${uid}/${Date.now()}_upload.${fileExtension}`);
        const metadata = {
          contentType: file.type || 'image/jpeg',
        };
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) {
              onProgress(Math.round(progress));
            }
          },
          (error) => {
            console.error("Firebase storage upload error on bucket:", error);
            resUpload(null);
          },
          async () => {
            try {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              resUpload(downloadURL);
            } catch (err) {
              console.error("Error getting download URL:", err);
              resUpload(null);
            }
          }
        );
      });
    };

    // 2. Fallback to Firebase Storage
    try {
      const currentUserUid = auth.currentUser?.uid;
      if (!currentUserUid || currentUserUid !== uid) {
        console.error("Unauthorized media upload attempt");
        resolve(null);
        return;
      }

      // Try primary storage first
      let downloadURL = await uploadWithStorage(storage);
      if (downloadURL) {
        resolve(downloadURL);
        return;
      }

      // If primary failed, try fallback bucket (.appspot.com if current is .firebasestorage.app, or vice versa)
      const primaryBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "";
      if (primaryBucket) {
        const fallbackBucket = primaryBucket.includes("firebasestorage.app")
          ? primaryBucket.replace("firebasestorage.app", "appspot.com")
          : primaryBucket.replace("appspot.com", "firebasestorage.app");

        if (fallbackBucket !== primaryBucket) {
          console.warn(`Attempting fallback storage upload to: gs://${fallbackBucket}`);
          try {
            const fallbackStorage = getStorage(storage.app, `gs://${fallbackBucket}`);
            downloadURL = await uploadWithStorage(fallbackStorage);
            if (downloadURL) {
              resolve(downloadURL);
              return;
            }
          } catch (fallbackErr) {
            console.error("Fallback storage initialization/upload failed:", fallbackErr);
          }
        }
      }

      resolve(null);
    } catch (error) {
      console.error("Firebase storage upload catch error:", error);
      resolve(null);
    }
  });
};
