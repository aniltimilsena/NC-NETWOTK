import { useEffect, useState, useRef, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, deleteDoc, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { subscribeToProfile, uploadProfileMedia, updateProfileData } from '../../../services/profile';
import type { UserProfile, ServiceResult } from '../../../types';

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
  const [analytics, setAnalytics] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // Resolve UID (handle @username)
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
        } else {
          const cleanUser = profileId.replace(/^@/, '');
          const q = query(collection(db, "profiles"), where("username", "==", cleanUser));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            setResolvedUid(qSnap.docs[0].id);
          } else {
            setResolvedUid(profileId);
          }
        }
      } catch (err) {
        console.error("Error resolving UID:", err);
        setResolvedUid(profileId);
      }
      setResolvingUid(false);
    };

    resolve();
  }, [profileId, currentUser?.uid]);

  const targetUid = resolvedUid || profileId || currentUser?.uid;
  const isOwnProfile = !!currentUser && (targetUid === currentUser?.uid);

  // Subscribe to profile document
  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToProfile(targetUid, (data) => {
      setProfile(data as unknown as UserProfile);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetUid]);

  // Subscribe to followers count
  useEffect(() => {
    if (!targetUid) return;
    const q = query(collection(db, "follows"), where("followingId", "==", targetUid));
    const unsub = onSnapshot(q, (snap) => {
      setFollowerCount(snap.size);
    }, (err) => {
      console.warn("Followers count subscription failed:", err);
    });
    return () => unsub();
  }, [targetUid]);

  // Subscribe to following count
  useEffect(() => {
    if (!targetUid) return;
    const q = query(collection(db, "follows"), where("followerId", "==", targetUid));
    const unsub = onSnapshot(q, (snap) => {
      setFollowingCount(snap.size);
    }, (err) => {
      console.warn("Following count subscription failed:", err);
    });
    return () => unsub();
  }, [targetUid]);

  // Subscribe to follow state
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

  // Subscribe to reviews list
  useEffect(() => {
    if (!targetUid) {
      setLoadingReviews(false);
      return;
    }
    const q = query(collection(db, "reviews"), where("targetUid", "==", targetUid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(docSnap => {
        const r = docSnap.data();
        let dateStr = 'Just now';
        if (r.createdAt) {
          const date = r.createdAt.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
          dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        }
        return {
          id: docSnap.id,
          ...r,
          dateFormatted: dateStr
        };
      });
      setReviewsList(list);
      setLoadingReviews(false);
    }, (err) => {
      console.warn("Failed to subscribe to reviews:", err);
      setLoadingReviews(false);
    });
    return () => unsub();
  }, [targetUid]);

  // Check if worked together
  useEffect(() => {
    if (!currentUser || isOwnProfile || !targetUid) {
      setHasWorkedTogether(false);
      return;
    }

    const checkWorked = async () => {
      try {
        const q1 = query(
          collection(db, "applications"),
          where("userId", "==", currentUser.uid),
          where("creatorId", "==", targetUid),
          where("status", "==", "accepted")
        );
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          setHasWorkedTogether(true);
          return;
        }

        const q2 = query(
          collection(db, "applications"),
          where("userId", "==", targetUid),
          where("creatorId", "==", currentUser.uid),
          where("status", "==", "accepted")
        );
        const snap2 = await getDocs(q2);
        setHasWorkedTogether(!snap2.empty);
      } catch (err) {
        console.warn("Error checking applications history:", err);
        setHasWorkedTogether(false);
      }
    };

    checkWorked();
  }, [currentUser, isOwnProfile, targetUid]);

  // Subscribe to saved casting calls count (only for own profile)
  useEffect(() => {
    if (!isOwnProfile || !currentUser?.uid) return;
    const q = query(collection(db, 'saved_calls'), where('userId', '==', currentUser.uid));
    const unsubscribe = onSnapshot(q, async (snap) => {
      let activeCount = 0;
      const checks = snap.docs.map(async (savedDoc) => {
        const data = savedDoc.data();
        try {
          const castingDoc = await getDoc(doc(db, 'casting_calls', data.castingId));
          if (castingDoc.exists()) {
            activeCount++;
          } else {
            // Automatically clean up orphaned saved_calls document
            await deleteDoc(doc(db, 'saved_calls', savedDoc.id));
          }
        } catch (err) {
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

  // Subscribe to own profile analytics
  useEffect(() => {
    if (!isOwnProfile || !targetUid) {
      setLoadingAnalytics(false);
      return;
    }
    const analyticRef = doc(db, "profiles", targetUid, "analytics", "views");
    const unsub = onSnapshot(analyticRef, (snap) => {
      if (snap.exists()) {
        setAnalytics(snap.data());
      } else {
        setAnalytics({
          totalViews: 0,
          uniqueViewers: 0,
          searchAppearances: 0,
          messageConversions: 0,
          viewTrend: []
        });
      }
      setLoadingAnalytics(false);
    }, (err) => {
      console.warn("Failed to subscribe to analytics:", err);
      setLoadingAnalytics(false);
    });
    return () => unsub();
  }, [isOwnProfile, targetUid]);

  // Increment profile views
  useEffect(() => {
    if (isOwnProfile || !currentUser?.uid || !targetUid) return;
    const viewRef = doc(db, "profiles", targetUid, "analytics", "views");
    setDoc(viewRef, {
      totalViews: increment(1),
      lastViewedAt: serverTimestamp()
    }, { merge: true }).catch(err => console.warn("Failed to increment views:", err));
  }, [isOwnProfile, currentUser?.uid, targetUid]);

  // Toggle follow action
  const toggleFollow = useCallback(async (): Promise<ServiceResult> => {
    if (!currentUser || !targetUid) {
      return { success: false, error: "Authentication required" };
    }
    const followId = `${currentUser.uid}_${targetUid}`;
    const followDocRef = doc(db, "follows", followId);

    try {
      if (isFollowing) {
        await deleteDoc(followDocRef);
        return { success: true, error: null };
      } else {
        await setDoc(followDocRef, {
          followerId: currentUser.uid,
          followingId: targetUid,
          createdAt: serverTimestamp(),
        });
        return { success: true, error: null };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to update follow status" };
    }
  }, [currentUser, targetUid, isFollowing]);

  return {
    profile,
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
    analytics,
    loadingAnalytics,
    toggleFollow
  };
}
export type UseProfileReturn = ReturnType<typeof useProfile>;
