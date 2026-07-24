/**
 * Advanced Client-Side Cache, Request Deduplicator, and Listener Pool Manager
 * Designed for High-Concurrency (1,000+ simultaneous users)
 */

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
  
  // Developer Metrics Telemetry
  public metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    firestoreReadsSaved: 0,
    duplicateRequestsPrevented: 0,
    activeListeners: 0
  };

  /**
   * Execute a data fetcher with caching and in-flight request deduplication (Single Flight pattern)
   */
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(key);

    // 1. Return valid cached data (Cache Hit)
    if (cached && now < cached.expiresAt) {
      this.metrics.cacheHits++;
      console.debug(`[Cache] HIT: ${key}`);
      return cached.data;
    }

    // 2. Request Deduplication: If already in-flight, reuse the same promise
    if (this.inFlightPromises.has(key)) {
      this.metrics.duplicateRequestsPrevented++;
      this.metrics.firestoreReadsSaved++;
      console.debug(`[Firestore] Duplicate request prevented for key: ${key}`);
      return this.inFlightPromises.get(key) as Promise<T>;
    }

    // 3. Cache Miss: Execute fetcher
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
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  /**
   * Managed Listener Pool: Deduplicates real-time onSnapshot listeners
   */
  subscribePooled(
    key: string,
    listenerCreator: (callback: (data: any, error?: any) => void) => () => void,
    callback: (data: any, error?: any) => void
  ): () => void {
    let entry = this.listenerPool.get(key);

    if (!entry) {
      const subscribers = new Set<(data: any, error?: any) => void>();
      subscribers.add(callback);

      const pooledCallback = (data: any, error?: any) => {
        const poolEntry = this.listenerPool.get(key);
        if (poolEntry) {
          poolEntry.lastData = data;
          poolEntry.subscribers.forEach(sub => sub(data, error));
        }
      };

      const unsubscribe = listenerCreator(pooledCallback);

      entry = {
        unsubscribe,
        refCount: 1,
        subscribers,
      };

      this.listenerPool.set(key, entry);
      this.metrics.activeListeners = this.listenerPool.size;
      console.debug(`[Listener] Created new pooled listener for key: ${key}. Active pool count: ${this.listenerPool.size}`);
    } else {
      entry.refCount++;
      entry.subscribers.add(callback);
      this.metrics.firestoreReadsSaved++;
      console.debug(`[Listener] Reused pooled listener for key: ${key}. Subscriber count: ${entry.refCount}`);

      // Deliver cached snapshot immediately if available
      if (entry.lastData !== undefined) {
        callback(entry.lastData, null);
      }
    }

    // Unsubscribe Handler with Reference Counting Cleanup
    return () => {
      const currentEntry = this.listenerPool.get(key);
      if (!currentEntry) return;

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

  /**
   * Invalidate specific cache key or pattern
   */
  invalidateCache(keyOrPrefix: string) {
    for (const key of this.cache.keys()) {
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.cache.delete(key);
        console.debug(`[Cache] Invalidated key: ${key}`);
      }
    }
  }

  /**
   * Clear all cache
   */
  clearAll() {
    this.cache.clear();
    console.debug(`[Cache] All entries cleared`);
  }
}

export const cacheManager = new CacheManager();
