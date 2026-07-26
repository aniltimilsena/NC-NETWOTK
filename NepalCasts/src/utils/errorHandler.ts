import { logger } from './logger';
const ERROR_MAP: Record<string, string> = {
    'auth/user-not-found': 'Invalid email or password.',
    'auth/wrong-password': 'Invalid email or password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/invalid-email': 'Invalid email or password.',
    'auth/user-mismatch': 'Invalid email or password.',
    'auth/email-already-in-use': 'This email address is already in use.',
    'auth/credential-already-in-use': 'This credential is already linked to another user.',
    'auth/weak-password': 'The password is too weak. Please use a stronger password.',
    'auth/too-many-requests': 'Too many attempts. Please try again later or reset your password.',
    'auth/user-disabled': 'This account has been disabled. Please contact support.',
    'auth/network-request-failed': 'Network error. Please check your internet connection.',
    'auth/popup-closed-by-user': 'Sign-in cancelled. The sign-in window was closed.',
    'auth/popup-blocked': 'The login popup was blocked by your browser. Please allow popups for this site.',
    'auth/cancelled-popup-request': 'The sign-in window was closed because another popup request was opened.',
    'permission-denied': 'You do not have permission to perform this action.',
    'unavailable': 'Service is temporarily unavailable. Please check your connection.',
    'default': 'Something went wrong. Please try again.'
};
export const getUserFriendlyError = (error: any): string => {
    logger.error(error);
    if (!error) {
        return ERROR_MAP['default'];
    }
    if (typeof error === 'string') {
        return ERROR_MAP[error] || error;
    }
    const code = error?.code || error?.message || 'default';
    return ERROR_MAP[code] || ERROR_MAP['default'];
};
