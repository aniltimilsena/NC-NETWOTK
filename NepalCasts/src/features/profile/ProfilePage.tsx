import React, { useState, useEffect, useRef } from 'react';
import { useProfile } from './hooks/useProfile';
import SEO from '../../components/SEO';
import ProfileExperience from './components/ProfileExperience';
import FollowModal from './components/FollowModal';
import ShareSheet from '../../components/ui/ShareSheet';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import BackButton from '../../components/ui/BackButton';
import { ProfileSkeleton } from '../../components/ui/Skeleton';
import { doc, setDoc, deleteDoc, query, collection, where, getDocs, serverTimestamp, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { AuthService } from '../../services/AuthService';
import { updateProfileData, uploadProfileMedia } from '../../services';
import { notifyProfileUpdated } from './services/users';
import { isUserOnline } from '../../utils/presence';
import { formatRole, isDefaultImage } from '../../utils';
import { getOptimizedImageUrl, getImageSrcSet, getAvatarOptimizedUrl } from '../../utils/media';
import { useUser } from '@clerk/clerk-react';
import {
  Play,
  Pencil,
  Plus,
  MapPin,
  Share2,
  UserPlus,
  UserCheck,
  MessageSquare,
  Briefcase,
  BadgeCheck,
  User,
  Contact,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Video,
  Camera,
  Phone,
  Mail,
  Clapperboard,
} from 'lucide-react';

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
  'Content Creation',
  'Video Editing',
];

