import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, MessageSquare, Share2, UserPlus, Check, MapPin, Pencil } from 'lucide-react';
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
  const coverImgRef = useRef<HTMLImageElement>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);

  const isRealOwn =
    isOwnProfile ||
    Boolean(CurrentUser.id && (profile?.uid === CurrentUser.id || (profile as any)?.id === CurrentUser.id));

  const activeCover = profile.coverImage || (profile as any)?.coverPhoto;
  const validCover = activeCover && activeCover !== '/hero-bg.png' && activeCover !== '/hero-bg.webp' ? activeCover : null;
  const coverImage = validCover || '/hero-bg.webp';

  useEffect(() => {
    setCoverLoaded(false);
    if (coverImgRef.current && coverImgRef.current.complete) {
      setCoverLoaded(true);
    }
  }, [coverImage]);

  const name =
    profile?.name ||
    (profile as any)?.displayName ||
    (profile as any)?.fullName ||
    ((profile as any)?.email ? (profile as any).email.split('@')[0] : 'Discovery Talent');

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
      : 'Model';

  const location = (profile as any)?.location || (profile as any)?.city || 'Dailekh, Nepal';

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
    <div className="w-full px-0 pt-0 font-sans select-none">
      {/* Main Profile Header Card (Edge to Edge Full Screen) */}
      <div className="w-full bg-[#121215] border-b border-white/10 overflow-hidden shadow-2xl">
        
        {/* Cover Photo Banner */}
        <div className="relative h-52 sm:h-72 md:h-80 lg:h-96 w-full bg-[#18181D] overflow-hidden group/cover">
          {!coverLoaded && <div className="absolute inset-0 skeleton" />}
          <img
            ref={coverImgRef}
            src={coverImage}
            alt="Profile Cover"
            fetchPriority="high"
            decoding="async"
            onLoad={() => setCoverLoaded(true)}
            className={`w-full h-full object-cover object-center select-none pointer-events-none transition-opacity duration-300 ${
              coverLoaded ? 'opacity-95' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121215] via-[#121215]/40 to-transparent" />

          {/* Top Back and Share Actions */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20">
            <button
              onClick={() => onNavigate('back')}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white border border-white/20 transition-all active:scale-95 cursor-pointer shadow-lg"
              aria-label="Back"
            >
              <ChevronLeft className="w-6 h-6 stroke-[2.5] text-white" />
            </button>

            <button
              onClick={handleShare}
              className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-lg"
              title="Share Profile"
            >
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Profile Info Details inside Dark Card */}
        <div className="px-4 sm:px-8 pb-5 sm:pb-6 pt-0 relative bg-[#121215]">
          
          {/* Main Info Row: Avatar + Name/Location on Left, Actions on Right */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            
            {/* Left: Avatar + Details Cluster */}
            <div className="flex flex-row items-end gap-3.5 sm:gap-6 min-w-0">
              
              {/* Profile Avatar */}
              <div className="relative shrink-0 -mt-16 sm:-mt-20 z-20">
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
                  className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-[#121215] bg-[#121215] shadow-2xl overflow-hidden"
                />
              </div>

              {/* Name, Role/Location, and Followers */}
              <div className="space-y-0.5 sm:space-y-1 pb-1 pt-3 sm:pt-4 text-left min-w-0 flex-1">
                
                {/* Full Name */}
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate">
                    {name}
                  </h1>
                  {profile.verified === true && (
                    <span
                      className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-[#0088CC] inline-flex items-center justify-center text-white shrink-0 shadow-md"
                      title="Verified Professional Talent"
                    >
                      <svg className="w-3 h-3 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                </div>

                {/* Role & Location */}
                <p className="text-xs sm:text-sm font-semibold text-gray-300 flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <span className="capitalize text-[#0088CC]">{userRole}</span>
                  <span className="text-gray-500">•</span>
                  <span className="text-gray-400 flex items-center gap-1 font-normal truncate">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{location}</span>
                  </span>
                </p>

                {/* Followers & Following Stats */}
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-300 font-medium pt-1">
                  <button
                    type="button"
                    onClick={() => onFollowClick?.('followers')}
                    className="hover:text-[#0088CC] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="text-white font-extrabold text-sm sm:text-base">{followerCount ?? 0}</span>
                    <span className="text-gray-400 font-medium">followers</span>
                  </button>

                  <span className="text-gray-600 font-bold">•</span>

                  <button
                    type="button"
                    onClick={() => onFollowClick?.('following')}
                    className="hover:text-[#0088CC] transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span className="text-white font-extrabold text-sm sm:text-base">{followingCount ?? 0}</span>
                    <span className="text-gray-400 font-medium">following</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Right / Bottom on Mobile: Action Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0">
              {!isRealOwn ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={onFollowToggle}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-lg ${
                      isFollowing
                        ? 'bg-white/10 border border-white/15 text-white hover:bg-white/15'
                        : 'bg-[#0088CC] hover:bg-[#0077B3] text-white shadow-[#0088CC]/30'
                    }`}
                  >
                    {isFollowing ? <Check className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    <span>{isFollowing ? 'Following' : 'Follow'}</span>
                  </button>

                  <button
                    onClick={() => onNavigate('messages', profile.uid)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 border border-white/15 hover:bg-white/15 text-white text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-md"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-[#0088CC]" />
                    <span>Message</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onNavigate('/settings/profile')}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/15 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <Pencil className="w-3.5 h-3.5 text-gray-300" />
                  <span>Edit profile</span>
                </button>
              )}
            </div>

          </div>

          {/* Open to Work Tag */}
          {profile.openToWork && (
            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Open to Castings &amp; Projects</span>
              </span>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
