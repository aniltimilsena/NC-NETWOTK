import { auth } from "../lib/firebase";
import imageCompression from "browser-image-compression";
import { uploadMedia } from "../utils/uploadMedia";

export const uploadFile = async (
  file: File,
  path: string,
  onProgress?: (p: number) => void
): Promise<string> => {
  const uid = auth.currentUser?.uid;
  if (!uid) {
    throw new Error("Authentication is required for uploads");
  }

  
  const isProfilePath = path.startsWith(`profiles/${uid}/`);
  const isMediaPath = path.startsWith(`media/${uid}/`);
  const isCastingPath = path.startsWith(`castings/`);
  const isConversationPath = path.startsWith(`conversations/`) && path.includes(`/attachments/`);

  if (!isProfilePath && !isMediaPath && !isCastingPath && !isConversationPath) {
    throw new Error("Upload failed. Unauthorized upload path or target directory.");
  }

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");

  let fileToUpload = file;

  
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
  } else if (isConversationPath) {
    if (!isImage && !isVideo) {
      throw new Error("Invalid file type. Only images and videos are allowed as message attachments");
    }
    const maxAllowedSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxAllowedSize) {
      throw new Error(`File too large. Maximum size is ${isVideo ? '50MB' : '10MB'}`);
    }
  }

  
  if (isImage && file.type !== "image/gif") {
    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: false,
      };
      fileToUpload = await imageCompression(file, options);
    } catch (compressionError) {
      console.warn("Client-side image compression failed. Using original file:", compressionError);
    }
  }

  
  let folder = "general";
  if (isProfilePath) {
    folder = `avatars/${uid}`;
  } else if (isMediaPath) {
    folder = `gallery/${uid}`;
  } else if (isCastingPath) {
    const parts = path.split('/');
    const castingId = parts[1] || 'general';
    folder = `castings/${castingId}`;
  } else if (isConversationPath) {
    const parts = path.split('/');
    const convoId = parts[1] || 'general';
    folder = `chat/${convoId}`;
  }

  try {
    const result = await uploadMedia(fileToUpload, folder, onProgress);
    return result.url;
  } catch (err: any) {
    console.error("Cloudinary upload failed:", err);
    throw new Error(err.message || "Cloudinary upload failed", { cause: err });
  }
};
