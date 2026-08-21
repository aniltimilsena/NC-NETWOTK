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
import {
  Pencil,
  Plus,
  Ruler,
  ShoppingBag,
  Phone,
  Mail,
  MapPin,
  Eye,
  UserCheck,
  CreditCard,
  Briefcase,
  Play,
} from 'lucide-react';

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
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const isRealOwn =
    isOwnProfile ||
    Boolean(CurrentUser.id && (profile?.uid === CurrentUser.id || (profile as any)?.id === CurrentUser.id));

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
        <div className="w-24 h-24 rounded-full border-2 border-white/10 skeleton mb-4" />
        <div className="h-6 w-48 skeleton rounded-lg mb-2" />
        <div className="h-4 w-32 skeleton rounded-md mb-4" />
        <div className="h-24 w-full max-w-md skeleton rounded-2xl" />
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

  const bio = profile.bio || '';
  const height = profile.height || (profile as any)?.heightInCm ? `${(profile as any).heightInCm} cm` : null;
  const weight = profile.weight || (profile as any)?.weightInKg ? `${(profile as any).weightInKg} kg` : null;
  const contactPhone = profile.phone || (profile as any)?.phoneNumber || null;
  const contactEmail = profile.email || (profile as any)?.contactEmail || null;
  const locationName = (profile.location || (profile as any)?.city || (profile as any)?.district || 'Kathmandu, Nepal').trim();

  const rawSkills: any = profile.skills;
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills.map((s) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean)
    : typeof rawSkills === 'string' && rawSkills.trim() !== ''
    ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const rawMedia: unknown = profile?.media;
  const mediaList: string[] = Array.isArray(rawMedia)
    ? rawMedia.map(String).filter((s) => s && s.trim() !== '')
    : [];

  const experiencesList = Array.isArray(profile?.experience) ? profile.experience : [];

  return (
    <div className="min-h-screen bg-[#06080C] pb-16 text-white font-sans">
      <SEO
        title={`${profile.name || 'Talent'} | NepalCasts Profile`}
        description={profile.bio || `View ${profile.name || 'this talent'}'s portfolio, auditions, and experience on NepalCasts.`}
        image={profile.image || undefined}
        noindex={(profile as any).isPrivate === true}
      />

      {/* Full Screen Unified Profile Container */}
      <div className="w-full max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* 1. Header (Centered Avatar, 3 Meta Pills, Followers Count Box) */}
        <ProfileHeader
          profile={profile}
          isOwnProfile={isRealOwn}
          isFollowing={isFollowing}
          followerCount={followerCount}
          followingCount={followingCount}
          savedCount={savedCount}
          onFollowToggle={handleFollowToggle}
          onNavigate={onNavigate}
          showAlert={showAlert}
          onFollowClick={handleFollowModalOpen}
        />

        {/* 2. About Section */}
        <section className="text-left space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              About
            </h3>
            {isRealOwn && (
              <button
                onClick={() => onNavigate('/settings/profile')}
                className="text-[#0088CC] hover:text-[#38c9ff] transition-colors p-1 cursor-pointer"
                title="Edit About"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-line">
            {bio ? bio : (
              <span className="text-gray-500 italic">Add a short bio about yourself...</span>
            )}
          </p>

          {/* Attributes Box */}
          <div className="bg-[#0D121D] border border-[#172033] rounded-2xl p-3 divide-y divide-[#172033] shadow-sm mt-2">
            {/* Height Row */}
            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-300">
                <span className="font-mono font-bold text-[#0088CC]">II</span>
                <span className="font-semibold text-white">Height</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={height ? 'text-gray-300 font-medium' : 'text-gray-500'}>
                  {height ? height : 'Not added'}
                </span>
                {isRealOwn && (
                  <button
                    onClick={() => onNavigate('/settings/profile')}
                    className="text-[#0088CC] hover:text-[#38c9ff] cursor-pointer"
                  >
                    {height ? <Pencil className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Weight Row */}
            <div className="py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-300">
                <ShoppingBag className="w-3.5 h-3.5 text-[#0088CC]" />
                <span className="font-semibold text-white">Weight</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={weight ? 'text-gray-300 font-medium' : 'text-gray-500'}>
                  {weight ? weight : 'Not added'}
                </span>
                {isRealOwn && (
                  <button
                    onClick={() => onNavigate('/settings/profile')}
                    className="text-[#0088CC] hover:text-[#38c9ff] cursor-pointer"
                  >
                    {weight ? <Pencil className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>

            {/* Contacts Row */}
            <div className="py-2.5 flex items-start justify-between text-xs">
              <div className="flex items-center gap-2.5 text-gray-300 pt-0.5">
                <Phone className="w-3.5 h-3.5 text-[#0088CC]" />
                <span className="font-semibold text-white">Contacts</span>
              </div>
              <div className="flex items-start gap-2 text-right">
                {contactPhone || contactEmail ? (
                  <div className="space-y-0.5 text-gray-300 font-medium text-[11px]">
                    {contactPhone && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Phone className="w-2.5 h-2.5 text-gray-500" />
                        <span>{contactPhone}</span>
                      </div>
                    )}
                    {contactEmail && (
                      <div className="flex items-center justify-end gap-1.5">
                        <Mail className="w-2.5 h-2.5 text-gray-500" />
                        <span>{contactEmail}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-500">Not added</span>
                )}
                {isRealOwn && (
                  <button
                    onClick={() => onNavigate('/settings/profile')}
                    className="text-[#0088CC] hover:text-[#38c9ff] cursor-pointer pt-0.5"
                  >
                    {contactPhone || contactEmail ? <Pencil className="w-3 h-3" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Media Section */}
        <section className="text-left space-y-1.5 pt-1">
          <ProfileMedia
            profile={profile}
            isOwnProfile={isRealOwn}
            onUploadMedia={handleUploadMedia}
            onDeleteMedia={handleDeleteMedia}
            onUploadIntroVideo={handleUploadIntroVideo}
            onDeleteIntroVideo={handleDeleteIntroVideo}
          />
        </section>

        {/* 4. Experience Section */}
        <section className="text-left space-y-1.5 pt-1">
          <ProfileExperience
            profile={profile}
            isOwnProfile={isRealOwn}
            showAlert={showAlert}
          />
        </section>

        {/* 5. Skills Section */}
        <section className="text-left space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              Skills
            </h3>
            {isRealOwn && (
              <button
                onClick={() => onNavigate('/settings/profile')}
                className="text-xs font-semibold text-[#0088CC] hover:text-[#38c9ff] transition-colors cursor-pointer"
              >
                {skillsList.length > 0 ? 'Edit' : '+ Add Skills'}
              </button>
            )}
          </div>

          {skillsList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {skillsList.map((skill, index) => (
                <span
                  key={index}
                  className="bg-[#0088CC] text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <div
              onClick={() => isRealOwn && onNavigate('/settings/profile')}
              className="border border-dashed border-[#172033] bg-[#0D121D] rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#0088CC]/50 transition-colors group"
            >
              <Plus className="w-4 h-4 text-gray-400 group-hover:text-[#0088CC] mb-1" />
              <span className="text-xs font-semibold text-gray-400 group-hover:text-white">
                Add Skills
              </span>
              <p className="text-[10px] text-gray-500 mt-0.5">Add skills you are good at...</p>
            </div>
          )}
        </section>



        {/* 7. Bottom Action Bar */}
        <section className="pt-3">
          {isRealOwn && !isPreviewMode ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => onNavigate('/settings/profile')}
                className="flex-1 py-3 px-5 rounded-2xl bg-[#0088CC] hover:bg-[#0077B3] text-white font-bold text-xs sm:text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#0088CC]/30"
              >
                <Pencil className="w-4 h-4" />
                <span>Update Profile</span>
              </button>
              <button
                onClick={() => {
                  setIsPreviewMode(true);
                  showAlert('Preview Mode', 'info', 'Viewing your profile as seen by casting directors.');
                }}
                className="flex-1 py-3 px-5 rounded-2xl bg-[#121824] hover:bg-[#1A2234] border border-[#1E293B] text-white font-bold text-xs sm:text-sm transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                <Eye className="w-4 h-4" />
                <span>Preview Profile</span>
              </button>
            </div>
          ) : (
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
                className="flex-1 py-3.5 px-6 rounded-2xl bg-[#0088CC] hover:bg-[#0077B3] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-lg shadow-[#0088CC]/30"
              >
                Contact
              </button>
              <button
                onClick={() => onNavigate('messages', profile.uid || (profile as any).id)}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-[#121824] hover:bg-[#1A2234] border border-[#1E293B] text-white font-bold text-sm transition-all active:scale-98 cursor-pointer shadow-md"
              >
                Message
              </button>
            </div>
          )}
        </section>
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
