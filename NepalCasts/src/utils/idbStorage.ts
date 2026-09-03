/**
 * Native Asynchronous IndexedDB Storage with in-memory fast-cache
 * Replaces blocking synchronous localStorage for large data objects (talents, casting calls, profiles).
 * Completely non-blocking (60 FPS preserved during serialization/deserialization).
 */

const DB_NAME = 'nc_app_storage';
const STORE_NAME = 'cached_entities';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase | null> | null = null;
const memoryCache = new Map<string, any>();

function getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.resolve(null);
    }
    if (!dbPromise) {
        dbPromise = new Promise((resolve) => {
            try {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onupgradeneeded = () => {
                    const db = req.result;
                    if (!db.objectStoreNames.contains(STORE_NAME)) {
                        db.createObjectStore(STORE_NAME);
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => {
                    console.warn('[IDBStorage] IndexedDB unavailable, using memory fallback');
                    resolve(null);
                };
            } catch (_err) {
                resolve(null);
            }
        });
    }
    return dbPromise;
}

export function idbGetSync<T>(key: string): T | null {
    if (memoryCache.has(key)) {
        return memoryCache.get(key) as T;
    }
    return null;
}

export async function idbGet<T>(key: string): Promise<T | null> {
    if (memoryCache.has(key)) {
        return memoryCache.get(key) as T;
    }
    try {
        const db = await getDB();
        if (!db) return null;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(key);
                req.onsuccess = () => {
                    const val = req.result ?? null;
                    if (val !== null) {
                        memoryCache.set(key, val);
                    }
                    resolve(val);
                };
                req.onerror = () => resolve(null);
            } catch (_err) {
                resolve(null);
            }
        });
    } catch (_e) {
        return null;
    }
}

export async function idbSet<T>(key: string, value: T): Promise<void> {
    memoryCache.set(key, value);
    try {
        const db = await getDB();
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put(value, key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_err) {
                resolve();
            }
        });
    } catch (_e) {
        // Fallback to in-memory map on any storage error
    }
}

export async function idbDelete(key: string): Promise<void> {
    memoryCache.delete(key);
    try {
        const db = await getDB();
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).delete(key);
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_err) {
                resolve();
            }
        });
    } catch (_e) {
        // ignore
    }
}

export async function idbClear(): Promise<void> {
    memoryCache.clear();
    try {
        const db = await getDB();
        if (!db) return;
        return new Promise((resolve) => {
            try {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                tx.objectStore(STORE_NAME).clear();
                tx.oncomplete = () => resolve();
                tx.onerror = () => resolve();
            } catch (_err) {
                resolve();
            }
        });
    } catch (_e) {
        // ignore
    }
}
