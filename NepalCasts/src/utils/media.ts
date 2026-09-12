export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: 'auto' | 'good' | 'eco' | number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg';
  crop?: 'fill' | 'fit' | 'scale' | 'thumb';
  dpr?: number | string;
}

/**
 * Returns a lightweight inline SVG data URI representing an elegant placeholder fallback
 * when an image fails to load or 404s.
 */
export function getFallbackPlaceholderSvg(label = 'NC Media'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
    <rect width="400" height="400" fill="#141414"/>
    <rect x="20" y="20" width="360" height="360" rx="16" stroke="#262626" stroke-width="2" stroke-dasharray="6 6"/>
    <path d="M160 170a20 20 0 100-40 20 20 0 000 40zm-30 80h140l-45-60-35 45-25-30-35 45z" fill="#522C69" fill-opacity="0.4"/>
    <text x="200" y="280" font-family="Ubuntu, sans-serif" font-size="13" font-weight="600" fill="#737373" text-anchor="middle">${label}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function getOptimizedImageUrl(url?: string | null, options: ImageOptimizationOptions = {}): string {
  if (!url || typeof url !== 'string' || url.trim() === '') return '';
  const trimmed = url.trim();

  // 1. Unsplash Images Optimization
  if (trimmed.includes('images.unsplash.com')) {
    try {
      const u = new URL(trimmed);
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', options.crop === 'fit' ? 'max' : 'crop');
      if (options.width) u.searchParams.set('w', options.width.toString());
      if (options.height) u.searchParams.set('h', options.height.toString());
      const q = typeof options.quality === 'number' ? options.quality : 75;
      u.searchParams.set('q', q.toString());
      return u.toString();
    } catch (_e) {
      return trimmed;
    }
  }

  // 2. Google User Avatars Optimization (=s96-c param)
  if (trimmed.includes('googleusercontent.com')) {
    const targetSize = options.width || options.height || 120;
    if (/=s\d+(-c)?/.test(trimmed)) {
      return trimmed.replace(/=s\d+(-c)?/, `=s${targetSize}-c`);
    }
    return `${trimmed}=s${targetSize}-c`;
  }

  // 3. Cloudinary CDN Transformation
  if (trimmed.includes('res.cloudinary.com') && trimmed.includes('/upload/')) {
    const { width, height, quality = 'auto', format = 'auto', crop = 'fill', dpr } = options;
    const transforms: string[] = [`f_${format}`, `q_${quality}`];

    if (width) transforms.push(`w_${width}`);
    if (height) transforms.push(`h_${height}`);
    if (width || height || crop) transforms.push(`c_${crop}`);
    if (dpr) transforms.push(`dpr_${dpr}`);

    const transformString = transforms.join(',');

    // If already has transformation parameters right after /upload/, replace or inject cleanly
    const uploadIdx = trimmed.indexOf('/upload/');
    if (uploadIdx !== -1) {
      const prefix = trimmed.slice(0, uploadIdx + 8);
      const rest = trimmed.slice(uploadIdx + 8);

      // Check if already transformed with existing f_ or w_ parameters
      const firstSlashIdx = rest.indexOf('/');
      if (firstSlashIdx !== -1) {
        const potentialTransform = rest.slice(0, firstSlashIdx);
        if (potentialTransform.includes('f_') || potentialTransform.includes('w_') || potentialTransform.includes('q_') || potentialTransform.includes('c_')) {
          // Replace existing transformation segment
          return `${prefix}${transformString}/${rest.slice(firstSlashIdx + 1)}`;
        }
      }
      return `${prefix}${transformString}/${rest}`;
    }
  }

  return trimmed;
}

export type AvatarSizeVariant = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number | string;

export function getAvatarOptimizedUrl(url?: string | null, size: AvatarSizeVariant = 'md'): string {
  if (!url) return '';
  let pixelWidth = 120;

  if (typeof size === 'number') {
    pixelWidth = Math.round(size * 2); // 2x for Retina displays
  } else if (typeof size === 'string') {
    switch (size) {
      case 'xs':
        pixelWidth = 64;
        break;
      case 'sm':
        pixelWidth = 80;
        break;
      case 'md':
        pixelWidth = 120;
        break;
      case 'lg':
        pixelWidth = 160;
        break;
      case 'xl':
        pixelWidth = 240;
        break;
      case '2xl':
        pixelWidth = 320;
        break;
      default: {
        const parsed = parseInt(size, 10);
        pixelWidth = !isNaN(parsed) && parsed > 0 ? Math.round(parsed * 2) : 120;
        break;
      }
    }
  }

  return getOptimizedImageUrl(url, {
    width: pixelWidth,
    height: pixelWidth,
    crop: 'fill',
    quality: 'auto',
    format: 'auto',
  });
}

export function getImageSrcSet(url?: string | null, widths: number[] = [400, 800, 1200]): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  return widths
    .map((w) => `${getOptimizedImageUrl(url, { width: w, quality: 'auto', format: 'auto' })} ${w}w`)
    .join(', ');
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
