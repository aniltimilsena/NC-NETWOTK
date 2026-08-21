import React, { useState, useEffect } from 'react';
import { useProfile } from './hooks/useProfile';
import SEO from '../../components/SEO';
import ProfileHeader from './components/ProfileHeader';
import ProfileMedia from './components/ProfileMedia';
import ProfileExperience from './components/ProfileExperience';
import FollowModal from './components/FollowModal';
import { doc, setDoc, query, collection, where, getDocs, serverTimestamp, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { updateProfileData, uploadProfileMedia } from '../../services';

interface ProfilePageProps {
  onNavigate: (page: string, param?: any) => void;
  user: any;
  profileId: string | null;
  isAdmin: boolean;
  showAlert: (message: string, type?: any, detail?: string, action?: any) => void;
  initialTab?: string;
}

export default function ProfilePage({
  onNavigate,
  user,
  profileId,
  isAdmin,
  showAlert,
  initialTab,
}: ProfilePageProps) {
  const {
    profile,
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
    toggleFollow,
  } = useProfile(profileId, user);

  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | 'projects' | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  const handleFollowModalClose = () => {
    setShowFollowModal(null);
    setFollowList([]);
  };

  const handleFollowModalOpen = async (type: 'followers' | 'following' | 'projects') => {
    setShowFollowModal(type);
    setLoadingFollowList(true);
    try {
      if (type === 'projects') {
        const q = query(collection(db, 'casting_calls'), where('createdBy', '==', targetUid));
        const snap = await getDocs(q);
        const list = snap.docs.map((docSnap) => {
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
        const q = query(collection(db, 'follows'), where(fieldName, '==', targetUid));
        const snap = await getDocs(q);
        const userIds = snap.docs
          .map((docSnap: any) => docSnap.data()[queryField])
          .filter((id: string) => id && id !== targetUid);
        if (userIds.length === 0) {
          setFollowList([]);
          return;
        }
        const chunks = [];
        for (let i = 0; i < userIds.length; i += 30) {
          chunks.push(userIds.slice(i, i + 30));
        }
        const profileMap = new Map<string, any>();
        await Promise.all(
          chunks.map(async (chunk) => {
            try {
              const qSnap = query(collection(db, 'profiles'), where(documentId(), 'in', chunk));
              const snapInner = await getDocs(qSnap);
              snapInner.docs.forEach((docSnap) => {
                profileMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
              });
            } catch (e) {
              console.warn('Chunk query error:', e);
            }
          })
        );
        const result = userIds.map((id) => profileMap.get(id)).filter(Boolean);
        setFollowList(result);
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
      if (!isFollowing && targetUid) {
        try {
          const notifId = `${user.uid}_${targetUid}_follow`;
          await setDoc(
            doc(db, 'notifications', notifId),
            {
              userId: targetUid,
              recipientId: targetUid,
              receiverId: targetUid,
              senderId: user.uid,
              notificationType: 'follow',
              type: 'follow',
              isRead: false,
              read: false,
              createdAt: serverTimestamp(),
              profileUrl: `/profile/${user.uid}`,
              title: 'New Follower',
              body: `${user.displayName || 'Someone'} started following you.`,
              senderName: user.displayName || 'Someone',
              senderAvatar: user.photoURL || '',
            },
            { merge: true }
          );
        } catch (err) {
          console.warn('Could not dispatch follow notification:', err);
        }
      }
    } else {
      showAlert(res.error || 'Failed to update follow status', 'error');
    }
  };

  const handleUploadMedia = async (files: FileList) => {
    const activeUid = CurrentUser.id || user?.uid || profile?.uid;
    if (!activeUid) return;
    const newUrls: string[] = [];
    let failedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const url = await uploadProfileMedia(activeUid, file);
        if (url) {
          newUrls.push(url);
        } else {
          failedCount++;
        }
      } catch (err) {
        console.error('Photo upload error:', err);
        failedCount++;
      }
    }
    if (newUrls.length > 0) {
      const currentMedia = Array.isArray(profile?.media) ? profile.media : [];
      const updatedMedia = [...currentMedia, ...newUrls];
      setProfile((prev: any) => (prev ? { ...prev, media: updatedMedia } : prev));
      await updateProfileData(activeUid, { media: updatedMedia });
    } else if (failedCount > 0) {
      showAlert('Upload Failed', 'error', 'Failed to upload photo(s). Please check your file size or network connection.');
    }
  };

  const handleDeleteMedia = async (src: string) => {
    const activeUid = CurrentUser.id || user?.uid || profile?.uid;
    if (!activeUid || !profile) return;
    try {
      const currentMedia = Array.isArray(profile.media) ? profile.media : [];
      const updatedMedia = currentMedia.filter((item) => item !== src);
      setProfile((prev: any) => (prev ? { ...prev, media: updatedMedia } : prev));
      await updateProfileData(activeUid, { media: updatedMedia });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadIntroVideo = async (file: File) => {
    const activeUid = CurrentUser.id || user?.uid || profile?.uid;
    if (!activeUid) return;
    try {
      const url = await uploadProfileMedia(activeUid, file);
      if (url) {
        setProfile((prev: any) =>
          prev
            ? {
                ...prev,
                introVideo: url,
                introVideoUrl: url,
                showreel: url,
                showreelUrl: url,
              }
            : prev
        );
        await updateProfileData(activeUid, {
          introVideo: url,
          introVideoUrl: url,
          showreel: url,
          showreelUrl: url,
        });
      } else {
        showAlert('Upload Failed', 'error', 'Failed to upload intro video.');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      showAlert('Failed to upload video.', 'error');
    }
  };

  const handleDeleteIntroVideo = async () => {
    const activeUid = CurrentUser.id || user?.uid || profile?.uid;
    if (!activeUid) return;
    try {
      setProfile((prev: any) =>
        prev
          ? {
              ...prev,
              introVideo: null,
              introVideoUrl: null,
              showreel: null,
              showreelUrl: null,
            }
          : prev
      );
      await updateProfileData(activeUid, {
        introVideo: null,
        introVideoUrl: null,
        showreel: null,
        showreelUrl: null,
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading || resolvingUid) {
    return (
      <div className="min-h-screen bg-[#06080C] pb-6 text-left animate-pulse flex flex-col items-center justify-center p-6">
        <div className="w-28 h-28 rounded-full border-2 border-white/10 skeleton mb-4" />
        <div className="h-6 w-48 skeleton rounded-lg mb-2" />
        <div className="h-4 w-32 skeleton rounded-md mb-4" />
        <div className="h-24 w-full max-w-lg skeleton rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#06080C] pb-6 flex flex-col items-center justify-center text-center p-6 text-white">
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-6">
          The profile you are looking for does not exist or has been deleted.
        </p>
        <button onClick={() => onNavigate('home')} className="px-6 py-2.5 bg-[#0088CC] text-white font-bold rounded-xl cursor-pointer">
          Go Back Home
        </button>
      </div>
    );
  }

  const contactEmail = profile?.email || (profile as any)?.contactEmail || null;
  const contactPhone = profile?.phone || (profile as any)?.phoneNumber || null;

  return (
    <div className="min-h-screen bg-[#06080C] pb-16 text-white font-sans">
      <SEO
        title={`${profile.name || 'Talent'} | NepalCasts Profile`}
        description={profile.bio || `View ${profile.name || 'this talent'}'s portfolio, auditions, and experience on NepalCasts.`}
        image={profile.image || undefined}
        noindex={(profile as any).isPrivate === true}
      />

      {/* Unified Profile Page Container */}
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* 1. Header (Centered Avatar, Name, Role, Pills & Actions) */}
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

        {/* 2. Main Profile Sections (About, Media, Experience) */}
        <div className="space-y-6 mt-4">
          {/* About Section */}
          <section className="text-left space-y-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              About
            </h2>
            {profile.bio ? (
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {profile.bio}
              </p>
            ) : (
              <p className="text-xs text-gray-500 italic">
                {isOwnProfile
                  ? 'Add a bio in Edit Profile to introduce yourself to casting directors.'
                  : 'No bio provided yet.'}
              </p>
            )}
          </section>

          {/* Media Section */}
          <section className="text-left">
            <ProfileMedia
              profile={profile}
              isOwnProfile={isOwnProfile}
              onUploadMedia={handleUploadMedia}
              onDeleteMedia={handleDeleteMedia}
              onUploadIntroVideo={handleUploadIntroVideo}
              onDeleteIntroVideo={handleDeleteIntroVideo}
            />
          </section>

          {/* Experience Section */}
          <section className="text-left">
            <ProfileExperience
              profile={profile}
              isOwnProfile={isOwnProfile}
              showAlert={showAlert}
            />
          </section>

          {/* 3. Bottom Action Section (Contact & Message) */}
          <section className="pt-2">
            {!isOwnProfile ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (contactPhone || contactEmail) {
                      setShowContactModal(true);
                    } else {
                      showAlert('Contact Direct', 'info', `${profile.name || 'Talent'} has not shared direct phone/email. Please send a message!`);
                      onNavigate('messages', profile.uid || (profile as any).id);
                    }
                  }}
                  className="flex-1 py-3 px-6 rounded-2xl bg-[#0088CC] hover:bg-[#0077B3] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-lg shadow-[#0088CC]/30"
                >
                  Contact
                </button>
                <button
                  onClick={() => onNavigate('messages', profile.uid || (profile as any).id)}
                  className="flex-1 py-3 px-6 rounded-2xl bg-[#121824] hover:bg-[#1A2234] border border-[#1E293B] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-md"
                >
                  Message
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onNavigate('/settings/profile')}
                  className="flex-1 py-3 px-6 rounded-2xl bg-[#0088CC] hover:bg-[#0077B3] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-lg shadow-[#0088CC]/30"
                >
                  Edit Profile
                </button>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: profile.name || 'Talent',
                        url: window.location.href,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      showAlert('Link Copied', 'info', 'Profile link copied to clipboard.');
                    }
                  }}
                  className="flex-1 py-3 px-6 rounded-2xl bg-[#121824] hover:bg-[#1A2234] border border-[#1E293B] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-md"
                >
                  Share Profile
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Contact Info Modal */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-[#0A0D14] border border-[#1E2638] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Contact {profile.name || 'Talent'}
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              {contactEmail && (
                <div className="p-3 bg-[#111622] rounded-xl border border-[#1E2638] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 uppercase font-mono block">Email</span>
                    <span className="text-xs text-white font-medium truncate block">{contactEmail}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(contactEmail);
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0088CC] text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {copiedEmail ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}

              {contactPhone && (
                <div className="p-3 bg-[#111622] rounded-xl border border-[#1E2638] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] text-gray-400 uppercase font-mono block">Phone</span>
                    <span className="text-xs text-white font-medium truncate block">{contactPhone}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(contactPhone);
                      setCopiedPhone(true);
                      setTimeout(() => setCopiedPhone(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#0088CC] text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    {copiedPhone ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setShowContactModal(false);
                  onNavigate('messages', profile.uid || (profile as any).id);
                }}
                className="w-full py-2.5 rounded-xl bg-[#121824] hover:bg-[#1A2234] border border-[#1E293B] text-white text-xs font-bold transition-all text-center cursor-pointer"
              >
                Send Direct Message &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      <FollowModal
        type={showFollowModal || 'followers'}
        isOpen={!!showFollowModal}
        onClose={handleFollowModalClose}
        list={followList}
        loading={loadingFollowList}
        onNavigate={onNavigate}
      />
    </div>
  );
}
