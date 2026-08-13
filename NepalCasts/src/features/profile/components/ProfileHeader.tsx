import React, { useRef, useState, useEffect } from 'react';
import { ChevronLeft, MessageSquare, Star, Share2, UserPlus } from 'lucide-react';
import { Avatar } from '../../../components/ui';
import ConfirmDialog from '../../../components/ui/ConfirmDialog';
import { uploadProfileMedia, updateProfileData } from '../../../services';
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

export default function ProfileHeader({ profile, isOwnProfile, isFollowing, followerCount, followingCount, savedCount, onFollowToggle, onNavigate, showAlert, onFollowClick }: ProfileHeaderProps) {
    const coverFileInputRef = useRef<HTMLInputElement>(null);
    const coverImgRef = useRef<HTMLImageElement>(null);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const [coverUploadProgress, setCoverUploadProgress] = useState(0);
    const [showCoverMenu, setShowCoverMenu] = useState(false);
    const [confirmDeleteCoverOpen, setConfirmDeleteCoverOpen] = useState(false);
    const [isDeletingCover, setIsDeletingCover] = useState(false);
    const [localCover, setLocalCover] = useState<string | null>(null);

    useEffect(() => {
        if (profile?.coverImage) {
            setLocalCover(profile.coverImage);
        }
    }, [profile?.coverImage]);

    useEffect(() => {
        if (!showCoverMenu)
            return;
        const close = () => setShowCoverMenu(false);
        document.addEventListener('click', close, { once: true });
        return () => document.removeEventListener('click', close);
    }, [showCoverMenu]);

    const isRealOwn = isOwnProfile || Boolean(CurrentUser.id && (profile?.uid === CurrentUser.id || (profile as any)?.id === CurrentUser.id));
    const avatarUrl = profile?.image || null;
    const activeCover = localCover || profile.coverImage || (profile as any)?.coverPhoto;
    const validCover = activeCover && activeCover !== '/hero-bg.png' && activeCover !== '/hero-bg.webp' ? activeCover : null;
    const coverImage = validCover || '/hero-bg.webp';
    const canEditCover = isRealOwn;
    const [coverLoaded, setCoverLoaded] = useState(false);
    useEffect(() => {
        setCoverLoaded(false);
        if (coverImgRef.current && coverImgRef.current.complete) {
            setCoverLoaded(true);
        }
    }, [coverImage]);
    const isPremiumUser = Boolean(
        profile?.isPremium || 
        profile?.premium || 
        (profile as any)?.isPro || 
        (isRealOwn && CurrentUser.premium)
    );
    const name = profile?.name || (profile as any)?.displayName || (profile as any)?.fullName || ((profile as any)?.email ? (profile as any).email.split('@')[0] : 'Discovery Talent');
    const extractedRole = profile?.role || (profile as any)?.primaryRole || (profile as any)?.category || (profile as any)?.systemRole || (Array.isArray((profile as any)?.roles) ? (profile as any).roles[0] : null) || (Array.isArray((profile as any)?.categories) ? (profile as any).categories[0] : null) || (isRealOwn ? CurrentUser.role : null);
    const userRole = (extractedRole && extractedRole.toLowerCase() !== 'user' && extractedRole.toLowerCase() !== 'talent') 
        ? extractedRole 
        : (isRealOwn && CurrentUser.role && CurrentUser.role.toLowerCase() !== 'user' ? CurrentUser.role : ((profile as any)?.category && (profile as any).category.toLowerCase() !== 'user' ? (profile as any).category : 'Model'));

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: name,
                    text: `Check out ${name}'s profile on NepalCasts!`,
                    url: window.location.href,
                });
            }
            catch (_err) {
                // Share cancelled or failed, ignore
            }
        }
        else {
            await navigator.clipboard.writeText(window.location.href);
            showAlert('Link Copied', 'info', 'Profile link copied to clipboard.');
        }
    };

    const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const targetUid = profile?.uid || (profile as any)?.id || CurrentUser.id;
        if (!file || !targetUid)
            return;
        if (file.size > 10 * 1024 * 1024) {
            showAlert('File Too Large', 'error', 'Cover image exceeds the 10MB size limit.');
            return;
        }
        setIsUploadingCover(true);
        setCoverUploadProgress(0);
        try {
            const url = await uploadProfileMedia(targetUid, file, (progress: number) => {
                setCoverUploadProgress(Math.round(progress));
            });
            if (url) {
                setLocalCover(url);
                await updateProfileData(targetUid, { coverImage: url });
            }
            else {
                throw new Error("Failed to upload cover banner.");
            }
        }
        catch (err: any) {
            console.error(err);
            showAlert('Upload Failed', 'error', err.message || 'Failed to upload cover banner.');
        }
        finally {
            setIsUploadingCover(false);
            if (e.target)
                e.target.value = '';
        }
    };

    const handleDeleteCover = async () => {
        const targetUid = profile?.uid || (profile as any)?.id || CurrentUser.id;
        if (!targetUid)
            return;
        setIsDeletingCover(true);
        try {
            setLocalCover(null);
            await updateProfileData(targetUid, { coverImage: '' });
            showAlert('Cover Removed', 'info', 'Profile cover image has been removed.');
        }
        catch (err: any) {
            showAlert('Error', 'error', 'Failed to remove cover image.');
        }
        finally {
            setIsDeletingCover(false);
            setConfirmDeleteCoverOpen(false);
        }
    };

    return (<div className="relative font-sans select-none">
      {/* Static Hero Cover Banner */}
      <div className="block h-[220px] sm:h-[320px] relative w-full overflow-hidden bg-[#0A0A0F] select-none">
        {!coverLoaded && <div className="absolute inset-0 skeleton" />}
        <img
          ref={coverImgRef}
          src={coverImage}
          alt="Hero Cover"
          fetchpriority="high"
          decoding="async"
          onLoad={() => setCoverLoaded(true)}
          className={`w-full h-full object-cover object-center select-none pointer-events-none transition-opacity duration-300 ${coverLoaded ? 'opacity-90' : 'opacity-0'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/30 to-transparent"/>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent pointer-events-none"/>

        {/* Back Button */}
        <button onClick={() => onNavigate('back')} className="absolute top-4 left-4 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all border border-white/15 active:scale-95 z-20 shrink-0 cursor-pointer shadow-lg" aria-label="Back">
          <ChevronLeft className="w-6 h-6" strokeWidth={2.5}/>
        </button>

        {/* Share Button */}
        <div className="absolute top-4 right-4 z-20">
          <button onClick={handleShare} className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 hover:bg-black/80 text-white flex items-center justify-center shadow-lg active:scale-95 transition-all" title="Share Profile">
            <Share2 className="w-4 h-4 text-white"/>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 sm:-mt-24 relative z-20 flex flex-col items-center text-center">
        <div className="relative z-10 mb-3">
          <Avatar 
            user={profile}
            src={(profile as any)?.profileImage || profile?.photoURL || profile?.image || (profile as any)?.avatar || (profile as any)?.photo || (isRealOwn ? CurrentUser.imageUrl : null)} 
            gender={profile.gender || ''} 
            name={name} 
            size="none" 
            editable={isRealOwn} 
            userId={profile.uid} 
            showStatus={profile.isOnline === true} 
            status={profile.isOnline === true ? 'online' : 'offline'} 
            onUploadSuccess={(url: string) => updateProfileData(CurrentUser.id || profile.uid, { image: url, photoURL: url, profileImage: url })} 
            showAlert={showAlert} 
            className="w-44 h-44 sm:w-56 sm:h-56 rounded-full border-4 border-[#0A0A0F] shadow-2xl ring-2 ring-white/15"
          />
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight flex items-center justify-center gap-2 flex-wrap mb-2">
          <span>{name}</span>
          {profile.verified === true && (
            <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00BFFF] inline-flex items-center justify-center text-[#060709] text-xs sm:text-sm font-black shrink-0 shadow-md shadow-[#00BFFF]/30" title="Verified Talent">
              ✓
            </span>
          )}
          {isPremiumUser && (
            <span className="px-3 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-extrabold text-[10px] sm:text-xs tracking-widest uppercase no-scale shadow-md shadow-amber-500/20">
              PREMIUM
            </span>
          )}
        </h1>

        {userRole && (
          <p className="text-[#00BFFF] font-black text-xs uppercase tracking-widest mb-3">
            {userRole}
          </p>
        )}

        <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
          {profile.openToWork && (<span className="px-2.5 py-0.5 rounded-full bg-[#00BFFF]/10 text-[#00BFFF] text-[9px] font-extrabold tracking-wider uppercase border border-[#00BFFF]/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] animate-pulse"/>
              OPEN TO WORK
            </span>)}
        </div>

        {!isRealOwn && (<div className="w-full max-w-sm flex items-center gap-3 mb-6">
            <button onClick={onFollowToggle} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-bold transition-all active:scale-95 ${isFollowing
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                : 'bg-white/[0.06] border-white/10 hover:bg-white/10 text-white'}`}>
              <UserPlus className="w-4 h-4 text-white/80"/>
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>

            <button onClick={() => onNavigate('messages', profile.uid)} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#00BFFF]/10 border border-[#00BFFF]/40 hover:bg-[#00BFFF]/20 text-[#00BFFF] text-sm font-bold transition-all active:scale-95 shadow-[0_0_15px_rgba(0,191,255,0.15)]">
              <MessageSquare className="w-4 h-4 text-[#00BFFF]"/>
              <span>Message</span>
            </button>
          </div>)}

        <div className={`grid ${isRealOwn ? 'grid-cols-2 max-w-xs' : 'grid-cols-3 max-w-md'} divide-x divide-white/10 w-full mx-auto py-2 my-2 ${isRealOwn ? 'mt-4' : ''}`}>
          <div onClick={() => isRealOwn && onFollowClick?.('followers')} className={`group/followers flex flex-col items-center justify-center text-center py-1 transition-all ${isRealOwn ? 'cursor-pointer' : ''}`}>
            <span className="text-white group-hover/followers:text-[#00BFFF] text-xl sm:text-2xl font-black transition-colors">
              {followerCount || profile?.followers || profile?.followersCount || 0}
            </span>
            <span className="text-gray-400 group-hover/followers:text-white text-[10px] uppercase tracking-widest font-semibold mt-1 transition-colors">
              Followers
            </span>
          </div>

          <div onClick={() => isRealOwn && onFollowClick?.('following')} className={`group/following flex flex-col items-center justify-center text-center py-1 transition-all ${isRealOwn ? 'cursor-pointer' : ''}`}>
            <span className="text-white group-hover/following:text-[#00BFFF] text-xl sm:text-2xl font-black transition-colors">
              {followingCount || profile?.following || profile?.followingCount || 0}
            </span>
            <span className="text-gray-400 group-hover/following:text-white text-[10px] uppercase tracking-widest font-semibold mt-1 transition-colors">
              Following
            </span>
          </div>

          {!isRealOwn && (
            <div className="flex flex-col items-center justify-center text-center py-1">
              <span className="text-amber-400 text-xl sm:text-2xl font-black flex items-center justify-center gap-1.5">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400"/>
                {profile.rating ? (typeof profile.rating === 'number' ? profile.rating.toFixed(1) : profile.rating) : '0.0'}
              </span>
              <span className="text-gray-400 text-[10px] uppercase tracking-widest font-semibold mt-1">
                Rating
              </span>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog isOpen={confirmDeleteCoverOpen} title="Remove Cover Image?" description="Are you sure you want to remove your profile banner background?" confirmText="Remove Cover" cancelText="Cancel" type="danger" isLoading={isDeletingCover} onClose={() => setConfirmDeleteCoverOpen(false)} onConfirm={handleDeleteCover}/>
    </div>);
}
