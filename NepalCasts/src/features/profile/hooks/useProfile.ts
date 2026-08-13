import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, or, updateDoc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp, documentId } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import type { UserProfile, ServiceResult } from '../../../types';
import { CurrentUser } from '../../../utils/CurrentUser';
export function useProfile(profileId: string | null, currentUser: any) {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [resolvedUid, setResolvedUid] = useState<string | null>(null);
    const [resolvingUid, setResolvingUid] = useState(true);
    const [loading, setLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followerCount, setFollowerCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [reviewsList, setReviewsList] = useState<any[]>([]);
    const [loadingReviews, setLoadingReviews] = useState(true);
    const [savedCount, setSavedCount] = useState(0);
    const [hasWorkedTogether, setHasWorkedTogether] = useState(false);
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
            const myUid = currentUser?.uid || currentUser?.id || CurrentUser.id || CurrentUser.uid;
            if (!profileId) {
                if (isMounted) {
                    setResolvedUid(myUid || null);
                    setResolvingUid(false);
                }
                return;
            }
            try {
                const myEmail = (currentUser?.email || CurrentUser.email || '').toLowerCase().trim();
                const myName = (currentUser?.displayName || currentUser?.fullName || CurrentUser.name || '').toLowerCase().trim();
                const myUsername = (currentUser?.username || CurrentUser.username || '').toLowerCase().trim();
                const myUid = currentUser?.uid || currentUser?.id || CurrentUser.id;

                if (profileId) {
                    const cleanPId = profileId.replace(/^@/, '').toLowerCase().trim();
                    if ((myUid && profileId === myUid) || (myUsername && cleanPId === myUsername) || (myEmail && cleanPId === myEmail.split('@')[0])) {
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
                    const docEmail = (data.email || '').toLowerCase().trim();
                    const docName = (data.name || data.displayName || '').toLowerCase().trim();
                    const docUsername = (data.username || '').toLowerCase().trim();
                    const docUid = data.uid || data.userId || snap.id;

                    const isMatch = Boolean(
                        (myUid && (docUid === myUid || snap.id === myUid)) ||
                        (myEmail && docEmail && docEmail === myEmail) ||
                        (myName && docName && docName === myName) ||
                        (myUsername && docUsername && docUsername === myUsername)
                    );

                    const realUid = isMatch ? myUid : (data.uid || data.userId || profileId);
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
                    const docEmail = (data.email || '').toLowerCase().trim();
                    const docName = (data.name || data.displayName || '').toLowerCase().trim();
                    const docUsername = (data.username || '').toLowerCase().trim();
                    const docUid = data.uid || data.userId || userSnap.id;

                    const isMatch = Boolean(
                        (myUid && (docUid === myUid || userSnap.id === myUid)) ||
                        (myEmail && docEmail && docEmail === myEmail) ||
                        (myName && docName && docName === myName) ||
                        (myUsername && docUsername && docUsername === myUsername)
                    );

                    const realUid = isMatch ? myUid : (data.uid || data.userId || profileId);
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
                    const docEmail = (docData.email || '').toLowerCase().trim();
                    const docName = (docData.name || docData.displayName || '').toLowerCase().trim();
                    const docUsername = (docData.username || '').toLowerCase().trim();
                    const docUid = docData.uid || docData.userId || qSnap.docs[0].id;

                    const isMatch = Boolean(
                        (myUid && docUid === myUid) ||
                        (myEmail && docEmail && docEmail === myEmail) ||
                        (myName && docName && docName === myName) ||
                        (myUsername && docUsername && docUsername === myUsername)
                    );

                    const realUid = isMatch ? myUid : (docData.uid || docData.userId || qSnap.docs[0].id);
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
                    const docEmail = (docData.email || '').toLowerCase().trim();
                    const docName = (docData.name || docData.displayName || '').toLowerCase().trim();
                    const docUsername = (docData.username || '').toLowerCase().trim();
                    const docUid = docData.uid || docData.userId || qUsersSnap.docs[0].id;

                    const isMatch = Boolean(
                        (myUid && docUid === myUid) ||
                        (myEmail && docEmail && docEmail === myEmail) ||
                        (myName && docName && docName === myName) ||
                        (myUsername && docUsername && docUsername === myUsername)
                    );

                    const realUid = isMatch ? myUid : (docData.uid || docData.userId || qUsersSnap.docs[0].id);
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
                                return tUid === profileId || (cleanUser && tUser === cleanUser);
                            });
                            if (match && (match.uid || match.id)) {
                                const matchedUid = match.uid || match.id;
                                const isMatch = Boolean(
                                    (myUid && matchedUid === myUid) ||
                                    (myEmail && match.email && match.email.toLowerCase().trim() === myEmail) ||
                                    (myName && match.name && match.name.toLowerCase().trim() === myName)
                                );
                                if (isMounted) {
                                    setResolvedUid(isMatch ? myUid : matchedUid);
                                    setResolvingUid(false);
                                }
                                return;
                            }
                        }
                    }
                } catch (_cacheErr) {}

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
    const myName = (currentUser?.displayName || currentUser?.fullName || CurrentUser.name || '').trim().toLowerCase();
    const isOwnProfile = Boolean(
        (currentUser && (initialTargetUid === currentUser.uid || initialTargetUid === currentUser.id)) ||
        (CurrentUser.id && (initialTargetUid === CurrentUser.id || initialTargetUid === CurrentUser.username)) ||
        (profileId && CurrentUser.username && profileId.replace(/^@/, '').toLowerCase() === CurrentUser.username.toLowerCase()) ||
        (profileId && currentUser?.email && profileId.replace(/^@/, '').toLowerCase() === currentUser?.email.split('@')[0].toLowerCase()) ||
        (profile?.email && currentUser?.email && profile.email.toLowerCase() === currentUser.email.toLowerCase()) ||
        (profile?.name && myName && profile.name.trim().toLowerCase() === myName) ||
        (profile?.uid && currentUser?.uid && profile.uid === currentUser.uid)
    );
    const targetUid = isOwnProfile && (currentUser?.uid || currentUser?.id) ? (currentUser.uid || currentUser.id) : initialTargetUid;

    useEffect(() => {
        if (!targetUid) {
            setLoading(false);
            setResolvingUid(false);
            return;
        }

        let pData: any = null;
        let uData: any = null;

        const handleMerge = () => {
            const isPrem = Boolean(
                pData?.isPremium || 
                pData?.premium || 
                uData?.isPremium || 
                uData?.premium || 
                ((currentUser?.uid === targetUid || currentUser?.id === targetUid) && (currentUser?.isPremium || currentUser?.premium))
            );
            
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
                } catch (_e) {}
            }

            const userPhoto = currentUser?.photoURL || currentUser?.imageUrl || CurrentUser.photoURL || CurrentUser.image;
            const finalPhoto = pData?.image || pData?.photoURL || uData?.image || uData?.photoURL || cachedTalent?.image || cachedTalent?.photoURL || (isOwnProfile || (currentUser?.email && pData?.email?.toLowerCase() === currentUser.email.toLowerCase()) ? userPhoto : null);

            const merged = {
                uid: targetUid,
                id: targetUid,
                ...cachedTalent,
                ...uData,
                ...pData,
                isPremium: isPrem,
                premium: isPrem,
                image: finalPhoto,
                photoURL: finalPhoto,
                profileImage: finalPhoto
            };
            setProfile(merged as unknown as UserProfile);
            setLoading(false);
            setResolvingUid(false);
        };

        const unsubProfile = onSnapshot(doc(db, "profiles", targetUid), (pSnap) => {
            pData = pSnap.exists() ? pSnap.data() : {};
            handleMerge();
        }, () => {
            handleMerge();
        });

        const unsubUser = onSnapshot(doc(db, "users", targetUid), (uSnap) => {
            uData = uSnap.exists() ? uSnap.data() : {};
            handleMerge();
        }, () => {
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

    const candidateIds = Array.from(new Set([
        profile?.uid,
        (profile as any)?.id,
        resolvedUid,
        profileId,
        profileId?.replace(/^@/, ''),
        currentUser?.uid,
        currentUser?.id,
        targetUid
    ].filter(Boolean))) as string[];

    useEffect(() => {
        if (candidateIds.length === 0) return;
        const targetSet = new Set(candidateIds);
        const q = query(collection(db, "follows"));
        const unsub = onSnapshot(q, (snap) => {
            let fCount = 0;
            let ingCount = 0;
            snap.docs.forEach((docSnap) => {
                const d = docSnap.data();
                if (d.followingId && targetSet.has(d.followingId)) {
                    fCount++;
                }
                if (d.followerId && targetSet.has(d.followerId)) {
                    ingCount++;
                }
            });
            const canonicalFollowers = Math.max(fCount, profile?.followers || 0, (profile as any)?.followersCount || 0);
            const canonicalFollowing = Math.max(ingCount, profile?.following || 0, (profile as any)?.followingCount || 0);
            setFollowerCount(canonicalFollowers);
            setFollowingCount(canonicalFollowing);
        }, (err) => {
            console.warn("Follows snapshot listener warning:", err);
        });
        return () => unsub();
    }, [candidateIds.join(','), profile?.followers, profile?.following]);
    useEffect(() => {
        if (!currentUser || !targetUid || targetUid === currentUser.uid) {
            setIsFollowing(false);
            return;
        }
        const followDocRef = doc(db, "follows", `${currentUser.uid}_${targetUid}`);
        const unsub = onSnapshot(followDocRef, (snap) => {
            setIsFollowing(snap.exists());
        });
        return () => unsub();
    }, [currentUser?.uid, targetUid]);
    useEffect(() => {
        if (!targetUid) {
            setLoadingReviews(false);
            return;
        }
        const q = query(collection(db, "reviews"), or(where("targetUid", "==", targetUid), where("targetUserId", "==", targetUid)));
        const unsub = onSnapshot(q, (snap) => {
            const listMap = new Map();
            snap.docs.forEach(docSnap => {
                const r = docSnap.data();
                let dateStr = 'Just now';
                if (r.createdAt) {
                    const date = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
                    dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                }
                listMap.set(docSnap.id, {
                    id: docSnap.id,
                    ...r,
                    dateFormatted: dateStr
                });
            });
            const list = Array.from(listMap.values());
            setReviewsList(list);
            setLoadingReviews(false);
            if (isOwnProfile && list.length > 0) {
                const totalRating = list.reduce((acc, r) => acc + (Number(r.rating) || 0), 0);
                const avg = parseFloat((totalRating / list.length).toFixed(1));
                updateDoc(doc(db, "profiles", targetUid), {
                    rating: avg,
                    reviews: list.length
                }).catch((e) => console.warn("Failed to auto-sync rating:", e));
            }
        }, (err) => {
            console.warn("Failed to subscribe to reviews:", err);
            setLoadingReviews(false);
        });
        return () => unsub();
    }, [targetUid]);
    useEffect(() => {
        if (!currentUser || isOwnProfile || !targetUid) {
            setHasWorkedTogether(false);
            return;
        }
        const checkWorked = async () => {
            try {
                const q1 = query(collection(db, "applications"), where("userId", "==", currentUser.uid), where("creatorId", "==", targetUid), where("status", "==", "accepted"));
                const snap1 = await getDocs(q1);
                if (!snap1.empty) {
                    setHasWorkedTogether(true);
                    return;
                }
                const q2 = query(collection(db, "applications"), where("userId", "==", targetUid), where("creatorId", "==", currentUser.uid), where("status", "==", "accepted"));
                const snap2 = await getDocs(q2);
                setHasWorkedTogether(!snap2.empty);
            }
            catch (err) {
                console.warn("Error checking applications history:", err);
                setHasWorkedTogether(false);
            }
        };
        checkWorked();
    }, [currentUser, isOwnProfile, targetUid]);
    useEffect(() => {
        if (!isOwnProfile || !currentUser?.uid)
            return;
        const q = query(collection(db, 'saved_calls'), where('userId', '==', currentUser.uid));
        const unsubscribe = onSnapshot(q, async (snap) => {
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
        return () => unsubscribe();
    }, [isOwnProfile, currentUser?.uid]);
    const toggleFollow = useCallback(async (): Promise<ServiceResult> => {
        if (!currentUser || !targetUid) {
            return { success: false, error: "Authentication required" };
        }
        if (currentUser.uid === targetUid) {
            return { success: false, error: "Cannot follow yourself" };
        }
        const followId = `${currentUser.uid}_${targetUid}`;
        const followDocRef = doc(db, "follows", followId);
        try {
            if (isFollowing) {
                await deleteDoc(followDocRef);
                return { success: true, error: null };
            }
            else {
                await setDoc(followDocRef, {
                    followerId: currentUser.uid,
                    followingId: targetUid,
                    createdAt: serverTimestamp(),
                });
                return { success: true, error: null };
            }
        }
        catch (err: any) {
            return { success: false, error: err.message || "Failed to update follow status" };
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
        }, (err) => {
            setContactInfo(null);
        });
        return () => unsub();
    }, [targetUid, currentUser]);

    const computedRating = reviewsList.length > 0
        ? parseFloat((reviewsList.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / reviewsList.length).toFixed(1))
        : (profile?.rating || (profile?.totalRating && profile?.reviewCount ? parseFloat((profile.totalRating / profile.reviewCount).toFixed(1)) : 0));

    const resolvedName = (profile?.name && profile.name !== 'Discovery Talent' ? profile.name : null) ||

        (profile as any)?.displayName ||
        (profile as any)?.fullName ||
        (isOwnProfile && currentUser?.displayName ? currentUser.displayName : null) ||
        profile?.name ||
        (isOwnProfile && currentUser?.email ? currentUser.email.split('@')[0] : 'Discovery Talent');

    const effectiveProfile = profile ? {
        ...profile,
        name: resolvedName,
        email: contactInfo?.email || profile.email || (isOwnProfile ? currentUser?.email : ''),
        phone: contactInfo?.phone || profile.phone,
        rating: computedRating
    } : (isOwnProfile && currentUser?.uid ? {
        uid: currentUser.uid,
        id: currentUser.uid,
        name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : 'Discovery Talent'),
        email: currentUser.email || '',
        photoURL: currentUser.photoURL || '',
        role: currentUser.role || 'Actor',
        rating: 0,
        reviews: 0
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
        reviewsList,
        loadingReviews,
        savedCount,
        hasWorkedTogether,
        toggleFollow
    };
}
export type UseProfileReturn = ReturnType<typeof useProfile>;
