import { collection, query, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { COLLECTIONS } from "../../../constants/collections";
import apiClient from "../../../api/client";

type Talent = {
    id: string;
    [key: string]: unknown;
};

import { cacheManager } from "../../../utils/cacheManager";
import { formatRole } from "../../../utils";

const LOCAL_STORAGE_CACHE_KEY = "nc_cached_talents_real";

export const getSavedRealTalents = (): Talent[] => {
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

export const saveRealTalents = (talents: Talent[]) => {
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
                        t.role = formatRole((t.role || t.category) as string);
                        t.category = formatRole((t.category || t.role) as string);
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

                // Sort so most complete profiles come first (has photo, has cover, has bio, has experience)
                rawMapped.sort((a, b) => {
                    const aScore = (a.image || a.photoURL ? 10 : 0) + (a.coverImage ? 5 : 0) + (a.bio ? 3 : 0) + (Array.isArray(a.experience) ? a.experience.length : 0);
                    const bScore = (b.image || b.photoURL ? 10 : 0) + (b.coverImage ? 5 : 0) + (b.bio ? 3 : 0) + (Array.isArray(b.experience) ? b.experience.length : 0);
                    return bScore - aScore;
                });

                const seenUids = new Set<string>();
                const seenEmails = new Set<string>();
                const seenNames = new Set<string>();
                const unique: Talent[] = [];

                for (const t of rawMapped) {
                    const uid = (t.uid || t.id || '') as string;
                    const name = (t.name || t.displayName || t.fullName || '').trim();
                    const email = (t.email || '').toLowerCase().trim();
                    const normName = name.toLowerCase();

                    if (!uid || seenUids.has(uid)) {
                        continue;
                    }
                    if (email && seenEmails.has(email)) {
                        continue;
                    }
                    if (
                        t.isAdmin === true ||
                        (t.role && t.role.toLowerCase() === 'admin') ||
                        (t.category && t.category.toLowerCase() === 'admin') ||
                        email === 'aniltimilsena53@gmail.com'
                    ) {
                        continue;
                    }

                    if (name || t.role || t.category || t.bio) {
                        t.role = formatRole((t.role || t.category) as string);
                        t.category = formatRole((t.category || t.role) as string);
                        seenUids.add(uid);
                        if (email) seenEmails.add(email);
                        if (normName) seenNames.add(normName);
                        unique.push(t);
                    }
                }

                for (const t of unique) {
                    const u = t as any;
                    const uid = (u.uid || u.id || '') as string;
                    const uName = (u.username || '').toLowerCase().trim();
                    const uEmail = (u.email || '').toLowerCase().trim();

                    const rawDocFollowers = u.followersCount ?? u.followerCount ?? (Array.isArray(u.followers) ? u.followers.length : u.followers);
                    const docFollowers = typeof rawDocFollowers === 'number' && !isNaN(rawDocFollowers) ? rawDocFollowers : 0;
                    const liveFollowers = (uid && followsCountsMap[uid]) || (uName && followsCountsMap[uName]) || (uEmail && followsCountsMap[uEmail]) || 0;
                    const finalFollowers = Math.max(docFollowers, liveFollowers);

                    const rawDocFollowing = u.followingCount ?? u.following ?? (Array.isArray(u.following) ? u.following.length : 0);
                    const docFollowing = typeof rawDocFollowing === 'number' && !isNaN(rawDocFollowing) ? rawDocFollowing : 0;
                    const liveFollowing = (uid && followingCountsMap[uid]) || (uName && followingCountsMap[uName]) || (uEmail && followingCountsMap[uEmail]) || 0;
                    const finalFollowing = Math.max(docFollowing, liveFollowing);

                    u.followers = finalFollowers;
                    u.followersCount = finalFollowers;
                    u.following = finalFollowing;
                    u.followingCount = finalFollowing;
                }

                unique.sort((a: any, b: any) => ((a.name || '').localeCompare(b.name || '')));
                return unique;
            };

            let profilesDocs: any[] = [];
            let usersDocs: any[] = [];

            const mergeAndEmit = () => {
                const combinedMap = new Map<string, any>();
                for (const d of usersDocs) {
                    const data = typeof d.data === 'function' ? d.data() : d;
                    const id = d.id || data.uid || data.id;
                    if (id) {
                        combinedMap.set(id, { id, uid: id, ...data });
                    }
                }
                for (const d of profilesDocs) {
                    const data = typeof d.data === 'function' ? d.data() : d;
                    const id = d.id || data.uid || data.id;
                    if (id) {
                        const existing = combinedMap.get(id) || {};
                        combinedMap.set(id, { ...existing, ...data, id, uid: id });
                    }
                }
                const mergedDocs = Array.from(combinedMap.values()).map(item => ({
                    id: item.id,
                    data: () => item
                }));

                const talents = processSnapshotDocs(mergedDocs);
                if (talents.length > 0) {
                    saveRealTalents(talents);
                    pooledCb(talents, null);
                }
            };

            const followsQuery = query(collection(db, COLLECTIONS.FOLLOWS));
            const unsubFollows = onSnapshot(followsQuery, (followsSnap) => {
                const fMap: Record<string, number> = {};
                const ingMap: Record<string, number> = {};
                followsSnap.docs.forEach((d) => {
                    const data = d.data();
                    const followerId = data.followerId || data.followerUid || data.userId || data.fromUserId;
                    const followingId = data.followingId || data.followingUid || data.targetUserId || data.targetId || data.toUserId;
                    if (followerId && followingId && followerId !== followingId) {
                        fMap[followingId] = (fMap[followingId] || 0) + 1;
                        ingMap[followerId] = (ingMap[followerId] || 0) + 1;
                    }
                });
                followsCountsMap = fMap;
                followingCountsMap = ingMap;
                mergeAndEmit();
            }, () => {});

            const qProfiles = query(collection(db, COLLECTIONS.PROFILES));
            const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
                profilesDocs = snapshot.docs;
                mergeAndEmit();
            }, (_error) => {
                getDocs(qProfiles).then((snapshot) => {
                    profilesDocs = snapshot.docs;
                    mergeAndEmit();
                }).catch(() => {});
            });

            const qUsers = query(collection(db, COLLECTIONS.USERS));
            const unsubUsers = onSnapshot(qUsers, (snapshot) => {
                usersDocs = snapshot.docs;
                mergeAndEmit();
            }, (_error) => {
                getDocs(qUsers).then((snapshot) => {
                    usersDocs = snapshot.docs;
                    mergeAndEmit();
                }).catch(() => {});
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
            unsubProfiles();
            unsubUsers();
        };
    }, (data) => callback(data));
};

