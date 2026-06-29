import { auth } from '../lib/firebase';

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

export const uploadMedia = async (
  file: File,
  folder: string,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResult> => {
  // Validate file
  if (!file) {
    throw new Error('No file selected');
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Authentication required for upload');
  }

  return new Promise((resolve, reject) => {
    // Build form data
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    // Upload via XHR (supports progress tracking)
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);

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
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && res.success) {
          resolve({
            url: res.url,
            publicId: res.publicId,
            type: res.type,
            width: res.width,
            height: res.height,
            duration: res.duration || null,
            format: res.format || '',
            bytes: res.bytes || 0,
          });
        } else {
          reject(new Error(res.error || 'Upload failed'));
        }
      } catch {
        reject(new Error('Failed to parse upload response'));
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
