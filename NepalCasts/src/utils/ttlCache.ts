/**
 * In-Memory TTL Cache Utility
 * Avoids repeated network hits for invariant data (categories, site settings, FAQs)
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class TTLCache {
  private cache = new Map<string, CacheEntry<any>>();

  /**
   * Get cached data or execute fetchFn and store with TTL
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = 10 * 60 * 1000 // Default: 10 minutes
  ): Promise<T> {
    const now = Date.now();
    const entry = this.cache.get(key);

    if (entry && entry.expiry > now) {
      return entry.data;
    }

    const freshData = await fetchFn();
    this.cache.set(key, {
      data: freshData,
      expiry: now + ttlMs,
    });

    return freshData;
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached items
   */
  clear(): void {
    this.cache.clear();
  }
}

export const ttlCache = new TTLCache();
