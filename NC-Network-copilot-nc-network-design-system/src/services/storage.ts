import { auth, storage } from "../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Authentication is required for uploads");
  }
  if (!path.startsWith(`${uid}/`)) {
    throw new Error("Invalid upload path");
  }
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Only image uploads are allowed");
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("File size exceeds 10MB");
  }

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress?.(progress);
      },
      (error) => {
        console.error("Upload error:", error);
        reject(error);
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(url);
      }
    );
  });
};
