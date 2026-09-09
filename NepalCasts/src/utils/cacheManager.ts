interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}

interface ListenerPoolEntry {
    unsubscribe: () => void;
    listenerCreator: (callback: (data: any, error?: any) => void) => () => void;
    refCount: number;
    subscribers: Set<(data: any, error?: any) => void>;
    lastData?: any;
    isPaused?: boolean;
}

class CacheManager {
    private cache = new Map<string, CacheEntry<any>>();
    private inFlightPromises = new Map<string, Promise<any>>();
    private listenerPool = new Map<string, ListenerPoolEntry>();
    private visibilityTimer: ReturnType<typeof setTimeout> | null = null;
    private isBackgroundPaused = false;

    public metrics = {
        cacheHits: 0,
        cacheMisses: 0,
        firestoreReadsSaved: 0,
        duplicateRequestsPrevented: 0,
        activeListeners: 0
    };

    constructor() {
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                this.handleVisibilityChange();
            });
        }
    }

    private handleVisibilityChange() {
        if (typeof document === 'undefined') return;

        if (document.visibilityState === 'hidden') {
            // Delay pause by 45 seconds to avoid churn on quick tab switches
            this.visibilityTimer = setTimeout(() => {
                this.pauseInactiveListeners();
            }, 45000);
        } else if (document.visibilityState === 'visible') {
            if (this.visibilityTimer) {
                clearTimeout(this.visibilityTimer);
                this.visibilityTimer = null;
            }
            if (this.isBackgroundPaused) {
                this.resumeActiveListeners();
            }
        }
    }

    private pauseInactiveListeners() {
        this.isBackgroundPaused = true;
        console.debug(`[Listener Pool] Tab hidden > 45s: Pausing ${this.listenerPool.size} background listeners to save quota`);
        for (const [_, entry] of this.listenerPool.entries()) {
            if (!entry.isPaused) {
                try {
                    entry.unsubscribe();
                    entry.isPaused = true;
                } catch (e) {
                    // ignore teardown error
                }
            }
        }
    }

    private resumeActiveListeners() {
        this.isBackgroundPaused = false;
        console.debug(`[Listener Pool] Tab visible: Resuming ${this.listenerPool.size} active listeners`);
        for (const [key, entry] of this.listenerPool.entries()) {
            if (entry.isPaused && entry.refCount > 0) {
                entry.isPaused = false;
                const pooledCallback = (data: any, error?: any) => {
                    const poolEntry = this.listenerPool.get(key);
                    if (poolEntry) {
                        poolEntry.lastData = data;
                        poolEntry.subscribers.forEach(sub => sub(data, error));
                    }
                };
                try {
                    entry.unsubscribe = entry.listenerCreator(pooledCallback);
                } catch (err) {
                    console.error(`Failed to resume pooled listener for ${key}:`, err);
                }
            }
        }
    }

    async fetchWithCache<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 5 * 60 * 1000): Promise<T> {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && now < cached.expiresAt) {
            this.metrics.cacheHits++;
            console.debug(`[Cache] HIT: ${key}`);
            return cached.data;
        }
        if (this.inFlightPromises.has(key)) {
            this.metrics.duplicateRequestsPrevented++;
            this.metrics.firestoreReadsSaved++;
            console.debug(`[Firestore] Duplicate request prevented for key: ${key}`);
            return this.inFlightPromises.get(key) as Promise<T>;
        }
        this.metrics.cacheMisses++;
        console.debug(`[Cache] MISS: ${key} (Fetching from source)`);
        const promise = (async () => {
            try {
                const result = await fetcher();
                this.cache.set(key, {
                    data: result,
                    timestamp: now,
                    expiresAt: now + ttlMs
                });
                return result;
            }
            finally {
                this.inFlightPromises.delete(key);
            }
        })();
        this.inFlightPromises.set(key, promise);
        return promise;
    }

    subscribePooled(key: string, listenerCreator: (callback: (data: any, error?: any) => void) => () => void, callback: (data: any, error?: any) => void): () => void {
        let entry = this.listenerPool.get(key);
        if (!entry) {
            const subscribers = new Set<(data: any, error?: any) => void>();
            subscribers.add(callback);
            
            let currentUnsubscribe = () => {};
            entry = {
                unsubscribe: () => currentUnsubscribe(),
                listenerCreator,
                refCount: 1,
                subscribers,
                isPaused: false,
            };
            this.listenerPool.set(key, entry);

            const pooledCallback = (data: any, error?: any) => {
                const poolEntry = this.listenerPool.get(key);
                if (poolEntry) {
                    poolEntry.lastData = data;
                    poolEntry.subscribers.forEach(sub => sub(data, error));
                }
            };
            
            try {
                const unsubscribe = listenerCreator(pooledCallback);
                currentUnsubscribe = unsubscribe;
            } catch (err) {
                this.listenerPool.delete(key);
                throw err;
            }
            
            this.metrics.activeListeners = this.listenerPool.size;
            console.debug(`[Listener] Created new pooled listener for key: ${key}. Active pool count: ${this.listenerPool.size}`);
        }
        else {
            entry.refCount++;
            entry.subscribers.add(callback);
            this.metrics.firestoreReadsSaved++;
            console.debug(`[Listener] Reused pooled listener for key: ${key}. Subscriber count: ${entry.refCount}`);
            if (entry.lastData !== undefined) {
                callback(entry.lastData, null);
            }
        }
        return () => {
            const currentEntry = this.listenerPool.get(key);
            if (!currentEntry)
                return;
            currentEntry.subscribers.delete(callback);
            currentEntry.refCount--;
            if (currentEntry.refCount <= 0) {
                currentEntry.unsubscribe();
                this.listenerPool.delete(key);
                this.metrics.activeListeners = this.listenerPool.size;
                console.debug(`[Listener] Disposed pooled listener for key: ${key}. Remaining active: ${this.listenerPool.size}`);
            }
        };
    }

    invalidateCache(keyOrPrefix: string, newData?: any) {
        for (const key of this.cache.keys()) {
            if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
                this.cache.delete(key);
                console.debug(`[Cache] Invalidated key: ${key}`);
            }
        }
        for (const [key, entry] of this.listenerPool.entries()) {
            if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
                if (newData !== undefined) {
                    entry.lastData = newData;
                    entry.subscribers.forEach(sub => sub(newData, null));
                } else {
                    delete entry.lastData;
                }
                console.debug(`[Listener] Updated pooled listener key: ${key}`);
            }
        }
    }

    reemit(key: string, data: any) {
        const entry = this.listenerPool.get(key);
        if (entry) {
            entry.lastData = data;
            entry.subscribers.forEach(sub => sub(data, null));
            console.debug(`[Listener] Re-emitted pooled listener key: ${key}`);
        }
    }

    getMemory<T>(key: string): T | null {
        const cached = this.cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.data;
        }
        return null;
    }

    setMemory<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
        const now = Date.now();
        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt: now + ttlMs,
        });
    }

    clearAll() {
        this.cache.clear();
        console.debug(`[Cache] All entries cleared`);
    }
}

export const cacheManager = new CacheManager();
