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
                    // Reset stale cached follower count until real live count is fetched
                    t.followers = 0;
                    t.followersCount = 0;
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

            let followsCountsMap: Record<string, number> = {};
            let followingCountsMap: Record<string, number> = {};

            const processSnapshotDocs = (docs: any[]) => {
                const rawMapped = docs.map((docSnap) => ({
                    id: docSnap.id,
                    uid: docSnap.id,
                    ...docSnap.data(),
                })) as any[];

                // Sort so complete records with names come first
                rawMapped.sort((a, b) => {
                    const aHasName = Boolean(a.name && a.name.trim() !== '' && a.name !== 'Talent User' && a.name !== 'Discovery Talent');
                    const bHasName = Boolean(b.name && b.name.trim() !== '' && b.name !== 'Talent User' && b.name !== 'Discovery Talent');
                    if (aHasName && !bHasName) return -1;
                    if (!aHasName && bHasName) return 1;
                    return 0;
                });

                const seen = new Set<string>();
                const unique: Talent[] = [];

                for (const t of rawMapped) {
                    const uid = (t.uid || t.id || '') as string;
                    const name = (t.name || t.displayName || '').trim();
                    if (!uid || seen.has(uid)) {
                        continue;
                    }
                    if (name || t.role || t.category || t.bio) {
                        seen.add(uid);
                        unique.push(t);
                    }
                }

                for (const t of unique) {
                    const u = t as any;
                    const uid = (u.uid || u.id || '') as string;
                    const uName = (u.username || '').toLowerCase().trim();
                    const uEmail = (u.email || '').toLowerCase().trim();

                    const liveFollowers = followsCountsMap[uid] || (uName && followsCountsMap[uName]) || (uEmail && followsCountsMap[uEmail]) || 0;
                    const liveFollowing = followingCountsMap[uid] || (uName && followingCountsMap[uName]) || (uEmail && followingCountsMap[uEmail]) || 0;

                    u.followers = liveFollowers;
                    u.followersCount = liveFollowers;
                    u.following = liveFollowing;
                    u.followingCount = liveFollowing;
                }

                unique.sort((a: any, b: any) => ((a.name || '').localeCompare(b.name || '')));
                return unique;
            };

            let lastDocs: any[] = [];
            const followsQuery = query(collection(db, COLLECTIONS.FOLLOWS));
            const unsubFollows = onSnapshot(followsQuery, (followsSnap) => {
                const fMap: Record<string, number> = {};
                const ingMap: Record<string, number> = {};
                const validProfileUids = new Set<string>();
                if (lastDocs.length > 0) {
                    lastDocs.forEach((d: any) => {
                        const data = d.data();
                        if (d.id) validProfileUids.add(d.id);
                        if (data.uid) validProfileUids.add(data.uid);
                        if (data.username) validProfileUids.add(data.username.toLowerCase().trim());
                    });
                }
                const mockFollowerUids = new Set(['uyR9rwPbZBUms2ffermJA0SDbqw2', 'Mm1B6rYaEebs6ajRyu0EJBrrGwT2']);
                followsSnap.docs.forEach((d) => {
                    const data = d.data();
                    const followerId = data.followerId;
                    const followingId = data.followingId;
                    // Exclude self-follows and known mock follow records
                    if (followerId && followingId && followerId !== followingId && !mockFollowerUids.has(followerId)) {
                        if (validProfileUids.size > 0 ? validProfileUids.has(followerId) : true) {
                            fMap[followingId] = (fMap[followingId] || 0) + 1;
                        }
                        if (validProfileUids.size > 0 ? validProfileUids.has(followingId) : true) {
                            ingMap[followerId] = (ingMap[followerId] || 0) + 1;
                        }
                    }
                });
                followsCountsMap = fMap;
                followingCountsMap = ingMap;
                if (lastDocs.length > 0) {
                    const updatedTalents = processSnapshotDocs(lastDocs);
                    saveRealTalents(updatedTalents);
                    pooledCb(updatedTalents, null);
                }
            }, () => {});

            const q = query(collection(db, COLLECTIONS.PROFILES));
            const unsub = onSnapshot(q, (snapshot) => {
                lastDocs = snapshot.docs;
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
                    lastDocs = snapshot.docs;
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

        const handleProfileUpdateEvent = (e: Event) => {
            const { uid, image } = (e as CustomEvent).detail || {};
            if (uid && image !== undefined) {
                const currentSaved = getSavedRealTalents();
                if (currentSaved.length > 0) {
                    const updated = currentSaved.map(t => {
                        const tUid = (t.uid || t.id) as string;
                        if (tUid === uid) {
                            return {
                                ...t,
                                image,
                                photoURL: image,
                                profileImage: image
                            };
                        }
                        return t;
                    });
                    saveRealTalents(updated);
                    pooledCb(updated, null);
                }
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('nc-profile-updated', handleProfileUpdateEvent);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('nc-profile-updated', handleProfileUpdateEvent);
            }
            unsubFollows();
            unsub();
        };
    }, (data) => callback(data));
};

export const notifyProfileUpdated = (uid: string, imageUrl: string) => {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nc-profile-updated', { detail: { uid, image: imageUrl } }));
        }
    } catch (_e) {
        /* ignore event error */
    }
    
    const saved = getSavedRealTalents();
    if (saved.length > 0) {
        const updated = saved.map(t => {
            const tUid = (t.uid || t.id) as string;
            if (tUid === uid) {
                return {
                    ...t,
                    image: imageUrl,
                    photoURL: imageUrl,
                    profileImage: imageUrl
                };
            }
            return t;
        });
        saveRealTalents(updated);
        cacheManager.reemit("talents_list_all", updated);
    } else {
        cacheManager.invalidateCache("talents_list_all");
    }
    cacheManager.invalidateCache(`profile_${uid}`);
    cacheManager.invalidateCache(`profile_sub_${uid}`);
};

export const notifyFollowUpdated = (targetUid: string) => {
    cacheManager.invalidateCache("talents_list_all");
    cacheManager.invalidateCache(`profile_${targetUid}`);
    cacheManager.invalidateCache(`user_follows_${targetUid}`);
};



