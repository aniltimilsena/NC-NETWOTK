/**
 * Real-time User Presence & Online Status Helper
 * Accurately determines if a user is online by evaluating both their online flag
 * AND their lastSeen / updatedAt timestamp recency (heartbeat threshold: 90s).
 */

export const ONLINE_THRESHOLD_MS = 90 * 1000; // 90 seconds

export function isUserOnline(data: any, thresholdMs: number = ONLINE_THRESHOLD_MS): boolean {
    if (!data) return false;

    // Must have an explicit online flag set to true
    const flag = data.isOnline === true || data.online === true;
    if (!flag) return false;

    // Check lastSeen / lastActive / updatedAt recency
    const rawTime = data.lastSeen || data.lastActive || data.updatedAt;
    if (!rawTime) {
        return false;
    }

    let timeMs = 0;
    if (typeof rawTime?.toMillis === 'function') {
        timeMs = rawTime.toMillis();
    } else if (typeof rawTime?.seconds === 'number') {
        timeMs = rawTime.seconds * 1000;
    } else if (rawTime instanceof Date) {
        timeMs = rawTime.getTime();
    } else if (typeof rawTime === 'number') {
        timeMs = rawTime;
    } else if (typeof rawTime === 'string') {
        timeMs = new Date(rawTime).getTime();
    }

    if (!timeMs || isNaN(timeMs)) return false;

    // Must have sent a heartbeat or interaction within the threshold
    return (Date.now() - timeMs) <= thresholdMs;
}
