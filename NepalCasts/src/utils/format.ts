export const formatMessagePreview = (text: string | null | undefined): string => {
  if (!text) return '';
  if (typeof text !== 'string') return String(text);
  const trimmed = text.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    const lower = trimmed.toLowerCase();
    if (lower.includes('.mp4') || lower.includes('.webm') || lower.includes('.mov') || lower.includes('/video/')) {
      return '🎥 Sent a video';
    }
    if (lower.includes('.jpg') || lower.includes('.jpeg') || lower.includes('.png') || lower.includes('.gif') || lower.includes('.webp') || lower.includes('/image/') || lower.includes('cloudinary')) {
      return '📷 Sent a photo';
    }
    return '🔗 Sent a link';
  }
  return text;
};
