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
