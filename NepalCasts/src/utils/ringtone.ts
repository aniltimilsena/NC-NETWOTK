import { logger } from './logger';

let audioContext: AudioContext | null = null;
let ringInterval: ReturnType<typeof setInterval> | null = null;

export const playRingtone = (): void => {
    stopRingtone();
    try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const playRingBurst = (): void => {
            if (!audioContext)
                return;
            const osc1 = audioContext.createOscillator();
            const gain1 = audioContext.createGain();
            osc1.type = "sine";
            osc1.frequency.setValueAtTime(440, audioContext.currentTime);
            gain1.gain.setValueAtTime(0, audioContext.currentTime);
            gain1.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.05);
            gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.4);
            osc1.connect(gain1);
            gain1.connect(audioContext.destination);
            osc1.start(audioContext.currentTime);
            osc1.stop(audioContext.currentTime + 0.4);
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.type = "sine";
            osc2.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.5);
            gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.5);
            gain2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.55);
            gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.9);
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.start(audioContext.currentTime + 0.5);
            osc2.stop(audioContext.currentTime + 0.9);
        };
        playRingBurst();
        ringInterval = setInterval(playRingBurst, 2000);
    }
    catch (err) {
        logger.error("[Ringtone] Failed to play:", err);
    }
};

export const stopRingtone = (): void => {
    if (ringInterval) {
        clearInterval(ringInterval);
        ringInterval = null;
    }
    if (audioContext) {
        audioContext.close().catch((_err) => { /* ignore close error */ });
        audioContext = null;
    }
};

export const playEndCallSound = (): void => {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(480, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(300, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        setTimeout(() => ctx.close(), 500);
    }
    catch (err) {
        logger.warn("[Ringtone] End call sound failed:", err);
    }
};
