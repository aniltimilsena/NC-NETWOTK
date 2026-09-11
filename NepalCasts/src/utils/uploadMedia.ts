import { AuthService } from '../services/AuthService';
import { getStorageInstance } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { fastCompressImage } from './fastImageCompressor';

export interface MediaUploadResult {
    url: string;
    publicId: string;
    type: 'image' | 'video';
    width: number | null;
    height: number | null;
    duration: number | null;
    format?: string;
    bytes?: number;
}
export type CloudinaryUploadResult = MediaUploadResult;

// Direct Cloudinary Upload via Unsigned Upload Preset (Fast, global CDN, real-time progress)
const uploadDirectCloudinary = (
    file: File,
    resourceType: 'image' | 'video',
    folder: string,
    onProgress: (percent: number) => void
): Promise<MediaUploadResult> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || (import.meta.env as any).CLOUDINARY_CLOUD_NAME || 'du7zu8mca';
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || (import.meta.env as any).CLOUDINARY_UPLOAD_PRESET || 'stored_media';
    const uploadEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType === 'video' ? 'video' : 'auto'}/upload`;

    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `nc-network/${folder}`);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadEndpoint);

        if (xhr.upload) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && e.total > 0) {
                    const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
                    onProgress(percent);
                }
            });
        }

        xhr.timeout = resourceType === 'video' ? 180000 : 90000;

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res && res.secure_url) {
                        onProgress(100);
                        resolve({
                            url: res.secure_url,
                            publicId: res.public_id || `nc-network/${folder}/${file.name}`,
                            type: res.resource_type === 'video' ? 'video' : 'image',
                            width: res.width || null,
                            height: res.height || null,
                            duration: res.duration || null,
                            format: res.format || file.name.split('.').pop() || '',
                            bytes: res.bytes || file.size,
                        });
                        return;
                    }
                } catch {
                    // Fallthrough to reject
                }
            }

            let errMsg = `Cloudinary upload failed (${xhr.status})`;
            try {
                const res = JSON.parse(xhr.responseText);
                if (res.error?.message) {
                    errMsg = res.error.message;
                }
            } catch {}
            reject(new Error(errMsg));
        });

        xhr.addEventListener('error', () => reject(new Error('Network error connecting to media server')));
        xhr.addEventListener('timeout', () => reject(new Error(`Media upload timed out after ${resourceType === 'video' ? '3 minutes' : '90 seconds'}`)));
        xhr.send(formData);
    });
};

// Fallback 1: Backend Express /api/upload
const uploadViaBackend = async (
    file: File,
    resourceType: 'image' | 'video',
    folder: string,
    onProgress: (percent: number) => void
): Promise<MediaUploadResult> => {
    const token = await AuthService.getIdToken().catch(() => null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload');
        if (token) {
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        if (xhr.upload) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && e.total > 0) {
                    const percent = Math.min(99, Math.round((e.loaded / e.total) * 100));
                    onProgress(percent);
                }
            });
        }

        xhr.timeout = 45000;

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const res = JSON.parse(xhr.responseText);
                    const uploadedUrl = res.url || res.data?.url || res.secure_url;
                    if (uploadedUrl) {
                        onProgress(100);
                        resolve({
                            url: uploadedUrl,
                            publicId: res.publicId || `${folder}/${file.name}`,
                            type: resourceType,
                            width: res.width || null,
                            height: res.height || null,
                            duration: res.duration || null,
                            format: file.name.split('.').pop() || '',
                            bytes: file.size,
                        });
                        return;
                    }
                } catch {}
            }
            reject(new Error(`Backend upload failed with status ${xhr.status}`));
        });

        xhr.addEventListener('error', () => reject(new Error('Backend upload network error')));
        xhr.addEventListener('timeout', () => reject(new Error('Backend upload timed out')));
        xhr.send(formData);
    });
};

// Fallback 2: Direct Firebase Storage (guarded with strict 15s timeout to avoid endless 0% hang)
const uploadViaFirebaseStorage = async (
    file: File,
    resourceType: 'image' | 'video',
    _folder: string,
    uid: string,
    onProgress: (percent: number) => void
): Promise<MediaUploadResult> => {
    const storage = await getStorageInstance();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    // Use uploads/{uid}/ path which is allowed in standard storage security rules
    const storagePath = `uploads/${uid}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
        let isSettled = false;
        const timeoutTimer = setTimeout(() => {
            if (!isSettled) {
                isSettled = true;
                reject(new Error('Firebase Storage upload timed out after 15s'));
            }
        }, 15000);

        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                if (snapshot.totalBytes > 0) {
                    const percent = Math.min(99, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
                    onProgress(percent);
                }
            },
            (err) => {
                if (!isSettled) {
                    isSettled = true;
                    clearTimeout(timeoutTimer);
                    reject(err);
                }
            },
            async () => {
                if (!isSettled) {
                    isSettled = true;
                    clearTimeout(timeoutTimer);
                    try {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        onProgress(100);
                        resolve({
                            url: downloadUrl,
                            publicId: storagePath,
                            type: resourceType,
                            width: null,
                            height: null,
                            duration: null,
                            format: file.name.split('.').pop() || '',
                            bytes: file.size,
                        });
                    } catch (urlErr) {
                        reject(urlErr);
                    }
                }
            }
        );
    });
};

