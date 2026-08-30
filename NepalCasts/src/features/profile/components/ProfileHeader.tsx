import React, { useState } from 'react';
import {
  ChevronLeft,
  Share2,
  Camera,
  MapPin,
  User as UserIcon,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';
import { Avatar } from '../../../components/ui';
import ShareSheet from '../../../components/ui/ShareSheet';
import { updateProfileData, uploadProfileMedia } from '../../../services';
import { CurrentUser } from '../../../utils/CurrentUser';
import type { UserProfile } from '../../../types';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  savedCount: number;
  onFollowToggle: () => void;
  onNavigate: (page: string, param?: any) => void;
  showAlert: (message: string, type?: any, detail?: string, action?: any) => void;
  onFollowClick?: (type: 'followers' | 'following') => void;
  hideTopNav?: boolean;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  followerCount,
  followingCount,
  savedCount,
  onFollowToggle,
  onNavigate,
  showAlert,
  onFollowClick,
  hideTopNav = false,
}: ProfileHeaderProps) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);

  const isRealOwn =
    isOwnProfile ||
    Boolean(CurrentUser.id && (profile?.uid === CurrentUser.id || (profile as any)?.id === CurrentUser.id));

  const name =
    profile?.name ||
    (profile as any)?.displayName ||
    (profile as any)?.fullName ||
    (isRealOwn ? 'Your Name' : 'Talent');

  const extractedRole =
    profile?.role ||
    (profile as any)?.primaryRole ||
    (profile as any)?.category ||
    (profile as any)?.systemRole ||
    (Array.isArray((profile as any)?.roles) ? (profile as any).roles[0] : null) ||
    (Array.isArray((profile as any)?.categories) ? (profile as any).categories[0] : null) ||
    (isRealOwn ? CurrentUser.role : null);

  const userRole =
    extractedRole && extractedRole.toLowerCase() !== 'user' && extractedRole.toLowerCase() !== 'talent'
      ? extractedRole
      : 'Actor';

  const formatTalentLocation = (p: any) => {
    const rawLoc = (p?.location || p?.city || p?.district || p?.address || '').trim();
    if (!rawLoc) return isRealOwn ? 'Kathmandu, Nepal\nNot added' : 'Kathmandu, Nepal';
    return rawLoc;
  };

  const location = formatTalentLocation(profile);

  const getTalentAge = (p: any) => {
    if (!p) return null;
    if (p.age) {
      const parsed = parseInt(p.age, 10);
      if (!isNaN(parsed) && parsed > 0 && parsed < 120) return parsed;
    }
    const rawDob = p.dob || p.dateOfBirth || p.birthDate || p.birthYear || p.birthday;
    if (rawDob) {
      if (typeof rawDob === 'number' && rawDob > 1900 && rawDob < new Date().getFullYear()) {
        return new Date().getFullYear() - rawDob;
      }
      const dob = new Date(rawDob);
      if (!isNaN(dob.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - dob.getFullYear();
        const m = today.getMonth() - dob.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age > 0 && age < 120) return age;
      }
    }
    return null;
  };

  const talentAge = getTalentAge(profile);
  const experiencesList = Array.isArray(profile?.experience) ? profile.experience : [];

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const activeUid = CurrentUser.id || profile.uid;
    if (!activeUid) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadProfileMedia(activeUid, file);
      if (url) {
        await updateProfileData(activeUid, {
          image: url,
          photoURL: url,
          profileImage: url,
        });
        showAlert('Avatar Updated', 'success');
      }
    } catch (err: any) {
      showAlert('Upload Failed', 'error', err.message || 'Could not upload avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <div className={`w-full font-sans select-none pb-2 text-left ${hideTopNav ? 'pt-0' : 'pt-3'}`}>
      {/* 1. Top Navigation Bar: Back Arrow, Centered "Profile", Share Button */}
      {!hideTopNav && (
        <div className="flex items-center justify-between px-1 sm:px-2 mb-4">
          <button
            onClick={() => onNavigate('back')}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            aria-label="Back"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Profile
          </h1>

          <button
            onClick={() => setShowShareSheet(true)}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
            title="Share Profile"
            aria-label="Share Profile"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      )}

      {/* 2. Centered Avatar with Camera Badge */}
      <div className={`flex flex-col items-center text-center space-y-3 px-4 ${hideTopNav ? '-mt-20 sm:-mt-24 lg:-mt-28' : ''}`}>
        <div className="relative">
          <div className="w-36 h-36 sm:w-44 sm:h-44 md:w-48 md:h-48 rounded-full overflow-hidden shadow-2xl ring-4 sm:ring-6 ring-[#141414]">
            <Avatar
              user={profile}
              src={
                (profile as any)?.profileImage ||
                profile?.photoURL ||
                profile?.image ||
                (profile as any)?.avatar ||
                (profile as any)?.photo ||
                (isRealOwn ? CurrentUser.imageUrl : null)
              }
              gender={profile.gender || ''}
              name={name}
              size="none"
              editable={false}
              userId={profile.uid}
              showStatus={profile.isOnline === true}
              status={profile.isOnline === true ? 'online' : 'offline'}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Frosted Glass Camera Upload Badge */}
          {isRealOwn && (
            <>
              <input
                type="file"
                id="avatar-photo-upload"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFileChange}
              />
              <label
                htmlFor="avatar-photo-upload"
                className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 w-9 h-9 sm:w-10 sm:h-10 bg-black/80 hover:bg-black/95 backdrop-blur-md rounded-full border border-white/25 flex items-center justify-center text-white cursor-pointer shadow-xl transition-all active:scale-90"
                title="Change Profile Photo"
              >
                <Camera className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
              </label>
            </>
          )}
        </div>

        {/* Name + Verified Badge */}
        <div className="space-y-2 flex flex-col items-center">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h2 className="font-apple font-extrabold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight">
              {name}
            </h2>
            {profile.verified === true && (
              <CheckCircle2 className="w-6 h-6 text-[#0088CC] fill-[#0088CC] stroke-black shrink-0" />
            )}
          </div>

          {/* Role Pill */}
          <span className="inline-block px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-white font-apple font-semibold text-xs sm:text-sm tracking-wider uppercase">
            {userRole}
          </span>
        </div>

        {/* 3 Meta Info Pills (Location, Age, Experience) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 w-full max-w-2xl pt-1">
          {/* Location Pill */}
          <div className="bg-[#161616] border border-white/5 text-neutral-200 rounded-xl px-3 py-2.5 sm:py-3 text-center flex items-center justify-center gap-2 shadow-sm font-apple font-medium text-xs sm:text-sm md:text-base">
            <MapPin className="w-4 h-4 text-white shrink-0" />
            <div className="truncate">
              {location.includes('Not added') ? (
                <span className="text-neutral-400 text-xs sm:text-sm">
                  {location.split('\n')[0] || location.split(',')[0]}
                </span>
              ) : (
                <span>{location.split(',')[0]}</span>
              )}
            </div>
          </div>

          {/* Age Pill */}
          <div className="bg-[#161616] border border-white/5 text-neutral-200 rounded-xl px-3 py-2.5 sm:py-3 text-center flex items-center justify-center gap-2 shadow-sm font-apple font-medium text-xs sm:text-sm md:text-base">
            <UserIcon className="w-4 h-4 text-white shrink-0" />
            <div className="truncate">
              {talentAge ? (
                <span>{talentAge} Years</span>
              ) : (
                <span className="text-neutral-400 text-xs sm:text-sm">Age Not added</span>
              )}
            </div>
          </div>

          {/* Experience Pill */}
          <div className="bg-[#161616] border border-white/5 text-neutral-200 rounded-xl px-3 py-2.5 sm:py-3 text-center flex items-center justify-center gap-2 shadow-sm font-apple font-medium text-xs sm:text-sm md:text-base">
            <Briefcase className="w-4 h-4 text-white shrink-0" />
            <div className="truncate">
              {experiencesList.length > 0 ? (
                <span>{experiencesList.length}+ Years Exp.</span>
              ) : (profile as any)?.experienceYears ? (
                <span>{(profile as any).experienceYears}+ Years Exp.</span>
              ) : (
                <span>1+ Years Exp.</span>
              )}
            </div>
          </div>
        </div>

        {/* Followers / Following Box */}
        <div className="bg-[#161616] border border-white/5 rounded-2xl py-3.5 px-6 grid grid-cols-2 text-center w-full max-w-2xl my-1 shadow-sm divide-x divide-white/10">
          <button
            type="button"
            onClick={() => onFollowClick?.('followers')}
            className="flex flex-col items-center justify-center hover:opacity-80 transition-opacity cursor-pointer pr-3 py-0.5"
          >
            <span className="font-apple font-extrabold text-lg sm:text-xl md:text-2xl text-white leading-none tracking-tight">
              {followerCount ? (followerCount > 999 ? `${(followerCount / 1000).toFixed(1)}K` : followerCount) : '0'}
            </span>
            <span className="font-apple text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wider mt-1.5">Followers</span>
          </button>

          <button
            type="button"
            onClick={() => onFollowClick?.('following')}
            className="flex flex-col items-center justify-center hover:opacity-80 transition-opacity cursor-pointer pl-3 py-0.5"
          >
            <span className="font-apple font-extrabold text-lg sm:text-xl md:text-2xl text-white leading-none tracking-tight">
              {followingCount ? (followingCount > 999 ? `${(followingCount / 1000).toFixed(1)}K` : followingCount) : '0'}
            </span>
            <span className="font-apple text-xs sm:text-sm text-neutral-400 font-semibold uppercase tracking-wider mt-1.5">Following</span>
          </button>
        </div>
      </div>

      {showShareSheet && (
        <ShareSheet
          profile={{
            id: profile?.uid || (profile as any)?.id || CurrentUser.id || '',
            name: name,
            role: userRole,
            location: location.replace('\nNot added', ''),
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
