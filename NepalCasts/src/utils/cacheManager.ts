interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
}
interface ListenerPoolEntry {
    unsubscribe: () => void;
    refCount: number;
    subscribers: Set<(data: any, error?: any) => void>;
    lastData?: any;
}
class CacheManager {
    private cache = new Map<string, CacheEntry<any>>();
    private inFlightPromises = new Map<string, Promise<any>>();
    private listenerPool = new Map<string, ListenerPoolEntry>();
    public metrics = {
        cacheHits: 0,
        cacheMisses: 0,
        firestoreReadsSaved: 0,
        duplicateRequestsPrevented: 0,
        activeListeners: 0
    };
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
                refCount: 1,
                subscribers,
            };
            this.listenerPool.set(key, entry);

            const pooledCallback = (data: any, error?: any) => {
                const poolEntry = this.listenerPool.get(key);
                if (poolEntry) {
                    poolEntry.lastData = data;
                    poolEntry.subscribers.forEach(sub => sub(data, error));
                }
            };
            
            const unsubscribe = listenerCreator(pooledCallback);
            currentUnsubscribe = unsubscribe;
            
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
    invalidateCache(keyOrPrefix: string) {
        for (const key of this.cache.keys()) {
            if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
                this.cache.delete(key);
                console.debug(`[Cache] Invalidated key: ${key}`);
            }
        }
    }
    clearAll() {
        this.cache.clear();
        console.debug(`[Cache] All entries cleared`);
    }
}
export const cacheManager = new CacheManager();
