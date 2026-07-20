import React, { useState, useEffect } from 'react';
import { useProfile } from './hooks/useProfile';
import ProfileHeader from './components/ProfileHeader';
import ProfileAbout from './components/ProfileAbout';
import ProfileMedia from './components/ProfileMedia';
import ProfileReviews from './components/ProfileReviews';
import FollowModal from './components/FollowModal';
import ReviewModal from './components/ReviewModal';
import { doc, getDoc, setDoc, query, collection, where, getDocs, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { updateProfileData, uploadProfileMedia } from '../../services/profile';
import type { Review } from './components/ProfileReviews';

interface ProfilePageProps {
  onNavigate: (page: string, param?: any) => void;
  user: any;
  profileId: string | null;
  isAdmin: boolean;
  showAlert: (message: string, type?: any, detail?: string, action?: any) => void;
}

export default function ProfilePage({
  onNavigate,
  user,
  profileId,
  isAdmin,
  showAlert
}: ProfilePageProps) {
  const {
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
    toggleFollow
  } = useProfile(profileId, user);

  const [activeTab, setActiveTab] = useState('about');
  
  // Reset tab to 'about' when profile changes
  useEffect(() => {
    setActiveTab('about');
  }, [resolvedUid]);

  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | 'projects' | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const handleFollowModalClose = () => {
    setShowFollowModal(null);
    setFollowList([]);
  };

  const handleFollowModalOpen = async (type: 'followers' | 'following' | 'projects') => {
    setShowFollowModal(type);
    setLoadingFollowList(true);
    try {
      if (type === 'projects') {
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
        const fieldName = type === 'followers' ? 'followingId' : 'followerId';
        const queryField = type === 'followers' ? 'followerId' : 'followingId';

        const q = query(collection(db, "follows"), where(fieldName, "==", targetUid));
        const snap = await getDocs(q);
        const userIds = snap.docs.map(docSnap => docSnap.data()[queryField]);

        if (userIds.length === 0) {
          setFollowList([]);
          return;
        }

        const fetchedProfiles = [];
        for (const uid of userIds) {
          const profileSnap = await getDoc(doc(db, "profiles", uid));
          if (profileSnap.exists()) {
            const pData = profileSnap.data();
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
      console.error(err);
    } finally {
      setLoadingFollowList(false);
    }
  };

  const handleFollowToggle = async () => {
    if (!user) {
      onNavigate('signin');
      return;
    }
    const res = await toggleFollow();
    if (res.success) {
      // Send notification if now following
      if (!isFollowing && targetUid) {
        try {
          const notifId = `${user.uid}_${targetUid}_follow`;
          await setDoc(doc(db, "notifications", notifId), {
            userId: targetUid,
            recipientId: targetUid,
            receiverId: targetUid,
            senderId: user.uid,
            notificationType: "follow",
            type: "follow",
            isRead: false,
            read: false,
            createdAt: serverTimestamp(),
            profileUrl: `/profile/${user.uid}`,
            title: "New Follower",
            body: `${user.displayName || 'Someone'} started following you.`,
            senderName: user.displayName || 'Someone',
            senderAvatar: user.photoURL || ''
          }, { merge: true });
        } catch (err) {
          console.warn("Could not dispatch follow notification:", err);
        }
      }
    } else {
      showAlert(res.error || 'Failed to update follow status', 'error');
    }
  };

  const handleReviewSubmit = async (ratingInput: number, reviewText: string, workedAsInput: string) => {
    if (!user || !targetUid) return;

    try {
      const reviewId = `${user.uid}_${targetUid}`;
      const reviewDocRef = doc(db, "reviews", reviewId);

      await setDoc(reviewDocRef, {
        reviewerId: user.uid,
        reviewerName: user.displayName || 'Discovery Talent',
        reviewerPhoto: user.photoURL || '',
        targetUid,
        targetUserId: targetUid,
        rating: ratingInput,
        text: reviewText,
        workedAs: workedAsInput,
        helpfulCount: 0,
        helpfulUsers: [],
        createdAt: serverTimestamp()
      });

      // Recalculate average rating
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

      showAlert('Review submitted successfully!', 'success');
      setShowReviewModal(false);
    } catch (err) {
      console.error(err);
      showAlert('Failed to submit review', 'error');
    }
  };

  const handleHelpfulToggle = async (reviewId: string, event: React.MouseEvent) => {
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
        await updateDoc(reviewRef, {
          helpfulCount: increment(-1),
          helpfulUsers: helpfulUsers.filter((uid: string) => uid !== user.uid)
        });
      } else {
        await updateDoc(reviewRef, {
          helpfulCount: increment(1),
          helpfulUsers: [...helpfulUsers, user.uid]
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadMedia = async (files: FileList) => {
    if (!user) return;
    let uploadedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const url = await uploadProfileMedia(user.uid, file);
        if (url) {
          const currentMedia = Array.isArray(profile?.media) ? profile.media : [];
          await updateProfileData(user.uid, { media: [...currentMedia, url] });
          uploadedCount++;
        }
      } catch (err) {
        console.error(err);
      }
    }

    if (uploadedCount > 0) {
      showAlert(`${uploadedCount} portfolio photos added!`, 'success');
    }
  };

  const handleDeleteMedia = async (src: string) => {
    if (!user || !profile) return;
    try {
      const currentMedia = Array.isArray(profile.media) ? profile.media : [];
      const updatedMedia = currentMedia.filter(item => item !== src);
      await updateProfileData(user.uid, { media: updatedMedia });
      showAlert('Photo removed from portfolio.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadIntroVideo = async (file: File) => {
    if (!user) return;
    try {
      const url = await uploadProfileMedia(user.uid, file);
      if (url) {
        await updateProfileData(user.uid, { introVideo: url });
        showAlert('Showreel video uploaded successfully!', 'success');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to upload video.', 'error');
    }
  };

  const handleDeleteIntroVideo = async () => {
    if (!user) return;
    try {
      await updateProfileData(user.uid, { introVideo: null });
      showAlert('Showreel video removed.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || resolvingUid) {
    return (
      <div className="min-h-screen bg-nc-dark pb-24 text-left">
        {/* Cover image skeleton */}
        <div className="h-[160px] w-full bg-white/[0.02] relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/40 to-transparent" />
        </div>

        {/* Header content skeleton */}
        <div className="max-w-5xl mx-auto px-3.5 sm:px-8 lg:px-12 relative -mt-16 sm:-mt-24 z-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-6 border-b border-white/5">
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
              {/* Avatar circle */}
              <div className="w-32 h-32 rounded-full border-4 border-nc-dark skeleton shrink-0" />
              
              <div className="space-y-2 pb-2">
                {/* Name */}
                <div className="h-6 skeleton w-48 mx-auto sm:mx-0" />
                {/* Role */}
                <div className="h-4 skeleton w-24 mx-auto sm:mx-0" />
                {/* Location */}
                <div className="h-3.5 skeleton w-32 mx-auto sm:mx-0" />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="h-10 skeleton w-28 rounded-xl flex-grow sm:flex-initial" />
              <div className="h-10 skeleton w-28 rounded-xl flex-grow sm:flex-initial" />
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-white/5 w-full">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex flex-col items-center justify-center py-1 space-y-1.5">
                <div className="h-5 skeleton w-12" />
                <div className="h-3 skeleton w-16" />
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 gap-6 mt-8 pb-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-5 skeleton w-20" />
            ))}
          </div>

          {/* Content Block */}
          <div className="mt-8 space-y-6">
            <div className="bg-[#111]/80 border border-white/5 rounded-[2rem] p-4 sm:p-8 space-y-6">
              <div className="h-5 skeleton w-32" />
              <div className="space-y-3">
                <div className="h-3.5 skeleton w-full" />
                <div className="h-3.5 skeleton w-11/12" />
                <div className="h-3.5 skeleton w-4/5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-nc-dark pb-24 flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
        <p className="text-nc-muted text-sm max-w-xs mb-6">
          The profile you are looking for does not exist or has been deleted.
        </p>
        <button 
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-[#00BFFF] text-black font-bold rounded-2xl"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  const showContact = isOwnProfile || isFollowing || profile.showContactInfo === true;
  const hasMediaContent = Boolean(profile.introVideo || (profile.media && profile.media.length > 0));
  const tabs = ['about'];
  if (isOwnProfile || hasMediaContent) {
    tabs.push('media');
  }
  tabs.push('reviews');

  return (
    <div className="min-h-screen bg-nc-dark pb-24">
      <ProfileHeader 
        profile={profile}
        isOwnProfile={isOwnProfile}
        isFollowing={isFollowing}
        followerCount={followerCount}
        followingCount={followingCount}
        savedCount={savedCount}
        onFollowToggle={handleFollowToggle}
        onNavigate={onNavigate}
        showAlert={showAlert}
        onFollowClick={handleFollowModalOpen}
      />

      {/* Tabs */}
      <div className="max-w-5xl mx-auto px-3.5 sm:px-8 lg:px-12 mt-8">
        <div className="flex border-b border-white/5 gap-6 mb-8 overflow-x-auto scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-bold uppercase tracking-wider transition-colors relative whitespace-nowrap ${
                activeTab === tab ? 'text-[#00BFFF]' : 'text-nc-muted hover:text-white'
              }`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 inset-x-0 h-0.5 bg-[#00BFFF] rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Panel */}
        <div className="animate-fade-in">
          {activeTab === 'about' && (
            <ProfileAbout profile={profile} showContact={showContact} />
          )}
          {(isOwnProfile || hasMediaContent) && activeTab === 'media' && (
            <ProfileMedia 
              profile={profile}
              isOwnProfile={isOwnProfile}
              onUploadMedia={handleUploadMedia}
              onDeleteMedia={handleDeleteMedia}
              onUploadIntroVideo={handleUploadIntroVideo}
              onDeleteIntroVideo={handleDeleteIntroVideo}
            />
          )}
          {activeTab === 'reviews' && (
            <ProfileReviews 
              reviews={reviewsList}
              loading={loadingReviews}
              isOwnProfile={isOwnProfile}
              hasWorkedTogether={hasWorkedTogether}
              onWriteReviewClick={() => {
                if (!user) {
                  onNavigate('signin');
                } else {
                  setShowReviewModal(true);
                }
              }}
              onHelpfulToggle={handleHelpfulToggle}
              currentUserId={user?.uid}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      <FollowModal 
        type={showFollowModal || 'followers'}
        isOpen={!!showFollowModal}
        onClose={handleFollowModalClose}
        list={followList}
        loading={loadingFollowList}
        onNavigate={onNavigate}
      />

      <ReviewModal 
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onSubmit={handleReviewSubmit}
      />
    </div>
  );
}
