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
import { isUserOnline } from '../../../utils/presence';
import { notifyProfileUpdated } from '../services/users';
import { useUser } from '@clerk/clerk-react';
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
  onProfileUpdated?: (updated: any) => void;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  followerCount,
  followingCount,
  savedCount: _savedCount,
  postsCount = 0,
  onFollowToggle,
  onNavigate,
  showAlert,
  onFollowClick,
  hideTopNav = false,
  bio,
  onEditBio,
  isAdmin = false,
  onOpenCall: _onOpenCall,
  onProfileUpdated,
}: ProfileHeaderProps) {
  const { user: clerkUser } = useUser();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
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
    const activeUid = CurrentUser.id || profile?.uid || (profile as any)?.id;
    if (!activeUid) {
      showAlert('Sign In Required', 'warning', 'Please sign in to update your profile photo.');
      return;
    }

    // Instant local preview for immediate visual feedback
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

        if (onProfileUpdated) {
          onProfileUpdated({
            image: url,
            photoURL: url,
            profileImage: url,
          });
        }

        // Sync avatar to Clerk so top navbar & user button reflect the new photo
        if (clerkUser) {
          try {
            await clerkUser.setProfileImage({ file });
          } catch (clerkErr) {
            console.warn('[ProfileHeader] Clerk avatar sync skipped:', clerkErr);
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
            type="button"
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/5 transition-colors cursor-pointer shrink-0"
            aria-label="Back"
            title="Go Back"
          >
            <ChevronLeft className="w-6 h-6 text-white" strokeWidth={2.2} />
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
      <div className="hidden md:flex items-start gap-8 lg:gap-12 px-4 sm:px-6 py-6 border-b border-[#E7E5E0]">
        {/* Large Avatar */}
        <div className="relative shrink-0">
          <div className="w-32 h-32 lg:w-36 lg:h-36 rounded-full overflow-hidden border border-[#E7E5E0] shadow-sm bg-white">
            <Avatar
              user={profile}
              src={
                avatarPreviewUrl ||
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
              showStatus={isUserOnline(profile)}
              status={isUserOnline(profile) ? 'online' : 'offline'}
              className="w-full h-full object-cover border-none shadow-none"
            />
          </div>

          {isRealOwn && (
            <label
              htmlFor="avatar-photo-upload"
              className="absolute bottom-1 right-1 p-2 rounded-full bg-white border border-[#E7E5E0] text-[#194332] hover:bg-[#FAF8F4] cursor-pointer shadow-sm transition-all active:scale-95"
              title="Change Profile Photo"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-4 h-4 text-[#194332] animate-spin" />
              ) : (
                <Camera className="w-4 h-4 text-[#194332]" />
              )}
            </label>
          )}
        </div>

        {/* Right Info Column */}
        <div className="flex-1 space-y-4 text-left">
          {/* Row 1: Name + Badges + Action Buttons */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl lg:text-2xl font-medium text-zinc-100 tracking-wide">
                {name}
              </h2>
              {username && username !== name && (
                <span className="text-sm text-neutral-400 font-normal">
                  @{username}
                </span>
              )}
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

            {/* Role & Action Buttons in same line on Desktop */}
            <div className="flex items-center gap-3">
              {userRole && (
                <span className="text-sm font-medium text-neutral-300 capitalize">
                  {userRole}
                </span>
              )}

              <div className="flex items-center gap-2.5">
                {isRealOwn ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onNavigate('/settings/profile')}
                      className="px-5 py-2 min-w-[110px] rounded-xl bg-[#262626] hover:bg-[#333333] text-white font-semibold text-sm transition-colors cursor-pointer text-center"
                    >
                      Edit profile
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowShareSheet(true)}
                      className="px-5 py-2 min-w-[110px] rounded-xl bg-[#262626] hover:bg-[#333333] text-white font-semibold text-sm transition-colors cursor-pointer text-center"
                    >
                      Share profile
                    </button>
                    {(isAdmin || (profile as any)?.isAdmin === true || (profile as any)?.role?.toLowerCase() === 'admin') && (
                      <button
                        type="button"
                        onClick={() => onNavigate('/admin')}
                        className="p-2 px-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 transition-colors cursor-pointer"
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
                      className={`px-6 py-2 min-w-[105px] rounded-xl font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                        isFollowing
                          ? 'bg-[#262626] hover:bg-[#333333] text-white'
                          : 'bg-[#522C69] hover:bg-[#663782] text-white'
                      }`}
                    >
                      <span>{isFollowing ? 'Connected' : 'Connect'}</span>
                      {isFollowing && <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const effectiveRecipientId = profile.uid || (profile as any)?.id || (profile as any)?.userId || (profile as any)?.canonicalUid || (profile as any)?.linkedUid || profile.username;
                        if (effectiveRecipientId) {
                          onNavigate('messages', effectiveRecipientId);
                        }
                      }}
                      className="px-6 py-2 min-w-[115px] rounded-xl bg-[#262626] hover:bg-[#333333] text-white font-semibold text-sm transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Message</span>
                    </button>
                  </>
                )}
              </div>
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
              <span>connects</span>
            </button>
            <button
              type="button"
              onClick={() => onFollowClick?.('following')}
              className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-semibold text-white mr-1.5">{formatCount(followingCount)}</span>
              <span>connected</span>
            </button>
          </div>

          {/* Row 3: Bio & Links */}
          <div className="flex flex-col gap-1 text-left">
            {(bio || isRealOwn) && (
              <div className="text-sm text-neutral-200 leading-normal whitespace-pre-line max-w-2xl">
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
            {(() => {
              const cleanLocation = location ? location.replace(/\bNot added\b/gi, '').replace(/\n+/g, ' ').trim() : '';
              if (!cleanLocation) return null;
              return (
                <div className="flex items-center gap-1 text-xs md:text-sm text-sky-400 hover:text-sky-300 font-medium">
                  <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                  <span>{cleanLocation}</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* 3. MOBILE PROFILE HEADER CARD: Avatar Left + 3 Stats Right (Shown only on < md) */}
      <div className="md:hidden px-4 sm:px-6 pt-2 pb-1 space-y-2">
        <div className="flex items-center gap-5 sm:gap-7">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border border-[#E7E5E0] shadow-sm bg-white">
              <Avatar
                user={profile}
                src={
                  avatarPreviewUrl ||
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
                showStatus={isUserOnline(profile)}
                status={isUserOnline(profile) ? 'online' : 'offline'}
                className="w-full h-full object-cover border-none shadow-none"
              />
            </div>

            {/* Avatar Upload Camera Badge for Owner */}
            {isRealOwn && (
              <label
                htmlFor="avatar-photo-upload"
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white border border-[#E7E5E0] text-[#194332] hover:bg-[#FAF8F4] cursor-pointer shadow-sm transition-all active:scale-95"
                title="Change Profile Photo"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 text-[#194332] animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-[#194332]" />
                )}
              </label>
            )}
          </div>

          {/* Stats Row (Posts, Followers, Following) */}
          <div className="flex-1 grid grid-cols-3 text-center gap-1">
            {/* Posts */}
            <div className="flex flex-col items-center justify-center py-0.5">
              <span className="font-bold text-base sm:text-lg text-white leading-none">
                {formatCount(postsCount)}
              </span>
              <span className="text-xs sm:text-[13px] text-neutral-300 mt-1">posts</span>
            </div>

            {/* Followers */}
            <button
              type="button"
              onClick={() => onFollowClick?.('followers')}
              className="flex flex-col items-center justify-center py-0.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-base sm:text-lg text-white leading-none">
                {formatCount(followerCount)}
              </span>
              <span className="text-xs sm:text-[13px] text-neutral-300 mt-1">connects</span>
            </button>

            {/* Following */}
            <button
              type="button"
              onClick={() => onFollowClick?.('following')}
              className="flex flex-col items-center justify-center py-0.5 cursor-pointer hover:opacity-80 transition-opacity"
            >
              <span className="font-bold text-base sm:text-lg text-white leading-none">
                {formatCount(followingCount)}
              </span>
              <span className="text-xs sm:text-[13px] text-neutral-300 mt-1">connected</span>
            </button>
          </div>
        </div>

        {/* Name, Role, Bio & Links */}
        <div className="flex flex-col gap-0 text-left">
          {/* Display Name + Verified Badges */}
          <div className="flex items-center gap-1.5 min-w-0 leading-none">
            <h1 className="font-medium text-base sm:text-lg text-zinc-100 tracking-normal truncate leading-none">
              {name}
            </h1>
            {profile.verified === true && (
              <CheckCircle2 className="w-4 h-4 text-sky-400 fill-sky-400 stroke-black shrink-0" />
            )}
            {(profile.isAdmin === true || (profile as any)?.role?.toLowerCase() === 'admin' || userRole.toLowerCase() === 'admin') && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                <ShieldCheck className="w-2.5 h-2.5" />
                Admin
              </span>
            )}
          </div>

          {/* Role (e.g. Model) in SAME LINE with Action Buttons (Follow / Message) */}
          <div className="flex items-center justify-between gap-3 mt-1 mb-1">
            {userRole ? (
              <span className="text-xs sm:text-sm font-semibold text-neutral-200 capitalize shrink-0 leading-none">
                {userRole}
              </span>
            ) : <div />}

            {/* Action Buttons right-aligned on same line without overlapping name */}
            <div className="flex items-center justify-end gap-2 shrink-0">
              {isRealOwn ? (
                <>
                  <button
                    type="button"
                    onClick={() => onNavigate('/settings/profile')}
                    className="h-7 px-4 sm:px-5 min-w-[95px] sm:min-w-[110px] rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-xs sm:text-[13px] transition-colors cursor-pointer text-center active:scale-95 shadow-sm flex items-center justify-center"
                  >
                    Edit profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowShareSheet(true)}
                    className="h-7 px-4 sm:px-5 min-w-[95px] sm:min-w-[110px] rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-xs sm:text-[13px] transition-colors cursor-pointer text-center active:scale-95 shadow-sm flex items-center justify-center"
                  >
                    Share profile
                  </button>
                  {(isAdmin || (profile as any)?.isAdmin === true || (profile as any)?.role?.toLowerCase() === 'admin') && (
                    <button
                      type="button"
                      onClick={() => onNavigate('/admin')}
                      className="h-7 px-2.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-200 font-semibold text-xs transition-colors cursor-pointer active:scale-95 flex items-center justify-center"
                      title="Admin Panel"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onFollowToggle}
                    className={`h-7 px-4 sm:px-5 min-w-[95px] sm:min-w-[110px] rounded-lg font-semibold text-xs sm:text-[13px] transition-colors cursor-pointer flex items-center justify-center gap-1 active:scale-95 shadow-sm ${
                      isFollowing
                        ? 'bg-[#262626] hover:bg-[#333333] text-white'
                        : 'bg-[#522C69] hover:bg-[#663782] text-white'
                    }`}
                  >
                    <span>{isFollowing ? 'Connected' : 'Connect'}</span>
                    {isFollowing && <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const effectiveRecipientId = profile.uid || (profile as any)?.id || (profile as any)?.userId || (profile as any)?.canonicalUid || (profile as any)?.linkedUid || profile.username;
                      if (effectiveRecipientId) {
                        onNavigate('messages', effectiveRecipientId);
                      }
                    }}
                    className="h-7 px-4 sm:px-5 min-w-[100px] sm:min-w-[115px] rounded-lg bg-[#262626] hover:bg-[#333333] text-white font-semibold text-xs sm:text-[13px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Message</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Bio text */}
          {(bio || isRealOwn) && (() => {
            const firstLine = bio ? bio.split('\n')[0] : '';
            const isLongBio = Boolean(bio && (bio.length > 90 || bio.includes('\n')));
            const rawBioToShow = isLongBio && !isBioExpanded ? (firstLine.length > 90 ? firstLine.slice(0, 90).trim() : firstLine) : bio;
            const bioToShow = rawBioToShow ? rawBioToShow.trim() : '';

            return (
              <div className="text-xs text-neutral-200 leading-tight whitespace-pre-line mt-0.5">
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
          {(() => {
            const cleanLocation = location ? location.replace(/\bNot added\b/gi, '').replace(/\n+/g, ' ').trim() : '';
            if (!cleanLocation) return null;
            return (
              <div className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 font-medium leading-none">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-sky-400" />
                <span>{cleanLocation}</span>
              </div>
            );
          })()}
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
