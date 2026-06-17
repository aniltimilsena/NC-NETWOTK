import { useEffect, useState } from 'react';
import { Sparkles, Briefcase, Image, Star, Video, ChevronLeft } from 'lucide-react';
import GlassCard from '../components/ui/GlassCard';
import Button from '../components/ui/Button';
import Tag from '../components/ui/Tag';
import SkillBar from '../components/ui/SkillBar';
import Avatar from '../components/ui/Avatar';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ShareSheet from '../components/ui/ShareSheet';
import { subscribeToProfile, uploadProfileMedia, updateProfileData } from '../services/profile';
import { usePermissionContext } from '../context/PermissionContext';
import { 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  increment, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc,
  onSnapshot,
  orderBy,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const isVideoUrl = (url) => {
  if (!url) return false;
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  return ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext) || url.includes('/video/upload/');
};

export default function Profile({ onNavigate, user, profileId, isAdmin }) {
  const isLoggedIn = !!user;
  const [profile, setProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('about');
  const [isFollowing, setIsFollowing] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Follow list & reviews state
  const [followList, setFollowList] = useState([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  // Review inputs
  const [ratingInput, setRatingInput] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [workedAsInput, setWorkedAsInput] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [sortBy, setSortBy] = useState('recent'); // 'recent', 'highest', 'helpful'
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const [loading, setLoading] = useState(true);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState(0);
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    description: '',
    confirmText: '',
    cancelText: '',
    type: 'default',
    isLoading: false,
    onConfirm: () => {},
  });
  const [shareCopied, setShareCopied] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [isUploadingIntro, setIsUploadingIntro] = useState(false);
  const [introProgress, setIntroProgress] = useState(0);
  const { requestPermission } = usePermissionContext();

  // Upload feedback & retry states
  const [mediaUploadError, setMediaUploadError] = useState(null);
  const [mediaLastFiles, setMediaLastFiles] = useState([]);
  const [introUploadError, setIntroUploadError] = useState(null);
  const [introLastFile, setIntroLastFile] = useState(null);
  const [showMediaSuccess, setShowMediaSuccess] = useState(false);
  const [showIntroSuccess, setShowIntroSuccess] = useState(false);

  const [resolvedUid, setResolvedUid] = useState(null);
  const [resolvingUid, setResolvingUid] = useState(true);
  const [showShareSheet, setShowShareSheet] = useState(false);

  useEffect(() => {
    const resolve = async () => {
      setResolvingUid(true);
      if (!profileId) {
        setResolvedUid(user?.uid || null);
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
  }, [profileId, user?.uid]);

  const targetUid = resolvedUid || profileId || user?.uid;
  const isOwnProfile = isLoggedIn && (targetUid === user?.uid);

  // Subscribe to profile
  useEffect(() => {
    if (!targetUid) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToProfile(targetUid, (data) => {
      setProfile(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [targetUid]);

  // Subscribe to real follows status
  useEffect(() => {
    if (!user || !targetUid || targetUid === user.uid) {
      setIsFollowing(false);
      return;
    }
    const followDocRef = doc(db, "follows", `${user.uid}_${targetUid}`);
    const unsub = onSnapshot(followDocRef, (snap) => {
      setIsFollowing(snap.exists());
    });
    return () => unsub();
  }, [user?.uid, targetUid]);

  // Subscribe to real-time follower count
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

  // Subscribe to real-time following count
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

  // Subscribe to real reviews feed
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

  // Check if current user has worked with the talent
  const [hasWorkedTogether, setHasWorkedTogether] = useState(false);
  const [checkingWorked, setCheckingWorked] = useState(true);

  useEffect(() => {
    if (!user || isOwnProfile || !targetUid) {
      setHasWorkedTogether(false);
      setCheckingWorked(false);
      return;
    }

    const checkWorked = async () => {
      setCheckingWorked(true);
      try {
        // Query direction 1: current user applied, profile owner created
        const q1 = query(
          collection(db, "applications"),
          where("userId", "==", user.uid),
          where("creatorId", "==", targetUid),
          where("status", "==", "accepted")
        );
        const snap1 = await getDocs(q1);
        if (!snap1.empty) {
          setHasWorkedTogether(true);
          setCheckingWorked(false);
          return;
        }

        // Query direction 2: profile owner applied, current user created
        const q2 = query(
          collection(db, "applications"),
          where("userId", "==", targetUid),
          where("creatorId", "==", user.uid),
          where("status", "==", "accepted")
        );
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          setHasWorkedTogether(true);
          setCheckingWorked(false);
          return;
        }
      } catch (err) {
        console.error("Error checking worked together status:", err);
      }
      setHasWorkedTogether(false);
      setCheckingWorked(false);
    };

    checkWorked();
  }, [user?.uid, targetUid, isOwnProfile]);

  useEffect(() => {
    if (!isOwnProfile || !targetUid) return;

    const fetchAnalytics = async () => {
      setLoadingAnalytics(true);
      try {
        const docRef = doc(db, "profile_analytics", targetUid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setAnalytics(snap.data());
        } else {
          // Initialize with default high-fidelity data
          const defaultAnalytics = {
            profileViewsThisWeek: 124,
            profileViewsLastWeek: 101,
            searchAppearances: 45,
            profileClicks: 78,
            followersGainedThisWeek: 4,
            viewsLast7Days: [12, 19, 15, 22, 18, 24, 14],
            viewerCategories: {
              "Directors": 45,
              "Producers": 30,
              "Agents": 25,
              "Actors": 15,
              "Fans": 9
            },
            topCategorySearches: "Actor searches",
            topLocation: "Kathmandu, Nepal",
            saves: 12,
            messages: 8
          };
          await setDoc(docRef, defaultAnalytics);
          setAnalytics(defaultAnalytics);
        }
      } catch (err) {
        console.error("Error loading profile analytics:", err);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    if (activeTab === 'analytics') {
      fetchAnalytics();
    }
  }, [activeTab, targetUid, isOwnProfile]);

  // Load followers/following/projects list
  useEffect(() => {
    if (!showFollowModal || !targetUid) {
      setFollowList([]);
      return;
    }

    const loadFollowList = async () => {
      setLoadingFollowList(true);
      try {
        if (showFollowModal === 'projects') {
          const q = query(collection(db, "casting_calls"), where("createdBy", "==", targetUid));
          const snap = await getDocs(q);
          const list = snap.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || 'Untitled Project',
              production: data.production || 'Independent',
              status: data.status || 'Open',
              location: data.location || 'Remote',
            };
          });
          setFollowList(list);
        } else {
          const fieldName = showFollowModal === 'followers' ? 'followingId' : 'followerId';
          const queryField = showFollowModal === 'followers' ? 'followerId' : 'followingId';

          const q = query(collection(db, "follows"), where(fieldName, "==", targetUid));
          const snap = await getDocs(q);

          const userIds = snap.docs.map(docSnap => docSnap.data()[queryField]);
          
          if (userIds.length === 0) {
            setFollowList([]);
            return;
          }

          const fetchedProfiles = [];
          for (const uid of userIds) {
            const profileSnap = await getDocs(query(collection(db, "profiles"), where("__name__", "==", uid)));
            if (!profileSnap.empty) {
              const pData = profileSnap.docs[0].data();
              fetchedProfiles.push({
                id: uid,
                name: pData.name || 'Discovery User',
                image: pData.image || '',
                role: pData.role || 'Talent'
              });
            }
          }
          setFollowList(fetchedProfiles);
        }
      } catch (err) {
        console.error("Error loading list:", err);
      } finally {
        setLoadingFollowList(false);
      }
    };

    loadFollowList();
  }, [showFollowModal, targetUid]);

  const handleFollowToggle = async () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (!profileId || profileId === user.uid) return;
    
    const followId = `${user.uid}_${profileId}`;
    const followDocRef = doc(db, "follows", followId);
    try {
      if (isFollowing) {
        // Unfollow
        await deleteDoc(followDocRef);
        // Decrement counters
        await updateDoc(doc(db, "profiles", profileId), { followers: increment(-1) });
        await updateDoc(doc(db, "profiles", user.uid), { following: increment(-1) });
        try {
          await updateDoc(doc(db, "users", profileId), { followers: increment(-1) });
          await updateDoc(doc(db, "users", user.uid), { following: increment(-1) });
        } catch (e) {
          console.warn("Could not sync follows stats to user doc:", e);
        }
      } else {
        // Follow
        await setDoc(followDocRef, {
          followerId: user.uid,
          followingId: profileId,
          createdAt: serverTimestamp()
        });

        // Send notification (deterministic ID to prevent duplicates)
        try {
          let senderName = user.displayName || 'Someone';
          let senderAvatar = user.photoURL || '';
          try {
            const senderProfileSnap = await getDocs(query(collection(db, "profiles"), where("__name__", "==", user.uid)));
            if (!senderProfileSnap.empty) {
              const spData = senderProfileSnap.docs[0].data();
              senderName = spData.name || senderName;
              senderAvatar = spData.image || senderAvatar;
            }
          } catch (spErr) {
            console.warn("Could not load sender profile:", spErr);
          }

          const notifId = `${user.uid}_${profileId}_follow`;
          await setDoc(doc(db, "notifications", notifId), {
            userId: profileId,
            recipientId: profileId,
            receiverId: profileId,
            senderId: user.uid,
            notificationType: "follow",
            type: "follow",
            isRead: false,
            read: false,
            createdAt: serverTimestamp(),
            profileUrl: `/profile/${user.uid}`,
            title: "New Follower",
            body: `${senderName} started following you.`,
            senderName,
            senderAvatar
          }, { merge: true });
        } catch (nErr) {
          console.warn("Could not send follow notification:", nErr);
        }

        // Increment counters
        await updateDoc(doc(db, "profiles", profileId), { followers: increment(1) });
        await updateDoc(doc(db, "profiles", user.uid), { following: increment(1) });
        try {
          await updateDoc(doc(db, "users", profileId), { followers: increment(1) });
          await updateDoc(doc(db, "users", user.uid), { following: increment(1) });
        } catch (e) {
          console.warn("Could not sync follows stats to user doc:", e);
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    if (!workedAsInput.trim()) {
      alert("Please specify the role you worked as (e.g. Actor, Director).");
      return;
    }
    if (!reviewText.trim()) {
      alert("Please enter review details.");
      return;
    }
    if (targetUid === user.uid) {
      alert("You cannot review your own profile.");
      return;
    }
    
    setIsSubmittingReview(true);
    try {
      const reviewId = `${user.uid}_${targetUid}`;
      const reviewDocRef = doc(db, "reviews", reviewId);
      
      let reviewerName = user.displayName || 'Discovery Talent';
      let reviewerPhoto = user.photoURL || '';
      
      try {
        const userProfileSnap = await getDocs(query(collection(db, "profiles"), where("__name__", "==", user.uid)));
        if (!userProfileSnap.empty) {
          const upData = userProfileSnap.docs[0].data();
          reviewerName = upData.name || reviewerName;
          reviewerPhoto = upData.image || reviewerPhoto;
        }
      } catch (e) {
        console.warn("Could not load reviewer profile:", e);
      }
      
      await setDoc(reviewDocRef, {
        reviewerId: user.uid,
        reviewerName,
        reviewerPhoto,
        targetUid,
        rating: ratingInput,
        text: reviewText.trim(),
        workedAs: workedAsInput.trim(),
        helpfulCount: 0,
        helpfulUsers: [],
        createdAt: serverTimestamp()
      });
      
      // Recalculate average rating & reviews count
      const q = query(collection(db, "reviews"), where("targetUid", "==", targetUid));
      const snap = await getDocs(q);
      const totalReviews = snap.size;
      let totalRating = 0;
      snap.docs.forEach(docSnap => {
        totalRating += (docSnap.data().rating || 0);
      });
      const avgRating = totalReviews > 0 ? parseFloat((totalRating / totalReviews).toFixed(1)) : 0;
      
      await updateDoc(doc(db, "profiles", targetUid), {
        rating: avgRating,
        reviews: totalReviews
      });
      try {
        await updateDoc(doc(db, "users", targetUid), {
          rating: avgRating,
          reviews: totalReviews
        });
      } catch (e) {
        console.warn("Could not sync rating to users doc:", e);
      }
      
      setShowReviewModal(false);
      setReviewText('');
      setWorkedAsInput('');
      setRatingInput(5);
      alert("Review submitted successfully!");
    } catch (err) {
      console.error("Error submitting review:", err);
      alert("Failed to submit review.");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleHelpfulClick = async (reviewId, event) => {
    event.stopPropagation();
    if (!user) {
      onNavigate('signin');
      return;
    }
    const reviewRef = doc(db, "reviews", reviewId);
    const review = reviewsList.find(r => r.id === reviewId);
    if (!review) return;

    const helpfulUsers = review.helpfulUsers || [];
    const hasLiked = helpfulUsers.includes(user.uid);

    try {
      if (hasLiked) {
        // Unlike
        await updateDoc(reviewRef, {
          helpfulCount: increment(-1),
          helpfulUsers: helpfulUsers.filter(uid => uid !== user.uid)
        });
      } else {
        // Like
        await updateDoc(reviewRef, {
          helpfulCount: increment(1),
          helpfulUsers: [...helpfulUsers, user.uid]
        });
      }
    } catch (err) {
      console.error("Error updating helpful count:", err);
    }
  };
  
  // Facebook-style Empty Placeholder Component
  const EmptyState = ({ title, description, icon: Icon, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-nc-card/30 border border-dashed border-white/10 rounded-[2rem] backdrop-blur-sm animate-fade-in group hover:border-nc-accent/30 transition-all duration-500">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-nc-accent/10 transition-all duration-500">
        {Icon && <Icon className="w-8 h-8 text-white/20 group-hover:text-nc-accent transition-colors stroke-[1.5]" />}
      </div>
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      <p className="text-nc-muted text-sm max-w-xs mx-auto mb-8 leading-relaxed">{description}</p>
      {isOwnProfile && actionLabel && (
        <Button size="sm" onClick={onAction} className="px-8 shadow-lg shadow-nc-accent/20">
          {actionLabel}
        </Button>
      )}
    </div>
  );

  const handleMediaUpload = async (e, filesToUpload = null) => {
    const files = filesToUpload || e?.target?.files;
    if (!files || files.length === 0 || !user) return;

    // Save for retry
    setMediaLastFiles(Array.from(files));
    setMediaUploadError(null);
    setShowMediaSuccess(false);

    const isOwnProfile = isLoggedIn && (!profileId || profileId === user?.uid);
    const isPremium = profile?.premium || (profile?.email === 'aniltimilsena53@gmail.com') || (isOwnProfile && isAdmin) || false;
    const existingPhotosCount = (profile?.media || []).filter(url => !isVideoUrl(url)).length;
    const existingVideosCount = (profile?.media || []).filter(url => isVideoUrl(url)).length;

    let newPhotosCount = 0;
    let newVideosCount = 0;

    // Validate all files first
    for (const file of files) {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');

      if (isImage) {
        newPhotosCount++;
        const sizeLimit = isPremium ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
        if (file.size > sizeLimit) {
          showAlert('File Too Large', 'error', `Gallery photo "${file.name}" exceeds the size limit of ${isPremium ? '10MB' : '5MB'}.`);
          return;
        }
      } else if (isVideo) {
        newVideosCount++;
        const sizeLimit = isPremium ? 500 * 1024 * 1024 : 100 * 1024 * 1024;
        if (file.size > sizeLimit) {
          showAlert('File Too Large', 'error', `Showreel video "${file.name}" exceeds the size limit of ${isPremium ? '500MB' : '100MB'}.`);
          return;
        }
      } else {
        showAlert('Invalid File Type', 'error', `File "${file.name}" is not a supported image or video format.`);
        return;
      }
    }

    // Enforce count limits
    const photoLimit = isPremium ? 50 : 10;
    if (existingPhotosCount + newPhotosCount > photoLimit) {
      showAlert('Limit Exceeded', 'error', `Gallery is limited to ${photoLimit} photos for ${isPremium ? 'PRO' : 'Free'} users.`);
      return;
    }

    const videoLimit = isPremium ? 5 : 1;
    if (existingVideosCount + newVideosCount > videoLimit) {
      showAlert('Limit Exceeded', 'error', `Showreel is limited to ${videoLimit} videos for ${isPremium ? 'PRO' : 'Free'} users.`);
      return;
    }
    
    requestPermission('photos', async () => {
      setIsUploadingMedia(true);
      setMediaUploadProgress(0);
      try {
        const newMediaUrls = [];
        let index = 0;
        for (const file of files) {
          const url = await uploadProfileMedia(user.uid, file, (progress) => {
            const baseProgress = (index / files.length) * 100;
            const itemProgress = progress / files.length;
            setMediaUploadProgress(Math.round(baseProgress + itemProgress));
          });
          if (url) {
            newMediaUrls.push(url);
          } else {
            throw new Error(`Failed to upload ${file.name}`);
          }
          index++;
        }
        
        if (newMediaUrls.length > 0) {
          const updatedMedia = [...(profile?.media || []), ...newMediaUrls];
          await updateProfileData(user.uid, { media: updatedMedia });
          setShowMediaSuccess(true);
          setTimeout(() => setShowMediaSuccess(false), 3000);
        }
      } catch (err) {
        console.error("Error uploading media", err);
        setMediaUploadError(err.message || "Upload failed. Please check your connection.");
      } finally {
        setIsUploadingMedia(false);
        if (e?.target) e.target.value = '';
      }
    });
  };

  const handleIntroVideoUpload = async (e, fileToUpload = null) => {
    const file = fileToUpload || e?.target?.files?.[0];
    if (!file || !user) return;

    setIntroLastFile(file);
    setIntroUploadError(null);
    setShowIntroSuccess(false);

    const isOwnProfile = isLoggedIn && (!profileId || profileId === user?.uid);
    const isPremium = profile?.premium || (profile?.email === 'aniltimilsena53@gmail.com') || (isOwnProfile && isAdmin) || false;
    const sizeLimit = isPremium ? 250 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > sizeLimit) {
      showAlert('File Too Large', 'error', `Intro video exceeds the limit of ${isPremium ? '250MB' : '50MB'} for your current tier.`);
      return;
    }

    setIsUploadingIntro(true);
    setIntroProgress(0);
    try {
      const url = await uploadProfileMedia(user.uid, file, (progress) => {
        setIntroProgress(Math.round(progress));
      });
      if (url) {
        await updateProfileData(user.uid, { introVideo: url });
        setShowIntroSuccess(true);
        setTimeout(() => setShowIntroSuccess(false), 3000);
      } else {
        throw new Error("Failed to upload intro video.");
      }
    } catch (err) {
      console.error("Error uploading intro video:", err);
      setIntroUploadError(err.message || "Failed to upload intro video.");
    } finally {
      setIsUploadingIntro(false);
      if (e?.target) e.target.value = '';
    }
  };

  const handleShare = () => {
    setShowShareSheet(true);
  };

  const handleDeleteMedia = (src) => {
    if (!user || !profile) return;
    const isVideo = isVideoUrl(src);
    
    setConfirmConfig({
      isOpen: true,
      title: isVideo ? "Delete Video?" : "Delete Photo?",
      description: isVideo 
        ? "Are you sure you want to delete this video from your showreel? This action cannot be undone." 
        : "Are you sure you want to delete this photo from your media showcase? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      type: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        try {
          const updatedMedia = p.media.filter(url => url !== src);
          await updateProfileData(user.uid, { media: updatedMedia });
          setFullscreenImage(null);
          showAlert('Deleted', 'info', isVideo ? 'Showreel video removed.' : 'Gallery photo removed.');
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Error deleting media:", err);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  const handleDeleteIntroVideo = () => {
    if (!user || !profile) return;
    
    setConfirmConfig({
      isOpen: true,
      title: "Remove Intro Video?",
      description: "Are you sure you want to remove your introduction video? This action cannot be undone.",
      confirmText: "Remove",
      cancelText: "Cancel",
      type: "danger",
      isLoading: false,
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isLoading: true }));
        try {
          await updateProfileData(user.uid, { introVideo: null });
          showAlert('Removed', 'info', 'Intro video removed.');
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        } catch (err) {
          console.error("Error removing intro video:", err);
        } finally {
          setConfirmConfig(prev => ({ ...prev, isLoading: false }));
        }
      }
    });
  };

  // isOwnProfile defined at top of component

  const p = {
    // Prioritize saved Firestore profile data over Firebase Auth data
    name: profile?.name 
      || [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') 
      || profile?.username 
      || (isOwnProfile ? user?.displayName : null)
      || 'Discovery Talent',
    role: profile?.role || 'New User',
    location: profile?.location || 'Not Specified',
    bio: profile?.bio || 'No bio provided yet.',
    followers: followerCount,
    following: followingCount,
    projects: profile?.projects || 0,
    rating: reviewsList.length > 0 
      ? parseFloat((reviewsList.reduce((acc, r) => acc + (r.rating || 0), 0) / reviewsList.length).toFixed(1)) 
      : (profile?.rating || 0),
    reviews: reviewsList.length,
    image: profile?.image || (isOwnProfile ? user?.photoURL : null),
    coverImage: profile?.coverImage || '/hero-bg.png',
    skills: Array.isArray(profile?.skills) ? profile.skills : [],
    experience: Array.isArray(profile?.experience) ? profile.experience : [],
    media: Array.isArray(profile?.media) ? profile.media : [],
    languages: Array.isArray(profile?.languages) ? profile.languages : [],
    verified: profile?.verified || false,
    premium: profile?.premium || (profile?.email === 'aniltimilsena53@gmail.com') || (isOwnProfile && isAdmin) || false,
    introVideo: profile?.introVideo || null,
    gender: profile?.gender || 'Not Specified',
    email: profile?.email || (isOwnProfile ? user?.email : null) || 'Not Specified',
    phone: profile?.phone || 'Not Specified',
    height: profile?.height || 'Not Specified',
    weight: profile?.weight || 'Not Specified',
    eyeColor: profile?.eyeColor || 'Not Specified',
    hairColor: profile?.hairColor || 'Not Specified',
    openToWork: profile?.openToWork || false,
  };
  
  const showContact = isOwnProfile || isFollowing || profile?.showContactInfo === true;

  const tabs = ['about', 'media', 'skills', 'experience', 'reviews'];
  if (isOwnProfile) {
    tabs.push('analytics');
  }

  // Progressive profile completion calculation
  const completionItems = [
    {
      id: 'photo',
      label: 'Upload Profile Photo',
      done: !!(p.image && p.image !== ''),
      action: () => onNavigate('settings', 'about')
    },
    {
      id: 'bio',
      label: 'Add Bio',
      done: !!(p.bio && p.bio.trim() !== '' && p.bio !== 'No bio yet.' && p.bio !== 'No bio added yet.' && p.bio !== 'No bio provided yet.'),
      action: () => onNavigate('settings', 'about')
    },
    {
      id: 'skills',
      label: 'Add Skills',
      done: !!(p.skills && p.skills.length > 0),
      action: () => onNavigate('settings', 'skills')
    },
    {
      id: 'portfolio',
      label: 'Add Portfolio (Media)',
      done: !!(p.media && p.media.length > 0),
      action: () => setActiveTab('media')
    },
    {
      id: 'introVideo',
      label: 'Add Introduction Video',
      done: !!(p.introVideo && p.introVideo.trim() !== ''),
      action: () => setActiveTab('media')
    },
    {
      id: 'verify',
      label: 'Verify Account',
      done: !!p.verified,
      action: () => onNavigate('trust')
    }
  ];

  const totalScore = completionItems.reduce((acc, item) => {
    let weight = 15;
    if (item.id === 'skills') weight = 20;
    if (item.id === 'portfolio') weight = 20;
    if (item.id === 'introVideo') weight = 20;
    if (item.id === 'verify') weight = 10;
    return acc + (item.done ? weight : 0);
  }, 0);

  if (loading || resolvingUid) {
    return (
      <div className="min-h-screen bg-nc-dark pb-24">
        {/* Cover Skeleton */}
        <div className="h-[160px] skeleton rounded-none relative" />
        
        {/* Profile Hero Glass Card Skeleton */}
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 relative -mt-20 sm:-mt-24 z-10">
          <div className="bg-[#0E0E0E] border border-white/5 rounded-[2.5rem] p-5 sm:p-7 shadow-2xl">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {/* Avatar Shimmer */}
              <div className="w-20 h-20 rounded-full skeleton shrink-0" />
              {/* Info Shimmer */}
              <div className="flex-1 space-y-3 w-full">
                <div className="h-6 skeleton w-1/3" />
                <div className="h-4 skeleton w-1/4" />
                <div className="h-3 skeleton w-1/5" />
              </div>
            </div>

            {/* Stats Row Shimmer */}
            <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/5 w-full">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className={`flex flex-col items-center justify-center text-center py-1 ${i > 1 ? 'border-l border-white/5' : ''}`}
                >
                  <div className="h-5 skeleton w-12" />
                  <div className="h-3 skeleton w-16 mt-1.5" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 mt-8 space-y-6">
          {/* Tab Bar Shimmer */}
          <div className="h-10 skeleton w-full rounded-full" />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-[#0E0E0E] border border-white/5 rounded-[2rem] p-6 h-48 space-y-3.5">
                <div className="h-5 skeleton w-1/4" />
                <div className="h-3.5 skeleton w-full" />
                <div className="h-3.5 skeleton w-full" />
                <div className="h-3.5 skeleton w-3/4" />
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-[#0E0E0E] border border-white/5 rounded-[1.5rem] p-6 h-40 space-y-3.5">
                <div className="h-5 skeleton w-1/3" />
                <div className="h-3.5 skeleton w-full" />
                <div className="h-3.5 skeleton w-3/4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      <div className="min-h-screen bg-nc-dark pb-24">
      {/* Cover + Hero */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-[160px] relative w-full overflow-hidden">
          <img 
            src={p.coverImage} 
            alt="Cover" 
            className="w-full h-full object-cover select-none" 
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
          
          {/* Back arrow "<" overlaying cover photo with a dark circular background, navigating back */}
          <button
            onClick={() => onNavigate('home')}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-colors border border-white/10"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
        
        {/* Profile Hero Glass Card — Redesigned */}
        <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 relative -mt-20 sm:-mt-24 z-10">
          <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.5rem] p-5 sm:p-7 shadow-2xl">
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
              {/* Avatar with edit shortcut */}
              <div className="relative flex-shrink-0">
                <Avatar 
                  src={p.image}
                  gender={p.gender}
                  name={p.name}
                  size="lg"
                />

                {isOwnProfile && (
                  <button
                    onClick={() => onNavigate('settings', 'about')}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-nc-accent rounded-full flex items-center justify-center shadow-lg border-2 border-[#0E0E0E] hover:scale-110 transition-transform"
                    title="Edit Profile Image"
                    aria-label="Edit Profile Image"
                  >
                    <svg className="w-3.5 h-3.5 text-[#0A0A0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
                {p.verified && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-nc-accent rounded-full flex items-center justify-center text-[#0A0A0A] text-[9px] font-black shadow ring-2 ring-[#0E0E0E]">✓</div>
                )}
              </div>

              {/* Info block */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center">
                        {p.name}
                        {p.verified && (
                          <span className="verified-badge shrink-0" title="Verified Talent">✓</span>
                        )}
                      </h1>
                      {p.openToWork && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                          Open
                        </span>
                      )}
                    </div>
                    <p className="text-nc-accent text-sm font-medium">{p.role}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3.5 h-3.5 text-[#555]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      <p className="text-[#666] text-xs">{p.location}</p>
                    </div>
                  </div>

                  {/* CTA Buttons — show when viewing another user's profile */}
                  {(() => {
                    const isOwnProfile = isLoggedIn && (!profileId || profileId === user?.uid);
                    const isOtherUser = !isOwnProfile;
                    return (
                      <div className="flex items-center gap-2 flex-wrap">
                        {isOtherUser && (
                          <button
                            onClick={handleFollowToggle}
                            className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all active:scale-95 ${
                              isFollowing
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'bg-nc-accent text-[#0A0A0A]'
                            }`}
                          >
                            {isFollowing ? 'Following' : 'Follow'}
                          </button>
                        )}
                        {isOtherUser && (
                          <button
                            onClick={() => onNavigate('messages', profileId)}
                            className="px-5 py-2 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] text-white text-xs font-black uppercase tracking-wide hover:border-white/20 transition-all active:scale-95"
                          >
                            Message
                          </button>
                        )}
                        {/* Audio Call */}
                        {isOtherUser && profileId && (
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('nc-call', {
                                detail: {
                                  calleeId: profileId,
                                  calleeName: p.name,
                                  calleePhoto: p.image || '',
                                  callType: 'audio',
                                }
                              }));
                            }}
                            className="w-8 h-8 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 hover:bg-green-500/20 hover:border-green-500/30 transition-all active:scale-90"
                            title="Audio Call"
                            aria-label="Audio Call"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </button>
                        )}
                        {/* Video Call */}
                        {isOtherUser && profileId && (
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('nc-call', {
                                detail: {
                                  calleeId: profileId,
                                  calleeName: p.name,
                                  calleePhoto: p.image || '',
                                  callType: 'video',
                                }
                              }));
                            }}
                            className="w-8 h-8 rounded-full bg-nc-accent/10 border border-nc-accent/20 flex items-center justify-center text-nc-accent hover:bg-nc-accent/20 hover:border-nc-accent/30 transition-all active:scale-90"
                            title="Video Call"
                            aria-label="Video Call"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                        <button 
                          id="profile-share-btn"
                          onClick={handleShare}
                          className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-[#2A2A2A] flex items-center justify-center text-[#666] hover:text-white hover:border-white/20 transition-all active:scale-95"
                          title="Share Profile"
                          aria-label="Share Profile"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })()}

                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-2 mt-6 pt-4 border-t border-white/5 w-full">
                  {[
                    { value: p.followers >= 1000 ? (p.followers / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : p.followers, label: 'Followers', clickable: true, type: 'followers' },
                    { value: p.following >= 1000 ? (p.following / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : p.following, label: 'Following', clickable: true, type: 'following' },
                    { value: p.projects, label: 'Projects', clickable: true, type: 'projects' },
                    { value: p.reviews, label: 'Reviews', clickable: true, type: 'reviews' }
                  ].map((stat, idx) => (
                    <div
                      key={stat.label}
                      onClick={() => {
                        if (stat.clickable) {
                          if (stat.type === 'reviews') {
                            setActiveTab('reviews');
                          } else {
                            setShowFollowModal(stat.type);
                          }
                        }
                      }}
                      className={`flex flex-col items-center justify-center text-center py-1 select-none
                        ${idx > 0 ? 'border-l border-white/5' : ''}
                        ${stat.clickable ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
                    >
                      <div className="font-extrabold text-white text-base leading-tight">
                        {stat.value}
                      </div>
                      <div className="text-gray-500 text-[9px] sm:text-[10px] uppercase font-bold tracking-normal sm:tracking-wide mt-0.5 leading-tight">
                        {stat.label}
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Content */}
      <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-12 mt-8 animate-fade-in">
        {/* Profile Completion Checklist */}
        {isOwnProfile && totalScore < 100 && (
          <GlassCard strong className="p-6 mb-8 border border-white/10 rounded-[2rem] bg-nc-card/30 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  Profile Strength: {totalScore}%
                </h3>
                <p className="text-nc-muted text-xs mt-1">Complete your profile to increase your visibility on the marketplace.</p>
              </div>
              <div className="w-full md:w-64 h-2 bg-white/5 rounded-full overflow-hidden relative">
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-nc-accent transition-all duration-500 rounded-full"
                  style={{ width: `${totalScore}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {completionItems.map((item) => (
                <div 
                  key={item.id}
                  onClick={() => !item.done && item.action()}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                    item.done 
                      ? 'bg-green-500/5 border-green-500/20 text-green-400' 
                      : 'bg-white/2 border-white/5 text-nc-secondary hover:bg-white/5 hover:border-white/10 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      item.done ? 'bg-green-500 text-[#0E0E0E]' : 'bg-white/5 border border-white/10 text-white/40'
                    }`}>
                      {item.done ? '✓' : ''}
                    </span>
                    <span className="text-xs font-bold truncate">{item.label}</span>
                  </div>
                  {!item.done && (
                    <span className="text-[10px] font-black text-nc-accent uppercase tracking-wider shrink-0">Add</span>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}
        
        {isOwnProfile && totalScore === 100 && (
          <GlassCard strong className="p-5 mb-8 border border-green-500/20 bg-green-500/5 rounded-[2rem] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚀</span>
              <div>
                <h4 className="text-sm font-bold text-green-400">Your profile is 100% complete!</h4>
                <p className="text-[11px] text-green-400/75 mt-0.5">Enjoy maximum network visibility and priority listing placement.</p>
              </div>
            </div>
            <span className="bg-green-500/10 border border-green-500/30 text-green-400 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full">Boosted</span>
          </GlassCard>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-nc-surface border border-nc-border rounded-full p-1 mb-8 overflow-x-auto scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-max py-2.5 px-4 rounded-full text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? 'bg-nc-accent text-nc-darker'
                  : 'text-nc-muted hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* About */}
        {activeTab === 'about' && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-[2] space-y-6">
              <div className="bg-nc-card border border-nc-border rounded-3xl p-6">
                <h2 className="font-bold text-white mb-3">About</h2>
                <p className="text-nc-secondary leading-relaxed">{p.bio}</p>
              </div>
              {p.languages.length > 0 && (
                <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-4">Languages</h2>
                  <div className="flex gap-2 flex-wrap">
                    {p.languages.map(lang => (
                      <Tag key={lang} color="accent">{lang}</Tag>
                    ))}
                  </div>
                </div>
              )}

              {p.skills.length > 0 && (
                <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-4">Special Skills</h2>
                  <div className="flex gap-2 flex-wrap">
                    {p.skills.map((skill, idx) => {
                      const skillName = typeof skill === 'string' ? skill : (skill?.name || '');
                      return skillName ? <Tag key={idx} color="default">{skillName}</Tag> : null;
                    })}
                  </div>
                </div>
              )}

              <div className="bg-nc-card border border-nc-border rounded-2xl p-6">
                <h2 className="font-bold text-white mb-6">Experience</h2>
                <div className="space-y-6">
                  {p.experience.map((exp, idx) => (
                    <div key={idx} className="relative pl-6 before:absolute before:left-0 before:top-1.5 before:bottom-0 before:w-px before:bg-nc-border last:before:bottom-6">
                      <div className="absolute left-[-4px] top-1 w-2.5 h-2.5 rounded-full bg-nc-accent ring-4 ring-nc-accent/10"></div>
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="text-white font-bold text-sm tracking-tight">{exp?.role || exp?.title || ''}</h4>
                        <span className="text-[10px] text-nc-muted font-black uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{exp?.year || ''}</span>
                      </div>
                      <div className="text-nc-accent text-xs font-medium mb-2">{exp?.production || exp?.company || ''}</div>
                      <p className="text-nc-muted text-xs leading-relaxed">{exp?.description || ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>


            <div className="flex-1 space-y-4">
              <div className="bg-nc-card border border-nc-border rounded-2xl p-5">
                <h3 className="font-bold text-white mb-4 text-sm uppercase tracking-wider">Contact Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-nc-muted text-xs">Email</div>
                      <div className="text-nc-secondary text-sm">{showContact ? p.email : 'Private'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-nc-muted text-xs">Phone</div>
                      <div className="text-nc-secondary text-sm">{showContact ? p.phone : 'Private'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                       </svg>
                    </div>
                    <div>
                      <div className="text-nc-muted text-xs">Gender</div>
                      <div className="text-nc-secondary text-sm">{p.gender || 'Not Specified'}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-nc-surface flex items-center justify-center text-nc-muted"></div>
                    <div>
                      <div className="text-nc-muted text-xs">Location</div>
                      <div className="text-nc-secondary text-sm">{p.location}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Physical Identity */}
              <div className="bg-nc-card border border-nc-border rounded-2xl p-5">
                <h3 className="font-bold text-nc-accent mb-4 text-xs uppercase tracking-[0.2em]">Physical Identity</h3>
                <div className="grid grid-cols-2 gap-y-4">
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Height</div>
                    <div className="text-white text-sm font-medium">{p.height}</div>
                  </div>
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Weight</div>
                    <div className="text-white text-sm font-medium">{p.weight}</div>
                  </div>
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Eye Color</div>
                    <div className="text-white text-sm font-medium">{p.eyeColor}</div>
                  </div>
                  <div>
                    <div className="text-nc-muted text-[10px] uppercase font-bold mb-1">Hair Color</div>
                    <div className="text-white text-sm font-medium">{p.hairColor}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Skills */}
        {activeTab === 'skills' && (
          <div className="flex flex-col lg:flex-row gap-6">
            {p.skills.length > 0 ? (
              <>
                <div className="flex-1 bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-6">Core Skills</h2>
                  <div className="space-y-5">
                    {p.skills.map((skill, idx) => {
                      const skillName = typeof skill === 'string' ? skill : skill?.name;
                      const skillLevel = typeof skill === 'string' ? 80 : (skill?.level || 80);
                      return skillName ? <SkillBar key={idx} name={skillName} level={skillLevel} /> : null;
                    })}
                  </div>
                </div>
                <div className="flex-1 bg-nc-card border border-nc-border rounded-2xl p-6">
                  <h2 className="font-bold text-white mb-4">Specializations</h2>
                  <div className="flex flex-wrap gap-2 text-nc-muted text-xs italic">
                    Not specified
                  </div>
                  <h2 className="font-bold text-white mb-4 mt-6">Equipment</h2>
                  <div className="flex flex-wrap gap-2 text-nc-muted text-xs italic">
                    Not specified
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full">
                <EmptyState 
                  title="No Skills Added"
                  description="Highlight your professional capabilities to attract more casting directors."
                  icon={Sparkles}
                  actionLabel="Add First Skill"
                  onAction={() => onNavigate('settings', 'skills')}
                />
              </div>
            )}
          </div>
        )}

        {/* Experience */}
        {activeTab === 'experience' && (
          <div className="bg-nc-card border border-nc-border rounded-2xl p-6 min-h-[400px]">
            <h2 className="font-bold text-white mb-6">Experience Timeline</h2>
            {p.experience.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-nc-border" />
                <div className="space-y-6 pl-12">
                  {p.experience.map((exp, idx) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-9 top-1 w-5 h-5 rounded-full bg-nc-accent flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-nc-darker" />
                      </div>
                      <div className="bg-nc-surface border border-nc-border rounded-[2rem] p-4">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <h3 className="font-bold text-white">{exp?.role || exp?.title || ''}</h3>
                            <p className="text-nc-accent text-sm">{exp?.production || exp?.company || ''}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Tag color="accent">{exp?.year || ''}</Tag>
                          </div>
                        </div>
                        <p className="text-nc-secondary text-sm mt-2">{exp?.description || ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState 
                title="Your Timeline is Empty"
                description="Showcase your professional journey and past projects to build trust."
                icon={Briefcase}
                actionLabel="Update Experience"
                onAction={() => onNavigate('settings', 'experience')}
              />
            )}
          </div>
        )}

        {/* Media */}
        {activeTab === 'media' && (() => {
          const photos = p.media.filter(url => !isVideoUrl(url));
          const videos = p.media.filter(url => isVideoUrl(url));
          const isPremium = p.premium;
          return (
            <div className="animate-fade-in min-h-[400px] space-y-8">
              {/* Intro Video Section */}
              {(isOwnProfile || p.introVideo || isUploadingIntro) && (
                <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-xl text-left">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">Intro Video</h3>
                      <p className="text-xs text-nc-muted">A short introduction video for casting directors.</p>
                    </div>
                    {isOwnProfile && !p.introVideo && !isUploadingIntro && (
                      <button 
                        onClick={() => document.getElementById('profile-intro-upload')?.click()}
                        className="bg-nc-accent text-nc-darker text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl hover:brightness-110 transition-all"
                      >
                        Upload Video
                      </button>
                    )}
                  </div>

                  {isUploadingIntro || showIntroSuccess || introUploadError ? (
                    <div className="py-10 px-6 text-center space-y-4 border border-dashed border-white/10 rounded-3xl bg-nc-card/30 backdrop-blur-sm">
                      {isUploadingIntro && (
                        <div className="max-w-xs mx-auto space-y-3">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-nc-accent font-bold animate-pulse">Uploading Intro Video...</span>
                            <span className="text-white font-black">{introProgress}%</span>
                          </div>
                          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                            <div 
                              className="absolute inset-y-0 left-0 bg-nc-accent transition-all duration-300 rounded-full" 
                              style={{ width: `${introProgress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {showIntroSuccess && (
                        <div className="flex flex-col items-center justify-center gap-2 text-green-400">
                          <span className="text-3xl font-bold">✓</span>
                          <span className="text-xs font-bold">Introduction video uploaded successfully!</span>
                        </div>
                      )}
                      {introUploadError && (
                        <div className="flex flex-col items-center justify-center gap-4 text-center">
                          <div className="flex flex-col items-center gap-1.5 text-red-400">
                            <span className="text-3xl font-bold">✕</span>
                            <span className="text-xs font-bold">{introUploadError}</span>
                          </div>
                          <button 
                            onClick={() => handleIntroVideoUpload(null, introLastFile)}
                            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all"
                          >
                            Retry Upload
                          </button>
                        </div>
                      )}
                    </div>
                  ) : p.introVideo ? (
                    <div className="relative aspect-video rounded-3xl overflow-hidden bg-black/40 border border-white/5 shadow-inner">
                      <video 
                        src={p.introVideo} 
                        controls 
                        controlsList="nodownload"
                        className="w-full h-full object-cover" 
                        onContextMenu={(e) => e.preventDefault()}
                      />
                      {isOwnProfile && (
                        <button 
                          onClick={handleDeleteIntroVideo}
                          className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-red-500 transition-colors shadow-lg"
                          title="Remove Intro Video"
                          aria-label="Remove Intro Video"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center border border-dashed border-white/5 rounded-3xl bg-white/2 group hover:border-nc-accent/30 transition-all duration-500">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 mx-auto group-hover:scale-110 group-hover:bg-nc-accent/10 transition-all duration-500">
                        <Video className="w-6 h-6 text-white/20 group-hover:text-nc-accent transition-colors stroke-[1.5]" />
                      </div>
                      <p className="text-xs text-nc-muted max-w-xs mx-auto leading-relaxed">
                        {isOwnProfile 
                          ? `Introduce yourself to the network! Maximum file size: ${isPremium ? '250MB' : '50MB'}.`
                          : 'No intro video has been uploaded by this talent.'}
                      </p>
                    </div>
                  )}
                  
                  <input 
                    id="profile-intro-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleIntroVideoUpload}
                  />
                </div>
              )}

              {/* Media Showcase Grid */}
              <div className="bg-[#0E0E0E] border border-[#1A1A1A] rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden shadow-xl text-left">
                {isOwnProfile && (
                  <div className="flex justify-end mb-6">
                    <button 
                      onClick={() => document.getElementById('profile-media-upload')?.click()}
                      disabled={isUploadingMedia}
                      className="bg-nc-accent text-nc-darker text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-xl hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingMedia ? 'Uploading...' : 'Upload Media'}
                    </button>
                    <input 
                      id="profile-media-upload"
                      type="file" 
                      multiple 
                      accept="image/*,video/*"
                      className="hidden" 
                      onChange={handleMediaUpload}
                    />
                  </div>
                )}

                {/* Gallery Photos Grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {photos.map((src, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => setFullscreenImage({ src, idx })}
                        className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-nc-surface border border-nc-border shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer"
                      >
                        <img 
                          src={src} 
                          alt={`Gallery asset ${idx + 1}`} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 select-none"
                          onContextMenu={(e) => e.preventDefault()}
                          onDragStart={(e) => e.preventDefault()}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end justify-between p-4 backdrop-blur-[2px]">
                          <span className="text-[9px] text-nc-accent font-black uppercase tracking-widest bg-nc-accent/10 border border-nc-accent/20 px-2.5 py-1 rounded-full">
                            Fullscreen
                          </span>
                          {isOwnProfile && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMedia(src);
                              }}
                              className="bg-black/60 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors shadow-lg"
                              title="Delete Photo"
                              aria-label="Delete Photo"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Showreel Videos Grid */}
                {videos.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {videos.map((src, idx) => (
                      <div 
                        key={idx} 
                        className="group relative aspect-video rounded-3xl overflow-hidden bg-nc-surface border border-nc-border shadow-lg"
                      >
                        <video 
                          src={src} 
                          controls 
                          controlsList="nodownload"
                          className="w-full h-full object-cover" 
                          onContextMenu={(e) => e.preventDefault()}
                        />
                        {isOwnProfile && (
                          <button 
                            onClick={() => handleDeleteMedia(src)}
                            className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full hover:bg-red-500 transition-colors shadow-lg"
                            title="Delete Video"
                            aria-label="Delete Video"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Clean empty state for no media */}
                {photos.length === 0 && videos.length === 0 && !isUploadingMedia && (
                  <div className="w-full">
                    <EmptyState 
                      title="No Portfolio Added"
                      description="Upload photos and videos to showcase your talent to the network."
                      icon={Image}
                    />
                  </div>
                )}

                {/* Upload States */}
                {(isUploadingMedia || showMediaSuccess || mediaUploadError) && (
                  <div className="mt-4 p-5 rounded-3xl bg-nc-card/30 border border-white/10 backdrop-blur-sm">
                    {isUploadingMedia && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-nc-accent font-bold animate-pulse">Uploading Showcase Media...</span>
                          <span className="text-white font-black">{mediaUploadProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden relative">
                          <div 
                            className="absolute inset-y-0 left-0 bg-nc-accent transition-all duration-300 rounded-full" 
                            style={{ width: `${mediaUploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {showMediaSuccess && (
                      <div className="flex items-center gap-3 text-green-400 text-xs font-bold py-1">
                        <span className="text-lg">✓</span>
                        <span>Showcase items uploaded successfully!</span>
                      </div>
                    )}
                    {mediaUploadError && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-1">
                        <div className="flex items-center gap-3 text-red-400 text-xs font-bold">
                          <span className="text-lg">✕</span>
                          <span>{mediaUploadError}</span>
                        </div>
                        <button 
                          onClick={() => handleMediaUpload(null, mediaLastFiles)}
                          className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all self-start sm:self-auto"
                        >
                          Retry Upload
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}




        {/* Reviews */}
        {activeTab === 'reviews' && (
          <div className="space-y-6 min-h-[400px]">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Reviews ({reviewsList.length})</h2>
              {isLoggedIn && !isOwnProfile && hasWorkedTogether && (
                <Button 
                  size="sm" 
                  onClick={() => setShowReviewModal(true)}
                  className="bg-[#00BFFF] hover:opacity-90 text-[#0A0A0A] font-bold shadow-lg shadow-[#00BFFF]/20"
                >
                  Write a Review
                </Button>
              )}
            </div>
            
            {loadingReviews ? (
              <p className="text-xs text-nc-muted">Loading reviews feed...</p>
            ) : reviewsList.length > 0 ? (
              <div className="space-y-6 animate-fade-in">
                {/* Rating Overview Card */}
                {(() => {
                  const totalRating = reviewsList.reduce((acc, r) => acc + (r.rating || 0), 0);
                  const avgRating = (totalRating / reviewsList.length).toFixed(1);
                  
                  // Calculate breakdown counts
                  const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
                  reviewsList.forEach(r => {
                    const rounded = Math.round(r.rating || 5);
                    if (counts[rounded] !== undefined) {
                      counts[rounded]++;
                    }
                  });

                  // Helper to render gold filled / empty stars
                  const renderOverviewStars = (val) => {
                    const stars = [];
                    const roundedRating = Math.round(val);
                    for (let i = 1; i <= 5; i++) {
                      if (i <= roundedRating) {
                        stars.push(<span key={i} className="text-yellow-500">★</span>);
                      } else {
                        stars.push(<span key={i} className="text-white/20">★</span>);
                      }
                    }
                    return stars;
                  };

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-nc-card border border-nc-border rounded-3xl p-6">
                      {/* Left: Large Rating Number */}
                      <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-white/5">
                        <span className="text-5xl font-black text-white tracking-tight leading-none mb-3">{avgRating}</span>
                        <div className="flex gap-1 text-lg mb-2">
                          {renderOverviewStars(parseFloat(avgRating))}
                        </div>
                        <span className="text-xs text-nc-muted">({reviewsList.length} {reviewsList.length === 1 ? 'review' : 'reviews'})</span>
                      </div>

                      {/* Right: Breakdown Bars */}
                      <div className="md:col-span-2 flex flex-col justify-center space-y-2 p-2">
                        {[5, 4, 3, 2, 1].map((stars) => {
                          const count = counts[stars];
                          const percentage = reviewsList.length > 0 ? (count / reviewsList.length) * 100 : 0;
                          
                          // Character representation matching: 5★ ████████░░ 8
                          const blockCount = Math.round(percentage / 10);
                          const blocks = "█".repeat(blockCount) + "░".repeat(10 - blockCount);

                          return (
                            <div key={stars} className="flex items-center gap-3 text-xs">
                              <span className="text-nc-secondary font-bold w-6 text-right">{stars}★</span>
                              <span className="font-mono text-yellow-500 tracking-tighter hidden sm:inline">{blocks}</span>
                              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden relative sm:hidden md:block">
                                <div 
                                  className="absolute inset-y-0 left-0 bg-yellow-500 rounded-full transition-all duration-500" 
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-white font-bold w-6 text-left">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Sorting Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mt-8">
                  <span className="text-xs text-nc-muted uppercase tracking-wider font-black">Sort Reviews</span>
                  <div className="flex gap-4 text-xs font-bold">
                    {[
                      { id: 'recent', label: 'Most Recent' },
                      { id: 'highest', label: 'Highest Rated' },
                      { id: 'helpful', label: 'Most Helpful' }
                    ].map(option => (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        className={`transition-colors uppercase tracking-wider ${
                          sortBy === option.id 
                            ? 'text-nc-accent border-b-2 border-nc-accent pb-1' 
                            : 'text-gray-500 hover:text-white pb-1'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sorted Review List */}
                {(() => {
                  const sortedReviews = [...reviewsList].sort((a, b) => {
                    if (sortBy === 'highest') {
                      return (b.rating || 0) - (a.rating || 0);
                    }
                    if (sortBy === 'helpful') {
                      return (b.helpfulCount || 0) - (a.helpfulCount || 0);
                    }
                    // 'recent'
                    const dateA = a.createdAt?.seconds ? a.createdAt.seconds : 0;
                    const dateB = b.createdAt?.seconds ? b.createdAt.seconds : 0;
                    return dateB - dateA;
                  });

                  return (
                    <div className="space-y-4">
                      {sortedReviews.map((rev) => {
                        const helpfulUsers = rev.helpfulUsers || [];
                        const hasLiked = user && helpfulUsers.includes(user.uid);
                        
                        return (
                          <div key={rev.id} className="bg-nc-card border border-nc-border rounded-3xl p-5 space-y-4 hover:border-white/10 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <Avatar 
                                  src={rev.reviewerPhoto}
                                  name={rev.reviewerName}
                                  size="sm"
                                />
                                <div>
                                  <p className="font-bold text-white text-sm">{rev.reviewerName || 'Discovery User'}</p>
                                  <p className="text-[10px] text-nc-muted uppercase">{rev.dateFormatted}</p>
                                </div>
                              </div>
                              <div className="text-yellow-500 flex gap-0.5 text-sm">
                                {'★'.repeat(rev.rating || 5)}{'☆'.repeat(5 - (rev.rating || 5))}
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm text-nc-secondary leading-relaxed">{rev.text}</p>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/5">
                              {rev.workedAs && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-nc-muted">
                                  Worked as: <strong className="text-nc-accent font-bold">{rev.workedAs}</strong>
                                </span>
                              )}
                              
                              <button
                                onClick={(e) => handleHelpfulClick(rev.id, e)}
                                className={`flex items-center gap-1.5 text-xs font-bold transition-all px-3 py-1.5 rounded-full ${
                                  hasLiked 
                                    ? 'bg-nc-accent/20 border border-nc-accent/30 text-nc-accent' 
                                    : 'bg-white/5 border border-white/10 text-nc-muted hover:text-white'
                                }`}
                              >
                                👍 Helpful ({rev.helpfulCount || 0})
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-nc-card/30 border border-dashed border-white/10 rounded-[2rem] backdrop-blur-sm animate-fade-in group hover:border-nc-accent/30 transition-all duration-500">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-nc-accent/10 transition-all duration-500">
                  <Star className="w-8 h-8 text-white/20 group-hover:text-nc-accent transition-colors stroke-[1.5]" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No reviews yet</h3>
                <p className="text-nc-muted text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                  Be the first to review {p.name}
                </p>
                {isLoggedIn && !isOwnProfile && hasWorkedTogether && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowReviewModal(true)}
                    className="px-8 shadow-lg shadow-nc-accent/20 bg-[#00BFFF] hover:opacity-90 text-[#0A0A0A] font-bold"
                  >
                    Write a Review
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && isOwnProfile && (
          <div className="space-y-8 animate-fade-in">
            {loadingAnalytics ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-12 h-12 border-2 border-t-[#00BFFF] border-r-transparent border-b-transparent border-l-transparent animate-spin rounded-full mx-auto" />
                <p className="text-xs text-nc-muted">Loading profile analytics...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Quick Stats Row */}
                {(() => {
                  const viewsThisWeek = analytics.profileViewsThisWeek || 0;
                  const viewsLastWeek = analytics.profileViewsLastWeek || 0;
                  const diff = viewsThisWeek - viewsLastWeek;
                  const pctChange = viewsLastWeek > 0 ? Math.round((diff / viewsLastWeek) * 100) : 0;
                  const sign = diff >= 0 ? "↑" : "↓";
                  const colorClass = diff >= 0 ? "text-green-400" : "text-red-400";
                  
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Views Card */}
                      <div className="bg-nc-card border border-nc-border rounded-3xl p-5 hover:border-white/10 transition-colors flex flex-col justify-between">
                        <div>
                          <span className="text-xs text-nc-muted font-bold uppercase tracking-wider block mb-1">👁 Views</span>
                          <span className="text-2xl font-black text-white">{viewsThisWeek}</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase mt-2 block ${colorClass}`}>
                          {sign}{Math.abs(pctChange)}% this week
                        </span>
                      </div>

                      {/* Searches Card */}
                      <div className="bg-nc-card border border-nc-border rounded-3xl p-5 hover:border-white/10 transition-colors flex flex-col justify-between">
                        <div>
                          <span className="text-xs text-nc-muted font-bold uppercase tracking-wider block mb-1">🔍 Searches</span>
                          <span className="text-2xl font-black text-white">{analytics.searchAppearances || 0}</span>
                        </div>
                        <span className="text-[10px] text-nc-muted font-black uppercase mt-2 block">
                          Search Appearances
                        </span>
                      </div>

                      {/* Saves Card */}
                      <div className="bg-nc-card border border-nc-border rounded-3xl p-5 hover:border-white/10 transition-colors flex flex-col justify-between">
                        <div>
                          <span className="text-xs text-nc-muted font-bold uppercase tracking-wider block mb-1">❤️ Saves</span>
                          <span className="text-2xl font-black text-white">{analytics.saves || 0}</span>
                        </div>
                        <span className="text-[10px] text-nc-muted font-black uppercase mt-2 block">
                          Profile Bookmarks
                        </span>
                      </div>

                      {/* Messages Card */}
                      <div className="bg-nc-card border border-nc-border rounded-3xl p-5 hover:border-white/10 transition-colors flex flex-col justify-between">
                        <div>
                          <span className="text-xs text-nc-muted font-bold uppercase tracking-wider block mb-1">📩 Messages</span>
                          <span className="text-2xl font-black text-white">{analytics.messages || 0}</span>
                        </div>
                        <span className="text-[10px] text-nc-muted font-black uppercase mt-2 block">
                          Active Chats
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Charts Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Line Chart: Views last 7 days */}
                  <div className="bg-nc-card border border-nc-border rounded-3xl p-6 flex flex-col">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Profile Views (Last 7 Days)</h3>
                    {(() => {
                      const data = analytics.viewsLast7Days || [0, 0, 0, 0, 0, 0, 0];
                      const maxVal = Math.max(...data, 10);
                      const chartWidth = 460;
                      const chartHeight = 160;
                      const padding = { top: 20, bottom: 20, left: 30, right: 15 };
                      
                      // Map values to coordinates
                      const points = data.map((val, idx) => {
                        const x = padding.left + (idx * (chartWidth - padding.left - padding.right) / 6);
                        const y = chartHeight - padding.bottom - (val * (chartHeight - padding.top - padding.bottom) / maxVal);
                        return { x, y, val };
                      });

                      // Construct svg line path
                      let pathD = "";
                      points.forEach((pt, idx) => {
                        if (idx === 0) {
                          pathD += `M ${pt.x} ${pt.y}`;
                        } else {
                          pathD += ` L ${pt.x} ${pt.y}`;
                        }
                      });

                      // Construct area path for gradient
                      const firstPt = points[0];
                      const lastPt = points[points.length - 1];
                      const areaD = `${pathD} L ${lastPt.x} ${chartHeight - padding.bottom} L ${firstPt.x} ${chartHeight - padding.bottom} Z`;

                      const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

                      return (
                        <div className="relative w-full overflow-hidden flex-1 flex flex-col justify-center">
                          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                            <defs>
                              <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#00BFFF" stopOpacity="0.35"/>
                                <stop offset="100%" stopColor="#00BFFF" stopOpacity="0.00"/>
                              </linearGradient>
                            </defs>

                            {/* Gridlines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                              const y = padding.top + ratio * (chartHeight - padding.top - padding.bottom);
                              const gridVal = Math.round(maxVal - ratio * maxVal);
                              return (
                                <g key={idx}>
                                  <line 
                                    x1={padding.left} 
                                    y1={y} 
                                    x2={chartWidth - padding.right} 
                                    y2={y} 
                                    stroke="rgba(255,255,255,0.05)" 
                                    strokeWidth="1" 
                                  />
                                  <text 
                                    x={padding.left - 8} 
                                    y={y + 4} 
                                    fill="rgba(255,255,255,0.3)" 
                                    fontSize="8" 
                                    textAnchor="end"
                                    className="font-mono"
                                  >
                                    {gridVal}
                                  </text>
                                </g>
                              );
                            })}

                            {/* X Axis Labels */}
                            {points.map((pt, idx) => (
                              <text 
                                key={idx} 
                                x={pt.x} 
                                y={chartHeight - 4} 
                                fill="rgba(255,255,255,0.3)" 
                                fontSize="9" 
                                textAnchor="middle"
                                className="font-bold"
                              >
                                {daysOfWeek[idx]}
                              </text>
                            ))}

                            {/* Gradient Area under line */}
                            <path d={areaD} fill="url(#viewsGradient)" />

                            {/* Line Path */}
                            <path d={pathD} fill="none" stroke="#00BFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                            {/* Interactive Dots */}
                            {points.map((pt, idx) => (
                              <g key={idx} className="group/dot cursor-pointer">
                                <circle 
                                  cx={pt.x} 
                                  cy={pt.y} 
                                  r="4" 
                                  fill="#00BFFF" 
                                  stroke="#0A0A0A" 
                                  strokeWidth="1.5" 
                                />
                                <circle 
                                  cx={pt.x} 
                                  cy={pt.y} 
                                  r="10" 
                                  fill="#00BFFF" 
                                  fillOpacity="0" 
                                  className="hover:fill-opacity-20 transition-all" 
                                />
                                <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
                                  <rect 
                                    x={pt.x - 18} 
                                    y={pt.y - 25} 
                                    width="36" 
                                    height="18" 
                                    rx="4" 
                                    fill="#00BFFF" 
                                  />
                                  <text 
                                    x={pt.x} 
                                    y={pt.y - 13} 
                                    fill="#0A0A0A" 
                                    fontSize="9" 
                                    fontWeight="bold" 
                                    textAnchor="middle"
                                  >
                                    {pt.val}
                                  </text>
                                </g>
                              </g>
                            ))}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Bar Chart: Categories */}
                  <div className="bg-nc-card border border-nc-border rounded-3xl p-6 flex flex-col">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Viewers by Category</h3>
                    {(() => {
                      const categories = analytics.viewerCategories || {};
                      const entries = Object.entries(categories);
                      const maxVal = Math.max(...entries.map(e => e[1]), 1);
                      const chartWidth = 460;
                      const chartHeight = 160;
                      const padding = { top: 20, bottom: 20, left: 15, right: 15 };

                      const barWidth = 36;
                      const spacing = (chartWidth - padding.left - padding.right - (entries.length * barWidth)) / (entries.length - 1 || 1);

                      return (
                        <div className="relative w-full overflow-hidden flex-1 flex flex-col justify-center">
                          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
                            <defs>
                              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#FACC15"/>
                                <stop offset="100%" stopColor="#FACC15" stopOpacity="0.2"/>
                              </linearGradient>
                            </defs>

                            {[0, 0.5, 1].map((ratio, idx) => {
                              const y = padding.top + ratio * (chartHeight - padding.top - padding.bottom);
                              return (
                                <line 
                                  key={idx}
                                  x1={padding.left} 
                                  y1={y} 
                                  x2={chartWidth - padding.right} 
                                  y2={y} 
                                  stroke="rgba(255,255,255,0.03)" 
                                  strokeWidth="1" 
                                />
                              );
                            })}

                            {entries.map(([catName, val], idx) => {
                              const x = padding.left + idx * (barWidth + spacing);
                              const h = (val * (chartHeight - padding.top - padding.bottom)) / maxVal;
                              const y = chartHeight - padding.bottom - h;

                              return (
                                <g key={catName} className="group/bar cursor-pointer">
                                  <rect 
                                    x={x} 
                                    y={y} 
                                    width={barWidth} 
                                    height={h} 
                                    rx="6"
                                    fill="url(#barGradient)" 
                                    className="hover:brightness-110 transition-all"
                                  />
                                  <text 
                                    x={x + barWidth / 2} 
                                    y={y - 6} 
                                    fill="rgba(255,255,255,0.7)" 
                                    fontSize="8" 
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    className="opacity-0 group-hover/bar:opacity-100 transition-opacity font-mono"
                                  >
                                    {val}
                                  </text>
                                  <text 
                                    x={x + barWidth / 2} 
                                    y={chartHeight - 4} 
                                    fill="rgba(255,255,255,0.3)" 
                                    fontSize="8" 
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    className="truncate w-[45px] block font-sans"
                                  >
                                    {catName}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Insights and Tips */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Performing Card */}
                  <div className="bg-nc-card border border-nc-border rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">⭐ Performance Insights</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-xl bg-[#00BFFF]/10 border border-[#00BFFF]/20 flex items-center justify-center text-[#00BFFF] shrink-0 text-sm">👁</div>
                        <div>
                          <p className="text-xs text-nc-muted">Top Search Discovery Term</p>
                          <p className="text-sm font-bold text-white mt-0.5">Your profile appears most for: <span className="text-[#00BFFF]">{analytics.topCategorySearches || 'Actor searches'}</span></p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5">
                        <div className="w-8 h-8 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0 text-sm">📍</div>
                        <div>
                          <p className="text-xs text-nc-muted">Top Viewer Location</p>
                          <p className="text-sm font-bold text-white mt-0.5">Most viewed from: <span className="text-yellow-400">{analytics.topLocation || 'Kathmandu, Nepal'}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tips Card */}
                  <div className="bg-nc-card border border-nc-border rounded-3xl p-6 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">💡 Tips to Grow Views</h3>
                    <div className="space-y-4">
                      {!p.introVideo ? (
                        <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-nc-surface border border-nc-border">
                          <span className="text-lg">🎬</span>
                          <div>
                            <p className="text-xs font-bold text-white">Add a showreel intro video</p>
                            <p className="text-[11px] text-nc-muted mt-0.5">Profiles with introduction videos receive up to 3x more profile views and clicks.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-green-500/5 border border-green-500/10">
                          <span className="text-lg">✅</span>
                          <div>
                            <p className="text-xs font-bold text-green-400">Intro video active</p>
                            <p className="text-[11px] text-green-400/80 mt-0.5">Great job! Your introduction video is helping you stand out on the casting board.</p>
                          </div>
                        </div>
                      )}

                      {p.bio === 'No bio provided yet.' || !p.bio || p.bio.length < 30 ? (
                        <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-nc-surface border border-nc-border">
                          <span className="text-lg">✏️</span>
                          <div>
                            <p className="text-xs font-bold text-white">Expand your bio description</p>
                            <p className="text-[11px] text-nc-muted mt-0.5">Profiles with a complete, rich bio description get 60% more incoming messages from casting directors.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3.5 p-3 rounded-2xl bg-green-500/5 border border-green-500/10">
                          <span className="text-lg">✅</span>
                          <div>
                            <p className="text-xs font-bold text-green-400">Rich bio description active</p>
                            <p className="text-[11px] text-green-400/80 mt-0.5">Nice! Your bio is fully filled out, providing professional detail for casting queries.</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-nc-muted text-center py-20">Unable to load analytics data.</p>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Follow Modal Overlay */}
    {/* Full-screen Follow/Following/Projects Modal */}
    {showFollowModal && (
      <div className="fixed inset-0 z-[100] bg-nc-dark overflow-y-auto flex flex-col animate-in fade-in duration-200">
        <div className="w-full max-w-3xl mx-auto px-6 sm:px-8 py-10 flex-1 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-8 border-b border-white/5 pb-5 shrink-0">
            <h1 className="text-2xl font-black text-white capitalize tracking-tight">{showFollowModal}</h1>
            <button
              onClick={() => setShowFollowModal(null)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
              title="Close"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* List Content */}
          <div className="flex-1">
            {loadingFollowList ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-white/5 rounded-2xl p-5 animate-pulse h-20" />
                ))}
              </div>
            ) : followList.length > 0 ? (
              showFollowModal === 'projects' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {followList.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setShowFollowModal(null);
                        onNavigate('casting-detail', item.id);
                      }}
                      className="flex flex-col justify-between p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 cursor-pointer transition-all hover:scale-[1.01] group"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="text-base font-bold text-white leading-tight group-hover:text-nc-accent transition-colors">{item.title}</h3>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                            item.status === 'Approved' || item.status === 'Open'
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-white/5 text-nc-muted border border-white/10'
                          }`}>{item.status}</span>
                        </div>
                        <p className="text-xs text-nc-muted uppercase tracking-wider">Prod: {item.production}</p>
                      </div>
                      <div className="mt-4 flex items-center gap-1.5 text-xs text-nc-secondary">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {item.location}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {followList.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setShowFollowModal(null);
                        onNavigate('profile', item.id);
                      }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/5 cursor-pointer transition-all hover:scale-[1.01]"
                    >
                      <div className="w-12 h-12 rounded-xl bg-nc-surface border border-nc-border overflow-hidden flex items-center justify-center font-bold text-sm text-nc-accent shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          item.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-white leading-tight truncate">{item.name}</p>
                        <p className="text-xs text-nc-muted uppercase mt-1 tracking-wider">{item.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4 text-[#555]">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-white font-bold text-lg">No items found</p>
                <p className="text-nc-muted text-sm mt-1">There is nothing to display in this list.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Review Modal Overlay */}
    {showReviewModal && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#0A0A0A]/85 backdrop-blur-sm animate-fade-in">
        <GlassCard strong className="w-full max-w-lg border border-nc-border bounce-in p-0 overflow-hidden bg-[#0F0F0F]">
          <div className="flex justify-between items-center p-5 border-b border-nc-border">
            <h3 className="font-bold text-white text-lg">Add Review for {p.name}</h3>
            <button 
              onClick={() => setShowReviewModal(false)} 
              className="text-nc-muted hover:text-white p-2 text-xs uppercase font-bold"
            >
              Close
            </button>
          </div>
          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-2">Rating</label>
              <div className="flex gap-2 text-3xl cursor-pointer">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button 
                    key={star} 
                    type="button"
                    onClick={() => setRatingInput(star)}
                    className={`transition-colors ${star <= ratingInput ? 'text-yellow-500 scale-110' : 'text-white/20 hover:scale-105'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-2">Worked as</label>
              <input 
                type="text"
                value={workedAsInput}
                onChange={(e) => setWorkedAsInput(e.target.value)}
                placeholder="e.g. Actor, Director, Cameraman..."
                className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-nc-secondary mb-2">Review Details</label>
              <textarea 
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience working with this talent..."
                className="w-full bg-nc-surface border border-nc-border rounded-xl px-4 py-3 text-white placeholder-nc-muted outline-none focus:border-nc-accent transition-colors text-sm resize-none"
              />
            </div>
          </div>
          <div className="p-5 border-t border-nc-border flex justify-end gap-3 bg-[#0a0a0a]/50">
            <Button variant="secondary" disabled={isSubmittingReview} onClick={() => setShowReviewModal(false)}>Cancel</Button>
            <button 
              disabled={isSubmittingReview} 
              onClick={handleSubmitReview}
              className="bg-[#00BFFF] hover:opacity-95 text-[#0A0A0A] px-5 py-2.5 rounded-xl text-sm font-bold uppercase transition-all disabled:opacity-50"
            >
              {isSubmittingReview ? 'Posting...' : 'Post Review'}
            </button>
          </div>
        </GlassCard>
      </div>
    )}

    {/* Fullscreen Media Lightbox Overlay */}
    {fullscreenImage && (
      <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-black/95 backdrop-blur-md animate-fade-in p-4">
        <button 
          onClick={() => setFullscreenImage(null)}
          className="absolute top-6 right-6 text-white/50 hover:text-white p-3 rounded-full hover:bg-white/5 transition-all text-xl font-bold"
          title="Close Preview"
          aria-label="Close Preview"
        >
          ✕
        </button>
        <div className="relative max-w-full max-h-[80vh] flex items-center justify-center">
          <img 
            src={fullscreenImage.src} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-white/5 select-none" 
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          />
        </div>
        
        {isOwnProfile && (
          <button
            onClick={() => handleDeleteMedia(fullscreenImage.src)}
            className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-black uppercase tracking-wider text-xs shadow-lg shadow-red-600/30 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Photo
          </button>
        )}
      </div>
    )}

    {showShareSheet && (
      <ShareSheet
        profile={{
          ...p,
          id: targetUid,
        }}
        onClose={() => setShowShareSheet(false)}
      />
    )}
    </>
  );
}
