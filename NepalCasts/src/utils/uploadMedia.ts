import { AuthService } from '../services/AuthService';

export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
    type: 'image' | 'video';
    width: number | null;
    height: number | null;
    duration: number | null;
    format?: string;
    bytes?: number;
}

export const uploadMedia = async (file: File, folder: string, onProgress?: (progress: number) => void): Promise<CloudinaryUploadResult> => {
    if (!file) {
        throw new Error('No file selected');
    }
    const token = await AuthService.getIdToken().catch(() => null);

    const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i));
    const resourceType = isVideo ? 'video' : 'auto';
    const isChat = folder === 'chat';

    if (!isChat && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('nc-upload-start', {
            detail: {
                fileName: file.name,
                fileType: resourceType,
                fileSize: file.size,
                folder
            }
        }));
    }

    let cloudName = 'du7zu8mca';
    let uploadPreset = 'stored_media';
    if (!import.meta.env.DEV && token) {
        try {
            const configRes = await fetch('/api/config/cloudinary', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }).catch(() => null);
            if (configRes && configRes.ok) {
                const config = await configRes.json();
                if (config.cloudName)
                    cloudName = config.cloudName;
                if (config.uploadPreset)
                    uploadPreset = config.uploadPreset;
            }
        } catch (_err) {
            // Ignore optional config fetch errors and fallback to defaults
        }
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('folder', `nc-network/${folder}`);
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        if (xhr.upload) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 100);
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
                }
            });
        }
        xhr.addEventListener('load', () => {
            if (xhr.status !== 200) {
                let errMsg = `Upload failed (Status ${xhr.status})`;
                try {
                    const res = JSON.parse(xhr.responseText);
                    if (res.error && res.error.message) {
                        errMsg = res.error.message;
                    }
                } catch (_err) {
                    // Ignore JSON parse failure on non-200 response
                }
                if (!isChat && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nc-upload-error', {
                        detail: { fileName: file.name, error: errMsg, folder }
                    }));
                }
                reject(new Error(errMsg));
                return;
            }
            try {
                const res = JSON.parse(xhr.responseText);
                if (res.secure_url) {
                    if (!isChat && typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('nc-upload-complete', {
                            detail: { fileName: file.name, folder }
                        }));
                    }
                    resolve({
                        url: res.secure_url,
                        publicId: res.public_id,
                        type: res.resource_type === 'video' ? 'video' : 'image',
                        width: res.width || null,
                        height: res.height || null,
                        duration: res.duration || null,
                        format: res.format || '',
                        bytes: res.bytes || 0,
                    });
                }
                else {
                    const errMsg = res.error?.message || 'Upload failed';
                    if (!isChat && typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('nc-upload-error', {
                            detail: { fileName: file.name, error: errMsg, folder }
                        }));
                    }
                    reject(new Error(errMsg));
                }
            }
            catch {
                const errMsg = 'Failed to parse upload response';
                if (!isChat && typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('nc-upload-error', {
                        detail: { fileName: file.name, error: errMsg, folder }
                    }));
                }
                reject(new Error(errMsg));
            }
        });
        xhr.addEventListener('error', () => {
            const errMsg = 'Network error during upload';
            if (!isChat && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nc-upload-error', {
                    detail: { fileName: file.name, error: errMsg, folder }
                }));
            }
            reject(new Error(errMsg));
        });
        xhr.timeout = 300000;
        xhr.addEventListener('timeout', () => {
            const errMsg = 'Upload timed out. Try a smaller file.';
            if (!isChat && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('nc-upload-error', {
                    detail: { fileName: file.name, error: errMsg, folder }
                }));
            }
            reject(new Error(errMsg));
        });
        xhr.send(formData);
    });
};