export const uploadMedia = async (
    file: File,
    folder: string,
    onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> => {
    if (!file) {
        throw new Error('No file selected');
    }

    const uid = AuthService.getUserId();
    if (!uid) {
        throw new Error('Authentication required: Please sign in before uploading files.');
    }
    const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i));
    const resourceType: 'image' | 'video' = isVideo ? 'video' : 'image';
    const isChat = folder === 'chat';

    // 1. Fast Hardware-Accelerated Client-Side Image Compression for Instant Uploads
    let fileToUpload = file;
    if (resourceType === 'image') {
        const isAvatarOrLogo = folder.includes('avatar') || folder.includes('profile') || folder.includes('logo');
        const maxDim = isAvatarOrLogo ? 640 : 1600;
        const quality = isAvatarOrLogo ? 0.85 : 0.82;
        try {
            fileToUpload = await fastCompressImage(file, { maxDimension: maxDim, quality });
        } catch (compErr) {
            console.warn('[uploadMedia] Compression skipped:', compErr);
        }
    }

    // Generate local preview thumbnail for upload modal
    let previewUrl: string | null = null;
    if (fileToUpload && typeof window !== 'undefined' && (fileToUpload.type.startsWith('image/') || fileToUpload.type.startsWith('video/'))) {
        try {
            previewUrl = URL.createObjectURL(fileToUpload);
        } catch {}
    }

    // Helper to cleanup object URL
    const cleanupPreview = () => {
        if (previewUrl) {
            setTimeout(() => {
                try {
                    URL.revokeObjectURL(previewUrl!);
                } catch {}
            }, 5000);
        }
    };

    // Dispatch upload modal start
    if (!isChat && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nc-upload-start', {
            detail: {
                fileName: fileToUpload.name,
                fileType: resourceType,
                fileSize: fileToUpload.size,
                folder,
                previewUrl,
            }
        }));
    }

    const reportProgress = (percent: number) => {
        onProgress?.(percent);
        if (!isChat && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nc-upload-progress', {
                detail: {
                    fileName: fileToUpload.name,
                    progress: percent,
                    folder,
                }
            }));
        }
    };

    const notifyComplete = () => {
        cleanupPreview();
        if (!isChat && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nc-upload-complete', {
                detail: { fileName: fileToUpload.name, folder }
            }));
        }
    };

    const notifyError = (errorMsg: string) => {
        cleanupPreview();
        if (!isChat && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nc-upload-error', {
                detail: { fileName: fileToUpload.name, error: errorMsg, folder }
            }));
        }
    };

    // Multi-tier upload strategy:
    // 1. Primary: Direct Cloudinary Upload (fastest, direct CDN, real progress, works dev + prod)
    let lastError: Error | null = null;
    try {
        const result = await uploadDirectCloudinary(fileToUpload, resourceType, folder, reportProgress);
        notifyComplete();
        return result;
    } catch (primaryErr: any) {
        lastError = primaryErr instanceof Error ? primaryErr : new Error(String(primaryErr));
        console.warn('[uploadMedia] Direct Cloudinary upload failed, trying backend API:', primaryErr);
    }

    // 2. Fallback 1: Backend Express /api/upload
    try {
        const result = await uploadViaBackend(fileToUpload, resourceType, folder, reportProgress);
        notifyComplete();
        return result;
    } catch (backendErr: any) {
        console.warn('[uploadMedia] Backend /api/upload failed, trying Firebase Storage:', backendErr);
    }

    // 3. Fallback 2: Direct Firebase Storage (safely timed out)
    try {
        const result = await uploadViaFirebaseStorage(fileToUpload, resourceType, folder, uid, reportProgress);
        notifyComplete();
        return result;
    } catch (storageErr: any) {
        console.error('[uploadMedia] All upload channels failed:', storageErr);
        const userMsg = lastError?.message || storageErr?.message || 'Upload failed. Please check your internet connection and try again.';
        notifyError(userMsg);
        throw new Error(userMsg);
    }
};
