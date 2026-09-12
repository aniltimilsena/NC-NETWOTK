import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp, documentId } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';
import type { UserProfile, ServiceResult } from '../../../types';
import { CurrentUser } from '../../../utils/CurrentUser';
import { cacheManager } from '../../../utils/cacheManager';
import { toggleFollowUser } from '../services/users';
export function useProfile(profileId: string | null, currentUser: any) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [resolvedUid, setResolvedUid] = useState<string | null>(null);
    const [resolvingUid, setResolvingUid] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [savedCount, setSavedCount] = useState(0);
    const [contactInfo, setContactInfo] = useState<{
        email?: string;
        phone?: string;
    } | null>(null);
    useEffect(() => {
        let isMounted = true;
        const timer = setTimeout(() => {
            if (isMounted) {
                setResolvingUid(false);
                setLoading(false);
            }
        }, 2500);

        const resolve = async () => {
            setResolvingUid(true);
            const myUid = currentUser?.uid || currentUser?.id || CurrentUser.id;
            if (!profileId) {
                if (isMounted) {
                    setResolvedUid(myUid || null);
                    setResolvingUid(false);
                }
                return;
            }
            try {
                const myUsername = (currentUser?.username || CurrentUser.username || '').toLowerCase().trim();

                if (profileId) {
                    const cleanPId = profileId.replace(/^@/, '').toLowerCase().trim();
                    if ((myUid && profileId === myUid) || (myUsername && cleanPId === myUsername)) {
                        if (isMounted) {
                            setResolvedUid(myUid);
                            setResolvingUid(false);
                        }
                        return;
                    }
                }

                // 1. Direct doc check in profiles
                const docRef = doc(db, "profiles", profileId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const data = snap.data();
                    const realUid = data.linkedUid || data.canonicalUid || data.uid || data.userId || snap.id;
                    if (isMounted) {
                        setResolvedUid(realUid);
                        setResolvingUid(false);
                    }
                    return;
                }

                // 2. Direct doc check in users
                const userDocRef = doc(db, "users", profileId);
                const userSnap = await getDoc(userDocRef);
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    const realUid = data.linkedUid || data.canonicalUid || data.uid || data.userId || userSnap.id;
                    if (isMounted) {
                        setResolvedUid(realUid);
                        setResolvingUid(false);
                    }
                    return;
                }

                // 3. Username queries in profiles and users
                const cleanUser = profileId.replace(/^@/, '').toLowerCase().trim();

                const qProfiles = query(collection(db, "profiles"), where("username", "==", cleanUser));
                const qSnap = await getDocs(qProfiles);
                if (!qSnap.empty) {
                    const docData = qSnap.docs[0].data();
                    const realUid = docData.linkedUid || docData.canonicalUid || docData.uid || docData.userId || qSnap.docs[0].id;
                    if (isMounted) {
                        setResolvedUid(realUid);
                        setResolvingUid(false);
                    }
                    return;
                }

                const qUsers = query(collection(db, "users"), where("username", "==", cleanUser));
                const qUsersSnap = await getDocs(qUsers);
                if (!qUsersSnap.empty) {
                    const docData = qUsersSnap.docs[0].data();
                    const realUid = docData.uid || docData.userId || qUsersSnap.docs[0].id;
                    if (isMounted) {
                        setResolvedUid(realUid);
                        setResolvingUid(false);
                    }
                    return;
                }


                // 4. Local cache check
                try {
                    const savedStr = typeof window !== 'undefined' ? localStorage.getItem("nc_cached_talents_real") : null;
                    if (savedStr) {
                        const saved = JSON.parse(savedStr);
                        if (Array.isArray(saved)) {
                            const match = saved.find((t: any) => {
                                const tUid = t.uid || t.id;
                                const tUser = (t.username || '').toLowerCase().trim();
                                return tUid === profileId || (Boolean(cleanUser && tUser) && tUser === cleanUser);
                            });
                            if (match && (match.uid || match.id)) {
                                const matchedUid = match.uid || match.id;
                                if (isMounted) {
                                    setResolvedUid(matchedUid);
                                    setResolvingUid(false);
                                }
                                return;
                            }
                        }
                    }
                } catch (_cacheErr) {
                    /* ignore cache error */
                }

                if (isMounted) {
                    setResolvedUid(profileId);
                }
            }
            catch (err) {
                console.error("Error resolving UID:", err);
                if (isMounted) {
                    setResolvedUid(profileId);
                }
            }
            if (isMounted) {
                setResolvingUid(false);
            }
        };
        resolve();

        return () => {
            isMounted = false;
            clearTimeout(timer);
        };
    }, [profileId, currentUser?.uid, currentUser?.id]);

    const initialTargetUid = resolvedUid || profileId || currentUser?.uid || currentUser?.id || CurrentUser.id;
    const myUid = currentUser?.uid || currentUser?.id || CurrentUser.id;
    const isOwnProfile = Boolean(myUid && initialTargetUid === myUid);
    const targetUid = initialTargetUid;

    useEffect(() => {
        if (!targetUid) {
            setLoading(false);
            setResolvingUid(false);
            return;
        }

        let pData: any = null;
        let uData: any = null;

        const handleMerge = () => {
            // Check local persistent storage for fallback data if Firestore docs were sparse
            let cachedTalent: any = null;
            if (!pData?.name && !uData?.name) {
                try {
                    const savedStr = typeof window !== 'undefined' ? localStorage.getItem("nc_cached_talents_real") : null;
                    if (savedStr) {
                        const saved = JSON.parse(savedStr);
                        if (Array.isArray(saved)) {
                            cachedTalent = saved.find((t: any) => {
                                const tUid = t.uid || t.id;
                                return tUid === targetUid || tUid === profileId;
                            });
                        }
                    }
                } catch (_e) {
                    /* ignore storage error */
                }
            }

            const userPhoto = currentUser?.photoURL || currentUser?.imageUrl || CurrentUser.imageUrl;
            const finalPhoto = pData?.image || pData?.photoURL || uData?.image || uData?.photoURL || cachedTalent?.image || cachedTalent?.photoURL || (isOwnProfile ? userPhoto : null);

            const merged = {
                uid: targetUid,
                id: targetUid,
                ...cachedTalent,
                ...uData,
                ...pData,
                image: finalPhoto,
                photoURL: finalPhoto,
                profileImage: finalPhoto
            };
            setProfile(merged as unknown as UserProfile);
            setLoading(false);
            setResolvingUid(false);
        };

        const unsubProfile = cacheManager.subscribePooled(`profile_doc_${targetUid}`, (pooledCb) => {
            return onSnapshot(doc(db, "profiles", targetUid), (pSnap) => {
                pooledCb(pSnap.exists() ? pSnap.data() : {}, null);
            }, () => {
                pooledCb({}, null);
            });
        }, (data) => {
            pData = data || {};
            handleMerge();
        });

        const unsubUser = cacheManager.subscribePooled(`user_doc_${targetUid}`, (pooledCb) => {
            return onSnapshot(doc(db, "users", targetUid), (uSnap) => {
                pooledCb(uSnap.exists() ? uSnap.data() : {}, null);
            }, () => {
                pooledCb({}, null);
            });
        }, (data) => {
            uData = data || {};
            handleMerge();
        });

        const safetyTimer = setTimeout(() => {
            handleMerge();
        }, 2000);

        return () => {
            clearTimeout(safetyTimer);
            unsubProfile();
            unsubUser();
        };
    }, [targetUid, currentUser?.uid, currentUser?.id]);

    useEffect(() => {
        if (!targetUid) return;
        const qFollowers = query(collection(db, "follows"), where("followingId", "==", targetUid));
        // eslint-disable-next-line no-secrets/no-secrets
        const mockFollowerUids = new Set(['uyR9rwPbZBUms2ffermJA0SDbqw2', targetUid]);
        const unsubFollowers = cacheManager.subscribePooled(`followers_count_${targetUid}`, (pooledCb) => {
            return onSnapshot(qFollowers, (snap) => {
                const validDocs = snap.docs.filter((d: any) => {
                    const data = d.data();
                    return data.followerId && !mockFollowerUids.has(data.followerId);
                });
                pooledCb(validDocs.length, null);
            }, () => pooledCb(0, null));
        }, (count) => setFollowerCount(count || 0));

        const qFollowing = query(collection(db, "follows"), where("followerId", "==", targetUid));
        const unsubFollowing = cacheManager.subscribePooled(`following_count_${targetUid}`, (pooledCb) => {
            return onSnapshot(qFollowing, (snap) => {
                const validDocs = snap.docs.filter((d: any) => {
                    const data = d.data();
                    return data.followingId && data.followingId !== targetUid;
                });
                pooledCb(validDocs.length, null);
            }, () => pooledCb(0, null));
        }, (count) => setFollowingCount(count || 0));

        // Auto-cleanup mock follow documents if logged-in user is targetUid
        if (currentUser?.uid && currentUser.uid === targetUid) {
            getDocs(qFollowers).then((snap) => {
                snap.docs.forEach((d) => {
                    const data = d.data();
                    if (mockFollowerUids.has(data.followerId)) {
                        deleteDoc(doc(db, "follows", d.id)).catch(() => { });
                    }
                });
            }).catch(() => { });
        }

        return () => {
            unsubFollowers();
            unsubFollowing();
        };
    }, [targetUid, currentUser?.uid]);
    useEffect(() => {
        if (!currentUser || !targetUid || targetUid === currentUser.uid) {
            setIsFollowing(false);
            return;
        }
        const followDocRef = doc(db, "follows", `${currentUser.uid}_${targetUid}`);
        const unsub = cacheManager.subscribePooled(`follow_rel_${currentUser.uid}_${targetUid}`, (pooledCb) => {
            return onSnapshot(followDocRef, (snap) => {
                pooledCb(snap.exists(), null);
            }, () => pooledCb(false, null));
        }, (exists) => {
            setIsFollowing(Boolean(exists));
        });
        return () => unsub();
    }, [currentUser?.uid, targetUid]);
    useEffect(() => {
        if (!isOwnProfile || !currentUser?.uid)
            return;
        let unsubscribeSnapshot: (() => void) | null = null;
        const unsubAuth = auth.onAuthStateChanged((fbUser) => {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }
            if (fbUser && fbUser.uid === currentUser.uid) {
                const q = query(collection(db, 'saved_calls'), where('userId', '==', currentUser.uid));
                unsubscribeSnapshot = onSnapshot(q, async (snap) => {
                    const docsData = snap.docs.map(d => ({ id: d.id, castingId: d.data().castingId }));
                    const castingIds = docsData.map(item => item.castingId).filter(Boolean);
                    const uniqueCastingIds = Array.from(new Set(castingIds));

                    const existingIds = new Set<string>();
                    const chunks = [];
                    for (let i = 0; i < uniqueCastingIds.length; i += 30) {
                        chunks.push(uniqueCastingIds.slice(i, i + 30));
                    }

                    await Promise.all(chunks.map(async (chunk) => {
                        try {
                            const chunkQuery = query(collection(db, 'casting_calls'), where(documentId(), 'in', chunk));
                            const chunkSnap = await getDocs(chunkQuery);
                            chunkSnap.docs.forEach(docSnap => {
                                existingIds.add(docSnap.id);
                            });
                        } catch (err) {
                            console.warn("Failed to check casting call existence batch:", err);
                        }
                    }));

                    let activeCount = 0;
                    for (const item of docsData) {
                        if (existingIds.has(item.castingId)) {
                            activeCount++;
                        } else if (item.castingId) {
                            deleteDoc(doc(db, 'saved_calls', item.id)).catch(err => console.warn(err));
                        }
                    }
                    setSavedCount(activeCount);
                }, (err) => {
                    console.warn("Failed to subscribe to saved calls count:", err);
                });
            }
        });

        return () => {
            if (unsubscribeSnapshot) unsubscribeSnapshot();
            unsubAuth();
        };
    }, [isOwnProfile, currentUser?.uid]);
    const toggleFollow = useCallback(async (): Promise<ServiceResult> => {
        if (!currentUser?.uid || !targetUid) {
            return { success: false, error: "Authentication required" };
        }
        if (currentUser.uid === targetUid) {
            return { success: false, error: "Cannot connect with yourself" };
        }
        try {
            const res = await toggleFollowUser({
                currentUserId: currentUser.uid,
                targetUserId: targetUid,
                isCurrentlyFollowing: Boolean(isFollowing),
                senderInfo: {
                    displayName: currentUser.displayName || currentUser.name || "Someone",
                    photoURL: currentUser.photoURL || currentUser.image || "",
                }
            });
            if (res.success) {
                setIsFollowing(res.isFollowing);
                setFollowerCount(prev => res.isFollowing ? prev + 1 : Math.max(0, prev - 1));
                return { success: true, error: null };
            }
            return { success: false, error: res.error || "Failed to update connection" };
        }
        catch (err: any) {
            return { success: false, error: err.message || "Failed to update connection" };
        }
    }, [currentUser, targetUid, isFollowing]);
    useEffect(() => {
        if (!targetUid || !currentUser) {
            setContactInfo(null);
            return;
        }
        const docRef = doc(db, "contact_info", targetUid);
        const unsub = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setContactInfo(snap.data() as {
                    email?: string;
                    phone?: string;
                });
            }
            else {
                setContactInfo(null);
            }
        }, () => {
            setContactInfo(null);
        });
        return () => unsub();
    }, [targetUid, currentUser]);

    const resolvedName = (profile?.name && profile.name !== 'Discovery Talent' && profile.name !== 'Talent User' ? profile.name : null) ||
        (profile as any)?.displayName ||
        (profile as any)?.fullName ||
        (profile as any)?.production ||
        (profile as any)?.productionHouse ||
        (profile as any)?.username ||
        (isOwnProfile && currentUser?.displayName ? currentUser.displayName : null) ||
        (profile?.email ? profile.email.split('@')[0] : null) ||
        (isOwnProfile && currentUser?.email ? currentUser.email.split('@')[0] : null) ||
        profile?.name ||
        'Artist Profile';

    const effectiveProfile = profile ? {
        ...profile,
        name: resolvedName,
        email: contactInfo?.email || profile.email || (isOwnProfile ? currentUser?.email : ''),
        phone: contactInfo?.phone || profile.phone,
    } : (isOwnProfile && currentUser?.uid ? {
        uid: currentUser.uid,
        id: currentUser.uid,
        name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Artist Profile'),
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
        role: currentUser.role || 'Actor',
    } as unknown as UserProfile : null);

    return {
        profile: effectiveProfile,
        setProfile,
        resolvedUid,
        resolvingUid,
        loading,
        isOwnProfile,
        targetUid,
        isFollowing,
        followerCount,
        followingCount,
        savedCount,
        toggleFollow
    };
}
export type UseProfileReturn = ReturnType<typeof useProfile>;
