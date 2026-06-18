import { auth, storage } from "../lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import imageCompression from "browser-image-compression";

export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Authentication is required for uploads");
  }

  // Validate path authorizations
  const isProfilePath = path.startsWith(`profiles/${uid}/`);
  const isMediaPath = path.startsWith(`media/${uid}/`);
  const isCastingPath = path.startsWith(`castings/`);

  if (!isProfilePath && !isMediaPath && !isCastingPath) {
    throw new Error("Upload failed. Unauthorized upload path or target directory.");
  }

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  let fileToUpload = file;

  // Type & size validations based on target folder
  if (isProfilePath) {
    if (!isImage) {
      throw new Error("Invalid file type. Please use JPG, PNG or WEBP");
    }
    const validImageTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validImageTypes.includes(file.type)) {
      throw new Error("Invalid file type. Please use JPG, PNG or WEBP");
    }
    const isCover = path.endsWith("cover.jpg");
    const maxSize = isCover ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`File too large. Maximum size is ${isCover ? '10MB' : '5MB'}`);
    }
  } else if (isMediaPath) {
    if (isVideo) {
      if (file.type !== "video/mp4") {
        throw new Error("Invalid video type. Only MP4 videos are allowed");
      }
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("File too large. Maximum video size is 50MB");
      }
    } else if (isImage) {
      const validImageTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!validImageTypes.includes(file.type)) {
        throw new Error("Invalid file type. Please use JPG, PNG, WEBP or GIF");
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new Error("File too large. Maximum image size is 10MB");
      }
    } else {
      throw new Error("Invalid file type. Only images and videos are allowed");
    }
  } else if (isCastingPath) {
    if (!isImage) {
      throw new Error("Invalid file type. Only image banners are allowed");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("File too large. Maximum banner size is 10MB");
    }
  }

  // Compress images before upload (max width 1200px, quality 80%)
  if (isImage && file.type !== "image/gif") {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
      };
      fileToUpload = await imageCompression(file, options);
    } catch (compressionError) {
      console.warn("Client-side image compression failed. Using original file:", compressionError);
    }
  }

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

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
        console.error("Storage upload task failed:", error);
        reject(new Error("Upload failed. Check your connection and try again"));
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve(url);
        } catch (urlError) {
          reject(new Error("Failed to retrieve upload download URL"));
        }
      }
    );
  });
};
