import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cacheManager } from '../utils/cacheManager';

describe('CacheManager background listener throttling & pooling', () => {
    beforeEach(() => {
        cacheManager.clearAll();
    });

    it('pools multiple subscriptions to the same key and deduplicates listener creation', () => {
        let listenerCreatedCount = 0;
        const fakeTeardown = vi.fn();
        const fakeCreator = vi.fn((callback) => {
            listenerCreatedCount++;
            callback({ name: 'Test Casting Call' });
            return fakeTeardown;
        });

        const subscriber1 = vi.fn();
        const subscriber2 = vi.fn();

        const unsub1 = cacheManager.subscribePooled('test_pool_key', fakeCreator, subscriber1);
        expect(listenerCreatedCount).toBe(1);
        expect(subscriber1).toHaveBeenCalledWith({ name: 'Test Casting Call' }, undefined);

        // Second subscriber reusing pooled listener
        const unsub2 = cacheManager.subscribePooled('test_pool_key', fakeCreator, subscriber2);
        expect(listenerCreatedCount).toBe(1); // Not called again!
        expect(subscriber2).toHaveBeenCalledWith({ name: 'Test Casting Call' }, null);

        // Teardown subscriber 1
        unsub1();
        expect(fakeTeardown).not.toHaveBeenCalled(); // Still active because refCount is 1

        // Teardown subscriber 2
        unsub2();
        expect(fakeTeardown).toHaveBeenCalledTimes(1); // Disposed because refCount reached 0
    });

    it('pauses background listeners when tab is hidden and resumes when visible', () => {
        const fakeTeardown = vi.fn();
        let fireCallback: ((data: any) => void) | null = null;
        let creatorCallCount = 0;

        const fakeCreator = vi.fn((callback) => {
            creatorCallCount++;
            fireCallback = callback;
            callback('data_v1');
            return fakeTeardown;
        });

        const sub = vi.fn();
        const unsub = cacheManager.subscribePooled('visibility_test_key', fakeCreator, sub);

        expect(creatorCallCount).toBe(1);
        expect(sub).toHaveBeenCalledWith('data_v1', undefined);
        expect(cacheManager.isPaused).toBe(false);

        // Simulate tab hidden (trigger pause directly)
        cacheManager.pauseInactiveListeners();
        expect(cacheManager.isPaused).toBe(true);
        expect(fakeTeardown).toHaveBeenCalledTimes(1);

        // Simulate tab refocus (trigger resume directly)
        cacheManager.resumeActiveListeners();
        expect(cacheManager.isPaused).toBe(false);
        // Resuming must have recreated the listener
        expect(creatorCallCount).toBe(2);
        // Sub must have received cached data immediately on resume
        expect(sub).toHaveBeenCalledWith('data_v1', null);

        // Emit new live data from the resumed listener
        if (fireCallback) {
            (fireCallback as any)('data_v2');
        }
        expect(sub).toHaveBeenCalledWith('data_v2', undefined);

        unsub();
    });

    it('safely handles unmount while listener is in paused state', () => {
        const fakeTeardown = vi.fn();
        const fakeCreator = vi.fn((cb) => {
            cb('sample');
            return fakeTeardown;
        });

        const sub = vi.fn();
        const unsub = cacheManager.subscribePooled('paused_unmount_key', fakeCreator, sub);

        cacheManager.pauseInactiveListeners();
        expect(fakeTeardown).toHaveBeenCalledTimes(1);

        // Unmount while paused: should not throw and should clean up refCount
        expect(() => unsub()).not.toThrow();
        expect(cacheManager.activeListenerCount).toBe(0);
    });
});
