import { getOptimizedImageUrl } from './media';

export const DEFAULT_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2318181E" rx="50"/><path d="M50 25a15 15 0 1 0 15 15 15 15 0 0 0-15-15zm-25 50c0-10 15-15 25-15s25 5 25 15v5H25z" fill="%235A5A75"/></svg>`;
export const MALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2318181E" rx="50"/><path d="M50 25a15 15 0 1 0 15 15 15 15 0 0 0-15-15zm-25 50c0-10 15-15 25-15s25 5 25 15v5H25z" fill="%235A5A75"/></svg>`;
export const FEMALE_AVATAR = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2318181E" rx="50"/><path d="M50 25a15 15 0 1 0 15 15 15 15 0 0 0-15-15zm-25 50c0-10 15-15 25-15s25 5 25 15v5H25z" fill="%235A5A75"/></svg>`;

export const isDefaultImage = (url?: string | null) => {
    if (!url || typeof url !== 'string' || url.trim() === '')
        return true;
    const lower = url.toLowerCase();
    if (
        lower.includes('default-avatar') ||
        lower.includes('default-male') ||
        lower.includes('default-female') ||
        lower.includes('achyut.png') ||
        lower.includes('img.clerk.com') ||
        lower.includes('clerk.dev') ||
        lower.startsWith('data:image/svg+xml')
    ) {
        return true;
    }
    return false;
};
export const getAvatar = (image?: string | null, gender?: string | null) => {
    if (image && typeof image === 'string' && image.trim() !== "" && !isDefaultImage(image)) {
        return getOptimizedImageUrl(image, { width: 400, height: 400 });
    }
    const g = gender?.toLowerCase().trim();
    if (g === "female" || g === "f")
        return FEMALE_AVATAR;
    if (g === "male" || g === "m")
        return MALE_AVATAR;
    return DEFAULT_AVATAR;
};
export const getProfileImage = (user: any) => {
    if (!user)
        return DEFAULT_AVATAR;
    const image = user.image || user.photoURL || user.profileImage || user.avatar || user.picture || user.photo || null;
    const gender = user.gender;
    return getAvatar(image, gender);
};
