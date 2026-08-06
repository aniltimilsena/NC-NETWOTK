import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc, collection, query, where, or, updateDoc, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
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
        const resolve = async () => {
            setResolvingUid(true);
            if (!profileId) {
                setResolvedUid(currentUser?.uid || null);
                setResolvingUid(false);
                return;
            }
            try {
                const docRef = doc(db, "profiles", profileId);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setResolvedUid(profileId);
                }
                else {
                    const cleanUser = profileId.replace(/^@/, '');
                    const q = query(collection(db, "profiles"), where("username", "==", cleanUser));
                    const qSnap = await getDocs(q);
                    if (!qSnap.empty) {
                        setResolvedUid(qSnap.docs[0].id);
                    }
                    else {
                        setResolvedUid(profileId);
                    }
                }
            }
            catch (err) {
                console.error("Error resolving UID:", err);
                setResolvedUid(profileId);
            }
            setResolvingUid(false);
        };
        resolve();
    }, [profileId, currentUser?.uid]);
    const targetUid = resolvedUid || profileId || currentUser?.uid || CurrentUser.id;
    const isOwnProfile = Boolean(
        (currentUser && (targetUid === currentUser.uid || targetUid === currentUser.id)) ||
        (CurrentUser.id && (targetUid === CurrentUser.id || targetUid === CurrentUser.username)) ||
        (profileId && CurrentUser.username && profileId.replace(/^@/, '') === CurrentUser.username)
    );
    useEffect(() => {
        if (!targetUid) {
            setLoading(false);
            return;
        }
        const unsubProfile = onSnapshot(doc(db, "profiles", targetUid), (pSnap) => {
            const pData = pSnap.exists() ? pSnap.data() : {};
            const unsubUser = onSnapshot(doc(db, "users", targetUid), (uSnap) => {
                const uData = uSnap.exists() ? uSnap.data() : {};
                const isPrem = Boolean(
                    pData.isPremium || 
                    pData.premium || 
                    uData.isPremium || 
                    uData.premium || 
                    (currentUser?.uid === targetUid && (currentUser?.isPremium || currentUser?.premium))
                );
                const merged = {
                    uid: targetUid,
                    id: targetUid,
                    ...uData,
                    ...pData,
                    isPremium: isPrem,
                    premium: isPrem,
                };
                setProfile(merged as unknown as UserProfile);
                setLoading(false);
            }, () => {
                const isPrem = Boolean(
                    pData.isPremium || 
                    pData.premium || 
                    (currentUser?.uid === targetUid && (currentUser?.isPremium || currentUser?.premium))
                );
                const merged = {
                    uid: targetUid,
                    id: targetUid,
                    ...pData,
                    isPremium: isPrem,
                    premium: isPrem,
                };
                setProfile(merged as unknown as UserProfile);
                setLoading(false);
            });
            return () => unsubUser();
        }, () => {
            setLoading(false);
        });
        return () => unsubProfile();
    }, [targetUid, currentUser?.uid]);
    useEffect(() => {
        if (!targetUid)
            return;
        const q = query(collection(db, "follows"), where("followingId", "==", targetUid));
        const unsub = onSnapshot(q, (snap) => {
            setFollowerCount(snap.size);
        }, (err) => {
            console.warn("Followers count subscription failed:", err);
        });
        return () => unsub();
    }, [targetUid]);
    useEffect(() => {
        if (!targetUid)
            return;
        const q = query(collection(db, "follows"), where("followerId", "==", targetUid));
        const unsub = onSnapshot(q, (snap) => {
            setFollowingCount(snap.size);
        }, (err) => {
            console.warn("Following count subscription failed:", err);
        });
        return () => unsub();
    }, [targetUid]);
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
            let activeCount = 0;
            const checks = snap.docs.map(async (savedDoc) => {
                const data = savedDoc.data();
                try {
                    const castingDoc = await getDoc(doc(db, 'casting_calls', data.castingId));
                    if (castingDoc.exists()) {
                        activeCount++;
                    }
                    else {
                        await deleteDoc(doc(db, 'saved_calls', savedDoc.id));
                    }
                }
                catch (err) {
                    console.warn("Failed to check casting call existence:", err);
                }
            });
            await Promise.all(checks);
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
