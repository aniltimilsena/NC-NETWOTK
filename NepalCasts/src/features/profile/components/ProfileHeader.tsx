import React from 'react';
import { ChevronLeft, MessageSquare, Share2, UserPlus, Check, MapPin, Pencil, User as UserIcon, Briefcase, CheckCircle2 } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import { updateProfileData } from '../../../services';
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
}: ProfileHeaderProps) {
  const isRealOwn =
    isOwnProfile ||
    Boolean(CurrentUser.id && (profile?.uid === CurrentUser.id || (profile as any)?.id === CurrentUser.id));

  const name =
    profile?.name ||
    (profile as any)?.displayName ||
    (profile as any)?.fullName ||
    ((profile as any)?.email ? (profile as any).email.split('@')[0] : 'Talent');

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
      : isRealOwn && CurrentUser.role && CurrentUser.role.toLowerCase() !== 'user'
      ? CurrentUser.role
      : (profile as any)?.category && (profile as any).category.toLowerCase() !== 'user'
      ? (profile as any).category
      : 'Actor';

  const formatTalentLocation = (p: any) => {
    if (!p) return 'Kathmandu, Nepal';
    const rawLoc = (p.location || p.city || p.district || p.address || '').trim();
    const rawCity = (p.city || p.district || '').trim();
    if (!rawLoc && !rawCity) return 'Kathmandu, Nepal';
    if (rawLoc) {
      if (/nepal/i.test(rawLoc)) {
        const parts = rawLoc.split(',').map((s: string) => s.trim()).filter(Boolean);
        if (parts.length > 1) {
          const cityPart = parts.find((pt: string) => !/nepal/i.test(pt));
          return cityPart ? `${cityPart}, Nepal` : 'Nepal';
        }
        return 'Nepal';
      }
      return `${rawLoc}, Nepal`;
    }
    return rawCity ? `${rawCity}, Nepal` : 'Kathmandu, Nepal';
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

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: name,
          text: `View ${name}'s professional portfolio on NepalCasts!`,
          url: window.location.href,
        });
      } catch (_err) {
        // Ignored
      }
    } else {
      await navigator.clipboard.writeText(window.location.href);
      showAlert('Link Copied', 'info', 'Profile link copied to clipboard.');
    }
  };

  return (
    <div className="w-full font-sans select-none pt-4 pb-2">
      {/* Top Bar with Back and Action Buttons */}
      <div className="flex items-center justify-between px-2 sm:px-4 mb-4">
        <button
          onClick={() => onNavigate('back')}
          className="w-10 h-10 rounded-full bg-[#111622] hover:bg-[#161D2B] border border-[#1E2638] flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shadow-md"
          aria-label="Back"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5] text-white" />
        </button>

        <div className="flex items-center gap-2">
          {!isRealOwn && (
            <button
              onClick={onFollowToggle}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md ${
                isFollowing
                  ? 'bg-[#111622] border border-[#1E2638] text-white hover:bg-[#161D2B]'
                  : 'bg-[#0088CC] hover:bg-[#0077B3] text-white'
              }`}
            >
              {isFollowing ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>
          )}

          {isRealOwn && (
            <button
              onClick={() => onNavigate('/settings/profile')}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#111622] hover:bg-[#161D2B] text-white text-xs font-bold border border-[#1E2638] transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <Pencil className="w-3.5 h-3.5 text-gray-300" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-full bg-[#111622] hover:bg-[#161D2B] border border-[#1E2638] text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-md"
            title="Share Profile"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Centered Profile Avatar, Name, Role & Meta Pills */}
      <div className="flex flex-col items-center text-center space-y-3 px-4">
        
        {/* Centered Avatar with Cyan Glowing Ring */}
        <div className="relative">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-[#0088CC] shadow-[0_0_30px_rgba(0,136,204,0.4)] overflow-hidden">
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
              editable={isRealOwn}
              userId={profile.uid}
              showStatus={profile.isOnline === true}
              status={profile.isOnline === true ? 'online' : 'offline'}
              onUploadSuccess={(url: string) =>
                updateProfileData(CurrentUser.id || profile.uid, {
                  image: url,
                  photoURL: url,
                  profileImage: url,
                })
              }
              showAlert={showAlert}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Name + Verified Badge */}
        <div className="space-y-0.5">
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {name}
            </h1>
            {profile.verified === true && (
              <CheckCircle2 className="w-5 h-5 text-[#0088CC] fill-[#0088CC] stroke-black shrink-0" />
            )}
          </div>

          {/* Role */}
          <p className="text-sm font-medium text-gray-400 capitalize">
            {userRole}
          </p>
        </div>

        {/* 3 Meta Info Pills (Location, Age, Experience) */}
        <div className="flex items-center justify-center gap-2.5 flex-wrap pt-1.5">
          {/* Location Pill */}
          <div className="bg-[#121824] border border-[#1E293B]/80 text-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm">
            <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{location}</span>
          </div>

          {/* Age Pill */}
          <div className="bg-[#121824] border border-[#1E293B]/80 text-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm">
            <UserIcon className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{talentAge ? `${talentAge} Years` : '22+ Years'}</span>
          </div>

          {/* Experience Pill */}
          <div className="bg-[#121824] border border-[#1E293B]/80 text-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-sm">
            <Briefcase className="w-4 h-4 text-gray-400 shrink-0" />
            <span>
              {experiencesList.length > 0
                ? `${experiencesList.length}+ Years Exp.`
                : (profile as any)?.experienceYears
                ? `${(profile as any).experienceYears}+ Years Exp.`
                : '3+ Years Exp.'}
            </span>
          </div>
        </div>

        {/* Subtle Followers / Following Counts */}
        <div className="flex items-center justify-center gap-3 text-xs text-gray-400 font-medium pt-0.5">
          <button
            type="button"
            onClick={() => onFollowClick?.('followers')}
            className="hover:text-[#0088CC] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-white font-bold">{followerCount ?? 0}</span>
            <span>followers</span>
          </button>

          <span className="text-gray-600 font-bold">•</span>

          <button
            type="button"
            onClick={() => onFollowClick?.('following')}
            className="hover:text-[#0088CC] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span className="text-white font-bold">{followingCount ?? 0}</span>
            <span>following</span>
          </button>
        </div>

      </div>
    </div>
  );
}
