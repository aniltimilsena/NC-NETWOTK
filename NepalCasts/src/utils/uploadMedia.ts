import { AuthService } from '../services/AuthService';
import { getStorageInstance } from '../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

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

export const uploadMedia = async (file: File, folder: string, onProgress?: (progress: number) => void): Promise<CloudinaryUploadResult> => {
    if (!file) {
        throw new Error('No file selected');
    }
    const uid = AuthService.getUserId() || 'public';
    const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i));
    const resourceType: 'image' | 'video' = isVideo ? 'video' : 'image';
    const isChat = folder === 'chat';

    let previewUrl: string | null = null;
    if (file && typeof window !== 'undefined' && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
        try {
            previewUrl = URL.createObjectURL(file);
        } catch {}
    }

    if (!isChat && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nc-upload-start', {
            detail: {
                fileName: file.name,
                fileType: resourceType,
                fileSize: file.size,
                folder,
                previewUrl,
            }
        }));
    }

    // 1. First attempt: Same-Origin Backend Upload Endpoint (/api/upload)
    // Completely avoids browser CORS preflight issues and executes virus/magic-byte checks.
    try {
        const token = await AuthService.getIdToken().catch(() => null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        const uploadResult = await new Promise<MediaUploadResult>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', '/api/upload');
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            if (xhr.upload) {
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        onProgress?.(percent);
                        if (!isChat && typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('nc-upload-progress', {
                                detail: { fileName: file.name, progress: percent, folder }
                            }));
                        }
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const res = JSON.parse(xhr.responseText);
                        if (res && res.url) {
                            resolve({
                                url: res.url,
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
                    } catch {
                        // ignore parse error
                    }
                }
                reject(new Error(`API upload returned status ${xhr.status}`));
            });

            xhr.addEventListener('error', () => reject(new Error('Network error on /api/upload')));
            xhr.addEventListener('timeout', () => reject(new Error('Timeout on /api/upload')));
            xhr.timeout = 180000;
            xhr.send(formData);
        });

        if (!isChat && typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nc-upload-complete', {
                detail: { fileName: file.name, folder }
            }));
        }
        return uploadResult;
    } catch (apiErr) {
        console.warn('[uploadMedia] /api/upload unavailable or failed, falling back to direct Firebase Storage:', apiErr);
    }

    // 2. Fallback: Direct Firebase Storage Upload
    const storage = await getStorageInstance();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${folder}/${uid}/${Date.now()}_${cleanName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
            'state_changed',
            (snapshot) => {
                const percent = snapshot.totalBytes > 0
                    ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
                    : 0;
                onProgress?.(percent);
                if (!isChat && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nc-upload-progress', {
                        detail: {
                            fileName: file.name,
                            progress: percent,
                            folder
                        }
                    }));
                }
            },
            (error) => {
                if (!isChat && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nc-upload-error', {
                        detail: { fileName: file.name, error: error.message, folder }
                    }));
                }
                reject(error);
            },
            async () => {
                try {
                    const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                    if (!isChat && typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('nc-upload-complete', {
                            detail: { fileName: file.name, folder }
                        }));
                    }
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
        );
    });
};
