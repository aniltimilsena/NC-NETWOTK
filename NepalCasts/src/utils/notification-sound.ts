export const playNotificationSound = () => {
    try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(err => {
            console.warn('Audio playback failed (likely browser policy):', err);
        });
    }
    catch (error) {
        console.error('Failed to initialize audio:', error);
    }
};
