import { collection, query, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { COLLECTIONS } from "../../../constants/collections";
import apiClient from "../../../api/client";

type Talent = {
    id: string;
    [key: string]: unknown;
};

import { cacheManager } from "../../../utils/cacheManager";

const LOCAL_STORAGE_CACHE_KEY = "nc_cached_talents_real";

const getSavedRealTalents = (): Talent[] => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const seen = new Set<string>();
                const unique: Talent[] = [];
                for (const t of parsed) {
                    const uid = (t.uid || t.id || '') as string;
                    const username = (t.username || '') as string;
                    if (!uid || seen.has(uid) || (username && seen.has(`usr_${username}`))) {
                        continue;
                    }
                    seen.add(uid);
                    if (username) {
                        seen.add(`usr_${username}`);
                    }
                    unique.push(t);
                }
                return unique;
            }
        }
    } catch (_e) {
        // ignore parse error
    }
    return [];
};

const saveRealTalents = (talents: Talent[]) => {
    try {
        if (Array.isArray(talents) && talents.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_CACHE_KEY, JSON.stringify(talents));
        }
    } catch (_e) {
        // ignore storage quota error
    }
};

export const subscribeToTalents = (callback: (talents: Talent[]) => void) => {
    return cacheManager.subscribePooled("talents_list_all", (pooledCb) => {
        // First check local persistent storage for previously cached real talents
        const saved = getSavedRealTalents();
        if (saved.length > 0) {
            pooledCb(saved, null);
        }

        const fetchFromApiFallback = async () => {
            try {
                const res = await apiClient.get('/profile/public');
                if (res.data?.success && Array.isArray(res.data.talents) && res.data.talents.length > 0) {
                    const seen = new Set<string>();
                    const unique: Talent[] = [];
                    for (const t of res.data.talents) {
                        const uid = (t.uid || t.id || '') as string;
                        const username = (t.username || '') as string;
                        if (!uid || seen.has(uid) || (username && seen.has(`usr_${username}`))) {
                            continue;
                        }
                        seen.add(uid);
                        if (username) {
                            seen.add(`usr_${username}`);
                        }
                        unique.push(t);
                    }
                    unique.sort((a: any, b: any) => ((a.name || '').localeCompare(b.name || '')));
                    saveRealTalents(unique);
                    pooledCb(unique, null);
                    return true;
                }
            } catch (_apiErr) {
                // Silently swallow fallback error if backend server is offline or proxy 502
            }
            return false;
        };

        const processSnapshotDocs = (docs: any[]) => {
            const seen = new Set<string>();
            const unique: Talent[] = [];
            const mapped = docs.map((doc) => ({
                id: doc.id,
                uid: doc.id,
                ...doc.data(),
            }));
            for (const t of mapped) {
                const uid = (t.uid || t.id || '') as string;
                const username = (t.username || '') as string;
                if (!uid || seen.has(uid) || (username && seen.has(`usr_${username}`))) {
                    continue;
                }
                seen.add(uid);
                if (username) {
                    seen.add(`usr_${username}`);
                }
                unique.push(t);
            }
            unique.sort((a: any, b: any) => ((a.name || '').localeCompare(b.name || '')));
            return unique;
        };

        const q = query(collection(db, COLLECTIONS.PROFILES));
        const unsub = onSnapshot(q, (snapshot) => {
            const talents = processSnapshotDocs(snapshot.docs);
            if (talents.length > 0) {
                saveRealTalents(talents);
                pooledCb(talents, null);
            } else {
                fetchFromApiFallback().then((success) => {
                    if (!success) pooledCb(saved, null);
                });
            }
        }, (_error) => {
            getDocs(q).then((snapshot) => {
                const talents = processSnapshotDocs(snapshot.docs);
                if (talents.length > 0) {
                    saveRealTalents(talents);
                    pooledCb(talents, null);
                } else {
                    fetchFromApiFallback().then((success) => {
                        if (!success) pooledCb(saved, null);
                    });
                }
            }).catch(async (fetchError) => {
                const success = await fetchFromApiFallback();
                if (!success) {
                    pooledCb(saved, fetchError);
                }
            });
        });

        return unsub;
    }, (data) => callback(data));
};



