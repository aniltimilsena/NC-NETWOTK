import { describe, it, expect } from 'vitest';
import { isUserOnline } from '../utils/presence';

describe('isUserOnline', () => {
    it('returns false for empty or null data', () => {
        expect(isUserOnline(null)).toBe(false);
        expect(isUserOnline(undefined)).toBe(false);
        expect(isUserOnline({})).toBe(false);
    });

    it('returns false when online flag is false or missing even with recent timestamp', () => {
        expect(isUserOnline({ isOnline: false, lastSeen: new Date() })).toBe(false);
        expect(isUserOnline({ online: false, updatedAt: Date.now() })).toBe(false);
        expect(isUserOnline({ lastSeen: new Date() })).toBe(false);
    });

    it('returns false when online flag is true but timestamp is stale (> 90 seconds ago)', () => {
        const staleTime = Date.now() - 120 * 1000; // 2 minutes ago
        expect(isUserOnline({ isOnline: true, lastSeen: staleTime })).toBe(false);
        expect(isUserOnline({ online: true, updatedAt: new Date(staleTime) })).toBe(false);
    });

    it('returns true when online flag is true and timestamp is fresh (< 90 seconds ago)', () => {
        const freshTime = Date.now() - 10 * 1000; // 10 seconds ago
        expect(isUserOnline({ isOnline: true, lastSeen: freshTime })).toBe(true);
        expect(isUserOnline({ online: true, lastActive: new Date(freshTime) })).toBe(true);
        expect(isUserOnline({ isOnline: true, updatedAt: { toMillis: () => freshTime } })).toBe(true);
    });
});
