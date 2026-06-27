import { auth } from "../lib/firebase";
import imageCompression from "browser-image-compression";
import axios from "axios";
import apiClient from "../api/client";

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
  const isConversationPath = path.startsWith(`conversations/`) && path.includes(`/attachments/`);

  if (!isProfilePath && !isMediaPath && !isCastingPath && !isConversationPath) {
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
  } else if (isConversationPath) {
    if (!isImage && !isVideo) {
      throw new Error("Invalid file type. Only images and videos are allowed as message attachments");
    }
    const maxAllowedSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxAllowedSize) {
      throw new Error(`File too large. Maximum size is ${isVideo ? '50MB' : '10MB'}`);
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

  try {
    // 1. Fetch Cloudinary config from the backend
    const configResponse = await apiClient.get<{ cloudName: string; uploadPreset: string }>("/config/cloudinary");
    const { cloudName, uploadPreset } = configResponse.data;

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary configuration missing from server");
    }

    // 2. Perform direct upload to Cloudinary CDN
    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("upload_preset", uploadPreset);

    // Cloudinary folder destination
    const folder = `nc_network/users/${uid}`;
    formData.append("folder", folder);

    const resourceType = isVideo ? "video" : "image";
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    // Note: Use standard axios to avoid attaching Firebase Auth token to Cloudinary public servers
    const response = await axios.post(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress?.(percent);
        }
      },
    });

    if (response.data && response.data.secure_url) {
      return response.data.secure_url;
    }
    throw new Error("Invalid response from Cloudinary API");
  } catch (error: any) {
    console.error("Direct Cloudinary upload failed:", error);
    throw new Error(error.response?.data?.error?.message || error.message || "Upload failed");
  }
};