export default function ProfilePage({
  onNavigate,
  user,
  profileId,
  isAdmin: _isAdmin,
  showAlert,
  initialTab: _initialTab = 'grid',
}: ProfilePageProps) {
  const { user: clerkUser } = useUser();
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
    savedCount: _savedCount,
    toggleFollow,
  } = useProfile(profileId, user);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [profile?.image, profile?.photoURL, (profile as any)?.profileImage, avatarPreviewUrl]);

  // Modals state
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<any[]>([]);
  const [loadingFollowList, setLoadingFollowList] = useState(false);

  // Edit Name & Headline Modal
  const [showNameModal, setShowNameModal] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [rolesInput, setRolesInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Edit Skills Modal
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [editingSkills, setEditingSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  // Edit Bio Modal
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  // Edit Specs / Personal Info Modal
  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [isEditingAttributes, setIsEditingAttributes] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSavingAttributes, setIsSavingAttributes] = useState(false);

  // Skills Modal
  const [isEditingSkillsMode, setIsEditingSkillsMode] = useState(false);

  // Experience Modal
  const [showExperienceModal, setShowExperienceModal] = useState(false);

  // Edit Contacts Modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [isEditingContacts, setIsEditingContacts] = useState(false);
  const [contactPhoneInput, setContactPhoneInput] = useState('');
  const [contactEmailInput, setContactEmailInput] = useState('');
  const [isSavingContacts, setIsSavingContacts] = useState(false);

  // Media / Lightbox state
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const reelVideoRef = useRef<HTMLVideoElement>(null);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [showAddMediaChoice, setShowAddMediaChoice] = useState(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
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
  const videoThumbnail =
    (profile as any)?.videoThumbnail ||
    (profile as any)?.introVideoThumbnail ||
    (profile as any)?.thumbnailUrl ||
    (profile as any)?.showreelThumbnail ||
    null;
  const postsCount = media.length + (introVideo ? 1 : 0);

  const handleCloseVideoModal = () => {
    if (reelVideoRef.current) {
      reelVideoRef.current.pause();
    }
    setShowVideoModal(false);
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
      let userIds: string[] = [];
      if (type === 'followers') {
        const followsQ = query(collection(db, 'follows'), where('followingId', '==', targetUid));
        const followsSnap = await getDocs(followsQ);
        userIds = followsSnap.docs.map((d) => d.data().followerId).filter(Boolean);
      } else {
        const followsQ = query(collection(db, 'follows'), where('followerId', '==', targetUid));
        const followsSnap = await getDocs(followsQ);
        userIds = followsSnap.docs.map((d) => d.data().followingId).filter(Boolean);
      }

      // Fallback check for legacy subcollections
      if (userIds.length === 0) {
        const subSnap = await getDocs(collection(db, 'profiles', targetUid, type)).catch(() => null);
        if (subSnap && !subSnap.empty) {
          userIds = subSnap.docs.map((d) => d.id).filter(Boolean);
        }
      }

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
      const result = userIds.map((id) => {
        const p = profileMap.get(id);
        if (!p) return null;
        return {
          id,
          name: p.name || p.displayName || 'Talent User',
          image: p.image || p.photoURL || p.profileImage || '',
          role: p.role || p.category || 'Actor',
        };
      }).filter(Boolean);
      setFollowList(result);
    } catch (err: any) {
      console.error('Error fetching follow list:', err);
      showAlert?.('Failed to load user list. Please try again.', 'error');
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
              title: 'New Connect',
              body: `${user.displayName || 'Someone'} connected with you.`,
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

  // Avatar Upload Handler
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const activeUid = CurrentUser.id || profile?.uid || (profile as any)?.id;
    if (!activeUid) {
      showAlert('Sign In Required', 'warning', 'Please sign in to update your profile photo.');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setAvatarPreviewUrl(localPreview);
    setUploadingAvatar(true);

    try {
      const avatarPath = `profiles/${activeUid}/avatar_${Date.now()}.webp`;
      const url = await uploadProfileMedia(activeUid, file, undefined, avatarPath);
      if (url) {
        setAvatarPreviewUrl(url);
        CurrentUser.setImageUrl(url);

        await updateProfileData(activeUid, {
          image: url,
          photoURL: url,
          profileImage: url,
        });

        notifyProfileUpdated(activeUid, url);
        setProfile((prev: any) => (prev ? { ...prev, image: url, photoURL: url, profileImage: url } : prev));

        if (clerkUser) {
          try {
            await clerkUser.setProfileImage({ file });
          } catch (clerkErr) {
            console.warn('[ProfilePage] Clerk avatar sync skipped:', clerkErr);
          }
        }

        showAlert('Avatar Updated', 'success');
      }
    } catch (err: any) {
      setAvatarPreviewUrl(null);
      showAlert('Upload Failed', 'error', err.message || 'Could not upload avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Upload Intro / Reel Video
  const handleUploadVideo = async (file: File) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;

    if (file.size > 200 * 1024 * 1024) {
      showAlert('File Too Large', 'error', 'Video size must be less than 200MB.');
      return;
    }

    setIsUploadingVideo(true);
    setVideoUploadProgress(0);
    try {
      const ext = file.name.split('.').pop() || 'mp4';
      const path = `media/${uidToUse}/reel_${Date.now()}.${ext}`;
      const url = await uploadProfileMedia(
        uidToUse,
        file,
        (progress) => {
          setVideoUploadProgress(progress);
        },
        path
      );

      if (url) {
        const updatePayload = {
          introVideo: url,
          introVideoUrl: url,
          showreel: url,
          showreelUrl: url,
        };
        setProfile((prev: any) => (prev ? { ...prev, ...updatePayload } : prev));
        await updateProfileData(uidToUse, updatePayload);
        showAlert('Video Uploaded', 'success', 'Your audition reel video has been added to your media.');
      }
    } catch (err: any) {
      showAlert('Upload Failed', 'error', err.message || 'Could not upload video.');
    } finally {
      setIsUploadingVideo(false);
      setVideoUploadProgress(0);
    }
  };

  // Upload Media (handles both photos and videos)
  const handleUploadMedia = async (files: FileList) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;

    const fileArray = Array.from(files);
    const videoFiles = fileArray.filter(
      (f) => f.type.startsWith('video/') || Boolean(f.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i))
    );
    const imageFiles = fileArray.filter(
      (f) => !f.type.startsWith('video/') && !f.name.match(/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i)
    );

    if (videoFiles.length > 0) {
      await handleUploadVideo(videoFiles[0]);
    }

    if (imageFiles.length > 0) {
      setIsUploadingPhotos(true);
      try {
        const newUrls: string[] = [];
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          const path = `profiles/${uidToUse}/portfolio_${Date.now()}_${i}.webp`;
          const url = await uploadProfileMedia(uidToUse, file, undefined, path);
          if (url) newUrls.push(url);
        }

        if (newUrls.length > 0) {
          const updatedMedia = [...media, ...newUrls];
          setProfile((prev: any) => (prev ? { ...prev, media: updatedMedia } : prev));
          await updateProfileData(uidToUse, { media: updatedMedia });
          showAlert('Media Uploaded', 'success', `${newUrls.length} photo(s) added to your portfolio.`);
        }
      } catch (err: any) {
        showAlert('Upload Failed', 'error', err.message || 'Could not upload photos.');
      } finally {
        setIsUploadingPhotos(false);
      }
    }
  };

  const handleDeleteMedia = async (urlToDelete: string) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    const previousProfile = profile;
    try {
      const updatedMedia = media.filter((url) => url !== urlToDelete);
      setProfile((prev: any) => (prev ? { ...prev, media: updatedMedia } : prev));
      const res = await updateProfileData(uidToUse, { media: updatedMedia });
      if (res && res.success === false) {
        throw new Error(res.error || 'Failed to remove photo');
      }
      showAlert('Photo Removed', 'info');
      if (lightboxIndex !== null) setLightboxIndex(null);
    } catch (err: any) {
      console.error('Failed to remove photo:', err);
      setProfile(previousProfile);
      showAlert(err.message || 'Failed to remove photo. Please try again.', 'error');
    }
  };

  const handleDeleteIntroVideo = async () => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    const previousProfile = profile;
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
      const res = await updateProfileData(uidToUse, {
        introVideo: null,
        introVideoUrl: null,
        showreel: null,
        showreelUrl: null,
      });
      if (res && res.success === false) {
        throw new Error(res.error || 'Failed to remove video');
      }
      showAlert('Video Removed', 'info');
      setShowVideoModal(false);
    } catch (err: any) {
      console.error('Failed to remove video:', err);
      setProfile(previousProfile);
      showAlert(err.message || 'Failed to remove video. Please try again.', 'error');
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

  // Direct Save Name, Roles, Location
  const handleSaveNameAndHeadline = async () => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    setIsSavingName(true);
    try {
      const rolesArray = rolesInput
        .split(/[•,]/)
        .map((r) => r.trim())
        .filter(Boolean);

      const updatePayload: Record<string, any> = {
        name: nameInput.trim() || profile?.name || '',
        displayName: nameInput.trim() || profile?.name || '',
        roles: rolesArray.length > 0 ? rolesArray : [rolesInput.trim()],
        role: rolesArray[0] || rolesInput.trim(),
        location: locationInput.trim(),
      };

      setProfile((prev: any) => (prev ? { ...prev, ...updatePayload } : prev));
      CurrentUser.setName(updatePayload.name);
      await updateProfileData(uidToUse, updatePayload);
      notifyProfileUpdated(uidToUse, profile?.image || undefined);
      showAlert('Profile Info Updated', 'success');
      setShowNameModal(false);
    } catch (err: any) {
      showAlert('Update Failed', 'error', err.message || 'Failed to update profile info');
    } finally {
      setIsSavingName(false);
    }
  };

  // Direct Save Specs / Contact Info
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
      showAlert('Personal Information Updated', 'success');
      setShowAttributesModal(false);
    } catch (err: any) {
      showAlert('Failed to update info', 'error', err.message);
    } finally {
      setIsSavingAttributes(false);
    }
  };

  // Direct Save Contacts
  const handleSaveContacts = async () => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    setIsSavingContacts(true);
    try {
      const updatePayload: Record<string, any> = {};
      if (contactPhoneInput !== undefined) updatePayload.phone = contactPhoneInput;
      if (contactEmailInput !== undefined) updatePayload.email = contactEmailInput;

      setProfile((prev: any) => (prev ? { ...prev, ...updatePayload } : prev));
      await updateProfileData(uidToUse, updatePayload);
      showAlert('Contact Information Updated', 'success');
      setShowContactModal(false);
    } catch (err: any) {
      showAlert('Failed to update contact info', 'error', err.message);
    } finally {
      setIsSavingContacts(false);
    }
  };

  if (loading || resolvingUid) {
    return <ProfileSkeleton />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#141414] pb-6 flex flex-col items-center justify-center text-center p-6 text-white">
        <p className="text-gray-400 text-base mb-4">Profile not found or unavailable.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-[#522C69] hover:bg-[#663782] text-white font-bold rounded-xl cursor-pointer shadow-lg transition-all"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  // Extracted display values
  const displayName =
    (profile?.name && profile.name !== 'Artist Profile' && profile.name !== 'Discovery Talent' ? profile.name : null) ||
    (profile as any)?.displayName ||
    (profile as any)?.fullName ||
    (profile as any)?.creatorName ||
    (profile as any)?.username ||
    profile?.name ||
    (isRealOwn ? 'Anil Timilsena' : 'Talent');

  const rawAvatarCandidate =
    avatarPreviewUrl ||
    profile?.image ||
    profile?.photoURL ||
    (profile as any)?.profileImage ||
    (profile as any)?.avatar ||
    null;

  const displayAvatar =
    !avatarLoadFailed && rawAvatarCandidate && !isDefaultImage(rawAvatarCandidate)
      ? rawAvatarCandidate
      : null;

  const getRolesText = (p: any) => {
    if (Array.isArray(p?.roles) && p.roles.length > 0) {
      return p.roles.join(' • ');
    }
    if (p?.role) {
      return formatRole(p.role);
    }
    if (p?.category) {
      return formatRole(p.category);
    }
    return 'Actor • Model • Creator';
  };

  const renderFormattedBio = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const displayRoles = getRolesText(profile);
  const displayLocation = (profile?.location || (profile as any)?.city || (profile as any)?.address || '').trim() || 'Kathmandu, Nepal';

  const bio = profile.bio || '';
  const contactPhone = profile.phone || (profile as any)?.phoneNumber || null;
  const contactEmail = profile.email || (profile as any)?.contactEmail || null;

  const rawSkills: any = profile.skills;
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills.map((s) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean)
    : typeof rawSkills === 'string' && rawSkills.trim() !== ''
    ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const formatCount = (count: number) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return count.toLocaleString();
  };

  const isOnline = isUserOnline(profile);

  return (
    <div className="min-h-screen bg-[#141414] text-white font-sans selection:bg-[#522C69] selection:text-black pb-20 select-none">
      <SEO
        title={`${displayName} | NepalCasts`}
        description={bio || `View ${displayName}'s portfolio and casting profile on NepalCasts.`}
        image={displayAvatar || undefined}
        noindex={(profile as any).isPrivate === true}
      />

      {/* Hidden File Upload Inputs */}
      {isRealOwn && (
        <input
          type="file"
          id="avatar-photo-upload"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileChange}
        />
      )}
      <input
        type="file"
        id="profile-direct-photo-upload"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif,video/*,.mp4,.mov,.webm,.mkv,.avi"
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
        accept="video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.3gp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadVideo(e.target.files[0]);
          }
          e.target.value = '';
        }}
      />

      {/* Main Responsive Container matching home page cards layout */}
      <div className="w-full px-0 sm:px-1.5 py-2 space-y-2 sm:space-y-2">
        {/* Top Header Bar */}
        {isRealOwn ? (
          <div className="flex items-center justify-between py-2 px-3 sm:px-4 mb-2">
            <BackButton
              onClick={() => onNavigate('back')}
              ariaLabel="Go Back"
            />
            <h1 className="text-base font-bold text-white tracking-tight">My Profile</h1>
            <button
              type="button"
              onClick={() => setShowShareSheet(true)}
              className="w-10 h-10 -mr-2 rounded-full hover:bg-white/5 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Share Profile"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between py-2 px-3 sm:px-4 mb-2">
            <BackButton
              onClick={() => onNavigate('back')}
              ariaLabel="Go Back"
            />
            <h1 className="text-base font-bold text-white tracking-tight">Profile</h1>
            <button
              type="button"
              onClick={() => setShowShareSheet(true)}
              className="w-10 h-10 -mr-2 rounded-full hover:bg-white/5 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Share Profile"
              aria-label="Share"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Profile Identity & Avatar Block - Directly on black background */}
        <div className="flex items-center gap-5 px-3.5 sm:px-4 py-1 mb-2">
          {/* Avatar with distinct rounded shape */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-b from-[#1E1E26] to-[#111116] border-2 border-white/10 shadow-xl overflow-hidden flex items-center justify-center select-none">
              {displayAvatar ? (
                <img
                  src={getAvatarOptimizedUrl(displayAvatar, 'xl')}
                  alt={displayName}
                  loading="lazy"
                  decoding="async"
                  onError={() => setAvatarLoadFailed(true)}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <svg viewBox="0 0 100 100" fill="#5A5A75" className="w-2/3 h-2/3">
                  <circle cx="50" cy="35" r="20" />
                  <ellipse cx="50" cy="85" rx="35" ry="25" />
                </svg>
              )}
            </div>

            {/* Badge: Purple Camera (owner) / Green Online Status (visitor) */}
            {isRealOwn ? (
              <button
                type="button"
                onClick={() => document.getElementById('avatar-photo-upload')?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#8f64f8] hover:bg-[#7c4fed] active:scale-95 border-2 border-black flex items-center justify-center text-white cursor-pointer shadow-md transition-all"
                title="Change Profile Photo"
                aria-label="Change Profile Photo"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>
            ) : isOnline ? (
              <div
                className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-black bg-emerald-500 shadow-sm"
                title="Online"
              />
            ) : null}
          </div>

          {/* Details (Name, Roles, Location) */}
          <div className="flex-1 min-w-0 text-left">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
                {displayName}
              </h2>
              {isRealOwn && (
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(displayName);
                    setRolesInput(displayRoles);
                    setLocationInput(displayLocation);
                    setShowNameModal(true);
                  }}
                  className="p-1 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                  title="Edit Profile Info"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs sm:text-[13px] text-gray-400 font-medium mb-1.5 truncate">
              {displayRoles}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-400" />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>
        </div>

        {/* 3-Column Stats Row with Vertical Dividers */}
        <div className="grid grid-cols-3 py-3 px-3 sm:px-4 mb-2 divide-x divide-white/10 text-center">
          <div className="flex flex-col items-center justify-center">
            <span className="text-base sm:text-lg font-bold text-white leading-tight">
              {postsCount}
            </span>
            <span className="text-[11px] sm:text-xs text-gray-400 font-normal mt-0.5">Projects</span>
          </div>
          <button
            type="button"
            onClick={() => handleFollowModalOpen('followers')}
            className="flex flex-col items-center justify-center w-full cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-base sm:text-lg font-bold text-white leading-tight">
              {formatCount(followerCount)}
            </span>
            <span className="text-[11px] sm:text-xs text-gray-400 font-normal mt-0.5">Connects</span>
          </button>
          <button
            type="button"
            onClick={() => handleFollowModalOpen('following')}
            className="flex flex-col items-center justify-center w-full cursor-pointer hover:opacity-80 transition-opacity"
          >
            <span className="text-base sm:text-lg font-bold text-white leading-tight">
              {formatCount(followingCount)}
            </span>
            <span className="text-[11px] sm:text-xs text-gray-400 font-normal mt-0.5">Connected</span>
          </button>
        </div>

        {/* Visitor Action Buttons: Follow & Message */}
        {!isRealOwn && (
          <div className="flex items-center gap-3 px-3 sm:px-4 mb-2">
            <button
              type="button"
              onClick={handleFollowToggle}
              className={`flex-1 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] ${
                isFollowing
                  ? 'bg-[#141416] hover:bg-[#1a1a1e] text-white border border-white/10'
                  : 'bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-lg'
              }`}
            >
              {isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Connected</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Connect</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('messages', targetUid)}
              className="flex-1 py-3 rounded-2xl bg-[#141416] hover:bg-[#1a1a1e] border border-white/5 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98]"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Message</span>
            </button>
          </div>
        )}

        {/* Card 1: About Me Card */}
        <div className="w-full bg-black border border-white/5 rounded-2xl p-3.5 sm:p-4 text-left relative shadow-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-white tracking-tight">
              {isRealOwn ? 'About Me' : 'About'}
            </h3>
            {isRealOwn && (
              <button
                type="button"
                onClick={() => {
                  setBioInput(bio || '');
                  setShowAboutModal(true);
                }}
                className="p-1 text-gray-400 hover:text-white rounded transition-colors cursor-pointer"
                title="Edit Bio"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {(() => {
            const rawBio =
              bio ||
              'Passionate about acting and storytelling.\nOpen to new opportunities in film, commercials and creative projects.';
            const bioTrimmed = rawBio.trim();
            const lines = bioTrimmed.split('\n').filter((l) => l.trim().length > 0);
            const isLong = bioTrimmed.length > 150 || lines.length > 2;

            let displayText = bioTrimmed;
            if (!isBioExpanded && isLong) {
              if (lines.length > 2) {
                const firstTwo = lines.slice(0, 2).join('\n');
                if (firstTwo.length > 150) {
                  const sub = firstTwo.slice(0, 150);
                  const lastSpace = sub.lastIndexOf(' ');
                  displayText = (lastSpace > 60 ? sub.slice(0, lastSpace) : sub).trimEnd() + '...';
                } else {
                  displayText = firstTwo.trimEnd() + '...';
                }
              } else if (bioTrimmed.length > 150) {
                const sub = bioTrimmed.slice(0, 150);
                const lastSpace = sub.lastIndexOf(' ');
                displayText = (lastSpace > 60 ? sub.slice(0, lastSpace) : sub).trimEnd() + '...';
              }
              // Clean any unclosed markdown bold tags in truncated preview
              if (displayText.split('**').length % 2 === 0) {
                displayText = displayText.replace(/\*\*([^*]*)$/, '$1');
              }
            }

            return (
              <p className="text-xs sm:text-[13px] text-gray-300 leading-relaxed font-normal">
                <span className="whitespace-pre-line">{renderFormattedBio(displayText)}</span>
                {isLong && (
                  <button
                    type="button"
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="text-xs font-semibold text-[#8f64f8] hover:text-[#a785fc] transition-colors cursor-pointer ml-1.5 inline align-baseline"
                  >
                    {isBioExpanded ? 'See less' : 'See more'}
                  </button>
                )}
              </p>
            );
          })()}
        </div>
        {/* Card 2: Media Card */}
        <div className="w-full bg-black border border-white/5 rounded-2xl p-4 sm:p-5 text-left shadow-md">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">Media</h3>
          </div>

          {!isRealOwn && media.length === 0 && !introVideo ? (
            <div className="rounded-xl bg-white/[0.02] border border-white/5 py-8 px-4 flex flex-col items-center justify-center text-center">
              <Camera className="w-7 h-7 text-gray-500 mb-2" />
              <p className="text-xs sm:text-sm text-gray-300 font-medium">No media uploaded yet</p>
              <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">Portfolio photos and audition clips will appear here.</p>
            </div>
          ) : (
            /* Horizontal Media Strip */
            <div className="flex items-center gap-3.5 sm:gap-4 overflow-x-auto pb-3 scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {/* Owner Add Media Box */}
              {isRealOwn && (
                <button
                  type="button"
                  onClick={() => setShowAddMediaChoice(true)}
                  disabled={isUploadingPhotos || isUploadingVideo}
                  className="w-48 h-64 sm:w-56 sm:h-72 md:w-60 md:h-80 rounded-2xl border border-white/5 bg-[#141416] hover:bg-[#1a1a1e] flex flex-col items-center justify-center gap-2.5 text-gray-400 hover:text-white cursor-pointer shrink-0 transition-all group"
                >
                  {isUploadingPhotos || isUploadingVideo ? (
                    <div className="flex flex-col items-center gap-2 px-3 text-center">
                      <Loader2 className="w-7 h-7 animate-spin text-[#8f64f8]" />
                      <span className="text-xs text-gray-300 font-medium">
                        {isUploadingVideo
                          ? videoUploadProgress > 0
                            ? `Uploading ${videoUploadProgress}%`
                            : 'Uploading video...'
                          : 'Uploading photos...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center transition-colors">
                        <Plus className="w-6 h-6 text-gray-300 group-hover:text-white transition-colors" />
                      </div>
                      <span className="text-xs sm:text-sm font-semibold text-gray-300 group-hover:text-white">Add Media</span>
                      <span className="text-[10px] text-gray-500">Photo or Video</span>
                    </>
                  )}
                </button>
              )}

              {/* Media Thumbnails */}
              {media.map((imgUrl, idx) => {
                const isLastInVisitorView = !isRealOwn && idx === 2 && media.length > 3;
                const remainingCount = media.length - 3;
                return (
                  <div
                    key={idx}
                    onClick={() => setLightboxIndex(idx)}
                    className="w-48 h-64 sm:w-56 sm:h-72 md:w-60 md:h-80 rounded-2xl overflow-hidden bg-black border border-white/5 shrink-0 relative cursor-pointer group shadow-sm"
                  >
                    <img
                      src={getOptimizedImageUrl(imgUrl, { width: 480, quality: 'auto', format: 'auto' })}
                      srcSet={getImageSrcSet(imgUrl, [240, 480, 720])}
                      sizes="(max-width: 640px) 192px, 240px"
                      alt={`Portfolio ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        const target = e.currentTarget;
                        target.onerror = null;
                        target.src = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400' fill='none'%3E%3Crect width='400' height='400' fill='%23141414'/%3E%3Crect x='20' y='20' width='360' height='360' rx='16' stroke='%23262626' stroke-width='2' stroke-dasharray='6 6'/%3E%3Cpath d='M160 170a20 20 0 100-40 20 20 0 000 40zm-30 80h140l-45-60-35 45-25-30-35 45z' fill='%23522C69' fill-opacity='0.4'/%3E%3Ctext x='200' y='280' font-family='sans-serif' font-size='13' font-weight='600' fill='%23737373' text-anchor='middle'%3ENC Media%3C/text%3E%3C/svg%3E";
                      }}
                    />
                    {isLastInVisitorView && (
                      <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px] flex flex-col items-center justify-center text-white">
                        <span className="text-2xl font-bold">+{remainingCount}</span>
                        <span className="text-xs text-gray-300 font-medium">more</span>
                      </div>
                    )}
                    {/* Owner Delete Option */}
                    {isRealOwn && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletePhotoTarget({ index: idx, url: imgUrl });
                        }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Intro Video Tile if present */}
              {introVideo && (
                <div
                  onClick={() => setShowVideoModal(true)}
                  className="w-48 h-64 sm:w-56 sm:h-72 md:w-60 md:h-80 rounded-2xl overflow-hidden bg-black border border-white/5 shrink-0 relative cursor-pointer group shadow-sm"
                >
                  <video
                    key={introVideo}
                    src={`${introVideo}#t=0.1`}
                    poster={videoThumbnail || undefined}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 pointer-events-none"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white group-hover:scale-110 group-hover:bg-[#522C69]/80 group-hover:border-[#522C69] transition-all shadow-md">
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Video Badge */}
                  <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded bg-black/70 backdrop-blur-sm border border-white/10 flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-white" />
                    <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Video</span>
                  </div>

                  {/* Owner Delete Option */}
                  {isRealOwn && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteVideoConfirmOpen(true);
                      }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/70 hover:bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Delete video"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation List Menu */}
        <div className="w-full bg-black border border-white/5 rounded-2xl divide-y divide-white/5 overflow-hidden text-left mb-2 shadow-md">
          {/* Personal Information */}
          <button
            type="button"
            onClick={() => {
              setHeightInput(profile.height || '');
              setWeightInput(profile.weight || '');
              setPhoneInput(contactPhone || '');
              setEmailInput(contactEmail || '');
              setIsEditingAttributes(false);
              setShowAttributesModal(true);
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3 text-left">
              <User className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors shrink-0" />
              <span className="text-sm font-medium text-gray-200 group-hover:text-white text-left">
                Personal Information
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Skills */}
          <button
            type="button"
            onClick={() => {
              setEditingSkills(skillsList);
              setIsEditingSkillsMode(false);
              setShowSkillsModal(true);
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3 text-left">
              <BadgeCheck className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors shrink-0" />
              <span className="text-sm font-medium text-gray-200 group-hover:text-white text-left">
                Skills
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Experience */}
          <button
            type="button"
            onClick={() => setShowExperienceModal(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3 text-left">
              <Briefcase className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors shrink-0" />
              <span className="text-sm font-medium text-gray-200 group-hover:text-white text-left">
                Experience
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Contacts */}
          <button
            type="button"
            onClick={() => {
              setContactPhoneInput(contactPhone || '');
              setContactEmailInput(contactEmail || '');
              setIsEditingContacts(false);
              setShowContactModal(true);
            }}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/[0.04] transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-3 text-left">
              <Contact className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors shrink-0" />
              <span className="text-sm font-medium text-gray-200 group-hover:text-white text-left">
                Contacts
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors shrink-0" />
          </button>
        </div>

        {/* Visitor Bottom CTA Button */}
        {!isRealOwn && (
          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('casting')}
              className="w-full py-3 sm:py-3.5 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all border-0"
            >
              <Clapperboard className="w-4 h-4" />
              <span>Apply for Opportunities</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL: EDIT NAME & HEADLINE */}
      {showNameModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowNameModal(false)}
        >
          <div
            className="bg-[#141416] rounded-2xl p-5 max-w-md w-full space-y-3.5 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Profile Info</h3>
              <button
                onClick={() => setShowNameModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Anil Timilsena"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">Headline / Roles (separated by •)</label>
                <input
                  type="text"
                  placeholder="e.g. Actor • Model • Creator"
                  value={rolesInput}
                  onChange={(e) => setRolesInput(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Kathmandu, Nepal"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNameModal(false)}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNameAndHeadline}
                disabled={isSavingName}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSavingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BIO */}
      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="bg-[#141416] rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit About Me</h3>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              placeholder="Write about yourself, your acting journey, passion, and storytelling..."
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8] resize-none leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="px-3 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={isSavingBio}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {isSavingBio && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Bio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SKILLS */}
      {showSkillsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowSkillsModal(false)}
        >
          <div
            className="bg-[#141416] rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <BadgeCheck className="w-4 h-4 text-white" />
                <h3 className="text-base font-bold text-white">Skills</h3>
              </div>
              <div className="flex items-center gap-2">
                {isRealOwn && !isEditingSkillsMode && (
                  <button
                    type="button"
                    onClick={() => setIsEditingSkillsMode(true)}
                    className="text-xs font-semibold text-[#8f64f8] hover:text-[#a785fc] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setShowSkillsModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isEditingSkillsMode ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {skillsList.length > 0 ? (
                    skillsList.map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-200 font-medium select-none"
                      >
                        {skill}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400">No skills added yet.</p>
                  )}
                </div>


              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {PRESET_SKILLS.map((skill) => {
                    const isSelected = editingSkills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkillTag(skill)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-gradient-to-r from-[#522C69] to-[#522C69]/20 text-white font-bold'
                            : 'bg-black text-gray-300 border border-white/10 hover:border-white/20'
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
                    placeholder="Add custom skill..."
                    value={customSkillInput}
                    onChange={(e) => setCustomSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addCustomSkill();
                      }
                    }}
                    className="flex-1 bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                  />
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    className="px-3.5 py-2 bg-[#1a1a20] hover:bg-[#22222a] text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Add
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingSkillsMode(false)}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveSkills();
                      setIsEditingSkillsMode(false);
                    }}
                    disabled={isSavingSkills}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isSavingSkills && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PERSONAL INFORMATION */}
      {showAttributesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAttributesModal(false)}
        >
          <div
            className="bg-[#141416] rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-white" />
                <h3 className="text-base font-bold text-white">Personal Information</h3>
              </div>
              <div className="flex items-center gap-2">
                {isRealOwn && !isEditingAttributes && (
                  <button
                    type="button"
                    onClick={() => setIsEditingAttributes(true)}
                    className="text-xs font-semibold text-[#8f64f8] hover:text-[#a785fc] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setShowAttributesModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isEditingAttributes ? (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-[10px] text-gray-400 font-medium mb-1">Height</p>
                    <p className="font-semibold text-white text-xs">{profile.height || 'Not specified'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                    <p className="text-[10px] text-gray-400 font-medium mb-1">Weight</p>
                    <p className="font-semibold text-white text-xs">{profile.weight || 'Not specified'}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5">Location</p>
                    <p className="font-semibold text-white text-xs">{displayLocation}</p>
                  </div>
                  <MapPin className="w-4 h-4 text-gray-400" />
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-gray-400 font-medium mb-0.5">Role</p>
                    <p className="font-semibold text-white text-xs">{formatRole(profile.role)}</p>
                  </div>
                  <Briefcase className="w-4 h-4 text-gray-400" />
                </div>


              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] text-gray-400 font-semibold mb-1">Height</label>
                  <input
                    type="text"
                    placeholder="e.g. 5'10&quot; (178 cm)"
                    value={heightInput}
                    onChange={(e) => setHeightInput(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 font-semibold mb-1">Weight</label>
                  <input
                    type="text"
                    placeholder="e.g. 68 kg"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingAttributes(false)}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveAttributes();
                      setIsEditingAttributes(false);
                    }}
                    disabled={isSavingAttributes}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isSavingAttributes && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: CONTACTS */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowContactModal(false)}
        >
          <div
            className="bg-[#141416] rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Contact className="w-4 h-4 text-white" />
                <h3 className="text-base font-bold text-white">Contact Information</h3>
              </div>
              <div className="flex items-center gap-2">
                {isRealOwn && !isEditingContacts && (
                  <button
                    type="button"
                    onClick={() => setIsEditingContacts(true)}
                    className="text-xs font-semibold text-[#8f64f8] hover:text-[#a785fc] flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}
                <button
                  onClick={() => setShowContactModal(false)}
                  className="text-gray-400 hover:text-white cursor-pointer p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {!isEditingContacts ? (
              <div className="space-y-3 text-xs">
                {contactPhone ? (
                  <a
                    href={`tel:${contactPhone}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-colors group text-gray-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                      <Phone className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-medium">Phone</p>
                      <p className="font-semibold text-white truncate text-xs">{contactPhone}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-gray-400 text-xs">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>No phone number listed</span>
                  </div>
                )}

                {contactEmail ? (
                  <a
                    href={`mailto:${contactEmail}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 hover:bg-white/[0.05] transition-colors group text-gray-200"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-gray-400 font-medium">Email</p>
                      <p className="font-semibold text-white truncate text-xs">{contactEmail}</p>
                    </div>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-gray-400 text-xs">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <span>No email listed</span>
                  </div>
                )}

                {!contactPhone && !contactEmail && !isRealOwn && (
                  <div className="py-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs text-gray-400">
                    <span>Direct contacts not publicly listed</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowContactModal(false);
                        onNavigate('messages', targetUid);
                      }}
                      className="text-xs font-semibold text-[#8f64f8] hover:text-[#a785fc] transition-colors cursor-pointer"
                    >
                      Send Message
                    </button>
                  </div>
                )}


              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] text-gray-400 font-semibold mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. +977 98XXXXXXXX"
                    value={contactPhoneInput}
                    onChange={(e) => setContactPhoneInput(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-gray-400 font-semibold mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="e.g. artist@example.com"
                    value={contactEmailInput}
                    onChange={(e) => setContactEmailInput(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#7f4ef8]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingContacts(false)}
                    className="px-3 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleSaveContacts();
                      setIsEditingContacts(false);
                    }}
                    disabled={isSavingContacts}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {isSavingContacts && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EXPERIENCE / CREDITS */}
      {showExperienceModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowExperienceModal(false)}
        >
          <div
            className="bg-[#141416] rounded-2xl p-5 max-w-lg w-full max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-white" />
                <h3 className="text-base font-bold text-white">Experience & Credits</h3>
              </div>
              <button
                onClick={() => setShowExperienceModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <ProfileExperience
              profile={profile}
              isOwnProfile={isRealOwn}
              showAlert={showAlert}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      )}

      {/* MODAL: LIGHTBOX */}
      {lightboxIndex !== null && media[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 select-none"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            onClick={() => setLightboxIndex(null)}
            className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
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
                className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((lightboxIndex + 1) % media.length);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <img
            src={getOptimizedImageUrl(media[lightboxIndex], { width: 1440, quality: 'good', format: 'auto' })}
            alt={`Portfolio full ${lightboxIndex + 1}`}
            decoding="async"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* MODAL: VIDEO REEL */}
      {showVideoModal && introVideo && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={handleCloseVideoModal}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseVideoModal}
              className="absolute top-3 right-3 z-50 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <video
              ref={reelVideoRef}
              src={introVideo}
              autoPlay
              controls
              playsInline
              className="w-full max-h-[80vh] object-cover rounded-2xl"
            />
          </div>
        </div>
      )}

      {/* MODAL: ADD MEDIA CHOICE */}
      {showAddMediaChoice && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAddMediaChoice(false)}
        >
          <div
            className="bg-[#141416] border border-white/10 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white">Add Media</h3>
              <button
                onClick={() => setShowAddMediaChoice(false)}
                className="text-gray-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setShowAddMediaChoice(false);
                  document.getElementById('profile-direct-photo-upload')?.click();
                }}
                className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                  <Camera className="w-5 h-5 text-[#8f64f8]" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Upload Photos</p>
                  <p className="text-[11px] text-gray-400">Add portfolio photos (JPG, PNG, WEBP)</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowAddMediaChoice(false);
                  document.getElementById('profile-direct-video-upload')?.click();
                }}
                className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/20 hover:bg-white/[0.06] transition-all text-left cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <Video className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Upload Video</p>
                  <p className="text-[11px] text-gray-400">Add showreel or audition reel (MP4, MOV)</p>
                </div>
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

      {/* SHARE SHEET */}
      {showShareSheet && (
        <ShareSheet
          title={`${displayName} - NepalCasts Profile`}
          url={window.location.href}
          onClose={() => setShowShareSheet(false)}
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
