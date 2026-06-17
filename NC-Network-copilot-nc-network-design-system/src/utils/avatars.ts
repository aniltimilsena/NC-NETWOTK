export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" stroke="%23222222" stroke-width="1.5" height="100" fill="%23111111" rx="50"/><path d="M50 25a15 15 0 1 0 15 15 15 15 0 0 0-15-15zm-25 50c0-10 15-15 25-15s25 5 25 15v5H25z" fill="%23888888"/></svg>`;
export const MALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" stroke="%231a2c38" stroke-width="1.5" height="100" fill="%230c1720" rx="50"/><path d="M50 25a15 15 0 1 0 15 15 15 15 0 0 0-15-15zm-25 50c0-10 15-15 25-15s25 5 25 15v5H25z" fill="%2300bfff"/></svg>`;
export const FEMALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" stroke="%232c1a38" stroke-width="1.5" height="100" fill="%23150c20" rx="50"/><path d="M50 25a15 15 0 1 0 15 15 15 15 0 0 0-15-15zm-25 50c0-10 15-15 25-15s25 5 25 15v5H25z" fill="%23ec4899"/></svg>`;

/**
 * Enhanced avatar utility for NC Network
 * Handles:
 * 1. Valid uploaded images
 * 2. Gender-based defaults (Male/Female)
 * 3. Fallback to generic default
 * 4. Case-insensitivity for gender strings
 */
const isDefaultImage = (url?: string | null) => {
  if (!url) return true;
  return url.includes('default-avatar.png') || 
         url.includes('default-male.png') || 
         url.includes('default-female.png') || 
         url.includes('achyut.png');
};

export const getAvatar = (image?: string | null, gender?: string | null) => {
  // 1. If valid image exists and is not a default placeholder
  if (image && typeof image === 'string' && image.trim() !== "" && !isDefaultImage(image)) {
    return image;
  }
  
  // 2. Gender-based logic (normalized to lowercase)
  const g = gender?.toLowerCase().trim();
  if (g === "female" || g === "f") return FEMALE_AVATAR;
  if (g === "male" || g === "m") return MALE_AVATAR;
  
  // 3. Absolute fallback
  return DEFAULT_AVATAR;
};

/**
 * Reusable helper that accepts a user/profile object
 */
export const getProfileImage = (user: any) => {
  if (!user) return DEFAULT_AVATAR;
  
  // Try various common property names
  const image = user.photoURL || user.profileImage || user.image;
  const gender = user.gender;
  
  return getAvatar(image, gender);
};

