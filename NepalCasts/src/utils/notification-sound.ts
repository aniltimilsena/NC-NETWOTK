import { logger } from './logger';

export const playNotificationSound = (): void => {
    try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(err => {
            logger.warn('Audio playback failed (likely browser policy):', err);
        });
    }
    catch (error) {
        logger.error('Failed to initialize audio:', error);
    }
};
