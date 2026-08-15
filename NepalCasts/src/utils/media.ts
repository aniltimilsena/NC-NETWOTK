export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
}

export function getOptimizedImageUrl(url?: string | null, options: ImageOptimizationOptions = {}): string {
  if (!url || typeof url !== 'string') return '';
  
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }

  if (url.includes('/f_auto,q_auto')) {
    return url;
  }

  const { width, height, quality = 'auto', format = 'auto', crop = 'fill' } = options;
  const transforms: string[] = [`f_${format}`, `q_${quality}`];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (width || height) transforms.push(`c_${crop}`);

  const transformString = transforms.join(',');
  return url.replace('/upload/', `/upload/${transformString}/`);
}

export const saveImageDirectly = async (url: string, filename = 'nepalcasts-photo.jpg') => {
  if (!url) return;
  try {
    // If Cloudinary URL, inject fl_attachment to force direct download headers
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
      const downloadUrl = url.replace('/upload/', '/upload/fl_attachment/');
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    // For any other image URL, fetch as blob and trigger local object download
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (err) {
    // Fallback
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
