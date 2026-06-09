export const DEFAULT_AVATAR = "/assets/default-avatar.png";
export const MALE_AVATAR = "/assets/default-male.png";
export const FEMALE_AVATAR = "/assets/default-female.png";

/**
 * Enhanced avatar utility for NC Network
 * Handles:
 * 1. Valid uploaded images
 * 2. Gender-based defaults (Male/Female)
 * 3. Fallback to generic default
 * 4. Case-insensitivity for gender strings
 */
export const getAvatar = (image?: string | null, gender?: string | null) => {
  // 1. If valid image exists
  if (image && typeof image === 'string' && image.trim() !== "") {
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

