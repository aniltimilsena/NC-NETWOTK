import { AuthService } from "./AuthService";
import { uploadMedia, type CloudinaryUploadResult } from "../utils/uploadMedia";
import { mediaOptimizer } from "./MediaOptimizer";
import { logger } from "../utils/logger";
import { CurrentUser } from "../utils/CurrentUser";
export const uploadFile = async (file: File, path: string, onProgress?: (p: number) => void, currentUserId?: string): Promise<string> => {
    const uid = currentUserId || AuthService.getUserId() || CurrentUser.id;
    if (!uid) {
        throw new Error("Authentication is required for uploads");
    }
    const isProfilePath = path.startsWith(`profiles/`);
    const isMediaPath = path.startsWith(`media/`);
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
            const isCover = path.endsWith("cover.jpg");
            const contextType = isProfilePath ? (isCover ? 'cover' : 'avatar') : isCastingPath ? 'banner' : isMediaPath ? 'portfolio' : 'general';
            const optResult = await mediaOptimizer.optimizeImage(file, contextType);
            fileToUpload = optResult.file;
        }
        catch (compressionError) {
            logger.warn("[Storage] Image optimization fallback to original file:", compressionError);
        }
    }
    else if (isVideo) {
        // Non-blocking background telemetry: never delay or hang video upload
        mediaOptimizer.extractVideoMetadata(file)
            .then((meta) => {
                logger.log(`[Storage] Video pre-upload check: ${meta.width}x${meta.height}, Duration: ${meta.duration.toFixed(1)}s`);
            })
            .catch((vErr) => {
                logger.warn("[Storage] Video metadata extraction error:", vErr);
            });
    }
    const safeUid = uid.replace(/[^a-zA-Z0-9_-]/g, '_');
    let folder = "general";
    if (isProfilePath) {
        folder = `avatars/${safeUid}`;
    }
    else if (isMediaPath) {
        folder = `gallery/${safeUid}`;
    }
    else if (isCastingPath) {
        const parts = path.split('/');
        const castingId = (parts[1] || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
        folder = `castings/${castingId}`;
    }
    else if (isConversationPath) {
        const parts = path.split('/');
        const convoId = (parts[1] || 'general').replace(/[^a-zA-Z0-9_-]/g, '_');
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
