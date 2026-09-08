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

export const uploadMedia = async (file: File, folder: string, onProgress?: (progress: number) => void): Promise<CloudinaryUploadResult> => {
    if (!file) {
        throw new Error('No file selected');
    }
    const uid = AuthService.getUserId() || 'public';
    const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i));
    const resourceType: 'image' | 'video' = isVideo ? 'video' : 'image';
    const isChat = folder === 'chat';

    // 1. Fast Client-Side Image Compression for Instant Uploads
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

    let previewUrl: string | null = null;
    if (fileToUpload && typeof window !== 'undefined' && (fileToUpload.type.startsWith('image/') || fileToUpload.type.startsWith('video/'))) {
        try {
            previewUrl = URL.createObjectURL(fileToUpload);
        } catch {}
    }

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

    // 2. Primary Fast Upload: Direct Firebase Storage (Google Cloud Storage CDN)
    // Avoids slow serverless proxy buffering, payload limit errors, and double-uploads
    try {
        const storage = await getStorageInstance();
        const cleanName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${folder}/${uid}/${Date.now()}_${cleanName}`;
        const storageRef = ref(storage, storagePath);

        return await new Promise((resolve, reject) => {
            const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

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
                                fileName: fileToUpload.name,
                                progress: percent,
                                folder
                            }
                        }));
                    }
                },
                (error) => {
                    if (!isChat && typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('nc-upload-error', {
                            detail: { fileName: fileToUpload.name, error: error.message, folder }
                        }));
                    }
                    reject(error);
                },
                async () => {
                    try {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                        if (!isChat && typeof window !== 'undefined') {
                            window.dispatchEvent(new CustomEvent('nc-upload-complete', {
                                detail: { fileName: fileToUpload.name, folder }
                            }));
                        }
                        resolve({
                            url: downloadUrl,
                            publicId: storagePath,
                            type: resourceType,
                            width: null,
                            height: null,
                            duration: null,
                            format: fileToUpload.name.split('.').pop() || '',
                            bytes: fileToUpload.size,
                        });
                    } catch (urlErr) {
                        reject(urlErr);
                    }
                }
            );
        });
    } catch (storageErr) {
        console.warn('[uploadMedia] Firebase direct upload failed, checking local fallback:', storageErr);

        // Fallback for local development Express backend if running
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
            const token = await AuthService.getIdToken().catch(() => null);
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('folder', folder);

            return new Promise<MediaUploadResult>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', '/api/upload');
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }
                xhr.timeout = 30000;
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const res = JSON.parse(xhr.responseText);
                            if (res && res.url) {
                                resolve({
                                    url: res.url,
                                    publicId: res.publicId || `${folder}/${fileToUpload.name}`,
                                    type: resourceType,
                                    width: res.width || null,
                                    height: res.height || null,
                                    duration: res.duration || null,
                                    format: fileToUpload.name.split('.').pop() || '',
                                    bytes: fileToUpload.size,
                                });
                                return;
                            }
                        } catch {}
                    }
                    reject(new Error(`Fallback upload returned status ${xhr.status}`));
                });
                xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
                xhr.addEventListener('timeout', () => reject(new Error('Upload timed out')));
                xhr.send(formData);
            });
        }

        throw storageErr;
    }
};
