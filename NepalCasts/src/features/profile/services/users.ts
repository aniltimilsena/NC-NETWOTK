import { collection, query, onSnapshot, getDocs, limit, startAfter, where, doc, setDoc, deleteDoc, updateDoc, increment, serverTimestamp, type DocumentSnapshot } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { COLLECTIONS } from "../../../constants/collections";
import apiClient from "../../../api/client";

type Talent = {
    id: string;
    [key: string]: unknown;
};

import { cacheManager } from "../../../utils/cacheManager";
import { formatRole } from "../../../utils";
import { idbGet, idbSet, idbGetSync } from "../../../utils/idbStorage";

const LOCAL_STORAGE_CACHE_KEY = "nc_cached_talents_real";

let memoryTalentsCache: Talent[] | null = null;

export const getSavedRealTalents = (): Talent[] => {
    if (memoryTalentsCache) {
        return memoryTalentsCache;
    }
    const synced = idbGetSync<Talent[]>(LOCAL_STORAGE_CACHE_KEY);
    if (synced && Array.isArray(synced) && synced.length > 0) {
        memoryTalentsCache = synced;
        return synced;
    }
    // Migration fallback from older localStorage if present
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_CACHE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                memoryTalentsCache = parsed;
                idbSet(LOCAL_STORAGE_CACHE_KEY, parsed);
                localStorage.removeItem(LOCAL_STORAGE_CACHE_KEY); // free quota
                return parsed;
            }
        }
    } catch (_e) {
        // ignore parse error
    }
    return [];
};

export const saveRealTalents = (talents: Talent[], maxItems: number = 60) => {
    try {
        if (Array.isArray(talents) && talents.length > 0) {
            const sliced = talents.slice(0, maxItems);
            memoryTalentsCache = sliced;
            // Asynchronous, non-blocking persist to IndexedDB
            idbSet(LOCAL_STORAGE_CACHE_KEY, sliced);
        }
    } catch (_e) {
        // ignore storage error
    }
};

