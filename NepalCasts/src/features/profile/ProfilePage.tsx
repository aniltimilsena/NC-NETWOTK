import React, { useState } from 'react';
import { useProfile } from './hooks/useProfile';
import SEO from '../../components/SEO';
import ProfileHeader from './components/ProfileHeader';
import ProfileMedia from './components/ProfileMedia';
import ProfileExperience from './components/ProfileExperience';
import FollowModal from './components/FollowModal';
import ShareSheet from '../../components/ui/ShareSheet';
import { doc, setDoc, deleteDoc, query, collection, where, getDocs, serverTimestamp, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { CurrentUser } from '../../utils/CurrentUser';
import { AuthService } from '../../services/AuthService';
import { updateProfileData, uploadProfileMedia } from '../../services';
import {
  Pencil,
  Plus,
  Ruler,
  Scale,
  Phone,
  Mail,
  Eye,
  MessageSquare,
  X,
  Loader2,
  Video,
  Image as ImageIcon,
  ChevronLeft,
  Share2,
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
];

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
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Direct Interactive Modals
  const [showSkillsModal, setShowSkillsModal] = useState(false);
  const [editingSkills, setEditingSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState('');
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [expTitle, setExpTitle] = useState('');
  const [expCompany, setExpCompany] = useState('');
  const [expYear, setExpYear] = useState('');
  const [expDesc, setExpDesc] = useState('');
  const [isSavingExp, setIsSavingExp] = useState(false);

  const [showAboutModal, setShowAboutModal] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const [showAttributesModal, setShowAttributesModal] = useState(false);
  const [heightInput, setHeightInput] = useState('');
  const [weightInput, setWeightInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [isSavingAttributes, setIsSavingAttributes] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const loggedInUserId = CurrentUser.id || AuthService.getUserId() || user?.uid || user?.id;
  const targetProfileId = profile?.uid || (profile as any)?.id;

  const isRealOwn =
    isOwnProfile ||
    Boolean(loggedInUserId && targetProfileId && loggedInUserId === targetProfileId);

  const activeUserId = isRealOwn ? (targetProfileId || loggedInUserId) : null;

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

  const handleUploadMedia = async (files: FileList) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    const newUrls: string[] = [];
    let failedCount = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
      const currentMedia = Array.isArray(profile?.media) ? profile.media : [];
      const updatedMedia = [...currentMedia, ...newUrls];
      setProfile((prev: any) => (prev ? { ...prev, media: updatedMedia } : prev));
      await updateProfileData(uidToUse, { media: updatedMedia });
      showAlert('Photos Uploaded', 'success');
    } else if (failedCount > 0) {
      showAlert('Upload Failed', 'error', 'Failed to upload photo(s).');
    }
  };

  const handleDeleteMedia = async (src: string) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse || !profile) return;
    try {
      const currentMedia = Array.isArray(profile.media) ? profile.media : [];
      const updatedMedia = currentMedia.filter((item) => item !== src);
      setProfile((prev: any) => (prev ? { ...prev, media: updatedMedia } : prev));
      await updateProfileData(uidToUse, { media: updatedMedia });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadIntroVideo = async (file: File) => {
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse) return;
    try {
      const url = await uploadProfileMedia(uidToUse, file);
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
        await updateProfileData(uidToUse, {
          introVideo: url,
          introVideoUrl: url,
          showreel: url,
          showreelUrl: url,
        });
        showAlert('Video Uploaded', 'success');
      } else {
        showAlert('Upload Failed', 'error', 'Failed to upload video.');
      }
    } catch (err) {
      console.error('Video upload error:', err);
      showAlert('Failed to upload video.', 'error');
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
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Direct Save Skills
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

  // 2. Direct Save Experience
  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    const uidToUse = profile?.uid || activeUserId || user?.uid;
    if (!uidToUse || !expTitle.trim()) return;
    setIsSavingExp(true);
    try {
      const currentList = Array.isArray(profile?.experience) ? profile.experience : [];
      const newExp = {
        title: expTitle.trim(),
        company: expCompany.trim(),
        year: expYear.trim(),
        description: expDesc.trim(),
      };
      const updatedList = [newExp, ...currentList];
      setProfile((prev: any) => (prev ? { ...prev, experience: updatedList } : prev));
      await updateProfileData(uidToUse, { experience: updatedList });
      showAlert('Experience Added', 'success');
      setExpTitle('');
      setExpCompany('');
      setExpYear('');
      setExpDesc('');
      setShowExperienceModal(false);
    } catch (err: any) {
      showAlert('Failed to add experience', 'error', err.message);
    } finally {
      setIsSavingExp(false);
    }
  };

  // 3. Direct Save Bio
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

  // 4. Direct Save Attributes (Height, Weight, Contacts)
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

  if (loading || resolvingUid) {
    return (
      <div className="min-h-screen bg-[#141414] pb-6 text-left animate-pulse flex flex-col items-center justify-center p-6">
        <div className="w-24 h-24 rounded-full border-2 border-white/10 skeleton mb-4" />
        <div className="h-6 w-48 skeleton rounded-lg mb-2" />
        <div className="h-4 w-32 skeleton rounded-md mb-4" />
        <div className="h-24 w-full max-w-md skeleton rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#141414] pb-6 flex flex-col items-center justify-center text-center p-6 text-white">
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-gray-400 text-sm max-w-xs mb-6">
          The profile you are looking for does not exist or has been deleted.
        </p>
        <button onClick={() => onNavigate('home')} className="px-6 py-2.5 bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold rounded-xl cursor-pointer">
          Go Back Home
        </button>
      </div>
    );
  }

  const bio = profile.bio || '';
  
  const formatPhysicalSpec = (val: any, unit: string) => {
    if (val === null || val === undefined) return null;
    const str = String(val).trim();
    if (!str || str.toLowerCase() === 'undefined' || str.toLowerCase() === 'null') return null;
    if (str.toLowerCase().includes(unit.toLowerCase()) || str.includes("'") || str.includes('"')) {
      return str;
    }
    return `${str} ${unit}`;
  };

  const height = formatPhysicalSpec(profile.height || (profile as any)?.heightInCm, 'cm');
  const weight = formatPhysicalSpec(profile.weight || (profile as any)?.weightInKg, 'kg');
  const contactPhone = profile.phone || (profile as any)?.phoneNumber || null;
  const contactEmail = profile.email || (profile as any)?.contactEmail || null;

  const rawSkills: any = profile.skills;
  const skillsList: string[] = Array.isArray(rawSkills)
    ? rawSkills.map((s) => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean)
    : typeof rawSkills === 'string' && rawSkills.trim() !== ''
    ? rawSkills.split(',').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const coverUrl =
    profile?.coverImage ||
    (profile as any)?.coverPhoto ||
    (profile as any)?.bannerImage ||
    '/hero-bg.png';

  const effectiveIsOwn = isRealOwn && !isPreviewMode;

  const renderFormattedBio = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-apple font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const renderAttributesCard = () => (
    <div className="bg-[#161616] border border-white/5 rounded-2xl p-4 sm:p-6 shadow-md space-y-2.5 text-center">
      <div className="pb-1.5 flex items-center justify-center text-center">
        <h4 className="font-apple font-bold text-base sm:text-lg text-white tracking-tight text-center">
          Physical Specs & Contact
        </h4>
      </div>

      <div className="divide-y divide-white/10">
        {/* Height Row */}
        <div className="py-3 flex items-center justify-center gap-2.5 text-sm sm:text-base font-apple">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Ruler className="w-4.5 h-4.5 text-white" />
            <span className="font-semibold text-neutral-200">Height:</span>
          </div>
          <span className={height ? 'text-white font-medium' : 'text-neutral-500'}>
            {height ? height : 'Not added'}
          </span>
          {effectiveIsOwn && (
            <button
              onClick={() => {
                setHeightInput(profile.height || '');
                setWeightInput(profile.weight || '');
                setPhoneInput(profile.phone || '');
                setEmailInput(profile.email || '');
                setShowAttributesModal(true);
              }}
              className="text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
            >
              {height ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Weight Row */}
        <div className="py-3 flex items-center justify-center gap-2.5 text-sm sm:text-base font-apple">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Scale className="w-4.5 h-4.5 text-white" />
            <span className="font-semibold text-neutral-200">Weight:</span>
          </div>
          <span className={weight ? 'text-white font-medium' : 'text-neutral-500'}>
            {weight ? weight : 'Not added'}
          </span>
          {effectiveIsOwn && (
            <button
              onClick={() => {
                setHeightInput(profile.height || '');
                setWeightInput(profile.weight || '');
                setPhoneInput(profile.phone || '');
                setEmailInput(profile.email || '');
                setShowAttributesModal(true);
              }}
              className="text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
            >
              {weight ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>

        {/* Contacts Row */}
        <div className="py-3 flex items-center justify-center gap-2.5 text-sm sm:text-base font-apple flex-wrap">
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Phone className="w-4.5 h-4.5 text-white" />
            <span className="font-semibold text-neutral-200">Contacts:</span>
          </div>
          {contactPhone || contactEmail ? (
            <div className="flex items-center gap-3 text-neutral-200 font-medium text-sm sm:text-base flex-wrap justify-center">
              {contactPhone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-white/80" />
                  <span>{contactPhone}</span>
                </div>
              )}
              {contactEmail && (
                <div className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-white/80" />
                  <span>{contactEmail}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="text-neutral-500">Not added</span>
          )}
          {effectiveIsOwn && (
            <button
              onClick={() => {
                setHeightInput(profile.height || '');
                setWeightInput(profile.weight || '');
                setPhoneInput(profile.phone || '');
                setEmailInput(profile.email || '');
                setShowAttributesModal(true);
              }}
              className="text-white/70 hover:text-white transition-colors cursor-pointer ml-1"
            >
              {contactPhone || contactEmail ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderActionButtons = () => (
    <div className="w-full">
      {isRealOwn && isPreviewMode ? (
        <div className="flex items-center gap-2.5 sm:gap-3 w-full">
          <button
            onClick={() => setIsPreviewMode(false)}
            className="flex-1 py-3 px-4 sm:py-3.5 sm:px-5 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-white/10 text-white font-bold text-xs sm:text-sm md:text-base transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <Eye className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
            <span>Exit Preview</span>
          </button>
          <button
            onClick={() => onNavigate('/settings/profile')}
            className="flex-1 py-3 px-4 sm:py-3.5 sm:px-5 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold text-xs sm:text-sm md:text-base transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <Pencil className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      ) : effectiveIsOwn ? (
        <div className="flex items-center gap-2.5 sm:gap-3 w-full">
          <button
            onClick={() => setIsPreviewMode(true)}
            className="flex-1 py-3 px-4 sm:py-3.5 sm:px-5 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-white/10 text-white font-bold text-xs sm:text-sm md:text-base transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <Eye className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-white" />
            <span>Preview Mode</span>
          </button>
          <button
            onClick={() => onNavigate('/settings/profile')}
            className="flex-1 py-3 px-4 sm:py-3.5 sm:px-5 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm font-bold text-xs sm:text-sm md:text-base transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <Pencil className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            <span>Edit Profile</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 sm:gap-3 w-full">
          <button
            onClick={handleFollowToggle}
            className={`flex-1 py-3 px-4 sm:py-3.5 sm:px-5 rounded-xl font-extrabold text-sm sm:text-base md:text-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center shadow-md ${
              isFollowing
                ? 'bg-[#222] hover:bg-[#2a2a2a] text-white border border-white/15'
                : 'bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm shadow-lg'
            }`}
          >
            <span>{isFollowing ? 'Following' : 'Follow'}</span>
          </button>
          <button
            onClick={() => onNavigate?.('messages', profile.uid || (profile as any)?.id)}
            className="flex-1 py-3 px-4 sm:py-3.5 sm:px-5 rounded-xl bg-[#1f1f1f] hover:bg-[#2a2a2a] border border-white/10 text-white font-extrabold text-sm sm:text-base md:text-lg transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 shadow-md"
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span>Message</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#141414] pb-28 sm:pb-32 lg:pb-12 text-white font-sans">
      <SEO
        title={`${profile.name || 'Talent'} | NepalCasts Profile`}
        description={profile.bio || `View ${profile.name || 'this talent'}'s portfolio, auditions, and experience on NepalCasts.`}
        image={profile.image || undefined}
        noindex={(profile as any).isPrivate === true}
      />


      {/* Hidden file inputs for media uploads */}
      <input
        type="file"
        id="profile-direct-photo-upload"
        multiple
        accept="image/*,.jpg,.jpeg,.png,.webp,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadMedia(e.target.files);
            setShowMediaModal(false);
          }
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
            setShowMediaModal(false);
          }
        }}
      />

      {/* Full-Width Edge-to-Edge Cinematic Cover Banner with Subtle Curved Bottom Edges */}
      <div className="relative w-full h-52 sm:h-64 md:h-76 lg:h-84 overflow-hidden bg-[#161616] group border-b border-white/10 rounded-b-xl sm:rounded-b-2xl">
        <img
          src={coverUrl}
          alt={`${profile.name || 'Talent'} Cover`}
          className="w-full h-full object-cover object-center"
        />

        {/* Ambient Contrast Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/40 pointer-events-none" />

        {/* Floating Top Navigation: Back Button & Share Button */}
        <div className="absolute top-3 sm:top-5 left-3 sm:left-6 lg:left-10 right-3 sm:right-6 lg:left-10 flex items-center justify-between z-10 pointer-events-auto max-w-[1600px] mx-auto">
          <button
            onClick={() => onNavigate('back')}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-lg"
            aria-label="Back"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          <button
            onClick={() => setShowShareSheet(true)}
            className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-lg"
            title="Share Profile"
            aria-label="Share Profile"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Full Screen Unified Profile Container */}
      <div className="w-full max-w-[1600px] mx-auto px-3.5 sm:px-8 lg:px-12 space-y-6">
        {/* Main Content Grid: 1 column on mobile, 2 columns on PC / Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          {/* Left Column (Desktop Hero & Specs Sidebar) */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4 lg:sticky lg:top-20">
            {/* 1. Header (Centered Avatar overlapping cover, Bio card, 3 Meta Pills, Followers Count Box) */}
            <ProfileHeader
              profile={profile}
              isOwnProfile={effectiveIsOwn}
              isFollowing={isFollowing}
              followerCount={followerCount}
              followingCount={followingCount}
              savedCount={savedCount}
              onFollowToggle={handleFollowToggle}
              onNavigate={onNavigate}
              showAlert={showAlert}
              onFollowClick={handleFollowModalOpen}
              hideTopNav={true}
              bio={bio}
              onEditBio={() => {
                setBioInput(profile.bio || '');
                setShowAboutModal(true);
              }}
            />

            {/* Desktop Action Buttons (Directly embedded in Left Sidebar on Laptop/Desktop) */}
            <div className="hidden lg:block pt-1">
              {renderActionButtons()}
            </div>

            {/* Desktop Attributes & Contacts */}
            <div className="hidden lg:block">
              {renderAttributesCard()}
            </div>
          </div>

          {/* Right Column (Portfolio, Media, Experience, Skills) */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-6">
            {/* 2. Media Section Card */}
            <div className="bg-[#161616] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-md text-left">
              <ProfileMedia
                profile={profile}
                isOwnProfile={effectiveIsOwn}
                onUploadMedia={handleUploadMedia}
                onDeleteMedia={handleDeleteMedia}
                onUploadIntroVideo={handleUploadIntroVideo}
                onDeleteIntroVideo={handleDeleteIntroVideo}
                onNavigate={() => setShowMediaModal(true)}
              />
            </div>

            {/* Attributes Box (mobile only) */}
            <div className="lg:hidden">
              {renderAttributesCard()}
            </div>

            {/* 4. Experience Section Card */}
            <div className="bg-[#161616] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-md text-left">
              <ProfileExperience
                profile={profile}
                isOwnProfile={effectiveIsOwn}
                showAlert={showAlert}
                onNavigate={() => setShowExperienceModal(true)}
              />
            </div>

            {/* 5. Skills Section Card */}
            <div className="bg-[#161616] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-md text-left space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-apple font-bold text-lg sm:text-xl text-white tracking-tight">
                  Skills
                </h3>
                {effectiveIsOwn && (
                  <button
                    onClick={() => {
                      setEditingSkills(skillsList);
                      setShowSkillsModal(true);
                    }}
                    className="font-apple text-xs sm:text-sm font-semibold text-[#522C69] hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    + Edit Skills
                  </button>
                )}
              </div>

              {skillsList.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {skillsList.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-white text-black text-xs sm:text-sm font-apple font-bold px-3.5 py-1.5 rounded-full shadow-sm select-none"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              ) : effectiveIsOwn ? (
                <div
                  onClick={() => {
                    setEditingSkills(skillsList);
                    setShowSkillsModal(true);
                  }}
                  className="border border-dashed border-white/10 bg-black rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-white/20 transition-colors group"
                >
                  <Plus className="w-4 h-4 text-gray-400 group-hover:text-white mb-1" />
                  <span className="text-xs font-semibold text-gray-400 group-hover:text-white">
                    Add Skills
                  </span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Add skills you are good at...</p>
                </div>
              ) : (
                <div className="rounded-xl border border-white/5 bg-black/40 py-6 px-4 flex flex-col items-center justify-center text-center space-y-1">
                  <p className="text-xs sm:text-sm text-neutral-400 font-medium">No skills listed yet</p>
                  <p className="text-[11px] sm:text-xs text-neutral-500">Skills and specializations will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT SKILLS */}
      {showSkillsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowSkillsModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Skills</h3>
              <button
                onClick={() => setShowSkillsModal(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Tap skill tags to select or type your custom skill below.
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
              {PRESET_SKILLS.map((skill) => {
                const isSelected = editingSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkillTag(skill)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white font-bold shadow-md'
                        : 'bg-[#121212] text-gray-300 border border-white/10 hover:border-white/20'
                    }`}
                  >
                    {isSelected ? `✓ ${skill}` : `+ ${skill}`}
                  </button>
                );
              })}
            </div>

            {/* Custom Skill Input */}
            <div className="flex gap-2 pt-2">
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
                className="flex-1 bg-[#121212] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
              />
              <button
                type="button"
                onClick={addCustomSkill}
                className="px-3.5 py-2 bg-[#242424] hover:bg-[#2e2e2e] border border-white/10 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Add
              </button>
            </div>

            {/* Save Buttons */}
            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowSkillsModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSkills}
                disabled={isSavingSkills}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingSkills ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save Skills</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD EXPERIENCE */}
      {showExperienceModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowExperienceModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Work Experience</h3>
              <button
                onClick={() => setShowExperienceModal(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExperience} className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Role / Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Lead Actor, Supporting Actor, Model"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  required
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Production / Project / Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. Maya Short Film, Ek Din Web Series"
                  value={expCompany}
                  onChange={(e) => setExpCompany(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Year / Timeline
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2024 or 2021 - 2023"
                  value={expYear}
                  onChange={(e) => setExpYear(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief details about your role..."
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExperienceModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExp}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSavingExp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Experience</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD MEDIA QUICK PICKER */}
      {showMediaModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowMediaModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Add Portfolio Media</h3>
              <button
                onClick={() => setShowMediaModal(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  document.getElementById('profile-direct-photo-upload')?.click();
                }}
                className="w-full p-4 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] border border-white/10 flex items-center gap-3.5 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#522C69]/10 text-[#522C69] flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block group-hover:text-[#522C69] transition-colors">
                    Upload Photos
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    JPG, PNG, WebP portfolio shots
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  document.getElementById('profile-direct-video-upload')?.click();
                }}
                className="w-full p-4 rounded-xl bg-[#222222] hover:bg-[#2a2a2a] border border-white/10 flex items-center gap-3.5 text-left transition-all cursor-pointer group"
              >
                <div className="w-10 h-10 rounded-lg bg-[#522C69]/10 text-[#522C69] flex items-center justify-center shrink-0">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block group-hover:text-[#522C69] transition-colors">
                    Upload Intro Video
                  </span>
                  <span className="text-[11px] text-gray-400 block">
                    MP4, MOV audition showreel
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: EDIT BIO */}
      {showAboutModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAboutModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Bio</h3>
              <button
                onClick={() => setShowAboutModal(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <textarea
              rows={4}
              placeholder="Tell casting directors about your passion, training, and acting background..."
              value={bioInput}
              onChange={(e) => setBioInput(e.target.value)}
              className="w-full bg-[#121212] border border-white/10 rounded-xl p-3.5 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69] resize-none leading-relaxed"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAboutModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={isSavingBio}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingBio ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save Bio</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT ATTRIBUTES (Height, Weight, Contacts) */}
      {showAttributesModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowAttributesModal(false)}
        >
          <div
            className="bg-[#181818] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-fade-in text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Edit Physical & Contact Info</h3>
              <button
                onClick={() => setShowAttributesModal(false)}
                className="text-gray-400 hover:text-white text-sm cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Height
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5'10&quot; (178 cm)"
                  value={heightInput}
                  onChange={(e) => setHeightInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Weight
                </label>
                <input
                  type="text"
                  placeholder="e.g. 68 kg"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. +977 9812345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 font-semibold mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. anil.timilsena@gmail.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full bg-[#121212] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-[#522C69]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAttributesModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAttributes}
                disabled={isSavingAttributes}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#522C69] to-[#522C69]/20 hover:from-[#663782] hover:to-[#522C69]/35 text-white shadow-sm text-xs font-bold shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingAttributes ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Save Info</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar (Mobile Only: hidden on laptop/desktop since embedded in sidebar) */}
      <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-[#141414]/90 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_35px_rgba(0,0,0,0.9)]">
        <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl mx-auto">
          {renderActionButtons()}
        </div>
      </div>

      <FollowModal
        type={showFollowModal || 'followers'}
        isOpen={!!showFollowModal}
        onClose={handleFollowModalClose}
        list={followList}
        loading={loadingFollowList}
        onNavigate={onNavigate}
      />

      {showShareSheet && (
        <ShareSheet
          profile={{
            id: profile?.uid || (profile as any)?.id || CurrentUser.id || '',
            name: profile.name || 'Talent',
            role: profile.role || 'Actor',
            location: (profile.location || 'Kathmandu, Nepal').replace('\nNot added', ''),
            followers: followerCount || 0,
            rating: (profile as any)?.rating || 5.0,
            image: (profile as any)?.profileImage || profile?.photoURL || profile?.image || (profile as any)?.avatar || null,
            verified: profile?.verified === true,
            username: (profile as any)?.username || null,
          }}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </div>
  );
}
