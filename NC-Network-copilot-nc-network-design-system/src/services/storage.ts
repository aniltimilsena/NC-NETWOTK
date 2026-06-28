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
    // Determine if we should upload directly to Cloudinary:
    // 1. All videos (to avoid proxying heavy media)
    // 2. Any file larger than 4MB (to bypass Vercel's 4.5MB body size limit)
    const shouldUploadDirect = isVideo || fileToUpload.size > 4 * 1024 * 1024;

    if (!shouldUploadDirect) {
      try {
        // 1. For small files and images, route through our own trusted server (/api/upload).
        // Send as base64 JSON to avoid multipart parsing issues on Vercel serverless functions.
        const fileBuffer = await fileToUpload.arrayBuffer();
        const bytes = new Uint8Array(fileBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        const dataURI = `data:${fileToUpload.type};base64,${base64}`;

        const response = await apiClient.post<{ url: string }>("/upload",
          { file: dataURI },
          {
            headers: { "Content-Type": "application/json" },
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress?.(percent);
              }
            },
          }
        );

        if (response.data && response.data.url) {
          return response.data.url;
        }
        throw new Error("Invalid response from upload server");
      } catch (serverError) {
        console.warn("Server upload failed, falling back to direct Cloudinary upload:", serverError);
        // Fall through to direct-to-Cloudinary upload
      }
    }

    // 2. Direct upload to Cloudinary (either because it is required or as a fallback).
    // Config is fetched via the self-contained Vercel serverless function
    // /api/cloudinary-config, which works without SERVER_URL being configured.
    // Only the public-safe values (cloudName + uploadPreset) are returned —
    // never the API key or secret.
    let cloudName: string | undefined;
    let uploadPreset: string | undefined;

    try {
      // Primary: self-contained Vercel function (always available in production)
      const configResponse = await apiClient.get<{ cloudName: string; uploadPreset: string }>("/cloudinary-config");
      cloudName = configResponse.data.cloudName;
      uploadPreset = configResponse.data.uploadPreset;
    } catch (vercelConfigError) {
      console.warn("Vercel cloudinary-config endpoint failed, trying Express proxy:", vercelConfigError);
      try {
        // Fallback: Express server endpoint (only works when SERVER_URL is configured)
        const configResponse = await apiClient.get<{ cloudName: string; uploadPreset: string }>("/config/cloudinary");
        cloudName = configResponse.data.cloudName;
        uploadPreset = configResponse.data.uploadPreset;
      } catch (expressConfigError) {
        console.error("Both Cloudinary config endpoints failed:", expressConfigError);
      }
    }

    if (!cloudName || !uploadPreset) {
      throw new Error("Cloudinary configuration unavailable. Please check server environment variables.");
    }

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("upload_preset", uploadPreset);

    const folder = `nc_network/users/${uid}`;
    formData.append("folder", folder);

    const resourceType = isVideo ? "video" : "image";
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

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
    console.error("Hybrid Cloudinary upload failed:", error);
    throw new Error(error.response?.data?.error?.message || error.response?.data?.error || error.message || "Upload failed");
  }
};
