import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from './hooks/useProfile';
import SEO from '../../components/SEO';
import ProfileHeader from './components/ProfileHeader';
import ProfileExperience from './components/ProfileExperience';
import FollowModal from './components/FollowModal';
import ShareSheet from '../../components/ui/ShareSheet';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { doc, setDoc, deleteDoc, query, collection, where, getDocs, serverTimestamp, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { AuthService } from '../../services/AuthService';
import { updateProfileData, uploadProfileMedia } from '../../services';
import { getOptimizedImageUrl } from '../../utils/media';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Pencil,
  Plus,
  Ruler,
  Phone,
  Mail,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Camera,
} from 'lucide-react';
import type { UserProfile } from '../../types';

interface ProfilePageProps {
  onNavigate: (page: string, param?: any) => void;
  user: any;
  profileId: string | null;
  isAdmin: boolean;
  showAlert: (message: string, type?: any, detail?: string, action?: any) => void;
  initialTab?: string;
}

const PRESET_SKILLS = [
  'Acting',
  'Voice Over',
  'Dance',
  'Modeling',
  'Body Language',
  'Improvisation',
  'Script Reading',
  'Theater',
  'Singing',
  'Stunt',
  'Hosting',
  'Fight Choreography',
  'Directing',
  'Screenwriting',
];

