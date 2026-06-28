// src/utils/uploadMedia.ts

const CLOUD_NAME = (import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME as string) || 
  (typeof process !== 'undefined' && process.env ? (process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME) : '');

const UPLOAD_PRESET = (import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET as string) || 
  (typeof process !== 'undefined' && process.env ? (process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET) : '');

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  width: number | null;
  height: number | null;
  duration: number | null;
  format: string;
  bytes: number;
}

export const uploadMedia = (
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    // Validate env vars
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      reject(new Error(
        'Cloudinary not configured. ' +
        'Add VITE_CLOUDINARY_CLOUD_NAME and ' +
        'VITE_CLOUDINARY_UPLOAD_PRESET to your configuration.'
      ));
      return;
    }

    // Validate file
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }

    // Validate size
    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 100 : 10; // MB
    if (file.size > maxSize * 1024 * 1024) {
      reject(new Error(
        `File too large. Max ${maxSize}MB. ` +
        `Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`
      ));
      return;
    }

    // Build form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', `nc-network/${folder}`);

    // Upload via XHR (supports progress tracking)
    const xhr = new XMLHttpRequest();
    const resourceType = isVideo ? 'video' : 'image';

    xhr.open(
      'POST',
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`
    );

    // Progress tracking
    if (xhr.upload) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress?.(percent);
        }
      });
    }

    // Success
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            type: resourceType,
            width: data.width || null,
            height: data.height || null,
            duration: data.duration || null,
            format: data.format,
            bytes: data.bytes,
          });
        } catch (parseError) {
          reject(new Error('Failed to parse Cloudinary response'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          if (err.error?.message?.includes('preset')) {
            reject(new Error(
              'Upload preset not found. ' +
              'Go to Cloudinary → Settings → Upload Presets ' +
              '→ make sure preset is set to UNSIGNED'
            ));
          } else {
            reject(new Error(err.error?.message || 'Upload failed'));
          }
        } catch {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener('error', () =>
      reject(new Error('Network error during upload'))
    );

    xhr.timeout = 300000; // 5 min for large videos
    xhr.addEventListener('timeout', () =>
      reject(new Error('Upload timed out. Try a smaller file.'))
    );

    xhr.send(formData);
  });
};

// Specific helpers:
export const uploadChatMedia = (file: File, conversationId: string, onProgress?: (progress: number) => void) =>
  uploadMedia(file, `chat/${conversationId}`, onProgress);

export const uploadAvatar = (file: File, userId: string, onProgress?: (progress: number) => void) =>
  uploadMedia(file, `avatars/${userId}`, onProgress);

export const uploadCover = (file: File, userId: string, onProgress?: (progress: number) => void) =>
  uploadMedia(file, `covers/${userId}`, onProgress);

export const uploadCastingBanner = (file: File, castingId: string, onProgress?: (progress: number) => void) =>
  uploadMedia(file, `castings/${castingId}`, onProgress);

export const uploadGalleryMedia = (file: File, userId: string, onProgress?: (progress: number) => void) =>
  uploadMedia(file, `gallery/${userId}`, onProgress);
