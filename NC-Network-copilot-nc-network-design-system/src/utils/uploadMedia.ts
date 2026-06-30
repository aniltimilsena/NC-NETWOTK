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

  // 1. Fetch Cloudinary config from the server
  let config: { cloudName: string; uploadPreset: string };
  try {
    const configRes = await fetch('/api/config/cloudinary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!configRes.ok) {
      throw new Error(`Failed to fetch upload config (Status ${configRes.status})`);
    }
    config = await configRes.json();
  } catch (err: any) {
    console.error('Failed to fetch Cloudinary config from server:', err);
    throw new Error(`Upload initialization failed: ${err.message || err}`);
  }

  const { cloudName, uploadPreset } = config;
  const isVideo = file.type.startsWith('video/');
  const resourceType = isVideo ? 'video' : 'image';
  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

  return new Promise((resolve, reject) => {
    // Build form data for Cloudinary direct upload
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', uploadPreset);
    formData.append('folder', `nc-network/${folder}`);

    // Upload via XHR (supports progress tracking)
    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl);

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
      if (xhr.status !== 200) {
        let errMsg = `Upload failed (Status ${xhr.status})`;
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.error && res.error.message) {
            errMsg = res.error.message;
          }
        } catch (e) {}
        reject(new Error(errMsg));
        return;
      }

      try {
        const res = JSON.parse(xhr.responseText);
        if (res.secure_url) {
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
        } else {
          reject(new Error(res.error?.message || 'Upload failed'));
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