export default function ProfilePage({
  onNavigate,
  user,
  profileId,
  isAdmin,
  showAlert,
  initialTab = 'grid',
}: ProfilePageProps) {
  const {
    profile,
    setProfile,
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

  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  // Direct Interactive Modals
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [editingSkills, setEditingSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  const [showAboutModal, setShowAboutModal] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);

  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSavingAttributes, setIsSavingAttributes] = useState(false);

  // Media / Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isReelPlaying, setIsReelPlaying] = useState(true);
  const [isReelMuted, setIsReelMuted] = useState(false);
  const [reelProgress, setReelProgress] = useState(0);
  const reelVideoRef = useRef<HTMLVideoElement>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [deletePhotoTarget, setDeletePhotoTarget] = useState<{ index: number; url: string } | null>(null);
  const [deleteVideoConfirmOpen, setDeleteVideoConfirmOpen] = useState(false);

  const loggedInUserId = CurrentUser.id || AuthService.getUserId() || user?.uid || user?.id;
  const targetProfileId = profile?.uid || (profile as any)?.id;

  const isRealOwn =
    isOwnProfile ||
    Boolean(loggedInUserId && targetProfileId && loggedInUserId === targetProfileId);

  const activeUserId = isRealOwn ? (targetProfileId || loggedInUserId) : null;

  const rawMedia: unknown = profile?.media;
  const media: string[] = Array.isArray(rawMedia)
    ? rawMedia.map(String).filter((s) => s && s.trim() !== '')
    : [];

  const introVideo = profile?.introVideo || (profile as any)?.introVideoUrl || (profile as any)?.showreel || null;
  const postsCount = media.length + (introVideo ? 1 : 0);

  const handleCloseVideoModal = () => {
    if (reelVideoRef.current) {
      reelVideoRef.current.pause();
    }
    setShowVideoModal(false);
    setIsReelPlaying(true);
    setReelProgress(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIndex !== null) setLightboxIndex(null);
        if (showVideoModal) handleCloseVideoModal();
      } else if (lightboxIndex !== null && media.length > 1) {
        if (e.key === 'ArrowLeft') {
          setLightboxIndex((prev) => (prev !== null ? (prev - 1 + media.length) % media.length : null));
        } else if (e.key === 'ArrowRight') {
          setLightboxIndex((prev) => (prev !== null ? (prev + 1) % media.length : null));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, showVideoModal, media.length]);

  const handleFollowModalClose = () => {
    setShowFollowModal(null);
    setFollowList([]);
  };

  const handleFollowModalOpen = async (type: 'followers' | 'following') => {
    setShowFollowModal(type);
    setLoadingFollowList(true);
    try {
      const subcollectionName = type === 'followers' ? 'followers' : 'following';
      const qSnap = await getDocs(collection(db, 'profiles', targetUid, subcollectionName));
      const userIds = qSnap.docs.map((d) => d.id).filter(Boolean);

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
            const q = query(collection(db, 'profiles'), where(documentId(), 'in', chunk));
            const snapInner = await getDocs(q);
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
    const notifId = `${user.uid}_${targetUid}_follow`;
    const res = await toggleFollow();
    if (res.success) {
      if (!isFollowing && targetUid) {
        try {
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
              targetUrl: `/profile/${user.uid}`,
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
      } else if (isFollowing && targetUid) {
        try {
          await deleteDoc(doc(db, 'notifications', notifId));
        } catch (err) {
          console.warn('Could not remove follow notification:', err);
        }
      }
    } else {
      showAlert(res.error || 'Failed to update follow status', 'error');
    }
  };

  // Upload Media (Enforced Limit: Max 2 Photos Only, 1 Video Reel, 1 Profile Photo)
  const MAX_PORTFOLIO_PHOTOS = 2;

  const handleUploadMedia = async (files: FileList) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;

    const currentMedia = Array.isArray(profile?.media) ? profile.media : [];
    const remainingSlots = MAX_PORTFOLIO_PHOTOS - currentMedia.length;

    if (remainingSlots <= 0) {
      showAlert(
        'Photo Limit Reached',
        'warning',
        'You can only upload up to 2 portfolio photos. Please delete an existing photo to upload a new one.'
      );
      return;
    }

    const filesArray = Array.from(files);
    const filesToUpload = filesArray.slice(0, remainingSlots);

    if (filesArray.length > remainingSlots) {
      showAlert(
        'Photo Limit (Max 2)',
        'info',
        `You can only have up to 2 portfolio photos. Uploading ${remainingSlots} of ${filesArray.length} selected.`
      );
    }

    setIsUploadingPhotos(true);
    const newUrls: string[] = [];
    let failedCount = 0;
    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      try {
        const url = await uploadProfileMedia(uidToUse, file);
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
      const updated = [...currentMedia, ...newUrls].slice(0, MAX_PORTFOLIO_PHOTOS);
      setProfile((prev: any) => (prev ? { ...prev, media: updated } : prev));
      await updateProfileData(uidToUse, { media: updated });
      showAlert(`Uploaded ${newUrls.length} photo${newUrls.length > 1 ? 's' : ''} (${updated.length}/2 photos)`, 'success');
    }
    if (failedCount > 0) {
      showAlert(`Failed to upload ${failedCount} file(s).`, 'error');
    }
    setIsUploadingPhotos(false);
  };

  const handleDeleteMedia = async (src: string) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    try {
      const currentMedia = Array.isArray(profile?.media) ? profile.media : [];
      const updated = currentMedia.filter((url: string) => url !== src);
      setProfile((prev: any) => (prev ? { ...prev, media: updated } : prev));
      await updateProfileData(uidToUse, { media: updated });
      showAlert('Photo Removed', 'info');
      if (lightboxIndex !== null) setLightboxIndex(null);
    } catch (err) {
      console.error('Delete media error:', err);
      showAlert('Failed to remove photo.', 'error');
    }
  };

  const handleUploadIntroVideo = async (file: File) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    setIsUploadingVideo(true);
    try {
      const url = await uploadProfileMedia(uidToUse, file);
      if (url) {
        setProfile((prev: any) =>
          prev ? { ...prev, introVideo: url, introVideoUrl: url } : prev
        );
        await updateProfileData(uidToUse, {
          introVideo: url,
          introVideoUrl: url,
        });
        showAlert('Video Uploaded', 'success');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      showAlert('Failed to upload video.', 'error');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  const handleDeleteIntroVideo = async () => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
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
      await updateProfileData(uidToUse, {
        introVideo: null,
        introVideoUrl: null,
        showreel: null,
        showreelUrl: null,
      });
      showAlert('Video Removed', 'info');
      setShowVideoModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Direct Save Skills
  const handleSaveSkills = async () => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    setIsSavingSkills(true);
    try {
      setProfile((prev: any) => (prev ? { ...prev, skills: editingSkills } : prev));
      await updateProfileData(uidToUse, { skills: editingSkills });
      showAlert('Skills Updated', 'success');
      setShowSkillsModal(false);
    } catch (err: any) {
      showAlert('Failed to update skills', 'error', err.message);
    } finally {
      setIsSavingSkills(false);
    }
  };

  const toggleSkillTag = (skill: string) => {
    setEditingSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const addCustomSkill = () => {
    const trimmed = customSkillInput.trim();
    if (trimmed && !editingSkills.includes(trimmed)) {
      setEditingSkills((prev) => [...prev, trimmed]);
      setCustomSkillInput('');
    }
  };

  // Direct Save Bio
  const handleSaveBio = async () => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    setIsSavingBio(true);
    try {
      setProfile((prev: any) => (prev ? { ...prev, bio: bioInput } : prev));
      await updateProfileData(uidToUse, { bio: bioInput });
      showAlert('Bio Updated', 'success');
      setShowAboutModal(false);
    } catch (err: any) {
      showAlert('Failed to update bio', 'error', err.message);
    } finally {
      setIsSavingBio(false);
    }
  };

  // Direct Save Attributes
  const handleSaveAttributes = async () => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    setIsSavingAttributes(true);
    try {
      const updatePayload: Record<string, any> = {};
      if (heightInput !== undefined) updatePayload.height = heightInput;
      if (weightInput !== undefined) updatePayload.weight = weightInput;
      if (phoneInput !== undefined) updatePayload.phone = phoneInput;
      if (emailInput !== undefined) updatePayload.email = emailInput;

      setProfile((prev: any) => (prev ? { ...prev, ...updatePayload } : prev));
      await updateProfileData(uidToUse, updatePayload);
      showAlert('Profile Info Updated', 'success');
      setShowAttributesModal(false);
    } catch (err: any) {
      showAlert('Failed to update info', 'error', err.message);
    } finally {
      setIsSavingAttributes(false);
    }
  };

  // Lightbox keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowLeft' && media.length > 0) {
        setLightboxIndex((lightboxIndex - 1 + media.length) % media.length);
      }
      if (e.key === 'ArrowRight' && media.length > 0) {
        setLightboxIndex((lightboxIndex + 1) % media.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, media.length]);

  if (loading || resolvingUid) {
    return (
      <div className="min-h-screen bg-black pb-6 text-left animate-pulse flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full border-2 border-white/10 skeleton mb-4" />
        <div className="h-5 w-36 skeleton rounded-lg mb-2" />
        <div className="h-3 w-28 skeleton rounded-md mb-4" />
        <div className="h-24 w-full max-w-md skeleton rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-black pb-6 flex flex-col items-center justify-center text-center p-6 text-white">
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-6">
          The profile you are looking for does not exist or has been deleted.
        </p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-[#522C69] hover:bg-[#663782] text-white font-bold rounded-xl cursor-pointer"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  const bio = profile.bio || '';
  const height = profile.height || (profile as any)?.heightInCm;
  const weight = profile.weight || (profile as any)?.weightInKg;
  const contactPhone = profile.phone || (profile as any)?.phoneNumber || null;
  const contactEmail = profile.email || (profile as any)?.contactEmail || null;

  const rawSkills: any = profile.skills;
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills.map((s) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean)
    : typeof rawSkills === 'string' && rawSkills.trim() !== ''
    ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-black text-white font-sans pb-16">
      <SEO
        title={`${profile.name || 'Talent'} | NepalCasts`}
        description={profile.bio || `View ${profile.name || 'this talent'}'s portfolio and casting profile on NepalCasts.`}
        image={profile.image || undefined}
        noindex={(profile as any).isPrivate === true}
      />

      {/* Hidden File Upload Inputs */}
      <input
        type="file"
        id="profile-direct-photo-upload"
        multiple={media.length < 1}
        accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadMedia(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        type="file"
        id="profile-direct-video-upload"
        accept="video/*,.mp4,.mov,.webm"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleUploadIntroVideo(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Main Instagram Profile Container */}
      <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto px-0 sm:px-2 md:px-4 py-0 md:py-4">
        {/* 1. Header (Avatar Left + 3 Stats Right + Bio + Action Buttons) */}
        <ProfileHeader
          profile={profile}
          isOwnProfile={isRealOwn}
          isFollowing={isFollowing}
          followerCount={followerCount}
          followingCount={followingCount}
          savedCount={savedCount}
          postsCount={postsCount}
          onFollowToggle={handleFollowToggle}
          onNavigate={onNavigate}
          showAlert={showAlert}
          onFollowClick={handleFollowModalOpen}
          hideTopNav={false}
          bio={bio}
          onEditBio={() => {
            setBioInput(profile.bio || '');
            setShowAboutModal(true);
          }}
          isAdmin={isAdmin}
          onOpenCall={() => onNavigate('call', profile.uid || (profile as any)?.id)}
        />

        {/* 3-Column Square Media Grid */}
        <div className="w-full mt-3 md:mt-6">
            <div>
              {/* Media Upload Banner for Owner (Limit: 1 Profile Photo, 1 Video Reel, 2 Portfolio Photos) */}
              {isRealOwn && (
                <div className="px-3 py-2 md:px-4 md:py-3 flex items-center justify-between bg-[#111111] border-b border-white/[0.06] md:rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs md:text-sm text-neutral-400">
                      {postsCount} {postsCount === 1 ? 'post' : 'posts'}
                    </span>
                    <span className="text-[11px] md:text-xs text-neutral-500 font-medium">
                      ({media.length}/2 photos • {introVideo ? '1/1 reel' : '0/1 reel'})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (media.length >= 2) {
                          showAlert(
                            'Limit Reached',
                            'warning',
                            'You can only upload up to 2 portfolio photos. Delete an existing photo to upload a new one.'
                          );
                          return;
                        }
                        document.getElementById('profile-direct-photo-upload')?.click();
                      }}
                      disabled={isUploadingPhotos || media.length >= 2}
                      title={media.length >= 2 ? 'Maximum 2 photos reached' : 'Add portfolio photo (limit 2)'}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded text-xs font-medium transition-colors ${
                        media.length >= 2
                          ? 'bg-white/5 text-neutral-500 cursor-not-allowed border border-white/5'
                          : 'bg-[#262626] hover:bg-[#333333] text-white cursor-pointer'
                      }`}
                    >
                      {isUploadingPhotos ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{media.length >= 2 ? 'Photos Full (2/2)' : `Add Photo (${media.length}/2)`}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => document.getElementById('profile-direct-video-upload')?.click()}
                      disabled={isUploadingVideo}
                      title="Upload 1 video reel"
                      className="inline-flex items-center gap-1 px-2.5 py-1 md:px-3 md:py-1.5 rounded bg-[#262626] hover:bg-[#333333] text-white text-xs font-medium cursor-pointer transition-colors"
                    >
                      {isUploadingVideo ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>{introVideo ? 'Change Reel' : 'Add Reel (0/1)'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 3-Column Square Grid (Responsive for mobile & laptop) */}
              {media.length > 0 || introVideo ? (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-2 md:gap-4 lg:gap-5">
                  {/* Intro Video Tile (if present, rendered with play icon) */}
                  {introVideo && (
                    <div
                      onClick={() => setShowVideoModal(true)}
                      className="relative aspect-square overflow-hidden bg-[#181818] group cursor-pointer md:rounded-xl"
                    >
                      <video
                        src={introVideo}
                        className="w-full h-full object-cover pointer-events-none group-hover:scale-105 transition-transform duration-300"
                        preload="metadata"
                        disablePictureInPicture
                      />
                      {/* Play badge bottom-left */}
                      <div className="absolute bottom-1.5 left-1.5 md:bottom-2.5 md:left-2.5 z-10 flex items-center gap-1 text-[11px] md:text-xs font-semibold text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                        <Play className="w-3.5 h-3.5 md:w-4 md:h-4 fill-white" />
                        <span>Reel</span>
                      </div>

                      {/* Desktop Hover Overlay */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                        <Play className="w-8 h-8 text-white fill-white drop-shadow-lg" />
                      </div>

                      {/* Owner Quick Delete Reel */}
                      {isRealOwn && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteVideoConfirmOpen(true);
                          }}
                          className="absolute top-1.5 left-1.5 md:top-2.5 md:left-2.5 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 shadow-md"
                          title="Delete reel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Media Photos (Square 1:1 Tiles) */}
                  {media.map((url, idx) => {
                    return (
                      <div
                        key={url}
                        onClick={() => setLightboxIndex(idx)}
                        className="relative aspect-square overflow-hidden bg-[#181818] group cursor-pointer md:rounded-xl"
                      >
                        <img
                          src={getOptimizedImageUrl(url, { width: 480, quality: 'auto', format: 'auto' })}
                          alt={`Post ${idx + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Desktop Hover Overlay */}
                        <div className="absolute inset-0 bg-black/25 opacity-0 md:group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <Camera className="w-7 h-7 text-white drop-shadow-md stroke-[2]" />
                        </div>

                        {/* Owner Quick Delete Overlay */}
                        {isRealOwn && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletePhotoTarget({ index: idx, url });
                            }}
                            className="absolute top-1.5 left-1.5 md:top-2.5 md:left-2.5 p-1.5 rounded-full bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-all cursor-pointer z-10 shadow-md"
                            title="Delete photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty Grid State */
                <div className="py-16 text-center space-y-2 px-4">
                  <div className="w-16 h-16 rounded-full border-2 border-neutral-700 flex items-center justify-center mx-auto text-neutral-400 mb-3">
                    <Camera className="w-8 h-8 stroke-[1.5]" />
                  </div>
                  <h3 className="font-bold text-base text-white">No Posts Yet</h3>
                  <p className="text-xs md:text-sm text-neutral-500 max-w-xs mx-auto">
                    {isRealOwn
                      ? 'Upload your media: 1 profile photo, 1 video reel, and up to 2 portfolio photos.'
                      : 'This talent has not uploaded any photos yet.'}
                  </p>
                  {isRealOwn && (
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => document.getElementById('profile-direct-photo-upload')?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#522C69] hover:bg-[#663782] text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Photo (0/2)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => document.getElementById('profile-direct-video-upload')?.click()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white text-xs font-semibold cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Reel (0/1)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>

        {/* Lower Cards Container (Responsive: 1 column on mobile, 2 columns on laptop) */}
        <div className="px-0 sm:px-1.5 mt-4 md:mt-6 text-left">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 items-start">
            {/* Column 1 (Left on Laptop): Experience & Skills */}
            <div className="space-y-3 sm:space-y-4">
              {/* 1. Experience & Productions Card */}
              <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md">
                <ProfileExperience
                  profile={profile}
                  isOwnProfile={isRealOwn}
                  showAlert={showAlert}
                  onNavigate={onNavigate}
                />
              </section>

              {/* 2. Skills Card with Compact Tags */}
              <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-neutral-300">
                    Professional Skills ({skillsList.length})
                  </h3>
                  {isRealOwn && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSkills(skillsList);
                        setShowSkillsModal(true);
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                    >
                      Edit Skills
                    </button>
                  )}
                </div>

                {skillsList.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-200 bg-white/[0.05] border border-white/5"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-500">No skills added yet.</p>
                )}
              </section>
            </div>

            {/* Column 2 (Right on Laptop): Physical Specs & Contact Info */}
            <div className="space-y-3 sm:space-y-4">
              {/* 3. Physical Specs Card */}
              <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-white" />
                    Physical Specifications
                  </h3>
                  {isRealOwn && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeightInput(profile.height || '');
                        setWeightInput(profile.weight || '');
                        setPhoneInput(profile.phone || '');
                        setEmailInput(profile.email || '');
                        setShowAttributesModal(true);
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                    >
                      Edit Specs
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04]">
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wide">Height</span>
                    <span className="font-semibold text-white">{height || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04]">
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wide">Weight</span>
                    <span className="font-semibold text-white">{weight || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04]">
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wide">Gender</span>
                    <span className="font-semibold text-white capitalize">{profile.gender || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-white/[0.04]">
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wide">Location</span>
                    <span className="font-semibold text-white truncate max-w-[110px] text-right">{profile.location || 'Nepal'}</span>
                  </div>
                </div>
              </section>

              {/* 4. Contact Info Card */}
              <section className="bg-black rounded-2xl border border-white/5 p-3.5 sm:p-4 text-white shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs md:text-sm font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-white" />
                    Contact Information
                  </h3>
                  {isRealOwn && (
                    <button
                      type="button"
                      onClick={() => {
                        setHeightInput(profile.height || '');
                        setWeightInput(profile.weight || '');
                        setPhoneInput(profile.phone || '');
                        setEmailInput(profile.email || '');
                        setShowAttributesModal(true);
                      }}
                      className="text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
                    >
                      Edit Contacts
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {contactPhone ? (
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Phone className="w-3.5 h-3.5 text-sky-400" />
                      <a href={`tel:${contactPhone}`} className="hover:text-white font-medium">
                        {contactPhone}
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">Phone not provided.</p>
                  )}

                  {contactEmail ? (
                    <div className="flex items-center gap-2 text-neutral-300">
                      <Mail className="w-3.5 h-3.5 text-sky-400" />
                      <a href={`mailto:${contactEmail}`} className="hover:text-white font-medium">
                        {contactEmail}
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">Email not provided.</p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {lightboxIndex !== null && media[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-20 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>

          {media.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex - 1 + media.length) % media.length);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % media.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 text-white p-3 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div
            className="relative max-w-3xl max-h-[85vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={media[lightboxIndex]}
              alt={`Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* FULLSCREEN VIDEO PLAYER MODAL (Instagram Reels Style) */}
      {showVideoModal && introVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 sm:bg-black/90 sm:backdrop-blur-md flex items-center justify-center sm:p-4 select-none"
          onClick={handleCloseVideoModal}
        >
          {/* Top Bar Actions */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            {/* Mute/Unmute */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (reelVideoRef.current) {
                  reelVideoRef.current.muted = !isReelMuted;
                  setIsReelMuted(!isReelMuted);
                }
              }}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer transition-colors shadow-lg"
              title={isReelMuted ? 'Unmute' : 'Mute'}
            >
              {isReelMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={handleCloseVideoModal}
              className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer transition-colors shadow-lg"
              title="Close"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div
            className="relative w-full h-full sm:h-[90vh] sm:max-h-[850px] sm:max-w-[420px] sm:rounded-2xl overflow-hidden bg-black shadow-2xl flex items-center justify-center cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              if (reelVideoRef.current) {
                if (reelVideoRef.current.paused) {
                  reelVideoRef.current.play();
                  setIsReelPlaying(true);
                } else {
                  reelVideoRef.current.pause();
                  setIsReelPlaying(false);
                }
              }
            }}
          >
            <video
              ref={reelVideoRef}
              src={introVideo}
              autoPlay
              loop
              playsInline
              disablePictureInPicture
              muted={isReelMuted}
              onTimeUpdate={() => {
                if (reelVideoRef.current && reelVideoRef.current.duration) {
                  setReelProgress(
                    (reelVideoRef.current.currentTime / reelVideoRef.current.duration) * 100
                  );
                }
              }}
              onPlay={() => setIsReelPlaying(true)}
              onPause={() => setIsReelPlaying(false)}
              onContextMenu={(e) => e.preventDefault()}
              className="w-full h-full object-cover pointer-events-none select-none"
            />

            {/* Center Play/Pause indicator when paused */}
            {!isReelPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white shadow-xl">
                  <Play className="w-8 h-8 fill-white translate-x-0.5" />
                </div>
              </div>
            )}

            {/* Gradient shadow for text readability */}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

            {/* Bottom creator info overlay (Reel style) */}
            <div className="absolute bottom-6 left-4 right-4 z-20 pointer-events-none text-left">
              <div className="flex items-center gap-2.5 mb-1 pointer-events-auto">
                <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/40 shadow-sm">
                  <img
                    src={(profile as any)?.profileImage || profile?.photoURL || profile?.image || ''}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-zinc-100 drop-shadow-sm tracking-normal truncate">
                      {(profile as any)?.username || (profile?.name ? profile.name.toLowerCase().replace(/[^a-z0-9_.]/g, '') : 'talent')}
                    </span>
                    {profile.verified === true && (
                      <span className="w-3.5 h-3.5 rounded-full bg-sky-400 flex items-center justify-center text-[9px] text-black font-bold">✓</span>
                    )}
                  </div>
                  {profile?.name && (
                    <p className="text-xs text-white/90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate">
                      {profile.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{ width: `${reelProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT SKILLS */}
      {showSkillsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowSkillsModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Skills</h3>
              <button
                onClick={() => setShowSkillsModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = editingSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkillTag(skill)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#522C69] text-white font-bold'
                        : 'bg-[#121212] text-gray-300 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="Add other skill (e.g. Martial Arts)"
                value={customSkillInput}
                onChange={(e) => setCustomSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomSkill();
                  }
                }}
                className="flex-1 bg-[#121212] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="px-3 py-1.5 bg-[#262626] hover:bg-[#333333] text-white text-xs font-semibold rounded-lg cursor-pointer"
              >
                Add
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSkills}
                disabled={isSavingSkills}
                className="px-4 py-1.5 rounded-lg bg-[#522C69] hover:bg-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingSkills ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT BIO */}
      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Bio</h3>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              placeholder="Write a short bio about yourself..."
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69] resize-none"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={isSavingBio}
                className="px-4 py-1.5 rounded-lg bg-[#522C69] hover:bg-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingBio ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Save Bio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ATTRIBUTES & CONTACT */}
      {showAttributesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAttributesModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-5 max-w-md w-full space-y-3 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Specs & Contacts</h3>
              <button
                onClick={() => setShowAttributesModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">Height</label>
                <input
                  type="text"
                  placeholder="e.g. 5'10&quot; (178 cm)"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">Weight</label>
                <input
                  type="text"
                  placeholder="e.g. 68 kg"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. +977 9812345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">Contact Email</label>
                <input
                  type="email"
                  placeholder="e.g. anil.timilsena@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAttributesModal(false)}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttributes}
                disabled={isSavingAttributes}
                className="px-4 py-1.5 rounded-lg bg-[#522C69] hover:bg-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingAttributes ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                <span>Save Specs</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOGS */}
      {deletePhotoTarget && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Photo"
          message="Are you sure you want to remove this photo from your portfolio?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => {
            handleDeleteMedia(deletePhotoTarget.url);
            setDeletePhotoTarget(null);
          }}
          onCancel={() => setDeletePhotoTarget(null)}
        />
      )}

      {deleteVideoConfirmOpen && (
        <ConfirmDialog
          isOpen={true}
          title="Delete Video"
          message="Are you sure you want to delete your audition reel video?"
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={() => {
            handleDeleteIntroVideo();
            setDeleteVideoConfirmOpen(false);
          }}
          onCancel={() => setDeleteVideoConfirmOpen(false)}
        />
      )}

      {/* FOLLOWERS / FOLLOWING MODAL */}
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
