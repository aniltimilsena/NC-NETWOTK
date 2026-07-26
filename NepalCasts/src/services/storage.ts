import { auth } from "../lib/firebase";
import { uploadMedia, type CloudinaryUploadResult } from "../utils/uploadMedia";
import { mediaOptimizer } from "./MediaOptimizer";
import { logger } from "../utils/logger";
export const uploadFile = async (file: File, path: string, onProgress?: (p: number) => void): Promise<string> => {
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
    const isVideo = file.type.startsWith("video/") || Boolean(file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i));
    const isImage = file.type.startsWith("image/") || Boolean(file.name.match(/\.(jpg|jpeg|png|webp|heic|heif|gif|bmp)$/i));
    let fileToUpload = file;
    if (isProfilePath) {
        if (!isImage) {
            throw new Error("Invalid file type. Please use JPG, PNG, WEBP, or HEIC");
        }
        const isCover = path.endsWith("cover.jpg");
        const maxSize = isCover ? 15 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            throw new Error(`File too large. Maximum size is ${isCover ? '15MB' : '10MB'}`);
        }
    }
    else if (isMediaPath) {
        if (isVideo) {
            if (file.size > 200 * 1024 * 1024) {
                throw new Error("File too large. Maximum video size is 200MB");
            }
        }
        else if (isImage) {
            if (file.size > 25 * 1024 * 1024) {
                throw new Error("File too large. Maximum image size is 25MB");
            }
        }
        else {
            throw new Error("Invalid file type. Only images and videos are allowed");
        }
    }
    else if (isCastingPath) {
        if (!isImage) {
            throw new Error("Invalid file type. Only image banners are allowed");
        }
        if (file.size > 15 * 1024 * 1024) {
            throw new Error("File too large. Maximum banner size is 15MB");
        }
    }
    else if (isConversationPath) {
        if (!isImage && !isVideo) {
            throw new Error("Invalid file type. Only images and videos are allowed as message attachments");
        }
        const maxAllowedSize = isVideo ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
        if (file.size > maxAllowedSize) {
            throw new Error(`File too large. Maximum size is ${isVideo ? '100MB' : '20MB'}`);
        }
    }
    if (isImage) {
        try {
            const optResult = await mediaOptimizer.optimizeImage(file);
            fileToUpload = optResult.file;
        }
        catch (compressionError) {
            logger.warn("[Storage] Image optimization fallback to original file:", compressionError);
        }
    }
    else if (isVideo) {
        try {
            const meta = await mediaOptimizer.extractVideoMetadata(file);
            logger.log(`[Storage] Video pre-upload check: ${meta.width}x${meta.height}, Duration: ${meta.duration.toFixed(1)}s`);
        }
        catch (vErr) {
            logger.warn("[Storage] Video metadata extraction error:", vErr);
        }
    }
    let folder = "general";
    if (isProfilePath) {
        folder = `avatars/${uid}`;
    }
    else if (isMediaPath) {
        folder = `gallery/${uid}`;
    }
    else if (isCastingPath) {
        const parts = path.split('/');
        const castingId = parts[1] || 'general';
        folder = `castings/${castingId}`;
    }
    else if (isConversationPath) {
        const parts = path.split('/');
        const convoId = parts[1] || 'general';
        folder = `chat/${convoId}`;
    }
    try {
        const result: CloudinaryUploadResult = await uploadMedia(fileToUpload, folder, onProgress);
        return result.url;
    }
    catch (err: any) {
        console.error("[Storage] Upload failed:", err);
        throw new Error(err.message || "Upload failed", { cause: err });
    }
};