export const subscribeToTalents = (callback: (talents: Talent[]) => void, limitCount: number = 50) => {
    const poolKey = `talents_list_limit_${limitCount}`;
    return cacheManager.subscribePooled(poolKey, (pooledCb) => {
        // First check in-memory fast cache
        const saved = getSavedRealTalents();
        if (saved.length > 0) {
            pooledCb(saved.slice(0, limitCount), null);
        } else {
            // Check async IndexedDB storage
            idbGet<Talent[]>(LOCAL_STORAGE_CACHE_KEY).then((idbSaved) => {
                if (idbSaved && Array.isArray(idbSaved) && idbSaved.length > 0) {
                    memoryTalentsCache = idbSaved;
                    pooledCb(idbSaved.slice(0, limitCount), null);
                }
            }).catch((idbErr) => {
                console.warn("[users] IndexedDB cache read failed:", idbErr);
            });
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
                    saveRealTalents(unique, limitCount);
                    pooledCb(unique.slice(0, limitCount), null);
                    return true;
                }
            } catch (_apiErr) {
                // Silently swallow fallback error if backend server is offline or proxy 502
            }
            return false;
        };

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
            const unique: Talent[] = [];

            for (const t of rawMapped) {
                const uid = (t.uid || t.id || '') as string;
                const name = (t.name || t.displayName || t.fullName || '').trim();
                const email = (t.email || '').toLowerCase().trim();

                if (!uid || seenUids.has(uid)) {
                    continue;
                }
                if (email && seenEmails.has(email)) {
                    continue;
                }
                if (
                    (t.isAdmin === true && !t.role && !t.bio && !t.category) ||
                    (t.role && t.role.toLowerCase() === 'admin' && !t.category && !t.bio && !t.skills)
                ) {
                    continue;
                }

                if (name || t.role || t.category || t.bio) {
                    t.role = formatRole((t.role || t.category) as string);
                    t.category = formatRole((t.category || t.role) as string);
                    seenUids.add(uid);
                    if (email) seenEmails.add(email);
                    unique.push(t);
                }
            }

            for (const t of unique) {
                const u = t as any;
                const rawDocFollowers = u.followersCount ?? u.followerCount ?? (Array.isArray(u.followers) ? u.followers.length : u.followers);
                const docFollowers = typeof rawDocFollowers === 'number' && !isNaN(rawDocFollowers) ? rawDocFollowers : 0;

                const rawDocFollowing = u.followingCount ?? u.following ?? (Array.isArray(u.following) ? u.following.length : 0);
                const docFollowing = typeof rawDocFollowing === 'number' && !isNaN(rawDocFollowing) ? rawDocFollowing : 0;

                u.followers = docFollowers;
                u.followersCount = docFollowers;
                u.following = docFollowing;
                u.followingCount = docFollowing;
            }

            unique.sort((a: any, b: any) => ((a.name || '').localeCompare(b.name || '')));
            return unique;
        };

        const handleSnapshot = (docs: any[]) => {
            const talents = processSnapshotDocs(docs);
            if (talents.length > 0) {
                saveRealTalents(talents, limitCount);
                pooledCb(talents.slice(0, limitCount), null);
            }
        };

        // Consolidated query on canonical profiles collection
        const qProfiles = query(collection(db, COLLECTIONS.PROFILES), limit(limitCount));
        const unsubProfiles = onSnapshot(qProfiles, (snapshot) => {
            handleSnapshot(snapshot.docs);
        }, (_error) => {
            getDocs(qProfiles).then((snapshot) => {
                handleSnapshot(snapshot.docs);
            }).catch(() => {
                fetchFromApiFallback();
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
                    saveRealTalents(updated, limitCount);
                    pooledCb(updated.slice(0, limitCount), null);
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
            unsubProfiles();
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
    cacheManager.invalidateCache("talents_list");
    cacheManager.reemit("talents_list_limit_50", updated.slice(0, 50));
    cacheManager.reemit("talents_list_all", updated);
    cacheManager.invalidateCache(`profile_${uid}`);
    cacheManager.invalidateCache(`profile_sub_${uid}`);
};

export const notifyFollowUpdated = (targetUid: string) => {
    cacheManager.invalidateCache("talents_list");
    cacheManager.invalidateCache(`profile_${targetUid}`);
    cacheManager.invalidateCache(`user_follows_${targetUid}`);
};

export const subscribeToUserFollows = (userId: string, callback: (ids: string[]) => void) => {
    if (!userId) {
        callback([]);
        return () => {};
    }
    return cacheManager.subscribePooled(`user_follows_${userId}`, (pooledCb) => {
        const q = query(collection(db, COLLECTIONS.FOLLOWS), where("followerId", "==", userId));
        return onSnapshot(q, (snapshot) => {
            const ids = snapshot.docs.map(d => (d.data() as any).followingId).filter(Boolean);
            pooledCb(ids, null);
        }, (err) => {
            console.warn("Follows listener error:", err);
            pooledCb([], err);
        });
    }, (ids) => {
        callback(ids || []);
    });
};

export interface ToggleFollowParams {
    currentUserId: string;
    targetUserId: string;
    isCurrentlyFollowing: boolean;
    senderInfo?: {
        displayName?: string;
        photoURL?: string;
    };
}

export const toggleFollowUser = async ({
    currentUserId,
    targetUserId,
    isCurrentlyFollowing,
    senderInfo
}: ToggleFollowParams): Promise<{ success: boolean; isFollowing: boolean; error?: string }> => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
        return { success: false, isFollowing: isCurrentlyFollowing, error: "Invalid user IDs" };
    }

    const followId = `${currentUserId}_${targetUserId}`;
    const followDocRef = doc(db, COLLECTIONS.FOLLOWS, followId);
    const notifId = `${currentUserId}_${targetUserId}_follow`;

    try {
        if (isCurrentlyFollowing) {
            await deleteDoc(followDocRef);
            await deleteDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId)).catch((err) => {
                console.warn("Could not delete follow notification:", err);
            });
            await updateDoc(doc(db, COLLECTIONS.PROFILES, targetUserId), {
                followers: increment(-1),
                followersCount: increment(-1),
                updatedAt: serverTimestamp()
            }).catch((err) => console.warn("Could not decrement target followers:", err));
            await updateDoc(doc(db, COLLECTIONS.PROFILES, currentUserId), {
                following: increment(-1),
                followingCount: increment(-1),
                updatedAt: serverTimestamp()
            }).catch((err) => console.warn("Could not decrement user following:", err));
            notifyFollowUpdated(targetUserId);
            notifyFollowUpdated(currentUserId);
            return { success: true, isFollowing: false };
        } else {
            await setDoc(followDocRef, {
                followerId: currentUserId,
                followingId: targetUserId,
                createdAt: serverTimestamp()
            });
            await setDoc(doc(db, COLLECTIONS.NOTIFICATIONS, notifId), {
                userId: targetUserId,
                recipientId: targetUserId,
                receiverId: targetUserId,
                senderId: currentUserId,
                senderName: senderInfo?.displayName || "Someone",
                senderAvatar: senderInfo?.photoURL || "",
                title: "New Connect",
                body: `${senderInfo?.displayName || "Someone"} connected with you.`,
                type: "follow",
                notificationType: "follow",
                isRead: false,
                read: false,
                createdAt: serverTimestamp(),
                targetUrl: `/profile/${currentUserId}`
            }, { merge: true });
            await updateDoc(doc(db, COLLECTIONS.PROFILES, targetUserId), {
                followers: increment(1),
                followersCount: increment(1),
                updatedAt: serverTimestamp()
            }).catch((err) => console.warn("Could not increment target followers:", err));
            await updateDoc(doc(db, COLLECTIONS.PROFILES, currentUserId), {
                following: increment(1),
                followingCount: increment(1),
                updatedAt: serverTimestamp()
            }).catch((err) => console.warn("Could not increment user following:", err));
            notifyFollowUpdated(targetUserId);
            notifyFollowUpdated(currentUserId);
            return { success: true, isFollowing: true };
        }
    } catch (err: any) {
        console.error("Error toggling follow:", err);
        return { success: false, isFollowing: isCurrentlyFollowing, error: err.message };
    }
};

export const fetchTalentsPaginated = async (lastVisibleDoc: DocumentSnapshot | null = null, pageSize: number = 20) => {
    try {
        const q = lastVisibleDoc
            ? query(collection(db, COLLECTIONS.PROFILES), startAfter(lastVisibleDoc), limit(pageSize))
            : query(collection(db, COLLECTIONS.PROFILES), limit(pageSize));
        const snap = await getDocs(q);
        const docs = snap.docs;
        const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
        const items = docs.map(d => ({ id: d.id, uid: d.id, ...d.data() }));
        return { items, lastDoc, hasMore: docs.length === pageSize };
    } catch (err) {
        console.error("fetchTalentsPaginated error:", err);
        return { items: [], lastDoc: null, hasMore: false };
    }
};



