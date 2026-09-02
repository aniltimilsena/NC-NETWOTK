import { logger } from './logger';

let audioCtx: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;
let isPreloaded = false;

/**
 * Pre-warms notification.mp3 into an in-memory AudioBuffer on initial user interaction
 */
export const preloadNotificationSound = async (): Promise<void> => {
    if (isPreloaded || typeof window === 'undefined') return;
    try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        if (!audioCtx) {
            audioCtx = new AudioContextClass();
        }
        const response = await fetch('/notification.mp3');
        const arrayBuffer = await response.arrayBuffer();
        notificationBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        isPreloaded = true;
    } catch (err) {
        logger.debug('Pre-buffering notification sound skipped or unsupported:', err);
    }
};

/**
 * Plays the pre-buffered sound with 0ms Web Audio latency
 */
export const playNotificationSound = (): void => {
    try {
        if (audioCtx && notificationBuffer) {
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            const source = audioCtx.createBufferSource();
            source.buffer = notificationBuffer;
            source.connect(audioCtx.destination);
            source.start(0);
            return;
        }

        // Fallback to HTML5 Audio element
        const audio = new Audio('/notification.mp3');
        audio.preload = 'auto';
        audio.play().catch(err => {
            logger.warn('Audio playback failed (likely browser policy):', err);
        });
    } catch (error) {
        logger.error('Failed to initialize audio:', error);
    }
};
