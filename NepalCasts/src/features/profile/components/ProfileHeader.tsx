import React, { useState } from 'react';
import {
  ChevronLeft,
  Share2,
  Camera,
  MapPin,
  CheckCircle2,
  Pencil,
  ShieldCheck,
  MessageSquare,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Avatar } from '../../../components/ui';
import ShareSheet from '../../../components/ui/ShareSheet';
import { updateProfileData, uploadProfileMedia } from '../../../services';
import { CurrentUser } from '../../../utils/CurrentUser';
import { formatRole } from '../../../utils';
import type { UserProfile } from '../../../types';

interface ProfileHeaderProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
  savedCount: number;
  postsCount?: number;
  onFollowToggle: () => void;
  onNavigate: (page: string, param?: any) => void;
  showAlert: (message: string, type?: any, detail?: string, action?: any) => void;
  onFollowClick?: (type: 'followers' | 'following') => void;
  hideTopNav?: boolean;
  bio?: string;
  onEditBio?: () => void;
  isAdmin?: boolean;
  onOpenCall?: () => void;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  followerCount,
  followingCount,
  savedCount,
  postsCount = 0,
  onFollowToggle,
  onNavigate,
  showAlert,
  onFollowClick,
  hideTopNav = false,
  bio,
  onEditBio,
  isAdmin = false,
  onOpenCall,
}: ProfileHeaderProps) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);

  const isRealOwn =
    isOwnProfile ||
    Boolean(CurrentUser.id && (profile?.uid === CurrentUser.id || (profile as any)?.id === CurrentUser.id));

  const name =
    (profile?.name && profile.name !== 'Artist Profile' && profile.name !== 'Discovery Talent' ? profile.name : null) ||
    (profile as any)?.displayName ||
    (profile as any)?.fullName ||
    (profile as any)?.production ||
    (profile as any)?.creatorName ||
    (profile as any)?.username ||
    profile?.name ||
    (isRealOwn ? 'Your Name' : 'Talent');

  const username =
    (profile as any)?.username ||
    (profile?.name ? profile.name.toLowerCase().replace(/[^a-z0-9_.]/g, '') : null) ||
    'talent';

  const extractedRole =
    profile?.role ||
    (profile as any)?.primaryRole ||
    (profile as any)?.category ||
    (profile as any)?.systemRole ||
    (Array.isArray((profile as any)?.roles) ? (profile as any).roles[0] : null) ||
    (Array.isArray((profile as any)?.categories) ? (profile as any).categories[0] : null) ||
    (isRealOwn ? CurrentUser.role : null);

  const userRole = formatRole(extractedRole);

  const formatTalentLocation = (p: any) => {
    const rawLoc = (p?.location || p?.city || p?.district || p?.address || '').trim();
    if (!rawLoc) return isRealOwn ? 'Kathmandu, Nepal' : 'Kathmandu, Nepal';
    return rawLoc;
  };

  const location = formatTalentLocation(profile);

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

  const formatCount = (count: number) => {
    if (!count) return '0';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return count.toLocaleString();
  };

  const renderFormattedBio = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*|#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-bold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('#') || part.startsWith('@')) {
        return (
          <span key={i} className="text-sky-400 font-medium">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="w-full font-sans select-none text-left">
      {/* 1. Mobile Top Navigation Bar (Instagram style: < back, username with verified badge in center, share right) */}
      {!hideTopNav && (
        <div className="md:hidden sticky top-0 z-30 bg-black/95 backdrop-blur-md border-b border-white/[0.08] px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <button
            onClick={() => onNavigate('back')}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
            aria-label="Back"
            title="Go Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-sm sm:text-[15px] text-zinc-200 tracking-normal truncate">
              {username}
            </span>
            {profile.verified === true && (
              <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400 stroke-black shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowShareSheet(true)}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer shrink-0"
              title="Share"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Desktop Sub-Nav Breadcrumb Bar (Hidden on Mobile) */}
      <div className="hidden md:flex items-center justify-between pb-3 mb-2 border-b border-white/[0.06] px-4">
        <button
          onClick={() => onNavigate('back')}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <button
          onClick={() => setShowShareSheet(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white transition-colors cursor-pointer border border-white/10"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share Profile</span>
        </button>
      </div>

      {/* Hidden File Input for Avatar Upload */}
      {isRealOwn && (
        <input
          type="file"
          id="avatar-photo-upload"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarFileChange}
        />
      )}

      {/* 2. LAPTOP / DESKTOP PROFILE HEADER (Instagram Web Style: Avatar Left, Details Right) */}
      <div className="hidden md:flex items-start gap-8 lg:gap-12 px-4 sm:px-6 py-6 border-b border-white/[0.06]">
        {/* Large Avatar */}
        <div className="relative shrink-0">
          <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden border-2 border-white/10 shadow-lg">
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

          {isRealOwn && (
            <label
              htmlFor="avatar-photo-upload"
              className="absolute bottom-1 right-1 p-2 rounded-full bg-[#1e1e24] border border-white/20 text-white hover:bg-[#282830] cursor-pointer shadow-lg transition-all active:scale-95"
              title="Change Profile Photo"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-white" />
              )}
            </label>
          )}
        </div>

        {/* Right Info Column */}
        <div className="flex-1 space-y-4 text-left">
          {/* Row 1: Username + Badges + Action Buttons */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xl lg:text-2xl font-normal text-zinc-100 tracking-normal">
                {username}
              </h2>
              {profile.verified === true && (
                <CheckCircle2 className="w-5 h-5 text-sky-400 fill-sky-400 stroke-black shrink-0" />
              )}
              {(profile.isAdmin === true || (profile as any)?.role?.toLowerCase() === 'admin' || userRole.toLowerCase() === 'admin') && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>

            {/* Action Buttons (Inline on Desktop) */}
            <div className="flex items-center gap-2">
              {isRealOwn ? (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('/settings/profile')}
                    className="px-4 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShareSheet(true)}
                    className="px-4 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-sm transition-colors cursor-pointer"
                  >
                    Share profile
                  </button>
                  {(isAdmin || (profile as any)?.isAdmin === true || (profile as any)?.role?.toLowerCase() === 'admin') && (
                    <button
                      type="button"
                      onClick={() => onNavigate('/admin')}
                      className="p-1.5 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 transition-colors cursor-pointer"
                      title="Admin Panel"
                    >
                      <ShieldCheck className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onFollowToggle}
                    className={`px-5 py-1.5 rounded-lg font-semibold text-sm transition-colors cursor-pointer flex items-center gap-1.5 ${
                      isFollowing
                        ? 'bg-[#262626] hover:bg-[#333333] text-white'
                        : 'bg-[#522C69] hover:bg-[#663782] text-white'
                    }`}
                  >
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                    {isFollowing && <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => onNavigate('messages', profile.uid || (profile as any)?.id)}
                    className="px-4 py-1.5 rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-sm transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Message</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Row 2: Stats Row */}
          <div className="flex items-center gap-8 text-sm lg:text-base text-neutral-300">
            <div>
              <span className="font-semibold text-white mr-1.5">{formatCount(postsCount)}</span>
              <span>posts</span>
            </div>
            <button
              type="button"
              onClick={() => onFollowClick?.('followers')}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-semibold text-white mr-1.5">{formatCount(followerCount)}</span>
              <span>followers</span>
            </button>
            <button
              type="button"
              onClick={() => onFollowClick?.('following')}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-semibold text-white mr-1.5">{formatCount(followingCount)}</span>
              <span>following</span>
            </button>
          </div>

          {/* Row 3: Name, Role, Bio & Links */}
          <div className="space-y-1 text-left">
            <h1 className="font-semibold text-base text-zinc-100">
              {name}
            </h1>
            {userRole && (
              <p className="text-xs md:text-sm text-neutral-400 font-medium capitalize">
                {userRole}
              </p>
            )}
            {(bio || isRealOwn) && (
              <div className="text-sm text-neutral-200 leading-relaxed whitespace-pre-line max-w-2xl pt-0.5">
                {bio ? renderFormattedBio(bio) : <span className="text-neutral-500 italic">No bio added yet.</span>}
                {isRealOwn && onEditBio && (
                  <button
                    type="button"
                    onClick={onEditBio}
                    className="inline-flex items-center text-neutral-400 hover:text-white ml-2 p-0.5 cursor-pointer align-middle"
                    title="Edit Bio"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
            {location && (
              <div className="flex items-center gap-1 text-xs md:text-sm text-sky-400 hover:text-sky-300 pt-0.5 font-medium">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span>{location.replace('\nNot added', '')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. MOBILE PROFILE HEADER CARD: Avatar Left + 3 Stats Right (Shown only on < md) */}
      <div className="md:hidden px-4 sm:px-6 pt-3 pb-2 space-y-3">
        <div className="flex items-center gap-6 sm:gap-8 md:gap-10">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden">
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

            {/* Avatar Upload Camera Badge for Owner */}
            {isRealOwn && (
              <label
                htmlFor="avatar-photo-upload"
                className="absolute bottom-0 right-0 p-2 rounded-full bg-[#1e1e24] border border-white/20 text-white hover:bg-[#282830] cursor-pointer shadow-lg transition-all active:scale-95"
                title="Change Profile Photo"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Camera className="w-4 h-4 text-white" />
                )}
              </label>
            )}
          </div>

          {/* Stats Row (Posts, Followers, Following) */}
          <div className="flex-1 grid grid-cols-3 text-center gap-1">
            {/* Posts */}
            <div className="flex flex-col items-center justify-center py-1">
              <span className="font-bold text-lg sm:text-xl md:text-2xl text-white leading-none">
                {formatCount(postsCount)}
              </span>
              <span className="text-xs sm:text-sm md:text-[15px] text-neutral-300 mt-1.5">posts</span>
            </div>

            {/* Followers */}
            <button
              type="button"
              onClick={() => onFollowClick?.('followers')}
              className="flex flex-col items-center justify-center py-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-lg sm:text-xl md:text-2xl text-white leading-none">
                {formatCount(followerCount)}
              </span>
              <span className="text-xs sm:text-sm md:text-[15px] text-neutral-300 mt-1.5">followers</span>
            </button>

            {/* Following */}
            <button
              type="button"
              onClick={() => onFollowClick?.('following')}
              className="flex flex-col items-center justify-center py-1 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-lg sm:text-xl md:text-2xl text-white leading-none">
                {formatCount(followingCount)}
              </span>
              <span className="text-xs sm:text-sm md:text-[15px] text-neutral-300 mt-1.5">following</span>
            </button>
          </div>
        </div>

        {/* Name, Role, Bio & Links */}
        <div className="space-y-1 text-left pt-0.5">
          {/* Display Name + Verified */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="font-semibold text-sm sm:text-base text-zinc-100 tracking-normal">
              {name}
            </h1>
            {profile.verified === true && (
              <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400 stroke-black shrink-0" />
            )}
            {(profile.isAdmin === true || (profile as any)?.role?.toLowerCase() === 'admin' || userRole.toLowerCase() === 'admin') && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <ShieldCheck className="w-2.5 h-2.5" />
                Admin
              </span>
            )}
          </div>

          {/* Role / Category */}
          {userRole && (
            <p className="text-xs text-neutral-400 font-medium capitalize">
              {userRole}
            </p>
          )}

          {/* Bio text */}
          {(bio || isRealOwn) && (() => {
            const firstLine = bio ? bio.split('\n')[0] : '';
            const isLongBio = Boolean(bio && (bio.length > 90 || bio.includes('\n')));
            const bioToShow = isLongBio && !isBioExpanded ? (firstLine.length > 90 ? firstLine.slice(0, 90).trim() : firstLine) : bio;

            return (
              <div className="text-xs text-neutral-200 leading-relaxed whitespace-pre-line pt-0.5">
                {bioToShow ? (
                  <>
                    {renderFormattedBio(bioToShow)}
                    {isLongBio && !isBioExpanded ? '... ' : ' '}
                  </>
                ) : (
                  <span className="text-neutral-500 italic">
                    {isRealOwn ? 'Tap Edit Profile to add a bio...' : ''}
                  </span>
                )}
                {isLongBio && (
                  <button
                    type="button"
                    onClick={() => setIsBioExpanded(!isBioExpanded)}
                    className="text-neutral-400 hover:text-white font-medium cursor-pointer ml-1"
                  >
                    {isBioExpanded ? 'less' : 'more'}
                  </button>
                )}
                {isRealOwn && onEditBio && (
                  <button
                    type="button"
                    onClick={onEditBio}
                    className="inline-flex items-center text-neutral-400 hover:text-white ml-1.5 p-0.5 cursor-pointer align-middle"
                    title="Edit Bio"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })()}

          {/* Location / Meta link */}
          {location && (
            <div className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 pt-0.5 font-medium">
              <MapPin className="w-3 h-3 shrink-0 text-sky-400" />
              <span>{location.replace('\nNot added', '')}</span>
            </div>
          )}
        </div>

        {/* Action Buttons Row (Mobile) */}
        <div className="pt-1">
          {isRealOwn ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('/settings/profile')}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer text-center"
              >
                Edit profile
              </button>
              <button
                type="button"
                onClick={() => setShowShareSheet(true)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer text-center"
              >
                Share profile
              </button>
              {(isAdmin || (profile as any)?.isAdmin === true || (profile as any)?.role?.toLowerCase() === 'admin') && (
                <button
                  type="button"
                  onClick={() => onNavigate('/admin')}
                  className="py-1.5 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-semibold text-xs transition-colors cursor-pointer"
                  title="Admin Panel"
                >
                  <ShieldCheck className="w-4 h-4 text-red-400" />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Follow / Following Button */}
              <button
                type="button"
                onClick={onFollowToggle}
                className={`flex-1 py-1.5 px-3 rounded-lg font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  isFollowing
                    ? 'bg-[#262626] hover:bg-[#333333] text-white'
                    : 'bg-[#522C69] hover:bg-[#663782] text-white'
                }`}
              >
                <span>{isFollowing ? 'Following' : 'Follow'}</span>
                {isFollowing && <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {/* Message Button */}
              <button
                type="button"
                onClick={() => onNavigate('messages', profile.uid || (profile as any)?.id)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message</span>
              </button>
            </div>
          )}
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
            username: username,
          }}
          onClose={() => setShowShareSheet(false)}
        />
      )}
    </div>
  );
}
