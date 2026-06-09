// Utility to play notification sound
// Using public/notification.mp3 as primary source
// Fallback to a simple subtle beep if needed

export const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => {
      console.warn('Audio playback failed (likely browser policy):', err);
      // Fallback: browser default beep or silent failure is better than technical crash
    });
  } catch (error) {
    console.error('Failed to initialize audio:', error);
  }
};