export const notifyProfileUpdated = (uid: string, imageUrl?: string, updatedData?: Record<string, any>) => {
    try {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('nc-profile-updated', { detail: { uid, image: imageUrl, ...updatedData } }));
        }
    } catch (_e) {
        /* ignore event error */
    }
    
    const saved = getSavedRealTalents();
    const exists = saved.some(t => ((t.uid || t.id) === uid));
    
    let updated: Talent[];
    if (exists) {
        updated = saved.map(t => {
            const tUid = (t.uid || t.id) as string;
            if (tUid === uid) {
                return {
                    ...t,
                    ...(imageUrl ? { image: imageUrl, photoURL: imageUrl, profileImage: imageUrl } : {}),
                    ...(updatedData ? updatedData : {})
                };
            }
            return t;
        });
    } else {
        const newTalent: Talent = {
            id: uid,
            uid: uid,
            name: updatedData?.name || updatedData?.displayName || 'User',
            displayName: updatedData?.displayName || updatedData?.name,
            role: formatRole((updatedData?.role || updatedData?.category || 'Actor') as string),
            category: formatRole((updatedData?.category || updatedData?.role || 'Actor') as string),
            image: imageUrl || updatedData?.photoURL || '',
            photoURL: imageUrl || updatedData?.photoURL || '',
            profileImage: imageUrl || updatedData?.photoURL || '',
            location: updatedData?.location || 'Kathmandu',
            bio: updatedData?.bio || '',
            skills: Array.isArray(updatedData?.skills) ? updatedData.skills : ['Actor'],
            experience: Array.isArray(updatedData?.experience) ? updatedData.experience : [],
            followers: typeof updatedData?.followers === 'number' ? updatedData.followers : 0,
            following: typeof updatedData?.following === 'number' ? updatedData.following : 0,
            rating: typeof updatedData?.rating === 'number' ? updatedData.rating : 5,
            reviews: typeof updatedData?.reviews === 'number' ? updatedData.reviews : 0,
            status: 'active',
            deactivated: false,
            onboarded: true,
            createdAt: updatedData?.createdAt || Date.now(),
            joinedAt: updatedData?.joinedAt || Date.now(),
            ...(updatedData || {})
        };
        updated = [newTalent, ...saved];
    }
    saveRealTalents(updated);
    cacheManager.reemit("talents_list_all", updated);
    cacheManager.invalidateCache(`profile_${uid}`);
    cacheManager.invalidateCache(`profile_sub_${uid}`);
};

export const notifyFollowUpdated = (targetUid: string) => {
    cacheManager.invalidateCache("talents_list_all");
    cacheManager.invalidateCache(`profile_${targetUid}`);
    cacheManager.invalidateCache(`user_follows_${targetUid}`);
};



