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
  
  if (!file) {
    throw new Error('No file selected');
  }

  const token = await auth.currentUser?.getIdToken();
  if (!token) {
    throw new Error('Authentication required for upload');
  }

  
  let cloudName = 'du7zu8mca';
  let uploadPreset = 'stored_media';
  
  if (!import.meta.env.DEV) {
    try {
      const configRes = await fetch('/api/config/cloudinary', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(() => null);

      if (configRes && configRes.ok) {
        const config = await configRes.json();
        if (config.cloudName) cloudName = config.cloudName;
        if (config.uploadPreset) uploadPreset = config.uploadPreset;
      }
    } catch {
      // Quietly fallback to defaults
    }
  }
  const isVideo = file.type.startsWith('video/') || Boolean(file.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i));
  const resourceType = isVideo ? 'video' : 'image';
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
        } catch {
          
        }
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

    xhr.timeout = 300000; 
    xhr.addEventListener('timeout', () =>
      reject(new Error('Upload timed out. Try a smaller file.'))
    );

    xhr.send(formData);
  });
};
